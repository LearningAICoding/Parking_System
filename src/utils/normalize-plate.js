const AppError = require('./app-error');

function normalizePlate(value) {
  const normalized = String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!/^[0-9A-Z]{6,10}$/.test(normalized)) {
    throw new AppError('Biển số xe không hợp lệ', 400, [{
      field: 'licensePlate',
      message: 'Biển số phải gồm 6 đến 10 ký tự chữ và số',
      code: 'INVALID_LICENSE_PLATE'
    }]);
  }
  return normalized;
}

module.exports = normalizePlate;
