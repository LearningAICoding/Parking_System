module.exports = function authorizeRoles(...allowed) {
  return function (req, res, next) {
    const role = req.session && req.session.user && req.session.user.role;
    if (allowed.includes(role)) {
      return next();
    }
    // API vs HTML response
    if (req.path && req.path.startsWith('/api')) {
      return res.status(403).json({ success: false, message: 'Forbidden', data: {}, errors: [] });
    }
    return res.status(403).render('errors/403', { message: 'Forbidden' });
  };
};
