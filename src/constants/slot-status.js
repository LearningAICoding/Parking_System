const SLOT_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE'
});

const SLOT_STATUS_LABEL = Object.freeze({ AVAILABLE: 'Trống', RESERVED: 'Đã đăng ký', OCCUPIED: 'Có xe', MAINTENANCE: 'Bảo trì' });
module.exports = { SLOT_STATUS, SLOT_STATUS_LABEL };
