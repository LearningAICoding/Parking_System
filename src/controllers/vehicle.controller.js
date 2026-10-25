const service = require('../services/vehicle.service');

exports.create = async (req, res) => {
  const data = await service.create(req.body || {}, req.session.user);
  res.status(201).json({ success: true, message: 'Đã thêm xe.', data, errors: [] });
};

exports.search = async (req, res) => {
  const items = await service.searchVehicles(req.query.keyword);
  res.json({ success: true, message: '', data: { items }, errors: [] });
};
