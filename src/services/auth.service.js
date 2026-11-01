const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const authModel = require('../models/auth.model');
const mailer = require('../config/mailer');
const AppError = require('../utils/app-error');

const RESET_TTL_MS = 30 * 60 * 1000;
const SALT_ROUNDS = 12;

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    customerId: user.customer_id || null,
    fullName: user.full_name || user.username
  };
}

async function authenticate(username, password) {
  const user = await authModel.findUserByUsername(username);
  const valid = user && user.is_active && await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('Sai tên đăng nhập hoặc mật khẩu', 401);
  return publicUser(user);
}

async function requestPasswordReset(email) {
  const user = await authModel.findUserByEmail(email);
  if (!user || !user.is_active) return;

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await authModel.saveResetToken(user.id, tokenHash, expiresAt);
  await mailer.sendPasswordResetEmail({ to: user.email, token });
}

async function resetPassword(token, password) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await authModel.findUserByResetToken(tokenHash);
  if (!user) throw new AppError('Liên kết không hợp lệ hoặc đã hết hạn', 400);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await authModel.updatePasswordAndClearReset(user.id, passwordHash);
}

module.exports = {
  authenticate,
  requestPasswordReset,
  resetPassword,
  RESET_TTL_MS,
  publicUser
};
