const db = require('../config/db');

const periodFormats = Object.freeze({ day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' });

async function querySeries(mode, startDateTime, endDateTime) {
  const format = periodFormats[mode];
  const [entries] = await db.execute(
    `SELECT DATE_FORMAT(check_in_time, ?) AS period, COUNT(*) AS entries
     FROM parking_sessions WHERE check_in_time >= ? AND check_in_time < ?
     GROUP BY period`,
    [format, startDateTime, endDateTime]
  );
  const [exits] = await db.execute(
    `SELECT DATE_FORMAT(check_out_time, ?) AS period, COUNT(*) AS exits
     FROM parking_sessions WHERE check_out_time >= ? AND check_out_time < ?
     GROUP BY period`,
    [format, startDateTime, endDateTime]
  );
  const [ticketRevenue] = await db.execute(
    `SELECT DATE_FORMAT(created_at, ?) AS period, SUM(price) AS ticketRevenue
     FROM tickets
     WHERE created_at >= ? AND created_at < ? AND status <> 'CANCELLED' AND deleted_at IS NULL
     GROUP BY period`,
    [format, startDateTime, endDateTime]
  );
  const [casualParkingRevenue] = await db.execute(
    `SELECT DATE_FORMAT(check_out_time, ?) AS period, SUM(fee) AS casualParkingRevenue
     FROM parking_sessions
     WHERE check_out_time >= ? AND check_out_time < ? AND fee > 0
     GROUP BY period`,
    [format, startDateTime, endDateTime]
  );
  const [slots] = await db.execute(
    `SELECT SUM(status='AVAILABLE') AS availableSlots, SUM(status='OCCUPIED') AS occupiedSlots
     FROM parking_slots`
  );
  return { entries, exits, ticketRevenue, casualParkingRevenue, slots: slots[0] || {} };
}

module.exports = { db, querySeries };
