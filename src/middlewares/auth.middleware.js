const AppError = require('../utils/app-error');
function requireAuth(req, res, next) { if (req.session?.user) return next(); if (req.path.startsWith('/api/')) return next(new AppError('Vui lòng đăng nhập.', 401)); const nextUrl = encodeURIComponent(req.originalUrl || '/'); return res.redirect(`/login?next=${nextUrl}`); }
module.exports = { requireAuth };
