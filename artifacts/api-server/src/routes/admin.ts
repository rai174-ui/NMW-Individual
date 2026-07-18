import { Router } from "express";
import { pool } from "../lib/sqlite";

const router = Router();

// Middleware to check if user is admin
const adminOnly = async (req: any, res: any, next: any) => {
  const memberId = req.headers["x-member-id"] || req.query.memberId;
  if (!memberId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { rows } = await pool.query("SELECT is_admin FROM members WHERE id = $1", [Number(memberId)]);
  if (!rows[0] || !rows[0].is_admin) {
    return res.status(403).json({ error: "Forbidden: Admins only" });
  }
  next();
};

// GET /api/admin/dashboard
router.get("/admin/dashboard", adminOnly, async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*) FROM members");
    
    // Active today (logged activity today)
    const today = new Date().toISOString().split('T')[0];
    const activeToday = await pool.query(
      "SELECT COUNT(DISTINCT member_id) FROM activity_logs WHERE DATE(logged_at AT TIME ZONE 'Asia/Kolkata') = $1", 
      [today]
    );

    // Premium users
    const premiumUsers = await pool.query(
      "SELECT COUNT(*) FROM members WHERE valid_until >= CURRENT_DATE"
    );

    res.json({
      total_users: Number(totalUsers.rows[0].count),
      active_today: Number(activeToday.rows[0].count),
      premium_users: Number(premiumUsers.rows[0].count)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get("/admin/users", adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, email, mobile, is_admin, valid_until, date_of_joining,
             (SELECT MAX(logged_at) FROM activity_logs WHERE member_id = members.id) as last_active
      FROM members 
      ORDER BY date_of_joining DESC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/extend
router.post("/admin/users/:id/extend", adminOnly, async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const { rows } = await pool.query("SELECT valid_until, email FROM members WHERE id = $1", [memberId]);
    if (!rows[0]) { return res.status(404).json({ error: "Member not found" }); }
    
    let validUntil = new Date(rows[0].valid_until);
    const now = new Date();
    if (validUntil < now) validUntil = now;
    validUntil.setDate(validUntil.getDate() + 30);
    
    const validUntilStr = validUntil.toISOString().split('T')[0];
    
    await pool.query("UPDATE members SET valid_until = $1 WHERE id = $2", [validUntilStr, memberId]);
    await pool.query("UPDATE member_history SET valid_until = $1 WHERE email = $2", [validUntilStr, rows[0].email]);
    
    res.json({ message: "Validity extended by 30 days", valid_until: validUntilStr });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/admin
router.post("/admin/users/:id/admin", adminOnly, async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const { is_admin } = req.body;
    await pool.query("UPDATE members SET is_admin = $1 WHERE id = $2", [is_admin, memberId]);
    res.json({ message: "Admin status updated", is_admin });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
