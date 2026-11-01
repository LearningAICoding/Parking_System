const bcrypt = require('bcrypt');

jest.mock('../../src/models/auth.model');
jest.mock('../../src/config/mailer');

const authModel = require('../../src/models/auth.model');
const mailer = require('../../src/config/mailer');
const authService = require('../../src/services/auth.service');

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('authenticates an active user and returns a safe session user', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    authModel.findUserByUsername.mockResolvedValue({
      id: 3,
      username: 'customer.one',
      email: 'customer.one@example.test',
      password_hash: passwordHash,
      role: 'CUSTOMER',
      is_active: 1,
      customer_id: 7,
      full_name: 'Khách hàng'
    });

    await expect(authService.authenticate('customer.one', 'Password123!')).resolves.toEqual({
      id: 3,
      username: 'customer.one',
      email: 'customer.one@example.test',
      role: 'CUSTOMER',
      customerId: 7,
      fullName: 'Khách hàng'
    });
  });

  test('uses one generic error for inactive or invalid credentials', async () => {
    authModel.findUserByUsername.mockResolvedValue(null);
    await expect(authService.authenticate('missing', 'wrong')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sai tên đăng nhập hoặc mật khẩu'
    });
  });

  test('does not reveal whether an email exists when requesting reset', async () => {
    authModel.findUserByEmail.mockResolvedValue(null);
    await expect(authService.requestPasswordReset('missing@example.test')).resolves.toBeUndefined();
    expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test('hashes a valid reset token and clears it after changing password', async () => {
    const token = 'a'.repeat(64);
    authModel.findUserByResetToken.mockResolvedValue({ id: 3, email: 'customer.one@example.test' });

    await expect(authService.resetPassword(token, 'NewPassword123!')).resolves.toBeUndefined();
    expect(authModel.updatePasswordAndClearReset).toHaveBeenCalledWith(
      3,
      expect.stringMatching(/^\$2[aby]\$/)
    );
  });

  test('rejects expired or unknown reset token', async () => {
    authModel.findUserByResetToken.mockResolvedValue(null);
    await expect(authService.resetPassword('b'.repeat(64), 'NewPassword123!')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Liên kết không hợp lệ hoặc đã hết hạn'
    });
  });
});
