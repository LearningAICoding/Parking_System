const SLOT_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE'
});

// Nhãn hiển thị duy nhất cho trạng thái ô; màu nằm ở public/css/parking.css theo data-status
const SLOT_STATUS_LABEL = Object.freeze({
  AVAILABLE: 'Trống',
  RESERVED: 'Đã đăng ký',
  OCCUPIED: 'Có xe',
  MAINTENANCE: 'Bảo trì'
});

module.exports = { SLOT_STATUS, SLOT_STATUS_LABEL };
