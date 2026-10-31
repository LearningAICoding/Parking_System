const VEHICLE_TYPE_LABEL = Object.freeze({ CAR: 'Ô tô', MOTORBIKE: 'Xe máy' });

// Nhãn trạng thái dẫn xuất của xe (AGENTS.md mục 7.1) dùng ở giao diện CUSTOMER
const VEHICLE_DERIVED_STATUS_LABEL = Object.freeze({
  REGISTERED: 'Sẵn sàng',
  EXITED: 'Đã ra bãi',
  RESERVED: 'Đang giữ chỗ',
  PARKED: 'Đang đỗ'
});

module.exports = { VEHICLE_TYPE_LABEL, VEHICLE_DERIVED_STATUS_LABEL };
