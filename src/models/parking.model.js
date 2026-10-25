const db = require('../config/database');

async function findVehicleByPlate(plate) {
  const [rows] = await db.execute(
    `SELECT v.id, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName, v.brand,
            v.vehicle_type AS vehicleType, v.customer_id AS customerId,
            c.full_name AS customerName, c.phone
     FROM vehicles v LEFT JOIN customers c ON c.id=v.customer_id AND c.deleted_at IS NULL
     WHERE v.license_plate=? LIMIT 1`,
    [plate]
  );
  return rows[0] || null;
}

async function vehicleSlot(vehicleId) {
  const [rows] = await db.execute(
    'SELECT slot_code AS slotCode FROM parking_slots WHERE current_vehicle_id=? LIMIT 1',
    [vehicleId]
  );
  return rows[0]?.slotCode || null;
}

async function insertScanToken(connection, token) {
  return connection.execute(
    `INSERT INTO parking_scan_tokens
     (token_hash,session_id_hash,user_id,vehicle_id,normalized_plate,plate_image_url,expires_at)
     VALUES (?,?,?,?,?,?,?)`,
    [token.tokenHash, token.sessionIdHash, token.userId, token.vehicleId, token.plate, token.imageUrl, token.expiresAt]
  );
}

async function lockSlot(connection, slotId) {
  const [rows] = await connection.execute(
    'SELECT id, slot_code AS slotCode, status, current_vehicle_id AS currentVehicleId FROM parking_slots WHERE id=? FOR UPDATE',
    [slotId]
  );
  return rows[0] || null;
}

async function lockVehicle(connection, vehicleId) {
  const [rows] = await connection.execute(
    'SELECT id, license_plate AS licensePlate, vehicle_name AS vehicleName, brand, vehicle_type AS vehicleType, customer_id AS customerId FROM vehicles WHERE id=? FOR UPDATE',
    [vehicleId]
  );
  return rows[0] || null;
}

async function vehicleHasCurrentSlot(connection, vehicleId) {
  const [rows] = await connection.execute(
    'SELECT id, status FROM parking_slots WHERE current_vehicle_id=? LIMIT 1',
    [vehicleId]
  );
  return rows[0] || null;
}

async function vehicleHasOpenSession(connection, vehicleId) {
  const [rows] = await connection.execute(
    'SELECT id FROM parking_sessions WHERE vehicle_id=? AND check_out_time IS NULL LIMIT 1',
    [vehicleId]
  );
  return rows.length > 0;
}

async function lockCustomer(connection, customerId) {
  if (!customerId) return null;
  const [rows] = await connection.execute(
    'SELECT id FROM customers WHERE id=? AND deleted_at IS NULL FOR UPDATE',
    [customerId]
  );
  return rows[0] || null;
}

async function expireTicketsForVehicle(connection, vehicleId) {
  await connection.execute(
    "UPDATE tickets SET status='EXPIRED' WHERE vehicle_id=? AND status='ACTIVE' AND end_date < CURRENT_DATE()",
    [vehicleId]
  );
}

async function findTicket(connection, ticketId) {
  const [rows] = await connection.execute(
    `SELECT id, vehicle_id AS vehicleId, slot_id AS slotId, price, status,
            DATE_FORMAT(start_date,'%Y-%m-%d') AS startDate,
            DATE_FORMAT(end_date,'%Y-%m-%d') AS endDate
     FROM tickets WHERE id=? AND deleted_at IS NULL FOR UPDATE`,
    [ticketId]
  );
  return rows[0] || null;
}

async function findActiveTicketForVehicleSlot(connection, vehicleId, slotId) {
  const [rows] = await connection.execute(
    `SELECT id, vehicle_id AS vehicleId, slot_id AS slotId, price, status,
            DATE_FORMAT(start_date,'%Y-%m-%d') AS startDate,
            DATE_FORMAT(end_date,'%Y-%m-%d') AS endDate
     FROM tickets WHERE vehicle_id=? AND slot_id=? AND status='ACTIVE' AND deleted_at IS NULL
       AND start_date <= CURRENT_DATE() AND end_date >= CURRENT_DATE()
     ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [vehicleId, slotId]
  );
  return rows[0] || null;
}

async function findScanToken(connection, tokenHash) {
  const [rows] = await connection.execute(
    `SELECT id, session_id_hash AS sessionIdHash, user_id AS userId, vehicle_id AS vehicleId,
            normalized_plate AS plate, plate_image_url AS imageUrl, expires_at AS expiresAt, used_at AS usedAt
     FROM parking_scan_tokens WHERE token_hash=? FOR UPDATE`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markScanTokenUsed(connection, tokenId) {
  return connection.execute('UPDATE parking_scan_tokens SET used_at=NOW() WHERE id=? AND used_at IS NULL', [tokenId]);
}

async function insertSession(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO parking_sessions
     (vehicle_id,ticket_id,scanned_plate,plate_image_url,slot_id,check_in_time)
     VALUES (?,?,?,?,?,?)`,
    [data.vehicleId, data.ticketId, data.plate, data.imageUrl, data.slotId, data.checkInTime]
  );
  return result.insertId;
}

