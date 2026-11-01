const express = require('express');
const { body } = require('express-validator');
const { requireAuth, authorizeRoles } = require('../middlewares/auth.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const { validateRequest } = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/async-handler');
const vehicleController = require('../controllers/vehicle.controller');
const vehicleSearch = require('../services/vehicle-search.service');

const router = express.Router();

router.get('/api/vehicles/search', requireAuth, authorizeRoles('MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const items = await vehicleSearch.searchVehicles(req.query.keyword);
  res.json({ success: true, message: '', data: { items }, errors: [] });
}));

router.post(
  '/api/vehicles',
  requireAuth,
  authorizeRoles('MANAGER', 'STAFF', 'CUSTOMER'),
  verifyCsrf,
  body('licensePlate').trim().isLength({ min: 1, max: 20 }).withMessage('Biển số xe bắt buộc'),
  body('vehicleName').trim().isLength({ min: 1, max: 100 }).withMessage('Tên xe bắt buộc'),
  body('brand').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).withMessage('Hãng xe quá dài'),
  body('vehicleType').isIn(['MOTORBIKE', 'CAR']).withMessage('Loại xe không hợp lệ'),
  body('customerId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('customerId không hợp lệ'),
  validateRequest,
  asyncHandler(vehicleController.createVehicle)
);

module.exports = router;
