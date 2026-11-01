const express = require('express');
const { body, query } = require('express-validator');
const { authorizeRoles, requireAuth } = require('../middlewares/auth.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const { validateRequest } = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/async-handler');
const { plateUpload } = require('../config/upload');
const parkingController = require('../controllers/parking.controller');

const router = express.Router();
const operatorOnly = [requireAuth, authorizeRoles('MANAGER', 'STAFF')];

router.get('/parking/checkin-checkout', ...operatorOnly, asyncHandler(parkingController.renderCheckinCheckout));
router.post(
  '/api/parking/scan-plate',
  ...operatorOnly,
  verifyCsrf,
  plateUpload.single('plateImage'),
  parkingController.handleUploadError,
  asyncHandler(parkingController.scanPlate)
);
router.post(
  '/api/parking/check-in',
  ...operatorOnly,
  verifyCsrf,
  [
    body('vehicleId').isInt({ min: 1 }).withMessage('vehicleId không hợp lệ'),
    body('slotId').isInt({ min: 1 }).withMessage('slotId không hợp lệ'),
    body('ticketId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('ticketId không hợp lệ'),
    body('scanToken').optional({ values: 'falsy' }).isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('scanToken không hợp lệ')
  ],
  validateRequest,
  asyncHandler(parkingController.checkIn)
);
router.post(
  '/api/parking/check-out',
  ...operatorOnly,
  verifyCsrf,
  body('sessionId').isInt({ min: 1 }).withMessage('sessionId không hợp lệ'),
  validateRequest,
  asyncHandler(parkingController.checkOut)
);
router.get(
  '/api/slots',
  requireAuth,
  query('zone').optional().isLength({ min: 1, max: 20 }),
  query('status').optional().isIn(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']),
  validateRequest,
  asyncHandler(parkingController.listSlots)
);

module.exports = router;
