const AppError = require('../utils/app-error');

function getCurrentUser(req) {
  if (!req.session || !req.session.user) return null;
  return req.session.user;
}

function expectsJson(req) {
  return req.path.startsWith('/api') || (req.get('Accept') || '').includes('application/json');
}

function requireAuth(req, res, next) {
  if (getCurrentUser(req)) return next();
  if (expectsJson(req)) {
    return next(new AppError('Bạn cần đăng nhập để tiếp tục', 401));
  }
  const returnTo = encodeURIComponent(req.originalUrl || '/');
  return res.redirect(`/login?returnTo=${returnTo}`);
}

function authorizeRoles(...roles) {
  return function authorizeRoleMiddleware(req, res, next) {
    const user = getCurrentUser(req);
    if (!user) return next(new AppError('Bạn cần đăng nhập để tiếp tục', 401));
    if (!roles.includes(user.role)) {
      return next(new AppError('Bạn không có quyền thực hiện thao tác này', 403));
    }
    return next();
  };
}

module.exports = { requireAuth, authorizeRoles, getCurrentUser };
