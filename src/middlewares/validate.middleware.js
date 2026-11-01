const { validationResult } = require('express-validator');
const AppError = require('../utils/app-error');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Transform to the envelope error format
    const formatted = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      code: err.msg // simple code, could be refined
    }));
    return next(new AppError('Validation failed', 400, formatted));
  }
  next();
};

function collectValidationErrors(req) {
  return validationResult(req).array().map((error) => ({
    field: error.path || error.param || '',
    message: error.msg,
    code: 'VALIDATION_ERROR'
  }));
}

function validateRequest(req, res, next) {
  const errors = collectValidationErrors(req);
  if (!errors.length) return next();
  if (req.path.startsWith('/api') || (req.get('Accept') || '').includes('application/json')) {
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', data: null, errors });
  }
  req.validationErrors = errors;
  return next();
}

module.exports = { validateRequest, collectValidationErrors };
