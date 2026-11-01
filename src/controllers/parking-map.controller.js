const parkingMapService = require('../services/parking-map.service');

async function renderMap(req, res) {
  const view = req.session.user.role === 'CUSTOMER' ? 'customer/parking-map' : 'parking/map';
  return res.render(view, { title: 'Bản đồ bãi đỗ' });
}

async function getVehicleAtSlot(req, res, next) {
  try {
    const data = await parkingMapService.getVehicleAtSlot(Number(req.params.id));
    return res.json({ success: true, message: '', data, errors: [] });
  } catch (error) { return next(error); }
}

async function registerSlot(req, res, next) {
  try {
    const data = await parkingMapService.registerParkingSlot({ slotId: Number(req.params.id), vehicleId: Number(req.body.vehicleId), actor: req.session.user });
    return res.status(201).json({ success: true, message: 'Đăng ký đỗ xe thành công', data, errors: [] });
  } catch (error) { return next(error); }
}

module.exports = { renderMap, getVehicleAtSlot, registerSlot };
