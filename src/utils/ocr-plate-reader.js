const AppError = require('./app-error');

async function readPlate() {
  const plate = process.env.OCR_MOCK_PLATE || '30A12345';
  if (!plate) throw new AppError('Không đọc được biển số.', 400);
  return plate;
}

module.exports = { readPlate };
