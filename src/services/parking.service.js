const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const AppError = require('../utils/app-error');
const normalizePlate = require('../utils/normalize-plate');
const ocrReader = require('../utils/ocr-plate-reader');
const parkingModel = require('../models/parking.model');
const { priceFor } = require('../config/pricing');
const { toBusinessDate, toIsoWithOffset } = require('../utils/date-helper');
const { SLOT_STATUS } = require('../constants/slot-status');

const TOKEN_TTL_MS = 10 * 60 * 1000;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function assertImageMagicBytes(file) {
  const bytes = await fs.readFile(file.path);
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).equals(bytes.subarray(0, 8));
  const isWebp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) {
    throw new AppError('File không phải ảnh hợp lệ', 400, [{ field: 'plateImage', message: 'Ảnh không đúng định dạng', code: 'INVALID_IMAGE_MAGIC_BYTES' }]);
  }
}

function formatScanData(vehicle, plate, scanToken) {
  return {
    exists: Boolean(vehicle),
    licensePlate: plate,
    vehicleId: vehicle?.id || null,
    vehicleName: vehicle?.vehicle_name || null,
    brand: vehicle?.brand || null,
    customerName: vehicle?.customer_name || null,
    phone: vehicle?.phone || null,
    slotCode: vehicle?.slot_code || null,
    scanToken
  };
}

async function scanPlate({ file, sessionId, userId }) {
  if (!file) throw new AppError('Vui lòng chọn ảnh biển số', 400);
  await assertImageMagicBytes(file);
  const rawPlate = await ocrReader.readPlate(file);
  const plate = normalizePlate(rawPlate);
  const conn = await parkingModel.pool.getConnection();
  try {
    const vehicle = await parkingModel.findVehicleForScan(conn, plate);
    const token = crypto.randomBytes(32).toString('hex');
    await parkingModel.insertScanToken(conn, {
      tokenHash: sha256(token),
      sessionIdHash: sha256(sessionId),
      userId,
      vehicleId: vehicle?.id || null,
      normalizedPlate: plate,
      plateImageUrl: `/files/plates/${file.filename}`,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
    });
    return formatScanData(vehicle, plate, token);
  } finally {
    conn.release();
  }
}

function ticketIsValidForCheckout(ticket, checkOutTime) {
  if (!ticket || ticket.deleted_at || ticket.status !== 'ACTIVE') return false;
  const start = toBusinessDate(ticket.start_date);
  const endExclusive = toBusinessDate(ticket.end_date);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return checkOutTime >= start && checkOutTime < endExclusive;
}

function ticketIsUsableForCheckIn(ticket, now = new Date()) {
  if (!ticket || ticket.deleted_at || ticket.status !== 'ACTIVE') return false;
  const start = toBusinessDate(ticket.start_date);
  const endExclusive = toBusinessDate(ticket.end_date);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return now >= start && now < endExclusive;
}

function calculateFee({ checkInTime, checkOutTime, vehicleType, ticket }) {
  if (ticketIsValidForCheckout(ticket, checkOutTime)) return 0;
  const minutes = Math.max(0, Math.ceil((checkOutTime.getTime() - toBusinessDate(checkInTime).getTime()) / 60000));
  const hours = Math.max(1, Math.ceil(minutes / 60));
  return hours * priceFor(vehicleType, 'HOURLY');
}

