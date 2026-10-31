const crypto = require('crypto');
const mapModel = require('../models/parking-map.model');
const slotModel = require('../models/slot.model');
const AppError = require('../utils/app-error');
const { withTransaction, mapDbError } = require('../utils/db-transaction');
const { toBusinessDate, toBusinessIso } = require('../utils/date-helper');
const { PRICING } = require('../config/pricing');
const { ROLES } = require('../constants/roles');
const { SLOT_STATUS } = require('../constants/slot-status');
const { TICKET_TYPE, TICKET_STATUS } = require('../constants/ticket');

const SLOT_STATUSES = new Set(Object.values(SLOT_STATUS));
const SLOT_NOT_AVAILABLE = {
  [SLOT_STATUS.RESERVED]: 'Vị trí đã được đăng ký, vui lòng chọn vị trí khác',
  [SLOT_STATUS.OCCUPIED]: 'Vị trí đang có xe đỗ, vui lòng chọn vị trí khác',
  [SLOT_STATUS.MAINTENANCE]: 'Vị trí đang bảo trì, không thể đăng ký'
};

async function guard(work) {
  try { return await work(); } catch (error) { throw mapDbError(error); }
}

function validateFilters({ zone, status }) {
  const errors = [];
  const cleanZone = typeof zone === 'string' ? zone.trim() : '';
  if (cleanZone.length > 20) errors.push({ field: 'zone', message: 'Khu vực tối đa 20 ký tự', code: 'TOO_LONG' });
  if (status && !SLOT_STATUSES.has(status)) errors.push({ field: 'status', message: 'Trạng thái không hợp lệ', code: 'INVALID_STATUS' });
  if (errors.length) throw new AppError('Bộ lọc không hợp lệ', 400, errors);
  return { zone: cleanZone, status: status || '' };
}

// GET /api/slots: chỉ trả { id, slotCode, zone, status } (AGENTS.md mục 6.7)
async function getMapSlots(filters = {}) {
  const rows = await guard(() => mapModel.listMapSlots(validateFilters(filters)));
  return rows.map(({ id, slotCode, zone, status }) => ({ id, slotCode, zone, status }));
}

// GET /api/slots/:id/vehicle: xe đang đỗ (session OPEN) tại ô, không có thì null (mục 6.8)
async function getVehicleAtSlot(slotId) {
  const slot = await guard(() => slotModel.findById(slotId));
  if (!slot) throw new AppError('Không tìm thấy vị trí đỗ', 404);
  const vehicle = await guard(() => mapModel.findParkedVehicle(slotId));
  if (!vehicle) return null;
  return { ...vehicle, checkInTime: toBusinessIso(vehicle.checkInTime) };
}

function ticketCodeOf(ticketId, startDate) {
  return `T-${startDate.replaceAll('-', '')}-${String(ticketId).padStart(5, '0')}`;
}

// POST /api/slots/:id/register (mục 6.9). Khóa slot trước, vehicle sau (mục 7.5).
async function registerParkingSlot({ slotId, vehicleId, user }) {
  try {
    return await withTransaction(async (conn) => {
      const slot = await slotModel.findById(slotId, conn, true);
      if (!slot) throw new AppError('Không tìm thấy vị trí đỗ', 404);
      if (slot.status !== SLOT_STATUS.AVAILABLE) throw new AppError(SLOT_NOT_AVAILABLE[slot.status], 409);

      const vehicle = await mapModel.lockVehicle(conn, vehicleId);
      if (user.role === ROLES.CUSTOMER) {
        // Không phân biệt "không tồn tại" và "không phải của bạn" để tránh dò ID
        if (!vehicle || !user.customerId || vehicle.customerId !== user.customerId) {
          throw new AppError('Bạn chỉ được đăng ký xe của mình', 403);
        }
      } else if (!vehicle) {
        throw new AppError('Không tìm thấy xe', 404);
      }
      if (vehicle.customerId && vehicle.customerDeletedAt) throw new AppError('Khách hàng của xe đã bị xóa', 409);

      const heldSlot = await mapModel.findSlotHeldByVehicle(conn, vehicleId);
      if (heldSlot) throw new AppError(`Xe đã đăng ký hoặc đang đỗ tại vị trí ${heldSlot.slotCode}`, 409);
      if (await mapModel.hasOpenSession(conn, vehicleId)) throw new AppError('Xe đang đỗ trong bãi, không thể đăng ký thêm', 409);

      if (!(await mapModel.reserveSlot(conn, slotId, vehicleId))) throw new AppError(SLOT_NOT_AVAILABLE.RESERVED, 409);

      const today = toBusinessDate();
      const ticketId = await mapModel.insertTicket(conn, {
        tempCode: `TMP-${crypto.randomBytes(12).toString('hex')}`,
        vehicleId, slotId,
        ticketType: TICKET_TYPE.DAILY,
        price: PRICING.DAILY_TICKET[vehicle.vehicleType],
        startDate: today, endDate: today,
        status: TICKET_STATUS.ACTIVE
      });
      await mapModel.setTicketCode(conn, ticketId, ticketCodeOf(ticketId, today));
      const ticket = await mapModel.findTicket(conn, ticketId);

      return {
        slotId: slot.id, slotCode: slot.slotCode, status: SLOT_STATUS.RESERVED, vehicleId,
        ticketId, ticketCode: ticket.ticketCode, startDate: ticket.startDate, endDate: ticket.endDate,
        price: String(ticket.price)
      };
    });
  } catch (error) {
    // Unique current_vehicle_id bị vi phạm khi hai ô cùng đăng ký một xe
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Xe đã được đăng ký ở vị trí khác', 409);
    throw mapDbError(error);
  }
}

module.exports = { getMapSlots, getVehicleAtSlot, registerParkingSlot };
