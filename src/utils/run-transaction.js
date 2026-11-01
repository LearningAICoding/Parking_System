const AppError = require('./app-error');

const deadlockCodes = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);
const backoffMilliseconds = [25, 50, 100];

async function runTransaction(db, work, { conflictMessage, conflictCodes = [] }) {
  for (let attempt = 0; attempt <= backoffMilliseconds.length; attempt += 1) {
    const connection = await db.getConnection();
    let transactionStarted = false;
    let retryDelay = 0;
    try {
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await connection.beginTransaction();
      transactionStarted = true;
      const result = await work(connection);
      await connection.commit();
      transactionStarted = false;
      return result;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      if (deadlockCodes.has(error.code)) {
        if (attempt === backoffMilliseconds.length) throw new AppError(conflictMessage, 409);
        retryDelay = backoffMilliseconds[attempt];
      } else if (conflictCodes.includes(error.code)) {
        throw new AppError(conflictMessage, 409);
      } else {
        throw error;
      }
    } finally {
      connection.release();
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }
  throw new AppError(conflictMessage, 409);
}

module.exports = runTransaction;
