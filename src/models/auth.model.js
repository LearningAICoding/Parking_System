const pool = require('../config/db');

async function findUserByUsername(username) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.email, u.password_hash, u.role, u.is_active,
            c.id AS customer_id, COALESCE(e.full_name, c.full_name) AS full_name
     FROM users u
     LEFT JOIN customers c ON c.user_id = u.id AND c.deleted_at IS NULL
     LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
     WHERE u.username = ? LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT id, username, email, password_hash, role, is_active
     FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function saveResetToken(userId, tokenHash, expiresAt) {
  await pool.execute(
    `UPDATE users SET reset_token_hash = ?, reset_expires = ? WHERE id = ?`,
    [tokenHash, expiresAt, userId]
  );
}

async function findUserByResetToken(tokenHash) {
  const [rows] = await pool.execute(
    `SELECT id, email FROM users
     WHERE reset_token_hash = ? AND reset_expires IS NOT NULL AND reset_expires > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function updatePasswordAndClearReset(userId, passwordHash) {
  await pool.execute(
    `UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_expires = NULL WHERE id = ?`,
    [passwordHash, userId]
  );
}

module.exports = {
  findUserByUsername,
  findUserByEmail,
  saveResetToken,
  findUserByResetToken,
  updatePasswordAndClearReset
};
