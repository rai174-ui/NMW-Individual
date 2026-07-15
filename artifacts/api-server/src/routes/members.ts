import { Router } from "express";
import { pool } from "../lib/sqlite";
import { requireMember, type MemberRequest } from "./auth";

const router = Router();
router.use("/members", requireMember);

// Ensure that member routes cannot access data belonging to other members
router.param("id", (req, res, next, id) => {
  if ((req as unknown as MemberRequest).authMemberId !== Number(id)) {
    res.status(403).json({ error: "Forbidden: Cannot access other member's data" });
    return;
  }
  next();
});

// GET /api/members/:id
router.get("/members/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, email, date_of_joining, height_cm, mobile, dob, age_at_joining, is_active FROM members WHERE id = $1", [Number(req.params.id)]);
  if (!rows[0]) { res.status(404).json({ error: "Member not found" }); return; }
  res.json(rows[0]);
});

// GET /api/members/:id/health-records
router.get("/members/:id/health-records", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM health_records WHERE member_id = $1 ORDER BY recorded_at DESC",
    [Number(req.params.id)]
  );
  res.json(rows);
});

// POST /api/members/:id/health-records
router.post("/members/:id/health-records", async (req, res) => {
  const memberId = Number(req.params.id);
  const {
    recorded_at, weight_kg, body_fat_pct, visceral_fat,
    bmr, bmi, metabolic_age, muscle_mass_kg, resting_hr, notes,
  } = req.body as {
    recorded_at?: string | null;
    weight_kg?: number | null; body_fat_pct?: number | null; visceral_fat?: number | null;
    bmr?: number | null; bmi?: number | null; metabolic_age?: number | null;
    muscle_mass_kg?: number | null; resting_hr?: number | null; notes?: string | null;
  };
  const recAt = recorded_at ? new Date(recorded_at) : new Date();
  const { rows } = await pool.query(
    `INSERT INTO health_records
       (member_id, recorded_at, weight_kg, body_fat_pct, visceral_fat,
        bmr, bmi, metabolic_age, muscle_mass_kg, resting_hr, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      memberId, recAt,
      weight_kg ?? null, body_fat_pct ?? null, visceral_fat ?? null,
      bmr ?? null, bmi ?? null, metabolic_age ?? null,
      muscle_mass_kg ?? null, resting_hr ?? null, notes ?? null,
    ]
  );
  res.status(201).json(rows[0]);
});

// GET /api/members/:id/consumption?date=YYYY-MM-DD
router.get("/members/:id/consumption", async (req, res) => {
  const memberId = Number(req.params.id);
  const date = req.query.date as string | undefined;
  if (date) {
    const { rows } = await pool.query(
      "SELECT * FROM consumption_logs WHERE member_id = $1 AND DATE(logged_at AT TIME ZONE 'Asia/Kolkata') = $2 ORDER BY logged_at ASC",
      [memberId, date]
    );
    res.json(rows);
  } else {
    const { rows } = await pool.query(
      "SELECT * FROM consumption_logs WHERE member_id = $1 ORDER BY logged_at DESC LIMIT 100",
      [memberId]
    );
    res.json(rows);
  }
});

// POST /api/members/:id/consumption
router.post("/members/:id/consumption", async (req, res) => {
  const memberId = Number(req.params.id);
  const { meal_slot, food_item, quantity_g, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, photo_url } = req.body as {
    meal_slot: string; food_item: string;
    quantity_g?: number | null; calories_kcal?: number | null;
    protein_g?: number | null; carbs_g?: number | null; fat_g?: number | null; fiber_g?: number | null;
    photo_url?: string | null;
  };
  if (!meal_slot || !food_item) { res.status(400).json({ error: "meal_slot and food_item are required" }); return; }

  const { rows } = await pool.query(
    `INSERT INTO consumption_logs
       (member_id, logged_at, meal_slot, food_item, quantity_g, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, photo_url, photo_uploaded_at)
     VALUES ($1,NOW(),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [memberId, meal_slot, food_item, quantity_g ?? null, calories_kcal ?? null,
     protein_g ?? null, carbs_g ?? null, fat_g ?? null, fiber_g ?? null,
     photo_url ?? null, photo_url ? new Date().toISOString() : null]
  );
  res.status(201).json(rows[0]);
});

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

// GET /api/members/:id/summary?date=YYYY-MM-DD
router.get("/members/:id/summary", async (req, res) => {
  const memberId = Number(req.params.id);
  const date = (req.query.date as string) ?? todayIST();
  const { rows: logs } = await pool.query(
    `SELECT id, member_id, logged_at, meal_slot, food_item, quantity_g, calories_kcal, protein_g, carbs_g, fat_g, fiber_g 
     FROM consumption_logs 
     WHERE member_id = $1 AND DATE(logged_at AT TIME ZONE 'Asia/Kolkata') = $2`,
    [memberId, date]
  );

  let totalKcal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, totalFiber = 0;
  for (const log of logs) {
    if (log.calories_kcal) totalKcal += Number(log.calories_kcal);
    if (log.protein_g) totalPro += Number(log.protein_g);
    if (log.carbs_g) totalCarb += Number(log.carbs_g);
    if (log.fat_g) totalFat += Number(log.fat_g);
    if (log.fiber_g) totalFiber += Number(log.fiber_g);
  }

  res.json({
    date,
    total_kcal: totalKcal,
    total_protein_g: totalPro,
    total_carbs_g: totalCarb,
    total_fat_g: totalFat,
    total_fiber_g: totalFiber,
    items: logs
  });
});

// DELETE /api/members/:id/consumption/:logId
router.delete("/members/:id/consumption/:logId", async (req, res) => {
  const memberId = Number(req.params.id);
  const logId = Number(req.params.logId);
  const { rowCount } = await pool.query(
    "DELETE FROM consumption_logs WHERE id = $1 AND member_id = $2",
    [logId, memberId]
  );
  if (rowCount === 0) {
    res.status(404).json({ error: "Log not found" });
    return;
  }
  res.status(204).send();
});

export default router;
