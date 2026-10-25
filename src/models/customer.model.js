const db = require('../config/database');

async function list({ q = '' } = {}) {
  const escaped = q.replace(/[\\%_]/g, '\\$&');
  const like = `%${escaped}%`;
  const [rows] = await db.execute(
    `SELECT c.id, c.full_name AS fullName, c.phone, c.email, c.address, c.created_at AS createdAt,
            u.username, u.is_active AS isActive
     FROM customers c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.deleted_at IS NULL
       AND (? = '' OR c.full_name LIKE ? OR c.phone LIKE ? OR COALESCE(c.email,'') LIKE ? OR COALESCE(u.username,'') LIKE ?)
     ORDER BY c.id DESC`,
    [q, like, like, like, like]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.execute(
    `SELECT c.id, c.user_id AS userId, c.full_name AS fullName, c.phone, c.email, c.address,
            u.username, u.is_active AS isActive
     FROM customers c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.id = ? AND c.deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT c.id, c.user_id AS userId, c.full_name AS fullName, c.phone, c.email, c.address,
            u.username, u.is_active AS isActive
     FROM customers c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.user_id = ? AND c.deleted_at IS NULL LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function insertUser(connection, data) {
  return connection.execute(
    'INSERT INTO users (username,email,password_hash,role,is_active) VALUES (?,?,?,\'CUSTOMER\',1)',
    [data.username, data.email, data.passwordHash]
  );
}

async function insertCustomer(connection, userId, data) {
  return connection.execute(
    'INSERT INTO customers (user_id,full_name,phone,email,address) VALUES (?,?,?,?,?)',
    [userId, data.fullName, data.phone, data.email, data.address || null]
  );
}

async function updateCustomer(connection, id, data) {
  return connection.execute(
    'UPDATE customers SET full_name=?, phone=?, email=?, address=? WHERE id=?',
    [data.fullName, data.phone, data.email, data.address || null, id]
  );
}

async function updateUserEmail(connection, userId, email) {
  return connection.execute('UPDATE users SET email=? WHERE id=?', [email, userId]);
}

async function lockSlotsForCustomer(connection, id) {
  const [rows] = await connection.execute(
    `SELECT ps.id FROM parking_slots ps JOIN vehicles v ON v.id = ps.current_vehicle_id
     WHERE v.customer_id = ? AND ps.status IN ('RESERVED','OCCUPIED') ORDER BY ps.id FOR UPDATE`,
    [id]
  );
  return rows;
}

async function lockVehiclesForCustomer(connection, id) {
  const [rows] = await connection.execute('SELECT id FROM vehicles WHERE customer_id=? ORDER BY id FOR UPDATE', [id]);
  return rows;
}

async function lockCustomer(connection, id) {
  const [rows] = await connection.execute(
    `SELECT c.id, c.user_id AS userId FROM customers c
     WHERE c.id=? AND c.deleted_at IS NULL FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function lockCustomerTickets(connection, id) {
  const [rows] = await connection.execute(
    `SELECT t.id FROM tickets t JOIN vehicles v ON v.id=t.vehicle_id
     WHERE v.customer_id=? AND t.status='ACTIVE' AND t.deleted_at IS NULL ORDER BY t.id FOR UPDATE`,
    [id]
  );
  return rows;
}

async function hasOpenSession(connection, id) {
  const [rows] = await connection.execute(
    'SELECT ps.id FROM parking_sessions ps JOIN vehicles v ON v.id=ps.vehicle_id WHERE v.customer_id=? AND ps.check_out_time IS NULL LIMIT 1',
    [id]
  );
  return rows.length > 0;
}

async function softDelete(connection, id) {
  return connection.execute('UPDATE customers SET deleted_at=NOW() WHERE id=?', [id]);
}

async function deactivateUser(connection, userId) {
  return connection.execute('UPDATE users SET is_active=0 WHERE id=?', [userId]);
}

async function listVehicles(customerId) {
  const [rows] = await db.execute(
    `SELECT v.id, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName, v.brand,
            v.vehicle_type AS vehicleType,
            CASE
              WHEN ps.status='RESERVED' THEN 'RESERVED'
              WHEN ps.status='OCCUPIED' THEN 'PARKED'
              WHEN last_session.check_out_time IS NOT NULL THEN 'EXITED'
              ELSE 'REGISTERED'
            END AS derivedStatus,
            FALSE AS isVisitor, ps.slot_code AS slotCode,
            open_session.check_in_time AS checkInTime,
            last_session.check_out_time AS lastExitTime
     FROM vehicles v
     LEFT JOIN parking_slots ps ON ps.current_vehicle_id=v.id
     LEFT JOIN parking_sessions open_session ON open_session.vehicle_id=v.id AND open_session.check_out_time IS NULL
     LEFT JOIN (
       SELECT p1.vehicle_id, p1.check_out_time
       FROM parking_sessions p1
       JOIN (SELECT vehicle_id, MAX(id) AS latestId FROM parking_sessions GROUP BY vehicle_id) latest
         ON latest.latestId=p1.id
     ) last_session ON last_session.vehicle_id=v.id
     WHERE v.customer_id=? ORDER BY v.id DESC`,
    [customerId]
  );
  return rows;
}

module.exports = {
  list,
  findById,
  findByUserId,
  insertUser,
  insertCustomer,
  updateCustomer,
  updateUserEmail,
  lockSlotsForCustomer,
  lockVehiclesForCustomer,
  lockCustomer,
  lockCustomerTickets,
  hasOpenSession,
  softDelete,
  deactivateUser,
  listVehicles
};
