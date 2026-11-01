const pool = require('../config/db');

async function findVehicleForScan(conn, plate) {
  const [rows] = await conn.execute(
    `SELECT v.id, v.license_plate, v.vehicle_name, v.brand, v.vehicle_type,
            c.full_name AS customer_name, c.phone,
            ps.id AS open_session_id, s.id AS slot_id, s.slot_code, s.status
     FROM vehicles v
     LEFT JOIN customers c ON c.id = v.customer_id AND c.deleted_at IS NULL
     LEFT JOIN parking_slots s ON s.current_vehicle_id = v.id
     LEFT JOIN parking_sessions ps ON ps.vehicle_id = v.id AND ps.check_out_time IS NULL
     WHERE v.license_plate = ?
     LIMIT 1`,
    [plate]
  );
  return rows[0] || null;
}

async function listSlots(filters = {}) {
  const where = [];
  const params = [];
  if (filters.zone) { where.push('zone = ?'); params.push(filters.zone); }
  if (filters.status) { where.push('status = ?'); params.push(filters.status); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT id, slot_code AS slotCode, zone, status
     FROM parking_slots ${clause} ORDER BY zone, slot_code`,
    params
  );
  return rows;
}

async function lockSlot(conn, slotId) {
  const [rows] = await conn.execute(
    `SELECT id, slot_code, zone, status, current_vehicle_id FROM parking_slots WHERE id = ? FOR UPDATE`,
    [slotId]
  );
  return rows[0] || null;
}

async function lockVehicle(conn, vehicleId) {
  const [rows] = await conn.execute(
    `SELECT id, license_plate, vehicle_name, brand, vehicle_type, customer_id
     FROM vehicles WHERE id = ? FOR UPDATE`,
    [vehicleId]
  );
  return rows[0] || null;
}

async function findOpenSessionForVehicle(conn, vehicleId) {
  const [rows] = await conn.execute(
    `SELECT id, vehicle_id, slot_id, ticket_id, scanned_plate, plate_image_url, check_in_time
     FROM parking_sessions WHERE vehicle_id = ? AND check_out_time IS NULL LIMIT 1 FOR UPDATE`,
    [vehicleId]
  );
  return rows[0] || null;
}

async function findCurrentSlotForVehicle(conn, vehicleId) {
  const [rows] = await conn.execute(
    'SELECT id FROM parking_slots WHERE current_vehicle_id = ? LIMIT 1',
    [vehicleId]
  );
  return rows[0]?.id || null;
}

async function lockTicket(conn, ticketId) {
  const [rows] = await conn.execute(
    `SELECT id, ticket_code, vehicle_id, slot_id, ticket_type, price, start_date, end_date, status, deleted_at
     FROM tickets WHERE id = ? FOR UPDATE`,
    [ticketId]
  );
  return rows[0] || null;
}

async function findActiveTicketForVehicleSlot(conn, vehicleId, slotId) {
  const [rows] = await conn.execute(
    `SELECT id, ticket_code, vehicle_id, slot_id, ticket_type, price, start_date, end_date, status, deleted_at
     FROM tickets
     WHERE vehicle_id = ? AND slot_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
     ORDER BY end_date DESC, id DESC LIMIT 1 FOR UPDATE`,
    [vehicleId, slotId]
  );
  return rows[0] || null;
}

async function updateTicketStatus(conn, ticketId, status) {
  await conn.execute(`UPDATE tickets SET status = ? WHERE id = ?`, [status, ticketId]);
}

async function lockScanToken(conn, tokenHash) {
  const [rows] = await conn.execute(
    `SELECT id, token_hash, session_id_hash, user_id, vehicle_id, normalized_plate, plate_image_url,
            expires_at, used_at
     FROM parking_scan_tokens WHERE token_hash = ? FOR UPDATE`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function insertScanToken(conn, token) {
  await conn.execute(
    `INSERT INTO parking_scan_tokens
      (token_hash, session_id_hash, user_id, vehicle_id, normalized_plate, plate_image_url, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [token.tokenHash, token.sessionIdHash, token.userId, token.vehicleId, token.normalizedPlate, token.plateImageUrl, token.expiresAt]
  );
}

async function markScanTokenUsed(conn, tokenId) {
  await conn.execute(`UPDATE parking_scan_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?`, [tokenId]);
}

async function insertOpenSession(conn, session) {
  const [result] = await conn.execute(
    `INSERT INTO parking_sessions
      (vehicle_id, ticket_id, scanned_plate, plate_image_url, slot_id, check_in_time)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [session.vehicleId, session.ticketId, session.scannedPlate, session.plateImageUrl, session.slotId, session.checkInTime]
  );
  return result.insertId;
}

async function updateSlotState(conn, slotId, status, vehicleId) {
  await conn.execute(
    `UPDATE parking_slots SET status = ?, current_vehicle_id = ? WHERE id = ?`,
    [status, vehicleId, slotId]
  );
}

async function findSessionSlotId(conn, sessionId) {
  const [rows] = await conn.execute(
    'SELECT slot_id FROM parking_sessions WHERE id = ?',
    [sessionId]
  );
  return rows[0]?.slot_id || null;
}

async function lockSession(conn, sessionId) {
  const [rows] = await conn.execute(
    `SELECT ps.id, ps.vehicle_id, ps.ticket_id, ps.scanned_plate, ps.plate_image_url, ps.slot_id,
            ps.check_in_time, ps.check_out_time, ps.fee,
            v.vehicle_type, s.slot_code, s.status AS slot_status, s.current_vehicle_id
     FROM parking_sessions ps
     JOIN vehicles v ON v.id = ps.vehicle_id
     JOIN parking_slots s ON s.id = ps.slot_id
     WHERE ps.id = ? FOR UPDATE`,
    [sessionId]
  );
  return rows[0] || null;
}

async function closeSession(conn, sessionId, checkOutTime, fee) {
  await conn.execute(
    `UPDATE parking_sessions SET check_out_time = ?, fee = ? WHERE id = ?`,
    [checkOutTime, fee, sessionId]
  );
}

module.exports = {
  findVehicleForScan,
  listSlots,
  lockSlot,
  lockVehicle,
  findOpenSessionForVehicle,
  findCurrentSlotForVehicle,
  lockTicket,
  findActiveTicketForVehicleSlot,
  updateTicketStatus,
  lockScanToken,
  insertScanToken,
  markScanTokenUsed,
  insertOpenSession,
  updateSlotState,
  findSessionSlotId,
  lockSession,
  closeSession,
  pool
};
