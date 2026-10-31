const { validationResult } = require('express-validator');
const AppError = require('../utils/app-error');

function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((error) => ({ field: error.path, message: error.msg, code: 'INVALID' }));
  return next(new AppError('Dữ liệu không hợp lệ', 400, errors));
}

module.exports = { validate };
