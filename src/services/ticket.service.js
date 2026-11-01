const AppError = require('../utils/app-error');
const ticketModel = require('../models/ticket.model');
const { priceFor } = require('../config/pricing');

async function listTickets({ page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);
  await ticketModel.expireActiveTickets();
  const total = await ticketModel.countTickets();
  const items = await ticketModel.listTickets((safePage - 1) * safeLimit, safeLimit);
  return {
    items,
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) }
  };
}

async function deleteTicket(ticketId) {
  const conn = await ticketModel.pool.getConnection();
  try {
    await conn.beginTransaction();
    const reference = await ticketModel.findTicketSlotReference(conn, ticketId);
    if (!reference) throw new AppError('Không tìm thấy vé', 404);
    const slot = await ticketModel.lockTicketSlot(conn, reference.slot_id);
    const ticket = await ticketModel.findTicketForUpdate(conn, ticketId);
    if (!ticket || ticket.deleted_at) throw new AppError('Không tìm thấy vé', 404);
    if (await ticketModel.hasTicketSessions(conn, ticket.id)) {
      throw new AppError('Không thể xóa vé đã được sử dụng cho lượt đỗ', 409);
    }
    if (slot && ['RESERVED', 'OCCUPIED'].includes(slot.status) && slot.current_vehicle_id === ticket.vehicle_id) {
      throw new AppError('Không thể xóa vé đang gắn với ô RESERVED hoặc OCCUPIED', 409);
    }
    await ticketModel.softDeleteTicket(conn, ticket.id);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

function assertDate(value, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    throw new AppError('Ngày vé không hợp lệ', 400, [{ field, message: 'Ngày phải có dạng YYYY-MM-DD', code: 'INVALID_DATE' }]);
  }
}

async function getTicketForEdit(ticketId) {
  const ticket = await ticketModel.findTicketForEdit(ticketId);
  if (!ticket || ticket.deletedAt) throw new AppError('Không tìm thấy vé', 404);
  return ticket;
}

async function updateTicketDates(ticketId, { startDate, endDate }) {
  assertDate(startDate, 'startDate');
  assertDate(endDate, 'endDate');
  if (startDate > endDate) throw new AppError('Ngày bắt đầu không được sau ngày kết thúc', 400);

  const conn = await ticketModel.pool.getConnection();
  try {
    await conn.beginTransaction();
    const reference = await ticketModel.findTicketSlotReference(conn, ticketId);
    if (!reference) throw new AppError('Không tìm thấy vé', 404);
    const slot = await ticketModel.lockTicketSlot(conn, reference.slot_id);
    const ticket = await ticketModel.findTicketForUpdate(conn, ticketId);
    if (!ticket || ticket.deleted_at) throw new AppError('Không tìm thấy vé', 404);
    if (await ticketModel.hasTicketSessions(conn, ticket.id)) throw new AppError('Không thể sửa ngày của vé đã được sử dụng', 409);
    if (slot && ['RESERVED', 'OCCUPIED'].includes(slot.status) && slot.current_vehicle_id !== ticket.vehicle_id) {
      throw new AppError('Vé không còn nhất quán với vị trí đỗ', 409);
    }
    const vehicleType = ticket.vehicle_type || 'CAR';
    await ticketModel.updateTicketDates(conn, ticket.id, startDate, endDate, priceFor(vehicleType, 'DAILY'));
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { listTickets, deleteTicket, getTicketForEdit, updateTicketDates };
