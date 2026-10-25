const express = require('express');
const controller = require('../controllers/parking.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const { uploadPlateImage } = require('../config/upload');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();
router.get('/files/plates/:filename', requireAuth, authorizeRoles('MANAGER', 'STAFF'), asyncHandler(controller.plateImage));
router.get('/parking/checkin-checkout', requireAuth, authorizeRoles('MANAGER', 'STAFF'), asyncHandler(controller.page));
router.post('/api/parking/scan-plate', requireAuth, authorizeRoles('MANAGER', 'STAFF'), verifyCsrf, uploadPlateImage, asyncHandler(controller.scanPlate));
router.post('/api/parking/check-in', requireAuth, authorizeRoles('MANAGER', 'STAFF'), verifyCsrf, asyncHandler(controller.checkIn));
router.post('/api/parking/check-out', requireAuth, authorizeRoles('MANAGER', 'STAFF'), verifyCsrf, asyncHandler(controller.checkOut));
module.exports = router;
