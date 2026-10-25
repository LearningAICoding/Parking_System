const crypto = require('node:crypto');
const model = require('../models/parking.model');
const pricing = require('../config/pricing');
const AppError = require('../utils/app-error');
const runTransaction = require('../utils/run-transaction');
const { formatBusinessDate } = require('../utils/date-helper');

async function getMapSlots(filters) {
  return model.getSlots(filters);
}

async function getVehicleAtSlot(id) {
  const slotId = Number(id);
  if (!Number.isInteger(slotId) || slotId < 1) throw new AppError('Mã vị trí không hợp lệ.', 400);
  const slot = await model.getSlotById(slotId);
  if (!slot) throw new AppError('Không tìm thấy vị trí đỗ.', 404);
  if (!['OCCUPIED', 'RESERVED'].includes(slot.status)) return null;
  return model.currentVehicleInfo(slotId);
}

async function registerParkingSlot(slotIdValue, vehicleIdValue, user) {
  const slotId = Number(slotIdValue);
  const vehicleId = Number(vehicleIdValue);
  if (!Number.isInteger(slotId) || slotId < 1 || !Number.isInteger(vehicleId) || vehicleId < 1) {
    throw new AppError('Mã vị trí và mã xe phải là số nguyên dương.', 400);
  }

  return runTransaction(model.db, async (connection) => {
    const slot = await model.lockSlot(connection, slotId);
    if (!slot) throw new AppError('Không tìm thấy vị trí đỗ.', 404);
    if (slot.status !== 'AVAILABLE' || slot.currentVehicleId) throw new AppError('Vị trí không còn trống để đăng ký.', 409);
    const vehicle = await model.lockVehicle(connection, vehicleId);
    if (!vehicle) throw new AppError('Không tìm thấy xe.', 404);
    const ownerId = user.role === 'CUSTOMER' ? Number(user.customerId) : null;
    if (user.role === 'CUSTOMER' && (!ownerId || Number(vehicle.customerId) !== ownerId)) {
      throw new AppError('Bạn không có quyền đăng ký chỗ cho xe này.', 403);
    }
    if (vehicle.customerId) {
      const customer = await model.lockCustomer(connection, vehicle.customerId);
      if (!customer) throw new AppError('Khách hàng sở hữu xe không còn hoạt động.', 409);
    }
    if (await model.vehicleHasCurrentSlot(connection, vehicleId) || await model.vehicleHasOpenSession(connection, vehicleId)) {
      throw new AppError('Xe đã đăng ký vị trí hoặc đang có phiên gửi xe mở.', 409);
    }

    const date = formatBusinessDate();
    const price = pricing.dailyTicket[vehicle.vehicleType];
    if (price === undefined) throw new AppError('Loại xe không hợp lệ.', 409);
    const ticketCode = `T-${date.replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await model.reserveSlot(connection, slotId, vehicleId);
    const ticketId = await model.insertDailyTicket(connection, {
      code: ticketCode,
      vehicleId,
      slotId,
      price,
      date
    });
    return {
      slotId,
      slotCode: slot.slotCode,
      status: 'RESERVED',
      vehicleId,
      ticketId,
      ticketCode,
      startDate: date,
      endDate: date,
      price: price.toFixed(2)
    };
  }, {
    conflictMessage: 'Vị trí hoặc vé vừa được thay đổi. Vui lòng tải lại bản đồ.',
    conflictCodes: ['ER_DUP_ENTRY']
  });
}

module.exports = { getMapSlots, getVehicleAtSlot, registerParkingSlot };
