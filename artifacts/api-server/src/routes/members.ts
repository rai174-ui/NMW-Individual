import { Router } from "express";
import { pool } from "../lib/sqlite";
import { requireMember, type MemberRequest } from "./auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  const { rows } = await pool.query(
    "SELECT id, name, email, date_of_joining, height_cm, mobile, dob, age_at_joining, is_active, daily_kcal, target_protein_g, target_fiber_g, target_water_ml, valid_until FROM members WHERE id = $1", 
    [Number(req.params.id)]
  );
  if (!rows[0]) { res.status(404).json({ error: "Member not found" }); return; }
  res.json(rows[0]);
});

// PUT /api/members/:id/targets
router.put("/members/:id/targets", async (req, res) => {
  const memberId = Number(req.params.id);
  const { daily_kcal, target_protein_g, target_fiber_g, target_water_ml } = req.body;
  const { rows } = await pool.query(
    `UPDATE members 
     SET daily_kcal = $1, target_protein_g = $2, target_fiber_g = $3, target_water_ml = $4 
     WHERE id = $5 RETURNING id, daily_kcal, target_protein_g, target_fiber_g, target_water_ml`,
    [
      daily_kcal ?? null, 
      target_protein_g ?? null, 
      target_fiber_g ?? null, 
      target_water_ml ?? null, 
      memberId
    ]
  );
  res.json(rows[0]);
});

