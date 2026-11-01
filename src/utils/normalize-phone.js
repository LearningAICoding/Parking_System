const AppError = require('./app-error');

function normalizePhone(value) {
  const text = String(value || '').trim();
  if (!/^(0|\+84)[0-9]{9}$/.test(text)) {
    throw new AppError('Số điện thoại không hợp lệ', 400, [{ field: 'phone', message: 'Số điện thoại không hợp lệ', code: 'INVALID_PHONE' }]);
  }
  return text.startsWith('+84') ? `0${text.slice(3)}` : text;
}

module.exports = normalizePhone;
