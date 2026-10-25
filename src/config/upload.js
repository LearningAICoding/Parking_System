const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const AppError = require('../utils/app-error');

const storageDirectory = path.resolve(__dirname, '../../storage/plates');
fs.mkdirSync(storageDirectory, { recursive: true });

const extensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, storageDirectory),
    filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${extensions[file.mimetype] || '.bin'}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!Object.hasOwn(extensions, file.mimetype)) return callback(new AppError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.', 400));
    callback(null, true);
  }
});

function uploadPlateImage(req, res, next) {
  upload.single('plateImage')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Ảnh vượt quá 5 MB', 413));
    }
    if (error instanceof multer.MulterError) return next(new AppError('Ảnh tải lên không hợp lệ.', 400));
    return next(error);
  });
}

async function validateImageMagicBytes(file) {
  if (!file) throw new AppError('Vui lòng tải ảnh biển số lên.', 400);
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const bytes = buffer.subarray(0, bytesRead);
    const valid = (file.mimetype === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
      || (file.mimetype === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        && path.extname(file.filename) === '.png')
      || (file.mimetype === 'image/webp' && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
        && bytes.subarray(8, 12).toString('ascii') === 'WEBP');
    if (!valid) throw new AppError('Định dạng ảnh không khớp nội dung tệp.', 400);
  } finally {
    await handle.close();
  }
}

module.exports = { storageDirectory, uploadPlateImage, validateImageMagicBytes };
