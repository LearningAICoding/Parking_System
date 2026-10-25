jest.mock('../../src/config/database', () => ({
  execute: jest.fn()
}));

const db = require('../../src/config/database');
const model = require('../../src/models/auth.model');

describe('auth model reset-token consumption', () => {
  test('updates the password and consumes an unexpired token in one statement', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }, []]);

    await expect(model.consumeResetToken('token-hash', 'password-hash')).resolves.toBe(true);

    const [sql, values] = db.execute.mock.calls[0];
    expect(sql).toContain('UPDATE users SET password_hash');
    expect(sql).toContain('reset_token_hash = NULL');
    expect(sql).toContain('reset_expires > NOW()');
    expect(sql).toContain('is_active = 1');
    expect(values).toEqual(['password-hash', 'token-hash']);
  });

  test('returns false when the token is expired or was already consumed', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }, []]);

    await expect(model.consumeResetToken('old-token-hash', 'password-hash')).resolves.toBe(false);
  });
});