async function checkIn({ vehicleId, slotId, ticketId, scanToken, sessionId, userId }) {
  const conn = await parkingModel.pool.getConnection();
  try {
    await conn.beginTransaction();
    const slot = await parkingModel.lockSlot(conn, vehicleId && slotId);
    if (!slot) throw new AppError('Không tìm thấy vị trí đỗ', 404);
    if (![SLOT_STATUS.AVAILABLE, SLOT_STATUS.RESERVED].includes(slot.status)) {
      throw new AppError('Vị trí đỗ không sẵn sàng', 409);
    }
    const vehicle = await parkingModel.lockVehicle(conn, vehicleId);
    if (!vehicle) throw new AppError('Không tìm thấy xe', 404);
    const heldSlotId = await parkingModel.findCurrentSlotForVehicle(conn, vehicle.id);
    if (heldSlotId && heldSlotId !== slot.id) throw new AppError('Xe đang giữ vị trí đỗ khác', 409);
    if (slot.status === SLOT_STATUS.RESERVED && slot.current_vehicle_id !== vehicle.id) {
      throw new AppError('Vị trí đã được giữ cho xe khác', 409);
    }
    if (slot.status === SLOT_STATUS.AVAILABLE && slot.current_vehicle_id !== null) {
      throw new AppError('Vị trí đỗ đang có xe', 409);
    }
    if (await parkingModel.findOpenSessionForVehicle(conn, vehicle.id)) {
      throw new AppError('Xe đang có lượt đỗ mở', 409);
    }

    let ticket = null;
    if (ticketId) {
      ticket = await parkingModel.lockTicket(conn, ticketId);
      if (!ticket || ticket.vehicle_id !== vehicle.id || ticket.slot_id !== slot.id || !ticketIsUsableForCheckIn(ticket)) {
        throw new AppError('Vé không hợp lệ với xe và vị trí đỗ', 409);
      }
    } else {
      ticket = await parkingModel.findActiveTicketForVehicleSlot(conn, vehicle.id, slot.id);
      if (ticket && !ticketIsUsableForCheckIn(ticket)) {
        if (ticket.status === 'ACTIVE') await parkingModel.updateTicketStatus(conn, ticket.id, 'EXPIRED');
        ticket = null;
      }
    }

    let plateImageUrl = null;
    let tokenRow = null;
    if (scanToken) {
      tokenRow = await parkingModel.lockScanToken(conn, sha256(scanToken));
      if (!tokenRow || tokenRow.user_id !== userId || tokenRow.session_id_hash !== sha256(sessionId)) throw new AppError('Scan token không hợp lệ', 403);
      if (tokenRow.used_at || new Date(tokenRow.expires_at) <= new Date()) throw new AppError('Scan token đã hết hạn hoặc đã dùng', 409);
      if (tokenRow.vehicle_id && tokenRow.vehicle_id !== vehicle.id) throw new AppError('Scan token không khớp xe', 409);
      if (tokenRow.normalized_plate !== vehicle.license_plate) throw new AppError('Scan token không khớp biển số', 409);
      plateImageUrl = tokenRow.plate_image_url;
    }

    const checkInTime = new Date();
    const sessionIdResult = await parkingModel.insertOpenSession(conn, {
      vehicleId: vehicle.id,
      ticketId: ticket?.id || null,
      scannedPlate: vehicle.license_plate,
      plateImageUrl,
      slotId: slot.id,
      checkInTime
    });
    await parkingModel.updateSlotState(conn, slot.id, SLOT_STATUS.OCCUPIED, vehicle.id);
    if (tokenRow) await parkingModel.markScanTokenUsed(conn, tokenRow.id);
    await conn.commit();
    return {
      sessionId: sessionIdResult,
      vehicleId: vehicle.id,
      slotId: slot.id,
      slotCode: slot.slot_code,
      checkInTime: toIsoWithOffset(checkInTime),
      ticketId: ticket?.id || null
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function checkOut({ sessionId }) {
  const conn = await parkingModel.pool.getConnection();
  try {
    await conn.beginTransaction();
    const slotId = await parkingModel.findSessionSlotId(conn, sessionId);
    if (!slotId) throw new AppError('Lượt đỗ không còn mở', 409);
    await parkingModel.lockSlot(conn, slotId);
    const session = await parkingModel.lockSession(conn, sessionId);
    if (!session || session.check_out_time) throw new AppError('Lượt đỗ không còn mở', 409);
    if (session.slot_status !== SLOT_STATUS.OCCUPIED || session.current_vehicle_id !== session.vehicle_id) {
      throw new AppError('Trạng thái vị trí đỗ không hợp lệ', 409);
    }
    const checkOutTime = new Date();
    const ticket = session.ticket_id ? await parkingModel.lockTicket(conn, session.ticket_id) : null;
    const ticketEndExclusive = ticket
      ? toBusinessDate(ticket.end_date)
      : null;
    if (ticketEndExclusive) ticketEndExclusive.setDate(ticketEndExclusive.getDate() + 1);
    if (ticket && ticket.status === 'ACTIVE' && ticketEndExclusive <= checkOutTime) {
      await parkingModel.updateTicketStatus(conn, ticket.id, 'EXPIRED');
      ticket.status = 'EXPIRED';
    }
    const fee = calculateFee({
      checkInTime: session.check_in_time,
      checkOutTime,
      vehicleType: session.vehicle_type,
      ticket
    });
    await parkingModel.closeSession(conn, session.id, checkOutTime, fee);
    await parkingModel.updateSlotState(conn, session.slot_id, SLOT_STATUS.AVAILABLE, null);
    await conn.commit();
    return {
      sessionId: session.id,
      vehicleId: session.vehicle_id,
      slotId: session.slot_id,
      slotCode: session.slot_code,
      checkInTime: toIsoWithOffset(session.check_in_time),
      checkOutTime: toIsoWithOffset(checkOutTime),
      fee: Number(fee).toFixed(2),
      ticketId: session.ticket_id || null
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function getMapSlots(filters) {
  return parkingModel.listSlots(filters);
}

module.exports = {
  scanPlate,
  checkIn,
  checkOut,
  getMapSlots,
  calculateFee,
  ticketIsValidForCheckout,
  ticketIsUsableForCheckIn,
  sha256,
  TOKEN_TTL_MS
};
