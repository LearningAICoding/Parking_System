const crypto = require('node:crypto');
const fs = require('node:fs');
const model = require('../models/parking.model');
const pricing = require('../config/pricing');
const ocr = require('../utils/ocr-plate-reader');
const normalizePlate = require('../utils/normalize-plate');
const AppError = require('../utils/app-error');
const runTransaction = require('../utils/run-transaction');
const { formatBusinessDate, formatMysqlDateTime, formatIsoWithOffset } = require('../utils/date-helper');

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function transaction(work) {
  return runTransaction(model.db, work, {
    conflictMessage: 'Dữ liệu vừa được thay đổi. Vui lòng tải lại và thử lại.',
    conflictCodes: ['ER_DUP_ENTRY']
  });
}

function parseMysqlDateTime(value) {
  if (value instanceof Date) return value;
  return new Date(`${String(value).replace(' ', 'T')}+07:00`);
}

async function lookupByScannedPlate(file, userId, sessionId) {
  let rawPlate;
  try {
    rawPlate = await ocr.readPlate(file.path);
  } catch (error) {
    await fs.promises.unlink(file.path).catch(() => {});
    throw error;
  }

  let plate;
  try {
    plate = normalizePlate(rawPlate);
  } catch (error) {
    await fs.promises.unlink(file.path).catch(() => {});
    throw error;
  }

  const vehicle = await model.findVehicleByPlate(plate);
  const slotCode = vehicle ? await model.vehicleSlot(vehicle.id) : null;
  const token = crypto.randomBytes(32).toString('hex');
  const imageUrl = `/files/plates/${file.filename}`;
  try {
    await model.db.execute(
      `INSERT INTO parking_scan_tokens
        (token_hash,session_id_hash,user_id,vehicle_id,normalized_plate,plate_image_url,expires_at)
       VALUES (?,?,?,?,?,?,DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [hash(token), hash(sessionId), userId, vehicle?.id || null, plate, imageUrl]
    );
  } catch (error) {
    await fs.promises.unlink(file.path).catch(() => {});
    throw error;
  }

  return {
    exists: Boolean(vehicle),
    licensePlate: plate,
    vehicleId: vehicle?.id || null,
    vehicleName: vehicle?.vehicleName || null,
    brand: vehicle?.brand || null,
    customerName: vehicle?.customerName || null,
    phone: vehicle?.phone || null,
    slotCode,
    scanToken: token
  };
}

async function getOperationsState() {
  const [slots, sessions] = await Promise.all([model.getSlots(), model.listOpenSessions()]);
  return { slots, sessions };
}

async function checkIn(input, userId, sessionId) {
  const vehicleId = Number(input.vehicleId);
  const slotId = Number(input.slotId);
  if (!Number.isInteger(vehicleId) || vehicleId < 1 || !Number.isInteger(slotId) || slotId < 1) {
    throw new AppError('Mã xe và mã vị trí phải là số nguyên dương.', 400);
  }

  return transaction(async (connection) => {
    const slot = await model.lockSlot(connection, slotId);
    if (!slot) throw new AppError('Không tìm thấy vị trí đỗ.', 404);
    const vehicle = await model.lockVehicle(connection, vehicleId);
    if (!vehicle) throw new AppError('Không tìm thấy xe.', 404);
    await model.expireTicketsForVehicle(connection, vehicleId);
    if (await model.vehicleHasOpenSession(connection, vehicleId)) throw new AppError('Xe đã có phiên gửi xe đang mở.', 409);

    if (slot.status === 'RESERVED') {
      if (Number(slot.currentVehicleId) !== vehicleId) throw new AppError('Vị trí đã được đăng ký cho xe khác.', 409);
    } else if (slot.status !== 'AVAILABLE' || slot.currentVehicleId) {
      throw new AppError('Vị trí không sẵn sàng để nhận xe.', 409);
    }

    let ticket = null;
    if (input.ticketId !== undefined && input.ticketId !== null && input.ticketId !== '') {
      const ticketId = Number(input.ticketId);
      if (!Number.isInteger(ticketId) || ticketId < 1) throw new AppError('Mã vé không hợp lệ.', 400);
      ticket = await model.findTicket(connection, ticketId);
      if (!ticket || Number(ticket.vehicleId) !== vehicleId || Number(ticket.slotId) !== slotId
        || ticket.status !== 'ACTIVE' || ticket.startDate > formatBusinessDate() || ticket.endDate < formatBusinessDate()) {
        throw new AppError('Vé không hợp lệ, đã hết hạn hoặc không thuộc xe/vị trí này.', 409);
      }
    } else {
      ticket = await model.findActiveTicketForVehicleSlot(connection, vehicleId, slotId);
    }

    let imageUrl = null;
    let plate = vehicle.licensePlate;
    let scanTokenId = null;
    if (input.scanToken) {
      const token = await model.findScanToken(connection, hash(String(input.scanToken)));
      if (!token || token.sessionIdHash !== hash(sessionId) || Number(token.userId) !== Number(userId)) {
        if (token && (token.sessionIdHash !== hash(sessionId) || Number(token.userId) !== Number(userId))) {
          throw new AppError('Mã quét không thuộc phiên đăng nhập hiện tại.', 403);
        }
        throw new AppError('Mã quét đã hết hạn, đã dùng hoặc không hợp lệ.', 409);
      }
      if (token.usedAt || parseMysqlDateTime(token.expiresAt) <= new Date()) {
        throw new AppError('Mã quét đã hết hạn hoặc đã được sử dụng.', 409);
      }
      if (token.plate !== vehicle.licensePlate || (token.vehicleId && Number(token.vehicleId) !== vehicleId)) {
        throw new AppError('Biển số trên mã quét không khớp với xe.', 409);
      }
      plate = token.plate;
      imageUrl = token.imageUrl;
      scanTokenId = token.id;
    }

    const checkInTime = formatMysqlDateTime();
    const sessionRecordId = await model.insertSession(connection, {
      vehicleId,
      ticketId: ticket?.id || null,
      plate,
      imageUrl,
      slotId,
      checkInTime
    });
    await model.setSlotOccupied(connection, slotId, vehicleId);
    if (scanTokenId) {
      const [result] = await model.markScanTokenUsed(connection, scanTokenId);
      if (!result.affectedRows) throw new AppError('Mã quét đã được sử dụng.', 409);
    }
    return {
      sessionId: sessionRecordId,
      vehicleId,
      slotId,
      slotCode: slot.slotCode,
      checkInTime: formatIsoWithOffset(parseMysqlDateTime(checkInTime)),
      ticketId: ticket?.id || null
    };
  });
}

async function checkOut(sessionIdInput) {
  const sessionId = Number(sessionIdInput);
  if (!Number.isInteger(sessionId) || sessionId < 1) throw new AppError('Mã phiên gửi xe không hợp lệ.', 400);

  return transaction(async (connection) => {
    const [sessionSlots] = await connection.execute(
      'SELECT slot_id AS slotId FROM parking_sessions WHERE id=? LIMIT 1',
      [sessionId]
    );
    if (!sessionSlots[0]) throw new AppError('Không tìm thấy phiên gửi xe.', 404);
    const slot = await model.lockSlot(connection, sessionSlots[0].slotId);
    if (!slot) throw new AppError('Không tìm thấy vị trí đỗ.', 404);
    const session = await model.lockSession(connection, sessionId);
    if (!session || session.checkOutTime || Number(slot.currentVehicleId) !== Number(session.vehicleId) || slot.status !== 'OCCUPIED') {
      throw new AppError('Phiên gửi xe đã đóng hoặc trạng thái vị trí không hợp lệ.', 409);
    }
    const vehicle = await model.lockVehicle(connection, session.vehicleId);
    if (!vehicle) throw new AppError('Không tìm thấy xe.', 404);
    await model.expireTicketsForVehicle(connection, vehicle.id);

    const checkOutDate = new Date();
    const checkOutTime = formatMysqlDateTime(checkOutDate);
    let ticket = null;
    if (session.ticketId) ticket = await model.findTicket(connection, session.ticketId);
    let fee;
    if (ticket?.status === 'ACTIVE') {
      const validFrom = new Date(`${ticket.startDate}T00:00:00+07:00`);
      const validTo = new Date(`${ticket.endDate}T00:00:00+07:00`);
      validTo.setTime(validTo.getTime() + 24 * 60 * 60 * 1000);
      fee = checkOutDate >= validFrom && checkOutDate < validTo
        ? 0
        : calculateCasualFee(session.checkInTime, checkOutDate, vehicle.vehicleType);
    } else {
      fee = calculateCasualFee(session.checkInTime, checkOutDate, vehicle.vehicleType);
    }

    const [updated] = await model.setSessionClosed(connection, sessionId, checkOutTime, fee);
    if (!updated.affectedRows) throw new AppError('Phiên gửi xe đã được đóng.', 409);
    await model.setSlotAvailable(connection, slot.id);
    return {
      sessionId,
      vehicleId: vehicle.id,
      slotId: slot.id,
      slotCode: slot.slotCode,
      checkInTime: formatIsoWithOffset(parseMysqlDateTime(session.checkInTime)),
      checkOutTime: formatIsoWithOffset(checkOutDate),
      fee: fee.toFixed(2),
      ticketId: session.ticketId || null
    };
  });
}

function calculateCasualFee(checkInTime, checkOutDate, vehicleType) {
  const hourlyRate = pricing.casualHourly[vehicleType];
  if (!hourlyRate) throw new AppError('Loại xe không hợp lệ để tính phí.', 409);
  const checkInDate = parseMysqlDateTime(checkInTime);
  const minutes = Math.max(0, (checkOutDate - checkInDate) / 60000);
  const hours = Math.max(1, Math.ceil(minutes / 60));
  return hours * hourlyRate;
}

module.exports = { lookupByScannedPlate, checkIn, checkOut, calculateCasualFee, getOperationsState };
