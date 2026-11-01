const db = require('../config/db');

async function list({ q = '' } = {}) {
  const escaped = q.replace(/[\\%_]/g, '\\$&');
  const like = `%${escaped}%`;
  const [rows] = await db.execute(
    `SELECT e.id, e.user_id AS userId, e.full_name AS fullName, e.phone, e.address, e.position, e.created_at AS createdAt, u.username, u.email, u.role, u.is_active AS isActive
     FROM employees e
     JOIN users u ON u.id = e.user_id
     WHERE e.deleted_at IS NULL AND u.is_active = 1
       AND (? = '' OR e.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR COALESCE(e.phone,'') LIKE ?)
     ORDER BY e.id DESC`,
    [q, like, like, like, like]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.execute(
    `SELECT e.id, e.user_id AS userId, e.full_name AS fullName, e.phone, e.address, e.position, u.username, u.email, u.role
     FROM employees e
     JOIN users u ON u.id = e.user_id
     WHERE e.id = ? AND e.deleted_at IS NULL AND u.is_active = 1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function insertUser(connection, data) {
  return connection.execute(
    'INSERT INTO users (username,email,password_hash,role,is_active) VALUES (?,?,?,?,1)',
    [data.username, data.email, data.passwordHash, data.role]
  );
}

async function insertEmployee(connection, userId, data) {
  return connection.execute(
    'INSERT INTO employees (user_id,full_name,phone,address,position) VALUES (?,?,?,?,?)',
    [userId, data.fullName, data.phone || null, data.address || null, data.position || null]
  );
}

async function lockActiveManagers(connection) {
  const [rows] = await connection.execute(
    "SELECT id FROM users WHERE role = 'MANAGER' AND is_active = 1 ORDER BY id FOR UPDATE"
  );
  return rows;
}

async function findForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT e.user_id AS userId, u.role
     FROM employees e
     JOIN users u ON u.id = e.user_id
     WHERE e.id = ? AND e.deleted_at IS NULL AND u.is_active = 1
     FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function updateEmployee(connection, id, data) {
  return connection.execute(
    'UPDATE employees SET full_name=?, phone=?, address=?, position=? WHERE id=?',
    [data.fullName, data.phone || null, data.address || null, data.position || null, id]
  );
}

async function updateUserEmail(connection, userId, email) {
  return connection.execute('UPDATE users SET email=? WHERE id=?', [email, userId]);
}

async function softDeleteEmployee(connection, id) {
  return connection.execute('UPDATE employees SET deleted_at=NOW() WHERE id=?', [id]);
}

async function deactivateUser(connection, userId) {
  return connection.execute('UPDATE users SET is_active=0 WHERE id=?', [userId]);
}

module.exports = {
  list,
  findById,
  insertUser,
  insertEmployee,
  lockActiveManagers,
  findForUpdate,
  updateEmployee,
  updateUserEmail,
  softDeleteEmployee,
  deactivateUser
};

