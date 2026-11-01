const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

const plateDirectory = path.resolve(process.cwd(), 'storage', 'plates');
fs.mkdirSync(plateDirectory, { recursive: true });

const extensionByMime = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, plateDirectory),
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${extensionByMime[file.mimetype] || '.bin'}`)
});

const plateUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!extensionByMime[file.mimetype]) return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'plateImage'));
    return callback(null, true);
  }
});

function extensionForMime(mime) {
  return extensionByMime[mime] || null;
}

module.exports = { plateDirectory, plateUpload, extensionForMime };
