const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { requireAuth, authorizeRoles } = require('../middlewares/auth.middleware');
const { plateDirectory } = require('../config/upload');
const AppError = require('../utils/app-error');

const router = express.Router();

router.get('/files/plates/:filename', requireAuth, authorizeRoles('MANAGER', 'STAFF'), (req, res, next) => {
  const { filename } = req.params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) return next(new AppError('Không tìm thấy file', 404));
  const filePath = path.resolve(plateDirectory, filename);
  if (!filePath.startsWith(`${path.resolve(plateDirectory)}${path.sep}`) || !fs.existsSync(filePath)) {
    return next(new AppError('Không tìm thấy file', 404));
  }
  return res.sendFile(filePath);
});

module.exports = router;
