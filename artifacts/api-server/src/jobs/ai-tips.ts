import cron from "node-cron";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from "../lib/sqlite";
import { sendPushNotification } from "../lib/push";
import { logger } from "../lib/logger";

let tipCronJob: cron.ScheduledTask | null = null;

export function initAiTipsJob() {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY not set. AI Tips push job will not run.");
    return;
  }

  // Schedule to run at 9 AM, 1 PM, 5 PM, and 8 PM every day (IST)
  // "0 9,13,17,20 * * *"
  tipCronJob = cron.schedule("0 9,13,17,20 * * *", async () => {
    logger.info("Running scheduled AI Health Tip job...");
    try {
      // 1. Get all push tokens
      const { rows } = await pool.query(
        "SELECT push_token FROM members WHERE is_active = TRUE AND push_token IS NOT NULL"
      );

      const tokens = rows.map((r: any) => r.push_token as string);
      if (tokens.length === 0) {
        logger.info("No users with push tokens found. Skipping AI tip.");
        return;
      }

      // 2. Generate Tip using Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

      const prompt = `You are an engaging AI Health Coach. Generate a single, highly actionable health or fitness tip, or an interesting wellness fact.
Constraints:
- Maximum 1 to 2 short sentences.
- Include one relevant emoji.
- Tone should be friendly and encouraging.
- Do NOT use markdown or quotation marks.`;

      const result = await model.generateContent(prompt);
      const tipText = result.response.text().trim();

      if (!tipText) {
        logger.warn("Gemini returned empty text for AI tip.");
        return;
      }

      // 3. Push to all tokens
      logger.info({ tokenCount: tokens.length, tip: tipText }, "Sending AI tip to users");
      await sendPushNotification(tokens, "Health Tip", tipText);
      logger.info("Successfully sent AI Health Tip.");
    } catch (err: any) {
      logger.error({ err }, "Error running AI Health Tip job");
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  tipCronJob.start();
  logger.info("AI Tips job initialized (Runs at 9 AM, 1 PM, 5 PM, 8 PM)");
}

export function stopAiTipsJob() {
  if (tipCronJob) {
    tipCronJob.stop();
  }
}
