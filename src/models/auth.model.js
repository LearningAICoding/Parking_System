const db = require('../config/database');
async function findByLogin(login) { const [rows] = await db.execute(`SELECT u.id, u.username, u.email, u.password_hash, u.role, u.is_active, e.full_name AS employeeName, c.id AS customerId, c.full_name AS customerName FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL LEFT JOIN customers c ON c.user_id = u.id AND c.deleted_at IS NULL WHERE u.username = ? OR u.email = ? LIMIT 1`, [login, login]); return rows[0] || null; }
async function findByEmail(email) { const [rows] = await db.execute('SELECT id, username, email, role, is_active FROM users WHERE email = ? LIMIT 1', [email]); return rows[0] || null; }
async function saveResetToken(id, hash, expires) { await db.execute('UPDATE users SET reset_token_hash = ?, reset_expires = ? WHERE id = ?', [hash, expires, id]); }
async function consumeResetToken(tokenHash, passwordHash) {
  const [result] = await db.execute(
    'UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_expires = NULL, updated_at = NOW() WHERE reset_token_hash = ? AND reset_expires > NOW() AND is_active = 1',
    [passwordHash, tokenHash]
  );
  return result.affectedRows === 1;
}
module.exports = { findByLogin, findByEmail, saveResetToken, consumeResetToken };
