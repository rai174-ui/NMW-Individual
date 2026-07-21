import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { pool } from "../lib/sqlite";
import { logger } from "../lib/logger";
import { Resend } from "resend";

const router = Router();
const JWT_SECRET = process.env["SESSION_SECRET"] ?? "dev-secret-change-me";

// Resend for password reset emails
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface MemberRequest extends Request {
  authMemberId: number;
}

export function requireMember(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { memberId: number };
    (req as unknown as MemberRequest).authMemberId = payload.memberId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function signToken(memberId: number, email: string): string {
  return jwt.sign({ memberId, email }, JWT_SECRET, { expiresIn: "30d" });
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  const { name, email, password, height_cm } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    
    // Check member_history
    const historyRes = await pool.query("SELECT first_joined_at, valid_until FROM member_history WHERE email = $1", [email.toLowerCase().trim()]);
    const history = historyRes.rows[0];
    
    let date_of_joining: string;
    let valid_until: string;
    
    if (history) {
      date_of_joining = new Date(history.first_joined_at).toISOString().split('T')[0];
      valid_until = new Date(history.valid_until).toISOString().split('T')[0];
    } else {
      date_of_joining = new Date().toISOString().split('T')[0];
      const validUntilDate = new Date();
      validUntilDate.setDate(validUntilDate.getDate() + 30);
      valid_until = validUntilDate.toISOString().split('T')[0];
    }

    const { rows } = await pool.query(
      `INSERT INTO members (name, email, password_hash, date_of_joining, valid_until, height_cm) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, valid_until`,
      [name, email.toLowerCase().trim(), password_hash, date_of_joining, valid_until, height_cm ?? null]
    );

    const member = rows[0];
    
    // Insert into history if fresh (so next time they don't get 30 days)
    if (!history) {
       await pool.query(
         `INSERT INTO member_history (email, first_joined_at, valid_until) VALUES ($1, $2, $3)`,
         [member.email, date_of_joining, valid_until]
       );
    }
    
    const token = signToken(member.id, member.email);
    res.status(201).json({ token, member });
  } catch (err: any) {
    if (err.code === '23505') { // unique violation
      res.status(409).json({ error: "Email is already registered" });
    } else {
      logger.error({ err }, "Registration error");
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const { rows } = await pool.query("SELECT * FROM members WHERE LOWER(TRIM(email)) = $1", [email.toLowerCase().trim()]);
  const member = rows[0];

  if (!member || !(await bcrypt.compare(password, member.password_hash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!member.is_active) {
    res.status(403).json({ error: "Account disabled" });
    return;
  }

  const token = signToken(member.id, member.email);
  const { password_hash, ...safeMember } = member;
  res.json({ token, member: safeMember });
});

// POST /api/auth/request-password-reset
router.post("/auth/request-password-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const { rows } = await pool.query("SELECT id FROM members WHERE LOWER(TRIM(email)) = $1", [email.toLowerCase().trim()]);
  if (!rows[0]) {
    // Return success to prevent email enumeration
    res.json({ message: "If that email exists, a reset code was sent." });
    return;
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otp_token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await pool.query(
    `INSERT INTO otps (member_id, email, otp, otp_token, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [rows[0].id, email.toLowerCase().trim(), otp, otp_token, expiresAt]
  );

  // In development without Resend, print OTP to console
  if (!resend) {
    logger.info({ email, otp, otp_token }, "Password reset OTP generated (Dev mode)");
    res.json({ message: "If that email exists, a reset code was sent.", dev_otp_token: otp_token });
    return;
  }

  try {
    await resend.emails.send({
      from: "HealthLogix <onboarding@resend.dev>",
      to: [email],
      subject: "Password Reset Code",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#0d9488">Password Reset Code</h2>
        <p>Use the following 6-digit code to reset your password:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:0.2em;color:#0d9488;padding:16px 24px;background:#f0fdfa;border-radius:8px;display:inline-block;margin:8px 0">${otp}</div>
        <p style="color:#6b7280;font-size:13px;margin-top:16px">This code expires in 15 minutes.</p>
      </div>`
    });
    res.json({ message: "If that email exists, a reset code was sent.", otp_token });
  } catch (err) {
    logger.error({ err }, "Failed to send reset email");
    res.status(500).json({ error: "Failed to send email" });
  }
});

// POST /api/auth/reset-password
router.post("/auth/reset-password", async (req, res) => {
  const { otp_token, otp, new_password } = req.body;
  if (!otp_token || !otp || !new_password) {
    res.status(400).json({ error: "OTP token, code, and new password are required" });
    return;
  }

  const { rows } = await pool.query(
    `SELECT * FROM otps WHERE otp_token = $1 AND otp = $2 AND used = FALSE AND expires_at > NOW()`,
    [otp_token, otp]
  );
  const otpRecord = rows[0];

  if (!otpRecord) {
    res.status(400).json({ error: "Invalid or expired code" });
    return;
  }

  const password_hash = await bcrypt.hash(new_password, 10);
  
  await pool.query("BEGIN");
  await pool.query("UPDATE members SET password_hash = $1 WHERE id = $2", [password_hash, otpRecord.member_id]);
  await pool.query("UPDATE otps SET used = TRUE WHERE id = $1", [otpRecord.id]);
  await pool.query("COMMIT");

  res.json({ message: "Password reset successfully" });
});

export default router;
