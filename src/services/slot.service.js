const slotModel = require('../models/slot.model');
const AppError = require('../utils/app-error');
const { withTransaction, mapDbError } = require('../utils/db-transaction');
const { SLOT_STATUS } = require('../constants/slot-status');

const EDITABLE_STATUSES = new Set([SLOT_STATUS.AVAILABLE, SLOT_STATUS.MAINTENANCE]);
const SLOT_CODE = /^[A-Z0-9-]{1,20}$/;

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function toAppError(error) {
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError('Vị trí đã có vé hoặc lịch sử đỗ xe, không thể xóa', 409);
  }
  return mapDbError(error);
}

async function guard(work) {
  try { return await work(); } catch (error) { throw toAppError(error); }
}

function transaction(work) {
  return withTransaction(work).catch((error) => { throw toAppError(error); });
}

function validateCreate(input) {
  const slotCode = cleanText(input.slotCode, 21).toUpperCase();
  const zone = cleanText(input.zone, 21);
  const status = input.status || SLOT_STATUS.AVAILABLE;
  const note = cleanText(input.note, 255);
  const errors = [];
  if (!SLOT_CODE.test(slotCode)) errors.push({ field: 'slotCode', message: 'Mã vị trí gồm 1–20 ký tự: chữ in hoa, số và dấu gạch ngang', code: 'INVALID_SLOT_CODE' });
  if (!zone) errors.push({ field: 'zone', message: 'Khu vực/tầng là bắt buộc', code: 'REQUIRED' });
  else if (zone.length > 20) errors.push({ field: 'zone', message: 'Khu vực/tầng tối đa 20 ký tự', code: 'TOO_LONG' });
  if (!EDITABLE_STATUSES.has(status)) errors.push({ field: 'status', message: 'Chỉ được chọn Trống hoặc Bảo trì', code: 'INVALID_STATUS' });
  if (errors.length) throw new AppError('Dữ liệu vị trí đỗ không hợp lệ', 400, errors);
  return { slotCode, zone, status, note };
}

function validateEdit(input) {
  const zone = cleanText(input.zone, 21);
  const status = input.status;
  const note = cleanText(input.note, 255);
  const errors = [];
  if (!zone) errors.push({ field: 'zone', message: 'Khu vực/tầng là bắt buộc', code: 'REQUIRED' });
  else if (zone.length > 20) errors.push({ field: 'zone', message: 'Khu vực/tầng tối đa 20 ký tự', code: 'TOO_LONG' });
  if (!EDITABLE_STATUSES.has(status)) errors.push({ field: 'status', message: 'Chỉ được chọn Trống hoặc Bảo trì', code: 'INVALID_STATUS' });
  if (errors.length) throw new AppError('Dữ liệu vị trí đỗ không hợp lệ', 400, errors);
  return { zone, status, note };
}

// Chỉ ô AVAILABLE/MAINTENANCE không gắn xe mới được sửa/xóa (AGENTS.md mục 7.2, 11.4).
function isModifiable(slot) {
  return EDITABLE_STATUSES.has(slot.status) && !slot.currentVehicleId;
}

async function listSlots(filters = {}) {
  const zone = cleanText(filters.zone, 20);
  return guard(() => slotModel.list({ zone, status: filters.status }));
}

async function listZones() { return guard(() => slotModel.listZones()); }

async function getSlot(id) {
  const slot = await guard(() => slotModel.findById(id));
  if (!slot) throw new AppError('Không tìm thấy vị trí đỗ', 404);
  return slot;
}

async function getSlotDetail(id) {
  const slot = await guard(() => slotModel.findDetail(id));
  if (!slot) throw new AppError('Không tìm thấy vị trí đỗ', 404);
  return slot;
}

async function createSlot(input) {
  const payload = validateCreate(input);
  try { return await slotModel.create(payload); } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError('Mã vị trí đã tồn tại', 409, [{ field: 'slotCode', message: 'Mã vị trí đã tồn tại', code: 'DUPLICATE' }]);
    }
    throw toAppError(error);
  }
}

async function editSlot(id, input) {
  const payload = validateEdit(input);
  return transaction(async (conn) => {
    const existing = await slotModel.findById(id, conn, true);
    if (!existing) throw new AppError('Không tìm thấy vị trí đỗ', 404);
    if (!EDITABLE_STATUSES.has(existing.status)) throw new AppError('Vị trí đang được sử dụng, không thể cập nhật', 409);
    return slotModel.update(id, payload, conn);
  });
}

async function deleteSlot(id) {
  return transaction(async (conn) => {
    const slot = await slotModel.findById(id, conn, true);
    if (!slot) throw new AppError('Vị trí đỗ đã bị xóa hoặc không tồn tại', 404);
    if (!isModifiable(slot)) {
      throw new AppError('Vị trí đang có xe đăng ký hoặc đang được sử dụng, không thể xóa', 409);
    }
    if (await slotModel.hasHistoryOrTickets(id, conn)) {
      throw new AppError('Vị trí đã có vé hoặc lịch sử đỗ xe, không thể xóa', 409);
    }
    await slotModel.remove(id, conn);
    return { id, slotCode: slot.slotCode };
  });
}

module.exports = { isModifiable, listSlots, listZones, getSlot, getSlotDetail, createSlot, editSlot, deleteSlot };
