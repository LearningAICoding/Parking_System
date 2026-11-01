const crypto = require('node:crypto');
const AppError = require('../utils/app-error');
const parkingModel = require('../models/parking.model');
const mapModel = require('../models/parking-map.model');
const { priceFor } = require('../config/pricing');
const { dateOnlyInBusinessZone, toIsoWithOffset } = require('../utils/date-helper');

async function getVehicleAtSlot(slotId) {
  const vehicle = await mapModel.findVehicleAtSlot(slotId);
  if (!vehicle?.vehicleId) return null;
  return { ...vehicle, checkInTime: toIsoWithOffset(vehicle.checkInTime) };
}

async function registerParkingSlot({ slotId, vehicleId, actor }) {
  const conn = await parkingModel.pool.getConnection();
  try {
    await conn.beginTransaction();
    const slot = await parkingModel.lockSlot(conn, slotId);
    if (!slot) throw new AppError('Không tìm thấy vị trí đỗ', 404);
    if (slot.status !== 'AVAILABLE') throw new AppError('Vị trí đỗ không còn trống', 409);
    const vehicle = await parkingModel.lockVehicle(conn, vehicleId);
    if (!vehicle) throw new AppError('Không tìm thấy xe', 404);
    if (actor.role === 'CUSTOMER' && vehicle.customer_id !== actor.customerId) throw new AppError('Bạn không có quyền đăng ký xe này', 403);
    if (await mapModel.findVehicleSlot(conn, vehicle.id) || await parkingModel.findOpenSessionForVehicle(conn, vehicle.id)) {
      throw new AppError('Xe đã giữ vị trí hoặc đang có lượt đỗ mở', 409);
    }
    const startDate = dateOnlyInBusinessZone();
    const ticketCode = `T-${startDate.replace(/-/g, '')}-${crypto.randomInt(10000, 99999)}`;
    const price = priceFor(vehicle.vehicle_type, 'DAILY');
    const ticketId = await mapModel.insertDailyTicket(conn, { ticketCode, vehicleId: vehicle.id, slotId: slot.id, price, startDate, endDate: startDate });
    await parkingModel.updateSlotState(conn, slot.id, 'RESERVED', vehicle.id);
    await conn.commit();
    return { slotId: slot.id, slotCode: slot.slot_code, status: 'RESERVED', vehicleId: vehicle.id, ticketId, ticketCode, startDate, endDate: startDate, price: Number(price).toFixed(2) };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { getVehicleAtSlot, registerParkingSlot };
