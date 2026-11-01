const AppError = require('../utils/app-error');
const normalizePhone = require('../utils/normalize-phone');
const customerModel = require('../models/customer.model');
const myVehiclesModel = require('../models/my-vehicles.model');

async function getProfile(userId) {
  const profile = await customerModel.findProfileByUserId(userId);
  if (!profile || !profile.isActive) throw new AppError('Hồ sơ khách hàng không tồn tại', 404);
  return profile;
}

async function updateProfile(userId, customerId, payload) {
  if (!payload.fullName || payload.fullName.length > 100) throw new AppError('Họ tên không hợp lệ', 400);
  if (!payload.email || payload.email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new AppError('Email không hợp lệ', 400);
  const phone = normalizePhone(payload.phone);
  const conn = await customerModel.pool.getConnection();
  try {
    await conn.beginTransaction();
    const profile = await customerModel.findProfileById(conn, customerId);
    if (!profile || profile.userId !== userId) throw new AppError('Bạn không có quyền sửa hồ sơ này', 403);
    if (await customerModel.findEmailConflict(conn, payload.email, customerId, userId)) throw new AppError('Email đã tồn tại', 409);
    await customerModel.updateProfile(conn, customerId, userId, { ...payload, phone });
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function getMyVehicles(customerId) {
  if (!customerId) throw new AppError('Tài khoản chưa gắn hồ sơ khách hàng', 403);
  return myVehiclesModel.listByCustomerId(customerId);
}

module.exports = { getProfile, updateProfile, getMyVehicles };
