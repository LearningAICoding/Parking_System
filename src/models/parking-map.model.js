const pool = require('../config/db');

async function findVehicleAtSlot(slotId) {
  const [rows] = await pool.execute(
    `SELECT v.id AS vehicleId, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName,
            v.brand, v.vehicle_type AS vehicleType, c.full_name AS customerName, c.phone,
            s.slot_code AS slotCode, ps.id AS sessionId, ps.check_in_time AS checkInTime
     FROM parking_slots s
     LEFT JOIN vehicles v ON v.id = s.current_vehicle_id
     LEFT JOIN customers c ON c.id = v.customer_id AND c.deleted_at IS NULL
     LEFT JOIN parking_sessions ps ON ps.vehicle_id = v.id AND ps.slot_id = s.id AND ps.check_out_time IS NULL
     WHERE s.id = ? LIMIT 1`,
    [slotId]
  );
  return rows[0] || null;
}

async function findVehicleSlot(conn, vehicleId) {
  const [rows] = await conn.execute(
    `SELECT id, slot_code, status, current_vehicle_id FROM parking_slots WHERE current_vehicle_id = ? LIMIT 1 FOR UPDATE`,
    [vehicleId]
  );
  return rows[0] || null;
}

async function insertDailyTicket(conn, ticket) {
  const [result] = await conn.execute(
    `INSERT INTO tickets (ticket_code, vehicle_id, slot_id, ticket_type, price, start_date, end_date, status)
     VALUES (?, ?, ?, 'DAILY', ?, ?, ?, 'ACTIVE')`,
    [ticket.ticketCode, ticket.vehicleId, ticket.slotId, ticket.price, ticket.startDate, ticket.endDate]
  );
  return result.insertId;
}

module.exports = { pool, findVehicleAtSlot, findVehicleSlot, insertDailyTicket };
