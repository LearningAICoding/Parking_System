const db = require('../config/database');

async function create({ licensePlate, vehicleName, brand, vehicleType, customerId }) {
  const [result] = await db.execute(
    'INSERT INTO vehicles (license_plate,vehicle_name,brand,vehicle_type,customer_id) VALUES (?,?,?,?,?)',
    [licensePlate, vehicleName, brand || null, vehicleType, customerId || null]
  );
  return result.insertId;
}

async function findByPlate(licensePlate) {
  const [rows] = await db.execute(
    `SELECT v.id, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName, v.brand,
            v.vehicle_type AS vehicleType, v.customer_id AS customerId
     FROM vehicles v WHERE v.license_plate=? LIMIT 1`,
    [licensePlate]
  );
  return rows[0] || null;
}

async function search(keyword) {
  const escaped = keyword.replace(/[\\%_]/g, '\\$&');
  const like = `%${escaped}%`;
  const normalizedPlate = keyword.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const plateLike = `%${normalizedPlate.replace(/[\\%_]/g, '\\$&')}%`;
  const [rows] = await db.execute(
    `SELECT v.id, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName, v.brand,
            c.full_name AS customerName, c.phone, c.id AS customerId
     FROM vehicles v LEFT JOIN customers c ON c.id=v.customer_id AND c.deleted_at IS NULL
     WHERE (c.full_name LIKE ? OR c.phone LIKE ? OR v.license_plate LIKE ?)
     ORDER BY v.id DESC LIMIT 20`,
    [like, like, plateLike]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await db.execute(
    'SELECT id, license_plate AS licensePlate, vehicle_name AS vehicleName, brand, vehicle_type AS vehicleType, customer_id AS customerId FROM vehicles WHERE id=? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function lockVehicle(connection, id) {
  const [rows] = await connection.execute(
    'SELECT id, license_plate AS licensePlate, vehicle_name AS vehicleName, brand, vehicle_type AS vehicleType, customer_id AS customerId FROM vehicles WHERE id=? FOR UPDATE',
    [id]
  );
  return rows[0] || null;
}

module.exports = { create, findByPlate, search, findById, lockVehicle };
