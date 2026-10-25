const express = require('express');
const controller = require('../controllers/vehicle.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();
router.use(requireAuth);
router.post('/', authorizeRoles('MANAGER', 'STAFF', 'CUSTOMER'), verifyCsrf, asyncHandler(controller.create));
router.get('/search', authorizeRoles('MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const items = await require('../services/vehicle-search.service').searchVehicles(req.query.keyword);
  res.json({ success: true, message: '', data: { items }, errors: [] });
}));
module.exports = router;
