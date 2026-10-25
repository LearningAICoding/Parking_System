const fs = require('node:fs');
const path = require('node:path');
const parking = require('../services/parking.service');
const { validateImageMagicBytes, storageDirectory } = require('../config/upload');
const AppError = require('../utils/app-error');
const auditLog = require('../utils/audit-log');

exports.page = async (req, res) => res.render('parking/checkin-checkout', {
  title: 'Xe vào / ra',
  ...await parking.getOperationsState()
});

exports.scanPlate = async (req, res) => {
  try {
    await validateImageMagicBytes(req.file);
    const data = await parking.lookupByScannedPlate(req.file, req.session.user.id, req.sessionID);
    res.json({ success: true, message: 'Đã nhận diện biển số', data, errors: [] });
  } catch (error) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    throw error;
  }
};

exports.checkIn = async (req, res) => {
  const data = await parking.checkIn(req.body || {}, req.session.user.id, req.sessionID);
  auditLog('parking_check_in', { actorUserId: req.session.user.id, sessionId: data.sessionId, vehicleId: data.vehicleId, slotId: data.slotId });
  res.status(201).json({ success: true, message: 'Đã ghi nhận xe vào bãi.', data, errors: [] });
};

exports.checkOut = async (req, res) => {
  const data = await parking.checkOut(req.body?.sessionId);
  auditLog('parking_check_out', { actorUserId: req.session.user.id, sessionId: data.sessionId, vehicleId: data.vehicleId, fee: data.fee });
  res.json({ success: true, message: 'Đã ghi nhận xe ra khỏi bãi.', data, errors: [] });
};

exports.plateImage = async (req, res, next) => {
  const filename = req.params.filename;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) return next(new AppError('Không tìm thấy tệp.', 404));
  const filePath = path.resolve(storageDirectory, filename);
  if (!filePath.startsWith(`${storageDirectory}${path.sep}`)) return next(new AppError('Không tìm thấy tệp.', 404));
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    return next(new AppError('Không tìm thấy tệp.', 404));
  }
  return res.sendFile(filePath);
};
