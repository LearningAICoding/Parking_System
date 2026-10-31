const pool = require('../config/db');

async function listMapSlots({ zone, status }) {
  const filters = [];
  const params = [];
  if (zone) { filters.push('zone = ?'); params.push(zone); }
  if (status) { filters.push('status = ?'); params.push(status); }
  const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT id, slot_code AS slotCode, zone, status FROM parking_slots${where} ORDER BY zone, slot_code`, params
  );
  return rows;
}

async function findParkedVehicle(slotId) {
  const [rows] = await pool.execute(
    `SELECT v.id AS vehicleId, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName, v.brand,
      v.vehicle_type AS vehicleType, c.full_name AS customerName, c.phone, s.slot_code AS slotCode,
      ps.id AS sessionId, ps.check_in_time AS checkInTime
     FROM parking_slots s
     JOIN parking_sessions ps ON ps.slot_id = s.id AND ps.check_out_time IS NULL
     JOIN vehicles v ON v.id = ps.vehicle_id
     LEFT JOIN customers c ON c.id = v.customer_id AND c.deleted_at IS NULL
     WHERE s.id = ?
     ORDER BY ps.check_in_time DESC LIMIT 1`, [slotId]
  );
  return rows[0] || null;
}

async function lockVehicle(conn, vehicleId) {
  const [rows] = await conn.execute(
    `SELECT v.id, v.customer_id AS customerId, v.vehicle_type AS vehicleType,
      c.deleted_at AS customerDeletedAt
     FROM vehicles v LEFT JOIN customers c ON c.id = v.customer_id
     WHERE v.id = ? FOR UPDATE`, [vehicleId]
  );
  return rows[0] || null;
}

async function findSlotHeldByVehicle(conn, vehicleId) {
  const [rows] = await conn.execute('SELECT id, slot_code AS slotCode FROM parking_slots WHERE current_vehicle_id = ?', [vehicleId]);
  return rows[0] || null;
}

async function hasOpenSession(conn, vehicleId) {
  const [rows] = await conn.execute(
    'SELECT EXISTS(SELECT 1 FROM parking_sessions WHERE vehicle_id = ? AND check_out_time IS NULL) AS hasOpen', [vehicleId]
  );
  return Boolean(rows[0].hasOpen);
}

async function reserveSlot(conn, slotId, vehicleId) {
  const [result] = await conn.execute(
    "UPDATE parking_slots SET status = 'RESERVED', current_vehicle_id = ? WHERE id = ? AND status = 'AVAILABLE'",
    [vehicleId, slotId]
  );
  return result.affectedRows;
}

async function insertTicket(conn, { tempCode, vehicleId, slotId, ticketType, price, startDate, endDate, status }) {
  const [result] = await conn.execute(
    `INSERT INTO tickets (ticket_code, vehicle_id, slot_id, ticket_type, price, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tempCode, vehicleId, slotId, ticketType, price, startDate, endDate, status]
  );
  return result.insertId;
}

async function setTicketCode(conn, ticketId, ticketCode) {
  await conn.execute('UPDATE tickets SET ticket_code = ? WHERE id = ?', [ticketCode, ticketId]);
}

async function findTicket(conn, ticketId) {
  const [rows] = await conn.execute(
    `SELECT id, ticket_code AS ticketCode, price,
      DATE_FORMAT(start_date, '%Y-%m-%d') AS startDate, DATE_FORMAT(end_date, '%Y-%m-%d') AS endDate
     FROM tickets WHERE id = ?`, [ticketId]
  );
  return rows[0] || null;
}

module.exports = {
  listMapSlots, findParkedVehicle, lockVehicle, findSlotHeldByVehicle, hasOpenSession,
  reserveSlot, insertTicket, setTicketCode, findTicket
};
