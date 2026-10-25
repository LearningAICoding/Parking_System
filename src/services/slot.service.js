const model = require('../models/slot.model');
const AppError = require('../utils/app-error');
const runTransaction = require('../utils/run-transaction');

function normalize(input, creating) {
  const slotCode = typeof input.slotCode === 'string' ? input.slotCode.trim().toUpperCase() : '';
  const zone = typeof input.zone === 'string' ? input.zone.trim() : '';
  const status = input.status || (creating ? 'AVAILABLE' : '');
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (creating && !/^[A-Z0-9-]{1,20}$/.test(slotCode)) throw new AppError('Mã vị trí chỉ gồm 1–20 chữ hoa, số hoặc dấu gạch ngang.', 400);
  if (creating && !zone) throw new AppError('Zone là bắt buộc.', 400);
  if (!zone || zone.length > 20 || note.length > 255) throw new AppError('Zone bắt buộc, tối đa 20 ký tự; ghi chú tối đa 255 ký tự.', 400);
  if (creating ? !['AVAILABLE', 'MAINTENANCE'].includes(status) : !['AVAILABLE', 'MAINTENANCE'].includes(status)) {
    throw new AppError('Trạng thái vị trí không hợp lệ.', 400);
  }
  return { slotCode, zone, status, note };
}

async function transaction(work) {
  return runTransaction(model.db, work, {
    conflictMessage: 'Không thể hoàn tất thao tác với vị trí đỗ.',
    conflictCodes: ['ER_ROW_IS_REFERENCED_2']
  });
}

async function list() {
  return model.list();
}

async function get(idValue) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id < 1) throw new AppError('Mã vị trí không hợp lệ.', 400);
  const slot = await model.findById(id);
  if (!slot) throw new AppError('Không tìm thấy vị trí đỗ.', 404);
  return slot;
}

async function create(input) {
  const data = normalize(input, true);
  try {
    return await model.create(data);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Mã vị trí đã được sử dụng.', 409);
    throw error;
  }
}

async function update(idValue, input) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id < 1) throw new AppError('Mã vị trí không hợp lệ.', 400);
  const data = normalize(input, false);
  await transaction(async (connection) => {
    const slot = await model.lockSlot(connection, id);
    if (!slot) throw new AppError('Không tìm thấy vị trí đỗ.', 404);
    if (['RESERVED', 'OCCUPIED'].includes(slot.status) || slot.currentVehicleId) {
      throw new AppError('Không thể sửa vị trí đã đăng ký hoặc đang có xe.', 409);
    }
    if (slot.status !== data.status
        && !((slot.status === 'AVAILABLE' && data.status === 'MAINTENANCE')
          || (slot.status === 'MAINTENANCE' && data.status === 'AVAILABLE'))) {
      throw new AppError('Chỉ có thể chuyển trạng thái AVAILABLE ↔ MAINTENANCE.', 409);
    }
    await model.update(connection, id, data);
  });
}

async function remove(idValue) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id < 1) throw new AppError('Mã vị trí không hợp lệ.', 400);
  await transaction(async (connection) => {
    const slot = await model.lockSlot(connection, id);
    if (!slot) throw new AppError('Không tìm thấy vị trí đỗ.', 404);
    if (!['AVAILABLE', 'MAINTENANCE'].includes(slot.status) || slot.currentVehicleId) {
      throw new AppError('Chỉ có thể xóa vị trí AVAILABLE hoặc MAINTENANCE không gắn xe.', 409);
    }
    const tickets = await model.ticketReferences(connection, id);
    const sessions = await model.sessionReferences(connection, id);
    if (tickets.length || sessions.length) throw new AppError('Không thể xóa vị trí đã được vé hoặc phiên gửi xe tham chiếu.', 409);
    await model.deleteSlot(connection, id);
  });
}

module.exports = { list, get, create, update, remove };
