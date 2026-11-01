const model = require('../models/vehicle.model');
const AppError = require('../utils/app-error');

async function searchVehicles(keyword) {
  const value = typeof keyword === 'string' ? keyword.trim() : '';
  if (!value || value.length > 50) throw new AppError('Từ khóa bắt buộc và tối đa 50 ký tự', 400);
  return model.search(value);
}

module.exports = { searchVehicles };
