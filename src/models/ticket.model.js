const pool = require('../config/db');

async function expireActiveTickets() {
  await pool.execute(
    `UPDATE tickets SET status = 'EXPIRED'
     WHERE status = 'ACTIVE' AND deleted_at IS NULL AND end_date < CURRENT_DATE()`
  );
}

async function countTickets() {
  const [rows] = await pool.execute(`SELECT COUNT(*) AS total FROM tickets WHERE deleted_at IS NULL`);
  return Number(rows[0]?.total || 0);
}

async function listTickets(offset, limit) {
  const [rows] = await pool.execute(
    `SELECT t.id, t.ticket_code AS ticketCode, t.vehicle_id AS vehicleId,
            t.slot_id AS slotId, t.ticket_type AS ticketType, t.price,
            t.start_date AS startDate, t.end_date AS endDate, t.status,
            t.created_at AS createdAt, v.license_plate AS licensePlate,
            v.vehicle_name AS vehicleName, c.full_name AS customerName,
            s.slot_code AS slotCode,
            EXISTS (SELECT 1 FROM parking_sessions ps WHERE ps.ticket_id = t.id) AS isUsed
     FROM tickets t
     JOIN vehicles v ON v.id = t.vehicle_id
     LEFT JOIN customers c ON c.id = v.customer_id AND c.deleted_at IS NULL
     JOIN parking_slots s ON s.id = t.slot_id
     WHERE t.deleted_at IS NULL
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

async function findTicketForUpdate(conn, ticketId) {
  const [rows] = await conn.execute(
    `SELECT t.id, t.ticket_code, t.vehicle_id, t.slot_id, t.status, t.deleted_at, v.vehicle_type
     FROM tickets t JOIN vehicles v ON v.id = t.vehicle_id
     WHERE t.id = ? FOR UPDATE`,
    [ticketId]
  );
  return rows[0] || null;
}

async function findTicketSlotReference(conn, ticketId) {
  const [rows] = await conn.execute(
    `SELECT id, slot_id FROM tickets WHERE id = ? LIMIT 1`,
    [ticketId]
  );
  return rows[0] || null;
}

async function findTicketForEdit(ticketId) {
  const [rows] = await pool.execute(
    `SELECT t.id, t.ticket_code AS ticketCode, t.vehicle_id AS vehicleId, t.slot_id AS slotId,
            t.ticket_type AS ticketType, t.price, t.start_date AS startDate, t.end_date AS endDate,
            t.status, t.deleted_at AS deletedAt, v.license_plate AS licensePlate,
            v.vehicle_name AS vehicleName, v.vehicle_type AS vehicleType, s.slot_code AS slotCode,
            s.status AS slotStatus
     FROM tickets t
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN parking_slots s ON s.id = t.slot_id
     WHERE t.id = ? LIMIT 1`,
    [ticketId]
  );
  return rows[0] || null;
}

async function lockTicketSlot(conn, slotId) {
  const [rows] = await conn.execute(
    `SELECT id, status, current_vehicle_id FROM parking_slots WHERE id = ? FOR UPDATE`,
    [slotId]
  );
  return rows[0] || null;
}

async function hasTicketSessions(conn, ticketId) {
  const [rows] = await conn.execute(`SELECT 1 FROM parking_sessions WHERE ticket_id = ? LIMIT 1`, [ticketId]);
  return Boolean(rows[0]);
}

async function updateTicketDates(conn, ticketId, startDate, endDate, price) {
  await conn.execute(
    `UPDATE tickets SET start_date = ?, end_date = ?, price = ? WHERE id = ?`,
    [startDate, endDate, price, ticketId]
  );
}

async function softDeleteTicket(conn, ticketId) {
  await conn.execute(`UPDATE tickets SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [ticketId]);
}

module.exports = {
  pool,
  expireActiveTickets,
  countTickets,
  listTickets,
  findTicketForUpdate,
  findTicketSlotReference,
  findTicketForEdit,
  lockTicketSlot,
  hasTicketSessions,
  updateTicketDates,
  softDeleteTicket
};
