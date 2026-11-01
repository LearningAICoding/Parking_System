const pool = require('../config/db');

async function listByCustomerId(customerId) {
  const [rows] = await pool.execute(
    `SELECT v.id, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName,
            v.brand, v.vehicle_type AS vehicleType,
            CASE
              WHEN s.status = 'RESERVED' THEN 'RESERVED'
              WHEN s.status = 'OCCUPIED' THEN 'PARKED'
              WHEN last_exit.lastExitTime IS NOT NULL THEN 'EXITED'
              ELSE 'REGISTERED'
            END AS derivedStatus,
            0 AS isVisitor, s.slot_code AS slotCode,
            open_session.checkInTime, last_exit.lastExitTime
     FROM vehicles v
     LEFT JOIN parking_slots s ON s.current_vehicle_id = v.id
     LEFT JOIN (
       SELECT vehicle_id, MAX(check_in_time) AS checkInTime
       FROM parking_sessions WHERE check_out_time IS NULL GROUP BY vehicle_id
     ) open_session ON open_session.vehicle_id = v.id
     LEFT JOIN (
       SELECT vehicle_id, MAX(check_out_time) AS lastExitTime
       FROM parking_sessions WHERE check_out_time IS NOT NULL GROUP BY vehicle_id
     ) last_exit ON last_exit.vehicle_id = v.id
     WHERE v.customer_id = ? ORDER BY v.created_at DESC, v.id DESC`,
    [customerId]
  );
  return rows.map((row) => ({ ...row, isVisitor: false }));
}

module.exports = { pool, listByCustomerId };
