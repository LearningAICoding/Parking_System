const db = require('../config/database');

async function list() {
  const [rows] = await db.execute(
    'SELECT id, slot_code AS slotCode, zone, status, note FROM parking_slots ORDER BY zone, slot_code'
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id, slot_code AS slotCode, zone, status, current_vehicle_id AS currentVehicleId, note FROM parking_slots WHERE id=? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const [result] = await db.execute(
    'INSERT INTO parking_slots (slot_code,zone,status,note) VALUES (?,?,?,?)',
    [data.slotCode, data.zone, data.status, data.note || null]
  );
  return result.insertId;
}

async function lockSlot(connection, id) {
  const [rows] = await connection.execute(
    'SELECT id, slot_code AS slotCode, zone, status, current_vehicle_id AS currentVehicleId FROM parking_slots WHERE id=? FOR UPDATE',
    [id]
  );
  return rows[0] || null;
}

async function update(connection, id, data) {
  return connection.execute(
    'UPDATE parking_slots SET zone=?, status=?, note=? WHERE id=?',
    [data.zone, data.status, data.note || null, id]
  );
}

async function ticketReferences(connection, slotId) {
  const [rows] = await connection.execute('SELECT id FROM tickets WHERE slot_id=? ORDER BY id FOR UPDATE', [slotId]);
  return rows;
}

async function sessionReferences(connection, slotId) {
  const [rows] = await connection.execute('SELECT id FROM parking_sessions WHERE slot_id=? ORDER BY id FOR UPDATE', [slotId]);
  return rows;
}

async function deleteSlot(connection, id) {
  return connection.execute('DELETE FROM parking_slots WHERE id=?', [id]);
}

module.exports = { db, list, findById, create, lockSlot, update, ticketReferences, sessionReferences, deleteSlot };
