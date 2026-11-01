const pool = require('../config/db');

async function listPublishedNews(limit = 5) {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 5, 1), 20);
  const [rows] = await pool.execute(
    `SELECT id, title, summary, content, thumbnail, published_at
     FROM news
     WHERE published_at <= CURRENT_TIMESTAMP
     ORDER BY published_at DESC, id DESC
     LIMIT ?`,
    [safeLimit]
  );
  return rows;
}

async function getDashboardSummary() {
  const [rows] = await pool.execute(`
    SELECT
      (SELECT COUNT(*) FROM vehicles) AS vehicleCount,
      (SELECT COUNT(*) FROM parking_slots WHERE status = 'OCCUPIED') AS occupiedSlots,
      (SELECT COUNT(*) FROM parking_slots WHERE status = 'AVAILABLE') AS availableSlots,
      (SELECT COUNT(*) FROM parking_sessions WHERE check_in_time >= CURRENT_DATE()) AS entriesToday,
      (SELECT COUNT(*) FROM parking_sessions WHERE check_out_time >= CURRENT_DATE()) AS exitsToday
  `);
  return rows[0] || {
    vehicleCount: 0,
    occupiedSlots: 0,
    availableSlots: 0,
    entriesToday: 0,
    exitsToday: 0
  };
}

module.exports = { listPublishedNews, getDashboardSummary };
