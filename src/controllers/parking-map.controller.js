const parkingMapService = require('../services/parking-map.service');
const { ROLES } = require('../constants/roles');
const { PRICING } = require('../config/pricing');

const ok = (res, data, message = '', status = 200) => res.status(status).json({ success: true, message, data, errors: [] });

function mapPage(req, res) {
  const { role } = req.session.user;
  const dailyPrices = PRICING.DAILY_TICKET;
  if (role === ROLES.CUSTOMER) {
    return res.render('customer/parking-map', { title: 'Bản đồ bãi đỗ xe', dailyPrices });
  }
  return res.render('parking/map', { title: 'Bản đồ vị trí bãi đỗ xe', dailyPrices });
}

async function listSlots(req, res) {
  const items = await parkingMapService.getMapSlots({ zone: req.query.zone, status: req.query.status });
  ok(res, { items });
}

async function vehicleAtSlot(req, res) {
  const vehicle = await parkingMapService.getVehicleAtSlot(Number(req.params.id));
  ok(res, vehicle, vehicle ? '' : 'Vị trí chưa có xe đang đỗ');
}

async function register(req, res) {
  const data = await parkingMapService.registerParkingSlot({
    slotId: Number(req.params.id),
    vehicleId: Number(req.body.vehicleId),
    user: req.session.user
  });
  ok(res, data, 'Đăng ký đỗ xe thành công', 201);
}

module.exports = { mapPage, listSlots, vehicleAtSlot, register };
