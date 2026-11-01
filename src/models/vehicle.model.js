const pool = require('../config/db');

async function findByPlate(conn, licensePlate) {
  const [rows] = await conn.execute(`SELECT id FROM vehicles WHERE license_plate = ? LIMIT 1`, [licensePlate]);
  return rows[0] || null;
}

async function findActiveCustomer(conn, customerId) {
  const [rows] = await conn.execute(
    `SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [customerId]
  );
  return rows[0] || null;
}

async function insertVehicle(conn, vehicle) {
  const [result] = await conn.execute(
    `INSERT INTO vehicles (customer_id, license_plate, vehicle_name, brand, vehicle_type)
     VALUES (?, ?, ?, ?, ?)`,
    [vehicle.customerId, vehicle.licensePlate, vehicle.vehicleName, vehicle.brand || null, vehicle.vehicleType]
  );
  return result.insertId;
}

async function search(keyword) {
  const escaped = keyword.replace(/[\\%_]/g, '\\$&');
  const like = `%${escaped}%`;
  const plate = keyword.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const plateLike = `%${plate}%`;
  const [rows] = await pool.execute(
    `SELECT v.id, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName, v.brand,
            c.full_name AS customerName, c.phone, c.id AS customerId
     FROM vehicles v LEFT JOIN customers c ON c.id=v.customer_id AND c.deleted_at IS NULL
     WHERE c.full_name LIKE ? OR c.phone LIKE ? OR v.license_plate LIKE ?
     ORDER BY v.id DESC LIMIT 20`,
    [like, like, plateLike]
  );
  return rows;
}

module.exports = { pool, findByPlate, findActiveCustomer, insertVehicle, search };
