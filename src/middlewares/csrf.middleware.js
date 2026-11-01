const crypto = require('node:crypto');
const AppError = require('../utils/app-error');

function ensureCsrfToken(req, _res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  req.csrfToken = () => req.session.csrfToken;
  next();
}

function verifyCsrf(req, _res, next) {
  const expected = req.session.csrfToken;
  const provided = req.get('X-CSRF-Token') || req.body?._csrf;
  if (!expected || !provided || provided.length !== expected.length
    || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    return next(new AppError('CSRF token không hợp lệ', 403));
  }
  return next();
}

module.exports = { ensureCsrfToken, verifyCsrf };
