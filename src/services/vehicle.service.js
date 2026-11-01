const AppError = require('../utils/app-error');
const normalizePlate = require('../utils/normalize-plate');
const vehicleModel = require('../models/vehicle.model');

const ALLOWED_TYPES = new Set(['MOTORBIKE', 'CAR']);

async function createVehicle({ payload, actor }) {
  const licensePlate = normalizePlate(payload.licensePlate);
  if (!payload.vehicleName || payload.vehicleName.length > 100) throw new AppError('Tên xe không hợp lệ', 400);
  if (payload.brand && payload.brand.length > 50) throw new AppError('Hãng xe không hợp lệ', 400);
  if (!ALLOWED_TYPES.has(payload.vehicleType)) throw new AppError('Loại xe không hợp lệ', 400);
  const customerId = actor.role === 'CUSTOMER' ? actor.customerId : (payload.customerId || null);
  const conn = await vehicleModel.pool.getConnection();
  try {
    await conn.beginTransaction();
    if (await vehicleModel.findByPlate(conn, licensePlate)) throw new AppError('Biển số xe đã tồn tại', 409);
    if (customerId && !await vehicleModel.findActiveCustomer(conn, customerId)) throw new AppError('Khách hàng không tồn tại', 404);
    const id = await vehicleModel.insertVehicle(conn, { ...payload, licensePlate, customerId });
    await conn.commit();
    return { id, licensePlate, vehicleName: payload.vehicleName, brand: payload.brand || null, vehicleType: payload.vehicleType, customerId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { createVehicle };
