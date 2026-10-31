const { SLOT_STATUS_LABEL } = require('../constants/slot-status');
const { VEHICLE_TYPE_LABEL, VEHICLE_DERIVED_STATUS_LABEL } = require('../constants/vehicle');

const LABELS = Object.freeze({
  slotStatus: SLOT_STATUS_LABEL,
  vehicleType: VEHICLE_TYPE_LABEL,
  derivedStatus: VEHICLE_DERIVED_STATUS_LABEL
});

// Đưa nhãn hiển thị dùng chung xuống mọi view để EJS và JS không tự định nghĩa lại
function viewLabels(_req, res, next) {
  res.locals.labels = LABELS;
  next();
}

module.exports = { viewLabels, LABELS };
