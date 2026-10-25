const db = require('../config/database');

async function list() {
  const [rows] = await db.execute(
    `SELECT t.id, t.ticket_code AS ticketCode, t.vehicle_id AS vehicleId,
            v.license_plate AS licensePlate, v.vehicle_name AS vehicleName,
            v.vehicle_type AS vehicleType, t.slot_id AS slotId, s.slot_code AS slotCode,
            t.ticket_type AS ticketType, CAST(t.price AS CHAR) AS price,
            DATE_FORMAT(t.start_date,'%Y-%m-%d') AS startDate,
            DATE_FORMAT(t.end_date,'%Y-%m-%d') AS endDate, t.status,
            t.created_at AS createdAt
     FROM tickets t JOIN vehicles v ON v.id=t.vehicle_id JOIN parking_slots s ON s.id=t.slot_id
     WHERE t.deleted_at IS NULL ORDER BY t.id DESC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.execute(
    `SELECT t.id, t.ticket_code AS ticketCode, t.vehicle_id AS vehicleId,
            v.license_plate AS licensePlate, v.vehicle_type AS vehicleType,
            t.slot_id AS slotId, s.slot_code AS slotCode, t.ticket_type AS ticketType,
            CAST(t.price AS CHAR) AS price,
            DATE_FORMAT(t.start_date,'%Y-%m-%d') AS startDate,
            DATE_FORMAT(t.end_date,'%Y-%m-%d') AS endDate, t.status
     FROM tickets t JOIN vehicles v ON v.id=t.vehicle_id JOIN parking_slots s ON s.id=t.slot_id
     WHERE t.id=? AND t.deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function lockTicket(connection, id) {
  const [rows] = await connection.execute(
    `SELECT id, ticket_code AS ticketCode, vehicle_id AS vehicleId, slot_id AS slotId,
            ticket_type AS ticketType, status,
            DATE_FORMAT(start_date,'%Y-%m-%d') AS startDate,
            DATE_FORMAT(end_date,'%Y-%m-%d') AS endDate, deleted_at AS deletedAt
     FROM tickets WHERE id=? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function updateDateAndPrice(connection, id, startDate, endDate, price) {
  return connection.execute(
    'UPDATE tickets SET start_date=?, end_date=?, price=? WHERE id=? AND deleted_at IS NULL',
    [startDate, endDate, price.toFixed(2), id]
  );
}

async function lockReferencedSessions(connection, ticketId) {
  const [rows] = await connection.execute(
    'SELECT id FROM parking_sessions WHERE ticket_id=? ORDER BY id FOR UPDATE',
    [ticketId]
  );
  return rows;
}

async function expireTicket(connection, ticketId) {
  return connection.execute(
    "UPDATE tickets SET status='EXPIRED' WHERE id=? AND status='ACTIVE' AND end_date < CURRENT_DATE()",
    [ticketId]
  );
}

async function referencedSessions(connection, ticketId) {
  const [rows] = await connection.execute(
    'SELECT id FROM parking_sessions WHERE ticket_id=? LIMIT 1',
    [ticketId]
  );
  return rows.length > 0;
}

async function softDelete(connection, ticketId) {
  return connection.execute('UPDATE tickets SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL', [ticketId]);
}

async function lockVehicle(connection, vehicleId) {
  const [rows] = await connection.execute(
    'SELECT id, vehicle_type AS vehicleType FROM vehicles WHERE id=? FOR UPDATE',
    [vehicleId]
  );
  return rows[0] || null;
}

async function lockSlot(connection, slotId) {
  const [rows] = await connection.execute(
    'SELECT id, status, current_vehicle_id AS currentVehicleId FROM parking_slots WHERE id=? FOR UPDATE',
    [slotId]
  );
  return rows[0] || null;
}

async function ticketReferences(id) {
  const [rows] = await db.execute('SELECT slot_id AS slotId, vehicle_id AS vehicleId FROM tickets WHERE id=? AND deleted_at IS NULL LIMIT 1', [id]);
  return rows[0] || null;
}

async function expireOldTickets() {
  await db.execute("UPDATE tickets SET status='EXPIRED' WHERE status='ACTIVE' AND end_date < CURRENT_DATE()");
}

module.exports = {
  db,
  list,
  findById,
  lockTicket,
  updateDateAndPrice,
  lockReferencedSessions,
  expireTicket,
  referencedSessions,
  softDelete,
  lockVehicle,
  lockSlot,
  ticketReferences,
  expireOldTickets
};
