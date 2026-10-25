const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const authModel = require('../models/auth.model');
const AppError = require('../utils/app-error');
const env = require('../config/env');
const { createTransport } = require('nodemailer');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function login(loginName, password) {
  const user = await authModel.findByLogin(String(loginName || '').trim());
  const valid = user
    && user.is_active
    && await bcrypt.compare(String(password || ''), user.password_hash);
  if (!valid) throw new AppError('Sai tên đăng nhập hoặc mật khẩu', 401);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.employeeName || user.customerName || user.username,
    ...(user.role === 'CUSTOMER' ? { customerId: user.customerId } : {})
  };
}

async function requestPasswordReset(email, baseUrl) {
  if (!env.smtp.host) throw new AppError('Chức năng quên mật khẩu chưa được cấu hình email.', 503);

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await authModel.findByEmail(normalizedEmail);
  if (!user || !user.is_active) return;

  const token = crypto.randomBytes(32).toString('hex');
  await authModel.saveResetToken(
    user.id,
    hashToken(token),
    new Date(Date.now() + 30 * 60 * 1000)
  );

  const base = String(baseUrl).replace(/\/+$/, '');
  const link = `${base}/reset-password/${token}`;
  const transport = createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: false,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined
  });
  await transport.sendMail({
    from: env.smtp.from,
    to: user.email,
    subject: 'Đặt lại mật khẩu Parking System',
    text: `Mở liên kết sau trong 30 phút để đặt lại mật khẩu: ${link}`
  });
}

async function resetPassword(token, password) {
  if (typeof password !== 'string'
      || password.length < 12
      || !/[A-Z]/.test(password)
      || !/[a-z]/.test(password)
      || !/[0-9]/.test(password)) {
    throw new AppError('Mật khẩu cần ít nhất 12 ký tự, gồm chữ hoa, chữ thường và chữ số.', 400);
  }

  const tokenHash = hashToken(String(token || ''));
  const passwordHash = await bcrypt.hash(password, 12);
  const consumed = await authModel.consumeResetToken(tokenHash, passwordHash);
  if (!consumed) throw new AppError('Liên kết không hợp lệ hoặc đã hết hạn', 400);
}

module.exports = { login, requestPasswordReset, resetPassword };
