const model = require('../models/ticket.model');
const pricing = require('../config/pricing');
const AppError = require('../utils/app-error');
const runTransaction = require('../utils/run-transaction');
const { formatBusinessDate } = require('../utils/date-helper');

async function transaction(work) {
  return runTransaction(model.db, work, { conflictMessage: 'Xung đột khi xử lý vé. Vui lòng tải lại và thử lại.' });
}

async function list() {
  await model.expireOldTickets();
  return model.list();
}

async function get(id) {
  if (!Number.isInteger(Number(id)) || Number(id) < 1) throw new AppError('Mã vé không hợp lệ.', 400);
  await model.expireOldTickets();
  const ticket = await model.findById(Number(id));
  if (!ticket) throw new AppError('Không tìm thấy vé.', 404);
  return ticket;
}

async function update(idValue, input) {
  const id = Number(idValue);
  const startDate = typeof input.startDate === 'string' ? input.startDate : '';
  const endDate = typeof input.endDate === 'string' ? input.endDate : '';
  if (!Number.isInteger(id) || id < 1) throw new AppError('Mã vé không hợp lệ.', 400);
  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
    throw new AppError('Ngày bắt đầu và kết thúc không hợp lệ; ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', 400);
  }

  await transaction(async (connection) => {
    const refs = await model.ticketReferences(id);
    if (!refs) throw new AppError('Không tìm thấy vé.', 404);
    const slot = await model.lockSlot(connection, refs.slotId);
    if (!slot) throw new AppError('Không tìm thấy vị trí của vé.', 404);
    const vehicle = await model.lockVehicle(connection, refs.vehicleId);
    if (!vehicle) throw new AppError('Không tìm thấy xe của vé.', 404);
    await model.expireTicket(connection, id);
    const ticket = await model.lockTicket(connection, id);
    if (!ticket || ticket.deletedAt) throw new AppError('Không tìm thấy vé.', 404);
    if (ticket.ticketType !== 'DAILY') throw new AppError('Chỉ hỗ trợ sửa vé DAILY trong Sprint 1.', 409);
    if (await model.lockReferencedSessions(connection, id).then((rows) => rows.length > 0)) {
      throw new AppError('Không thể sửa ngày vé đã được sử dụng bởi phiên gửi xe.', 409);
    }
    const attachedToActiveSlot = ['RESERVED', 'OCCUPIED'].includes(slot.status)
      && Number(slot.currentVehicleId) === Number(ticket.vehicleId);
    const today = formatBusinessDate();
    if (attachedToActiveSlot && !(startDate <= today && endDate >= today)) {
      throw new AppError('Ngày vé phải bao gồm ngày hiện tại khi xe đang giữ hoặc chiếm vị trí.', 409);
    }
    const price = pricing.dailyTicket[vehicle.vehicleType];
    if (price === undefined) throw new AppError('Loại xe không hợp lệ để tính giá vé.', 409);
    await model.updateDateAndPrice(connection, id, startDate, endDate, price);
  });
}

async function remove(idValue) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id < 1) throw new AppError('Mã vé không hợp lệ.', 400);
  await transaction(async (connection) => {
    const refs = await model.ticketReferences(id);
    if (!refs) throw new AppError('Không tìm thấy vé.', 404);
    const slot = await model.lockSlot(connection, refs.slotId);
    if (!slot) throw new AppError('Không tìm thấy vị trí của vé.', 404);
    const vehicle = await model.lockVehicle(connection, refs.vehicleId);
    if (!vehicle) throw new AppError('Không tìm thấy xe của vé.', 404);
    await model.expireTicket(connection, id);
    const ticket = await model.lockTicket(connection, id);
    if (!ticket || ticket.deletedAt) throw new AppError('Không tìm thấy vé.', 404);
    if (await model.referencedSessions(connection, id)) throw new AppError('Không thể xóa vé đã được dùng bởi phiên gửi xe.', 409);
    if (ticket.status === 'ACTIVE' && ['RESERVED', 'OCCUPIED'].includes(slot.status)
      && Number(slot.currentVehicleId) === Number(ticket.vehicleId)) {
      throw new AppError('Không thể xóa vé đang gắn với xe đã đăng ký hoặc đang đỗ.', 409);
    }
    await model.softDelete(connection, id);
  });
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

module.exports = { list, get, update, remove };
