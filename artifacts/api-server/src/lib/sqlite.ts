import pg from "pg";
import { logger } from "./logger";

const { Pool } = pg;
export let initDbError: Error | null = null;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connectionString,
  ssl: (process.env.DATABASE_URL?.includes("supabase.co") ||
         process.env.DATABASE_URL?.includes("rlwy.net") ||
         process.env.DATABASE_URL?.includes("railway.app"))
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await pool.query(text, params);
  return result.rows[0] ?? null;
}

async function createTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      date_of_joining TEXT,
      height_cm INTEGER,
      mobile TEXT,
      membership_no TEXT,
      dob TEXT,
      age_at_joining REAL,
      valid_until DATE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS health_records (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      weight_kg REAL,
      body_fat_pct REAL,
      visceral_fat REAL,
      bmr REAL,
      bmi REAL,
      metabolic_age INTEGER,
      muscle_mass_kg REAL,
      resting_hr INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS consumption_logs (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      meal_slot TEXT,
      food_item TEXT NOT NULL,
      quantity_g REAL,
      calories_kcal REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      photo_url TEXT,
      photo_uploaded_at TIMESTAMPTZ,
      fiber_g REAL,
      selected_flavour TEXT
    );

    CREATE TABLE IF NOT EXISTS otps (
      id SERIAL PRIMARY KEY,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      mobile TEXT,
      email TEXT,
      otp TEXT NOT NULL,
      otp_token TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
}

export async function initDb(): Promise<void> {
  try {
    await pool.query("SELECT NOW()"); // Test connection
    await createTables();
    logger.info("Database initialized successfully (Individual Edition)");
  } catch (err: any) {
    logger.error({ err }, "Database initialization failed");
    initDbError = err;
    throw err;
  }
}
