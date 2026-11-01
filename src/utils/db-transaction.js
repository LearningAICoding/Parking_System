const pool = require('../config/db');
const AppError = require('./app-error');

const CONNECTION_ERRORS = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH',
  'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'
]);
const LOCK_ERRORS = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);
const RETRY_DELAYS_MS = [25, 50, 100];

const CONNECTION_MESSAGE = 'Không kết nối được cơ sở dữ liệu, vui lòng thử lại sau';
const CONFLICT_MESSAGE = 'Dữ liệu đang được người khác thao tác, vui lòng tải lại và thử lại';

// Chuyển lỗi hạ tầng MySQL (kết nối, khóa) thành AppError tiếng Việt, không lộ chi tiết SQL.
function mapDbError(error) {
  if (error instanceof AppError) return error;
  if (CONNECTION_ERRORS.has(error.code)) return new AppError(CONNECTION_MESSAGE, 503);
  if (LOCK_ERRORS.has(error.code)) return new AppError(CONFLICT_MESSAGE, 409);
  return error;
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// Transaction READ COMMITTED, retry deadlock/lock-wait tối đa 3 lần (AGENTS.md mục 11.2).
// Lỗi được ném nguyên dạng để service tự ánh xạ lỗi nghiệp vụ trước khi gọi mapDbError.
async function withTransaction(work) {
  for (let attempt = 0; ; attempt += 1) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await conn.beginTransaction();
      const result = await work(conn);
      await conn.commit();
      return result;
    } catch (error) {
      if (conn) await conn.rollback().catch(() => {});
      if (LOCK_ERRORS.has(error.code) && attempt < RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = { withTransaction, mapDbError };
