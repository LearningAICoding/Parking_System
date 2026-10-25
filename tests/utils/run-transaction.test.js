const runTransaction = require('../../src/utils/run-transaction');

function createConnection() {
  return {
    query: jest.fn().mockResolvedValue([[], []]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
}

describe('run transaction', () => {
  test('retries a deadlock on a new connection and commits the successful attempt', async () => {
    const first = createConnection();
    const second = createConnection();
    const db = { getConnection: jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second) };
    const work = jest.fn()
      .mockRejectedValueOnce({ code: 'ER_LOCK_DEADLOCK' })
      .mockResolvedValueOnce('result');

    await expect(runTransaction(db, work, { conflictMessage: 'conflict' })).resolves.toBe('result');

    expect(db.getConnection).toHaveBeenCalledTimes(2);
    expect(first.rollback).toHaveBeenCalledTimes(1);
    expect(first.release).toHaveBeenCalledTimes(1);
    expect(second.commit).toHaveBeenCalledTimes(1);
  });

  test('maps non-retryable configured database conflicts to 409', async () => {
    const connection = createConnection();
    const db = { getConnection: jest.fn().mockResolvedValue(connection) };
    const work = jest.fn().mockRejectedValue({ code: 'ER_DUP_ENTRY' });

    await expect(runTransaction(db, work, {
      conflictMessage: 'Conflict',
      conflictCodes: ['ER_DUP_ENTRY']
    })).rejects.toMatchObject({ statusCode: 409, message: 'Conflict' });

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
