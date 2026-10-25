const AppError = require('./app-error');

function normalizePlate(value) {
  const normalized = typeof value === 'string'
    ? value.toUpperCase().replace(/[^0-9A-Z]/g, '')
    : '';
  if (!/^[0-9A-Z]{6,10}$/.test(normalized)) {
    throw new AppError('Biển số phải có từ 6 đến 10 ký tự chữ hoặc số.', 400);
  }
  return normalized;
}

module.exports = normalizePlate;
