const { validationResult } = require('express-validator');

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
