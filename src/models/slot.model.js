const pool = require('../config/db');

const SELECT_SLOT = `SELECT id, slot_code AS slotCode, zone, status, note, current_vehicle_id AS currentVehicleId,
  created_at AS createdAt, updated_at AS updatedAt FROM parking_slots`;

async function list({ zone, status }) {
  const filters = [];
  const params = [];
  if (zone) { filters.push('zone = ?'); params.push(zone); }
  if (status) { filters.push('status = ?'); params.push(status); }
  const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.execute(`${SELECT_SLOT}${where} ORDER BY zone, slot_code`, params);
  return rows;
}

async function listZones() {
  const [rows] = await pool.execute('SELECT DISTINCT zone FROM parking_slots ORDER BY zone');
  return rows.map((row) => row.zone);
}

async function findById(id, conn = pool, lock = false) {
  const [rows] = await conn.execute(`${SELECT_SLOT} WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [id]);
  return rows[0] || null;
}

async function create({ slotCode, zone, status, note }) {
  const [result] = await pool.execute(
    'INSERT INTO parking_slots (slot_code, zone, status, note) VALUES (?, ?, ?, ?)',
    [slotCode, zone, status, note || null]
  );
  return findById(result.insertId);
}

async function update(id, { zone, status, note }, conn = pool) {
  await conn.execute('UPDATE parking_slots SET zone = ?, status = ?, note = ? WHERE id = ?', [zone, status, note || null, id]);
  return findById(id, conn);
}

async function hasHistoryOrTickets(id, conn) {
  const [rows] = await conn.execute(
    `SELECT EXISTS(SELECT 1 FROM tickets WHERE slot_id = ?) AS hasTickets,
      EXISTS(SELECT 1 FROM parking_sessions WHERE slot_id = ?) AS hasSessions`, [id, id]
  );
  return Boolean(rows[0].hasTickets || rows[0].hasSessions);
}

async function remove(id, conn) {
  await conn.execute('DELETE FROM parking_slots WHERE id = ?', [id]);
}

async function findDetail(id) {
  const [rows] = await pool.execute(
    `SELECT s.id, s.slot_code AS slotCode, s.zone, s.status, s.note,
      v.id AS vehicleId, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName, v.brand, v.vehicle_type AS vehicleType,
      c.full_name AS customerName, c.email AS customerEmail, c.phone AS customerPhone
     FROM parking_slots s
     LEFT JOIN vehicles v ON v.id = s.current_vehicle_id
     LEFT JOIN customers c ON c.id = v.customer_id AND c.deleted_at IS NULL
     WHERE s.id = ?`, [id]
  );
  return rows[0] || null;
}

module.exports = { list, listZones, findById, create, update, hasHistoryOrTickets, remove, findDetail };
