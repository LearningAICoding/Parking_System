const express = require('express');
const controller = require('../controllers/parking-map.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();
router.get('/parking/map', requireAuth, authorizeRoles('MANAGER', 'STAFF'), controller.operationsPage);
router.get('/customer/parking-map', requireAuth, authorizeRoles('CUSTOMER'), controller.customerPage);
router.get('/api/slots', requireAuth, asyncHandler(controller.listSlots));
router.get('/api/slots/:id/vehicle', requireAuth, authorizeRoles('MANAGER', 'STAFF'), asyncHandler(controller.getVehicle));
router.post('/api/slots/:id/register', requireAuth, authorizeRoles('MANAGER', 'STAFF', 'CUSTOMER'), verifyCsrf, asyncHandler(controller.register));
router.get('/api/my-vehicles', requireAuth, authorizeRoles('CUSTOMER'), asyncHandler(controller.myVehicles));
module.exports = router;
