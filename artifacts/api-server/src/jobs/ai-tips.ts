import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from "../lib/sqlite";
import { sendPushNotification } from "../lib/push";
import { logger } from "../lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────

interface TipSlot {
  scheduledAt: Date;
  sent: boolean;
}

// ── In-memory daily plan ──────────────────────────────────────────────────

let todayPlan: TipSlot[] = [];
let lastPlanDate = ""; // YYYY-MM-DD in IST
let tipIntervalId: ReturnType<typeof setInterval> | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────

function getISTDateStr(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function getISTHour(now: Date): number {
  const hourStr = now.toLocaleString("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
  const h = parseInt(hourStr, 10);
  // toLocaleString with hour12:false returns "24" at midnight on some runtimes
  return h === 24 ? 0 : h;
}

/**
 * Plan 3 or 4 randomly-timed tip slots for today within the 6 AM–10 PM IST
 * window. Each slot falls in its own equal segment so tips are naturally spread
 * out and always at least (windowSize / tipCount) minutes apart.
 *
 * Slots that have already passed when planDay() is called are pre-marked sent
 * so they don't fire retroactively after a server restart.
 */
function planDay(now: Date): void {
  const dateStr = getISTDateStr(now);

  // Compute UTC timestamp for midnight IST of today.
  // IST = UTC + 5:30 → midnight IST = UTC midnight − 330 min
  const [year, month, day] = dateStr.split("-").map(Number);
  const istMidnightUTC = Date.UTC(year, month - 1, day) - 330 * 60_000;

  // 6 AM = 360 min from midnight, 10 PM = 1320 min → 960-min window
  const WINDOW_START_MIN = 360;
  const WINDOW_END_MIN   = 1320;
  const WINDOW_SIZE      = WINDOW_END_MIN - WINDOW_START_MIN; // 960

  const tipCount    = Math.random() < 0.5 ? 3 : 4;
  const segmentSize = WINDOW_SIZE / tipCount;

  const nowMs  = now.getTime();
  const slots: TipSlot[] = [];

  for (let i = 0; i < tipCount; i++) {
    const segStartMin  = WINDOW_START_MIN + i * segmentSize;
    const offsetMin    = Math.floor(Math.random() * segmentSize);
    const scheduledMin = segStartMin + offsetMin;
    const scheduledMs  = istMidnightUTC + scheduledMin * 60_000;

    slots.push({
      scheduledAt: new Date(scheduledMs),
      // Mark past slots as already sent so we don't double-fire on restart
      sent: scheduledMs <= nowMs,
    });
  }

  todayPlan    = slots;
  lastPlanDate = dateStr;

  const times = slots.map((s) =>
    s.scheduledAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }),
  );

  logger.info({ date: dateStr, times, tipCount }, "AI Tips planned for today");
}

/**
 * Returns a time-of-day-aware notification title and Gemini prompt category
 * so tips feel contextually relevant to what the user is actually doing.
 */
function getTimeContext(now: Date): { title: string; category: string } {
  const hour = getISTHour(now);

  if (hour < 10) {
    return {
      title: "Good Morning 🌅",
      category:
        "morning energy, hydration, and making healthy breakfast choices to kickstart the day",
    };
  }
  if (hour < 14) {
    return {
      title: "Midday Boost 💪",
      category:
        "pre-lunch and post-lunch nutrition, metabolism, portion control, and mindful eating",
    };
  }
  if (hour < 18) {
    return {
      title: "Afternoon Tip ☀️",
      category:
        "healthy snacking to beat the afternoon slump, avoiding sugar crashes, and staying active",
    };
  }
  return {
    title: "Evening Wellness 🌙",
    category:
      "evening digestion, post-dinner habits, recovery, sleep quality, and sustainable weight loss",
  };
}

// ── Core tip-sending logic ────────────────────────────────────────────────

async function fireTip(slot: TipSlot): Promise<void> {
  // Mark sent immediately to prevent double-fire if this call is slow
  slot.sent = true;

  try {
    const { rows } = await pool.query(
      "SELECT push_token FROM members WHERE push_token IS NOT NULL",
    );
    const tokens = (rows as Array<{ push_token: string }>).map(
      (r) => r.push_token,
    );

    if (tokens.length === 0) {
      logger.info("No members with push tokens. Skipping wellness tip.");
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const { title, category } = getTimeContext(new Date());

    const prompt = `You are HealthLogix, a friendly AI wellness coach.
Generate ONE actionable tip focused on: ${category}.
The tip should relate to weight loss, healthy nutrition, hydration, or wellness habits.
Constraints:
- Maximum 2 short sentences.
- Include exactly one relevant emoji naturally within the text.
- Friendly, encouraging, and conversational tone.
- Do NOT use markdown, quotes, asterisks, or bullet points.`;

    const result  = await model.generateContent(prompt);
    const tipText = result.response.text().trim();

    if (!tipText) {
      logger.warn("Gemini returned empty tip text. Skipping.");
      return;
    }

    logger.info(
      { tokenCount: tokens.length, title, tip: tipText },
      "Sending AI wellness tip",
    );
    await sendPushNotification(tokens, title, tipText);
    logger.info("AI wellness tip sent successfully.");
  } catch (err) {
    logger.error({ err }, "Error firing AI wellness tip");
  }
}

// ── Polling tick ──────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  const now      = new Date();
  const todayStr = getISTDateStr(now);

  // Replan at the start of each new IST calendar day
  if (todayStr !== lastPlanDate) {
    planDay(now);
  }

  // Fire any slots whose time has arrived but haven't been sent yet
  for (const slot of todayPlan) {
    if (!slot.sent && slot.scheduledAt <= now) {
      await fireTip(slot);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export function initAiTipsJob(): void {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY not set — AI Tips job will not run.");
    return;
  }

  // Build today's plan immediately on startup
  planDay(new Date());

  // Run one tick right away (catches any tip due within the first 60 s window)
  tick().catch((err) => logger.error({ err }, "AI Tips initial tick failed"));

  // Then poll every 60 seconds
  tipIntervalId = setInterval(() => {
    tick().catch((err) => logger.error({ err }, "AI Tips tick failed"));
  }, 60_000);

  logger.info(
    "AI Tips job started — randomized daily schedule, polling every 60 s",
  );
}

export function stopAiTipsJob(): void {
  if (tipIntervalId !== null) {
    clearInterval(tipIntervalId);
    tipIntervalId = null;
    logger.info("AI Tips job stopped.");
  }
}
