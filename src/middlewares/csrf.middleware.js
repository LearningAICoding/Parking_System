const crypto = require('crypto');
const AppError = require('../utils/app-error');

function csrfToken(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  res.locals.currentUser = req.session.user || null;
  next();
}

function requireCsrf(req, _res, next) {
  const token = req.get('X-CSRF-Token') || req.body?._csrf;
  if (!token || token !== req.session?.csrfToken) {
    return next(new AppError('Phiên làm việc không hợp lệ, vui lòng tải lại trang', 403));
  }
  return next();
}

module.exports = { csrfToken, requireCsrf };
