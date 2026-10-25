const model = require('../models/vehicle.model');
const customerModel = require('../models/customer.model');
const normalizePlate = require('../utils/normalize-plate');
const AppError = require('../utils/app-error');

async function create(input, user) {
  const licensePlate = normalizePlate(input.licensePlate);
  const vehicleName = typeof input.vehicleName === 'string' ? input.vehicleName.trim() : '';
  const brand = typeof input.brand === 'string' ? input.brand.trim() : '';
  const vehicleType = input.vehicleType;
  if (!vehicleName || vehicleName.length > 100 || brand.length > 50) throw new AppError('Tên xe bắt buộc (tối đa 100 ký tự), hãng xe tối đa 50 ký tự.', 400);
  if (!['MOTORBIKE', 'CAR'].includes(vehicleType)) throw new AppError('Loại xe không hợp lệ.', 400);
  let customerId = null;
  if (user.role === 'CUSTOMER') {
    if (!Number.isInteger(Number(user.customerId)) || Number(user.customerId) < 1) throw new AppError('Không tìm thấy hồ sơ khách hàng.', 404);
    customerId = Number(user.customerId);
  } else if (input.customerId !== undefined && input.customerId !== null && input.customerId !== '') {
    customerId = Number(input.customerId);
    if (!Number.isInteger(customerId) || customerId < 1 || !await customerModel.findById(customerId)) {
      throw new AppError('Khách hàng không hợp lệ.', 400);
    }
  }
  try {
    const id = await model.create({ licensePlate, vehicleName, brand, vehicleType, customerId });
    return { id, licensePlate, vehicleName, brand: brand || null, vehicleType, customerId };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Biển số đã được đăng ký.', 409);
    throw error;
  }
}

async function searchVehicles(keyword) {
  const term = typeof keyword === 'string' ? keyword.trim() : '';
  if (!term || term.length > 50) throw new AppError('Từ khóa bắt buộc và tối đa 50 ký tự.', 400);
  return model.search(term);
}

async function findByPlate(plate) {
  return model.findByPlate(normalizePlate(plate));
}

module.exports = { create, searchVehicles, findByPlate };