async function setSlotOccupied(connection, slotId, vehicleId) {
  return connection.execute(
    "UPDATE parking_slots SET status='OCCUPIED', current_vehicle_id=? WHERE id=?",
    [vehicleId, slotId]
  );
}

async function lockSession(connection, sessionId) {
  const [rows] = await connection.execute(
    `SELECT id, vehicle_id AS vehicleId, ticket_id AS ticketId, scanned_plate AS plate,
            slot_id AS slotId, check_in_time AS checkInTime, check_out_time AS checkOutTime
     FROM parking_sessions WHERE id=? FOR UPDATE`,
    [sessionId]
  );
  return rows[0] || null;
}

async function setSessionClosed(connection, sessionId, checkOutTime, fee) {
  return connection.execute(
    'UPDATE parking_sessions SET check_out_time=?, fee=? WHERE id=? AND check_out_time IS NULL AND fee IS NULL',
    [checkOutTime, fee.toFixed(2), sessionId]
  );
}

async function setSlotAvailable(connection, slotId) {
  return connection.execute(
    "UPDATE parking_slots SET status='AVAILABLE', current_vehicle_id=NULL WHERE id=?",
    [slotId]
  );
}

async function currentVehicleInfo(slotId) {
  const [rows] = await db.execute(
    `SELECT v.id AS vehicleId, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName,
            v.brand, v.vehicle_type AS vehicleType, c.full_name AS customerName, c.phone,
            ps.slot_code AS slotCode, open_session.id AS sessionId,
            open_session.check_in_time AS checkInTime
     FROM parking_slots ps JOIN vehicles v ON v.id=ps.current_vehicle_id
     LEFT JOIN customers c ON c.id=v.customer_id AND c.deleted_at IS NULL
     LEFT JOIN parking_sessions open_session ON open_session.vehicle_id=v.id AND open_session.check_out_time IS NULL
     WHERE ps.id=? LIMIT 1`,
    [slotId]
  );
  return rows[0] || null;
}

async function getSlots(filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.zone) {
    conditions.push('zone=?');
    values.push(filters.zone);
  }
  if (filters.status) {
    conditions.push('status=?');
    values.push(filters.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await db.execute(
    `SELECT id, slot_code AS slotCode, zone, status FROM parking_slots ${where} ORDER BY zone, slot_code`,
    values
  );
  return rows;
}

async function listOpenSessions() {
  const [rows] = await db.execute(
    `SELECT ps.id AS sessionId, ps.vehicle_id AS vehicleId, ps.slot_id AS slotId,
            ps.ticket_id AS ticketId, ps.check_in_time AS checkInTime,
            v.license_plate AS licensePlate, v.vehicle_name AS vehicleName,
            ps.slot_id AS slotCodeId, s.slot_code AS slotCode
     FROM parking_sessions ps
     JOIN vehicles v ON v.id=ps.vehicle_id
     JOIN parking_slots s ON s.id=ps.slot_id
     WHERE ps.check_out_time IS NULL ORDER BY ps.check_in_time DESC`
  );
  return rows;
}

async function getSlotById(slotId) {
  const [rows] = await db.execute(
    'SELECT id, slot_code AS slotCode, zone, status, note FROM parking_slots WHERE id=? LIMIT 1',
    [slotId]
  );
  return rows[0] || null;
}

async function insertDailyTicket(connection, ticket) {
  const [result] = await connection.execute(
    `INSERT INTO tickets (ticket_code,vehicle_id,slot_id,ticket_type,price,start_date,end_date,status)
     VALUES (?, ?, ?, 'DAILY', ?, ?, ?, 'ACTIVE')`,
    [ticket.code, ticket.vehicleId, ticket.slotId, ticket.price.toFixed(2), ticket.date, ticket.date]
  );
  return result.insertId;
}

async function reserveSlot(connection, slotId, vehicleId) {
  return connection.execute(
    "UPDATE parking_slots SET status='RESERVED', current_vehicle_id=? WHERE id=?",
    [vehicleId, slotId]
  );
}

module.exports = {
  db,
  findVehicleByPlate,
  vehicleSlot,
  insertScanToken,
  lockSlot,
  lockVehicle,
  vehicleHasCurrentSlot,
  vehicleHasOpenSession,
  lockCustomer,
  expireTicketsForVehicle,
  findTicket,
  findActiveTicketForVehicleSlot,
  findScanToken,
  markScanTokenUsed,
  insertSession,
  setSlotOccupied,
  lockSession,
  setSessionClosed,
  setSlotAvailable,
  currentVehicleInfo,
  getSlots,
  listOpenSessions,
  getSlotById,
  insertDailyTicket,
  reserveSlot
};
