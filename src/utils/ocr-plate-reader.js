const path = require('node:path');
const AppError = require('./app-error');

async function readPlate(file) {
  if (file?.mockLicensePlate) return file.mockLicensePlate;
  const baseName = path.basename(file?.originalname || '', path.extname(file?.originalname || ''));
  if (/^[0-9A-Za-z .-]{6,14}$/.test(baseName) && /[0-9]/.test(baseName)) return baseName;
  throw new AppError('Không đọc được biển số', 400, [{
    field: 'plateImage',
    message: 'Không đọc được biển số từ ảnh',
    code: 'OCR_UNREADABLE'
  }]);
}

module.exports = { readPlate };
