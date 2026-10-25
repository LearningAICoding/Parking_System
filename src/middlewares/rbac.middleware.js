const AppError = require('../utils/app-error');
function authorizeRoles(...roles) { return (req, res, next) => { if (!req.session?.user) return next(new AppError('Vui lòng đăng nhập.', 401)); if (!roles.includes(req.session.user.role)) return next(new AppError('Bạn không có quyền thực hiện thao tác này.', 403)); return next(); }; }
module.exports = { authorizeRoles };
