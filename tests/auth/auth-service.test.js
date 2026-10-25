jest.mock('../../src/models/auth.model', () => ({
  findByLogin: jest.fn(),
  findByEmail: jest.fn(),
  saveResetToken: jest.fn(),
  consumeResetToken: jest.fn()
}));
jest.mock('bcrypt');
jest.mock('../../src/config/env', () => ({
  nodeEnv: 'test',
  smtp: { host: 'smtp.example.test', port: 1025, user: null, password: null, from: 'no-reply@example.test' }
}));
jest.mock('nodemailer', () => ({
  createTransport: jest.fn()
}));

const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const authModel = require('../../src/models/auth.model');
const nodemailer = require('nodemailer');
const env = require('../../src/config/env');
const AppError = require('../../src/utils/app-error');
const service = require('../../src/services/auth.service');

describe('auth service password reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    env.smtp.host = 'smtp.example.test';
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({})
    });
  });

  test('fails with a generic configuration error when SMTP is unavailable', async () => {
    env.smtp.host = null;

    await expect(service.requestPasswordReset('user@example.test', 'https://parking.example'))
      .rejects.toMatchObject({ statusCode: 503 });
    expect(authModel.findByEmail).not.toHaveBeenCalled();
  });

  test('authenticates an active account using username or email', async () => {
    authModel.findByLogin.mockResolvedValue({
      id: 3,
      username: 'manager.one',
      email: 'manager@example.test',
      password_hash: 'stored-hash',
      role: 'MANAGER',
      is_active: 1
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(service.login(' manager.one ', 'StrongPassword123')).resolves.toEqual({
      id: 3,
      username: 'manager.one',
      email: 'manager@example.test',
      role: 'MANAGER',
      fullName: 'manager.one'
    });
    expect(authModel.findByLogin).toHaveBeenCalledWith('manager.one');
    expect(bcrypt.compare).toHaveBeenCalledWith('StrongPassword123', 'stored-hash');
  });

  test('rejects inactive accounts and incorrect passwords without revealing which failed', async () => {
    authModel.findByLogin.mockResolvedValue({
      id: 3,
      password_hash: 'stored-hash',
      is_active: 0
    });

    await expect(service.login('manager.one', 'wrong')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sai tên đăng nhập hoặc mật khẩu'
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  test('normalizes email and persists only a hash of a short-lived reset token', async () => {
    authModel.findByEmail.mockResolvedValue({
      id: 9,
      email: 'employee@example.test',
      is_active: 1
    });
    const before = Date.now();

    await service.requestPasswordReset(' Employee@Example.Test ', 'https://parking.example/');

    expect(authModel.findByEmail).toHaveBeenCalledWith('employee@example.test');
    const [userId, tokenHash, expiresAt] = authModel.saveResetToken.mock.calls[0];
    expect(userId).toBe(9);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 30 * 60 * 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 30 * 60 * 1000);
    const sentText = nodemailer.createTransport.mock.results[0].value.sendMail.mock.calls[0][0].text;
    const token = sentText.match(/reset-password\/([a-f0-9]{64})/)[1];
    expect(sentText).toContain('https://parking.example/reset-password/');
    expect(crypto.createHash('sha256').update(token).digest('hex')).toBe(tokenHash);
  });

  test('atomically consumes the reset token while changing password', async () => {
    authModel.consumeResetToken.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('bcrypt-hash');
    const token = 'one-time-reset-token';
    const expectedTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await service.resetPassword(token, 'StrongPassword123');

    expect(bcrypt.hash).toHaveBeenCalledWith('StrongPassword123', 12);
    expect(authModel.consumeResetToken).toHaveBeenCalledWith(expectedTokenHash, 'bcrypt-hash');
  });

  test('rejects expired or already-consumed reset tokens', async () => {
    authModel.consumeResetToken.mockResolvedValue(false);
    bcrypt.hash.mockResolvedValue('bcrypt-hash');

    await expect(service.resetPassword('used-token', 'StrongPassword123'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects weak passwords without consuming a reset token', async () => {
    await expect(service.resetPassword('token', 'weak'))
      .rejects.toBeInstanceOf(AppError);
    expect(authModel.consumeResetToken).not.toHaveBeenCalled();
  });
});
