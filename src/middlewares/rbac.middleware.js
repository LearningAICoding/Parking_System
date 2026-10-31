const AppError = require('../utils/app-error');

const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.session?.user?.role)) {
    return next(new AppError('Bạn không có quyền thực hiện thao tác này', 403));
  }
  return next();
};

module.exports = { authorizeRoles };
