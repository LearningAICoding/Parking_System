const mysql = require('mysql2/promise');
const env = require('./env');
const pool = mysql.createPool({ ...env.db, waitForConnections: true, connectionLimit: env.db.connectionLimit, queueLimit: 0, timezone: '+07:00', charset: 'utf8mb4' });
pool.on?.('connection', (connection) => connection.query("SET time_zone = '+07:00'"));
module.exports = pool;
