const vehicleService = require('../services/vehicle.service');

async function createVehicle(req, res, next) {
  try {
    const data = await vehicleService.createVehicle({ payload: req.body, actor: req.session.user });
    return res.status(201).json({ success: true, message: 'Thêm xe thành công', data, errors: [] });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createVehicle };
