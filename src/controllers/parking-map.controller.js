const service = require('../services/parking-map.service');
const customerService = require('../services/customer.service');
const auditLog = require('../utils/audit-log');

exports.operationsPage = (req, res) => res.render('parking/map', { title: 'Bản đồ vị trí đỗ' });
exports.customerPage = (req, res) => res.render('customer/parking-map', { title: 'Bản đồ bãi đỗ' });
exports.listSlots = async (req, res) => {
  const data = await service.getMapSlots({ zone: req.query.zone, status: req.query.status });
  res.json({ success: true, message: '', data: { items: data }, errors: [] });
};
exports.getVehicle = async (req, res) => {
  const data = await service.getVehicleAtSlot(req.params.id);
  res.json({ success: true, message: '', data, errors: [] });
};
exports.register = async (req, res) => {
  const data = await service.registerParkingSlot(req.params.id, req.body?.vehicleId, req.session.user);
  auditLog('parking_slot_registered', { actorUserId: req.session.user.id, slotId: data.slotId, vehicleId: data.vehicleId, ticketId: data.ticketId });
  res.status(201).json({ success: true, message: 'Đăng ký vị trí thành công.', data, errors: [] });
};
exports.myVehicles = async (req, res) => {
  const items = await customerService.getVehiclesForUser(req.session.user.id);
  res.json({ success: true, message: '', data: { items }, errors: [] });
};
