const pool = require('../config/db');

async function findProfileByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.user_id AS userId, c.full_name AS fullName, c.phone, c.email, c.address,
            u.username, u.email AS userEmail, u.is_active AS isActive
     FROM customers c JOIN users u ON u.id = c.user_id
     WHERE c.user_id = ? AND c.deleted_at IS NULL LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function findProfileById(conn, customerId) {
  const [rows] = await conn.execute(
    `SELECT id, user_id AS userId, full_name AS fullName, phone, email, address
     FROM customers WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
    [customerId]
  );
  return rows[0] || null;
}

async function findEmailConflict(conn, email, customerId, userId) {
  const [rows] = await conn.execute(
    `SELECT id FROM users WHERE email = ? AND id <> ?
     UNION ALL
     SELECT id FROM customers WHERE email = ? AND id <> ? AND deleted_at IS NULL
     LIMIT 1`,
    [email, userId, email, customerId]
  );
  return Boolean(rows[0]);
}

async function updateProfile(conn, customerId, userId, profile) {
  await conn.execute(
    `UPDATE customers SET full_name = ?, phone = ?, email = ?, address = ? WHERE id = ?`,
    [profile.fullName, profile.phone, profile.email, profile.address || null, customerId]
  );
  await conn.execute(`UPDATE users SET email = ? WHERE id = ?`, [profile.email, userId]);
}

module.exports = { pool, findProfileByUserId, findProfileById, findEmailConflict, updateProfile };
