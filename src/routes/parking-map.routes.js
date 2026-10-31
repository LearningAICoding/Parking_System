const express = require('express');
const { param, body } = require('express-validator');
const parkingMapController = require('../controllers/parking-map.controller');
const asyncHandler = require('../utils/async-handler');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const { requireCsrf } = require('../middlewares/csrf.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { viewLabels } = require('../middlewares/view-locals.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(viewLabels);

const allRoles = [requireAuth, authorizeRoles(ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER)];
const operators = [requireAuth, authorizeRoles(ROLES.MANAGER, ROLES.STAFF)];
const validSlotId = [param('id').isInt({ min: 1 }).withMessage('Mã vị trí không hợp lệ'), validate];
const validVehicleId = [body('vehicleId').isInt({ min: 1 }).withMessage('Vui lòng chọn xe hợp lệ'), validate];

// Task 10: bản đồ vị trí bãi đỗ
router.get('/parking/map', allRoles, parkingMapController.mapPage);
router.get('/api/slots', allRoles, asyncHandler(parkingMapController.listSlots));
router.get('/api/slots/:id/vehicle', operators, validSlotId, asyncHandler(parkingMapController.vehicleAtSlot));
router.post('/api/slots/:id/register', allRoles, requireCsrf, validSlotId, validVehicleId,
  asyncHandler(parkingMapController.register));

module.exports = router;
