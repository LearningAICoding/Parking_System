require('dotenv').config();
const required = ['SESSION_SECRET'];
if (process.env.NODE_ENV === 'production') required.push('DB_HOST','DB_NAME','DB_USER','DB_PASSWORD');
for (const key of required) if (!process.env[key]) throw new Error(`Thiếu biến môi trường bắt buộc: ${key}`);
module.exports = { nodeEnv: process.env.NODE_ENV || 'development', port: Number(process.env.PORT || 3000), appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000', sessionSecret: process.env.SESSION_SECRET, db: { host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), database: process.env.DB_NAME || 'parking_db', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10) }, smtp: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 1025), user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD, from: process.env.MAIL_FROM || 'no-reply@example.test' } };
