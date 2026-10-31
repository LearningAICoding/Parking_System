const AppError = require('../utils/app-error');

function requireAuth(req, res, next) {
  if (req.session?.user?.id) return next();
  if (req.path.startsWith('/api/') || req.accepts('html') !== 'html') {
    return next(new AppError('Bạn chưa đăng nhập', 401));
  }
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
}

module.exports = { requireAuth };
