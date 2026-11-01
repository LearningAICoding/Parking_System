const fs = require('node:fs/promises');
const multer = require('multer');
const parkingService = require('../services/parking.service');

function sendSuccess(res, statusCode, message, data) {
  return res.status(statusCode).json({ success: true, message, data, errors: [] });
}

async function renderCheckinCheckout(_req, res) {
  return res.render('parking/checkin-checkout', { title: 'Quản lý xe vào/ra' });
}

async function scanPlate(req, res, next) {
  try {
    const data = await parkingService.scanPlate({
      file: req.file,
      sessionId: req.sessionID,
      userId: req.session.user.id
    });
    return sendSuccess(res, 200, 'Đã nhận diện biển số', data);
  } catch (error) {
    if (req.file?.path && error.statusCode) await fs.unlink(req.file.path).catch(() => {});
    return next(error);
  }
}

async function checkIn(req, res, next) {
  try {
    const data = await parkingService.checkIn({
      vehicleId: Number(req.body.vehicleId),
      slotId: Number(req.body.slotId),
      ticketId: req.body.ticketId ? Number(req.body.ticketId) : null,
      scanToken: req.body.scanToken || null,
      sessionId: req.sessionID,
      userId: req.session.user.id
    });
    return sendSuccess(res, 201, 'Cho xe vào thành công', data);
  } catch (error) {
    return next(error);
  }
}

async function checkOut(req, res, next) {
  try {
    const data = await parkingService.checkOut({ sessionId: Number(req.body.sessionId) });
    return sendSuccess(res, 200, 'Cho xe ra thành công', data);
  } catch (error) {
    return next(error);
  }
}

async function listSlots(req, res, next) {
  try {
    const data = await parkingService.getMapSlots({ zone: req.query.zone, status: req.query.status });
    return sendSuccess(res, 200, '', data);
  } catch (error) {
    return next(error);
  }
}

function handleUploadError(error, _req, _res, next) {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    error.statusCode = 413;
    error.message = 'Ảnh vượt quá 5 MB';
  } else if (error instanceof multer.MulterError) {
    error.statusCode = 400;
    error.message = 'File ảnh không hợp lệ';
  }
  return next(error);
}

module.exports = {
  renderCheckinCheckout,
  scanPlate,
  checkIn,
  checkOut,
  listSlots,
  handleUploadError
};