// PUT /api/members/:id/profile
router.put("/members/:id/profile", async (req, res) => {
  const memberId = Number(req.params.id);
  const { name, height_cm, mobile, dob, gender } = req.body;
  const { rows } = await pool.query(
    `UPDATE members 
     SET name = COALESCE($1, name), height_cm = $2, mobile = $3, dob = $4, gender = $5 
     WHERE id = $6 RETURNING id, name, height_cm, mobile, dob, gender`,
    [
      name, 
      height_cm ?? null, 
      mobile ?? null, 
      dob ?? null, 
      gender ?? null,
      memberId
    ]
  );
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

// PUT /api/members/:id/health-records/:recordId
router.put("/members/:id/health-records/:recordId", async (req, res) => {
  const memberId = Number(req.params.id);
  const recordId = Number(req.params.recordId);
  const {
    weight_kg, body_fat_pct, notes,
  } = req.body as {
    weight_kg?: number | null; body_fat_pct?: number | null; notes?: string | null;
  };
  
  const { rowCount, rows } = await pool.query(
    `UPDATE health_records
     SET weight_kg = $1, body_fat_pct = $2, notes = $3
     WHERE id = $4 AND member_id = $5
     RETURNING *`,
    [weight_kg ?? null, body_fat_pct ?? null, notes ?? null, recordId, memberId]
  );
  
  if (rowCount === 0) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  res.json(rows[0]);
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
  const { meal_slot, food_item, quantity_g, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, photo_url, logged_at } = req.body as {
    meal_slot: string; food_item: string;
    quantity_g?: number | null; calories_kcal?: number | null;
    protein_g?: number | null; carbs_g?: number | null; fat_g?: number | null; fiber_g?: number | null;
    photo_url?: string | null; logged_at?: string | null;
  };
  if (!meal_slot || !food_item) { res.status(400).json({ error: "meal_slot and food_item are required" }); return; }

  const recAt = logged_at ? new Date(logged_at) : new Date();

  const { rows } = await pool.query(
    `INSERT INTO consumption_logs
       (member_id, logged_at, meal_slot, food_item, quantity_g, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, photo_url, photo_uploaded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [memberId, recAt, meal_slot, food_item, quantity_g ?? null, calories_kcal ?? null,
     protein_g ?? null, carbs_g ?? null, fat_g ?? null, fiber_g ?? null,
     photo_url ?? null, photo_url ? new Date().toISOString() : null]
  );
  res.status(201).json(rows[0]);
});

// POST /api/members/:id/vision
router.post("/members/:id/vision", async (req, res) => {
  const memberId = Number(req.params.id);
  const { rows } = await pool.query("SELECT valid_until FROM members WHERE id = $1", [memberId]);
  if (!rows[0]) { res.status(404).json({ error: "Member not found" }); return; }
  const validUntil = new Date(rows[0].valid_until);
  if (validUntil < new Date()) {
    res.status(403).json({ error: "Premium feature locked. Your trial has expired." });
    return;
  }
  try {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      res.status(400).json({ error: "Missing image or mimeType" });
      return;
    }
    
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: "AI Vision is not configured on the server." });
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Analyze this image of a meal. Identify the food item and estimate its calories, protein (in grams), and fiber (in grams).
Return ONLY a JSON object with this exact structure:
{
  "food_item": "Name of food",
  "calories_kcal": 0,
  "protein_g": 0,
  "fiber_g": 0
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image,
          mimeType: mimeType
        }
      }
    ]);

    const text = result.response.text();
    const json = JSON.parse(text);
    res.json(json);
  } catch (err: any) {
    console.error("AI Vision error:", err);
    res.status(500).json({ error: "AI Vision error: " + (err.message || String(err)) });
  }
});

// GET /api/members/:id/activities
router.get("/members/:id/activities", async (req, res) => {
  const memberId = Number(req.params.id);
  const date = req.query.date as string | undefined;
  if (date) {
    const { rows } = await pool.query(
      "SELECT * FROM activity_logs WHERE member_id = $1 AND DATE(logged_at AT TIME ZONE 'Asia/Kolkata') = $2 ORDER BY logged_at ASC",
      [memberId, date]
    );
    res.json(rows);
  } else {
    const { rows } = await pool.query(
      "SELECT * FROM activity_logs WHERE member_id = $1 ORDER BY logged_at DESC LIMIT 100",
      [memberId]
    );
    res.json(rows);
  }
});

// POST /api/members/:id/activities
router.post("/members/:id/activities", async (req, res) => {
  const memberId = Number(req.params.id);
  const { activity_type, duration_minutes, calories_burned, source, logged_at } = req.body as {
    activity_type: string;
    duration_minutes?: number | null;
    calories_burned?: number | null;
    source?: string | null;
    logged_at?: string | null;
  };
  if (!activity_type) { res.status(400).json({ error: "activity_type is required" }); return; }

  const recAt = logged_at ? new Date(logged_at) : new Date();

  const { rows } = await pool.query(
    `INSERT INTO activity_logs (member_id, logged_at, activity_type, duration_minutes, calories_burned, source)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [memberId, recAt, activity_type, duration_minutes ?? null, calories_burned ?? null, source ?? 'manual']
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/members/:id/activities/:logId
router.delete("/members/:id/activities/:logId", async (req, res) => {
  const memberId = Number(req.params.id);
  const logId = Number(req.params.logId);
  const { rowCount } = await pool.query(
    "DELETE FROM activity_logs WHERE id = $1 AND member_id = $2",
    [logId, memberId]
  );
  if (rowCount === 0) {
    res.status(404).json({ error: "Log not found" });
    return;
  }
  res.status(204).send();
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

  const { rows: activities } = await pool.query(
    `SELECT calories_burned FROM activity_logs 
     WHERE member_id = $1 AND DATE(logged_at AT TIME ZONE 'Asia/Kolkata') = $2`,
    [memberId, date]
  );
  
  let totalCaloriesBurned = 0;
  for (const act of activities) {
    if (act.calories_burned) totalCaloriesBurned += Number(act.calories_burned);
  }

  res.json({
    date,
    total_kcal: totalKcal,
    total_protein_g: totalPro,
    total_carbs_g: totalCarb,
    total_fat_g: totalFat,
    total_fiber_g: totalFiber,
    total_calories_burned_kcal: totalCaloriesBurned,
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

// GET /api/members/:id/water
router.get("/members/:id/water", async (req, res) => {
  const memberId = Number(req.params.id);
  const date = req.query.date as string | undefined;
  if (date) {
    const { rows } = await pool.query(
      "SELECT * FROM water_logs WHERE member_id = $1 AND DATE(logged_at AT TIME ZONE 'Asia/Kolkata') = $2 ORDER BY logged_at ASC",
      [memberId, date]
    );
    res.json(rows);
  } else {
    const { rows } = await pool.query(
      "SELECT * FROM water_logs WHERE member_id = $1 ORDER BY logged_at DESC LIMIT 100",
      [memberId]
    );
    res.json(rows);
  }
});

// POST /api/members/:id/water
router.post("/members/:id/water", async (req, res) => {
  const memberId = Number(req.params.id);
  const { amount_ml } = req.body;
  if (!amount_ml || isNaN(amount_ml)) {
    res.status(400).json({ error: "amount_ml is required" });
    return;
  }
  const { rows } = await pool.query(
    "INSERT INTO water_logs (member_id, amount_ml, logged_at) VALUES ($1, $2, NOW()) RETURNING *",
    [memberId, amount_ml]
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/members/:id/water/latest
router.delete("/members/:id/water/latest", async (req, res) => {
  const memberId = Number(req.params.id);
  const date = req.query.date as string | undefined;
  
  if (!date) {
    res.status(400).json({ error: "date query param is required (YYYY-MM-DD)" });
    return;
  }
  
  // Delete the most recent water log for this member on the given date
  const { rowCount, rows } = await pool.query(
    `DELETE FROM water_logs 
     WHERE id IN (
       SELECT id FROM water_logs 
       WHERE member_id = $1 AND DATE(logged_at AT TIME ZONE 'Asia/Kolkata') = $2 
       ORDER BY logged_at DESC LIMIT 1
     ) RETURNING *`,
    [memberId, date]
  );
  
  if (rowCount === 0) {
    res.status(404).json({ error: "No water log found to delete today" });
    return;
  }
  res.json({ message: "Deleted latest log", deleted: rows[0] });
});


// POST /api/members/:id/generate-targets
router.post("/members/:id/generate-targets", async (req, res) => {
  const memberId = Number(req.params.id);
  
  // Premium Check
  const { rows: memberRows } = await pool.query("SELECT valid_until FROM members WHERE id = $1", [memberId]);
  if (!memberRows[0]) { res.status(404).json({ error: "Member not found" }); return; }
  const validUntil = new Date(memberRows[0].valid_until);
  if (validUntil < new Date()) {
    res.status(403).json({ error: "Premium feature locked. Your trial has expired." });
    return;
  }

  try {
    const { gender, weight, height, age, ethnicity, activityLevel } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: "AI Vision is not configured on the server." });
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: {
        responseMimeType: "application/json", }
    });

    const prompt = `You are an expert nutritionist. Calculate daily macronutrient targets based on:
    Gender: ${gender}
    Weight: ${weight} kg
    Height: ${height} cm
    Age: ${age} years
    Ethnicity: ${ethnicity}
    Activity Level: ${activityLevel}
    
    Return ONLY a JSON object with this exact structure:
    {
      "daily_kcal": 0,
      "target_protein_g": 0,
      "target_fiber_g": 0,
      "target_water_ml": 0
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = JSON.parse(text);
    res.json(json);
  } catch (err: any) {
    console.error("AI Macro error:", err);
    res.status(500).json({ error: "AI error: " + (err.message || String(err)) });
  }
});

// POST /api/members/:id/renew
router.post("/members/:id/renew", async (req, res) => {
  const memberId = Number(req.params.id);
  // Extend valid_until by 30 days from now (or from existing valid_until if in future)
  const { rows } = await pool.query("SELECT valid_until, email FROM members WHERE id = $1", [memberId]);
  if (!rows[0]) { res.status(404).json({ error: "Member not found" }); return; }
  
  let validUntil = new Date(rows[0].valid_until);
  const now = new Date();
  if (validUntil < now) validUntil = now;
  validUntil.setDate(validUntil.getDate() + 30);
  
  const validUntilStr = validUntil.toISOString().split('T')[0];
  
  await pool.query("UPDATE members SET valid_until = $1 WHERE id = $2", [validUntilStr, memberId]);
  await pool.query("UPDATE member_history SET valid_until = $1 WHERE email = $2", [validUntilStr, rows[0].email]);
  
  res.json({ message: "Membership renewed", valid_until: validUntilStr });
});

// DELETE /api/members/:id
router.delete("/members/:id", async (req, res) => {
  const memberId = Number(req.params.id);
  const { rows } = await pool.query("SELECT email, date_of_joining, valid_until FROM members WHERE id = $1", [memberId]);
  if (!rows[0]) { res.status(404).json({ error: "Member not found" }); return; }
  
  const { email, date_of_joining, valid_until } = rows[0];
  
  await pool.query("BEGIN");
  // Upsert into member_history
  await pool.query(
    `INSERT INTO member_history (email, first_joined_at, valid_until) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (email) DO UPDATE SET valid_until = EXCLUDED.valid_until, deleted_at = NOW()`,
    [email, date_of_joining, valid_until]
  );
  
  await pool.query("DELETE FROM members WHERE id = $1", [memberId]);
  await pool.query("COMMIT");
  
  res.json({ message: "Account successfully deleted" });
});


export default router;

