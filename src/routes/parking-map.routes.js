const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth, authorizeRoles } = require('../middlewares/auth.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const { validateRequest } = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/async-handler');
const mapController = require('../controllers/parking-map.controller');

const router = express.Router();

router.get('/parking/map', requireAuth, authorizeRoles('MANAGER', 'STAFF', 'CUSTOMER'), asyncHandler(mapController.renderMap));
router.get('/api/slots/:id/vehicle', requireAuth, authorizeRoles('MANAGER', 'STAFF'), param('id').isInt({ min: 1 }), validateRequest, asyncHandler(mapController.getVehicleAtSlot));
router.post('/api/slots/:id/register', requireAuth, authorizeRoles('MANAGER', 'STAFF', 'CUSTOMER'), verifyCsrf, param('id').isInt({ min: 1 }), body('vehicleId').isInt({ min: 1 }).withMessage('vehicleId không hợp lệ'), validateRequest, asyncHandler(mapController.registerSlot));

module.exports = router;
