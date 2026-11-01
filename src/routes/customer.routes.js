const express = require('express');
const { body } = require('express-validator');
const { requireAuth, authorizeRoles } = require('../middlewares/auth.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const { validateRequest } = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/async-handler');
const customerController = require('../controllers/customer.controller');

const router = express.Router();
const customerOnly = [requireAuth, authorizeRoles('CUSTOMER')];

router.get('/my-vehicles', ...customerOnly, asyncHandler(customerController.renderMyVehicles));
router.get('/api/my-vehicles', ...customerOnly, asyncHandler(customerController.listMyVehicles));
router.get('/profile', ...customerOnly, asyncHandler(customerController.renderProfile));
router.post('/profile', ...customerOnly, verifyCsrf, [
  body('fullName').trim().isLength({ min: 1, max: 100 }).withMessage('Họ tên không hợp lệ'),
  body('phone').trim().matches(/^(0|\+84)[0-9]{9}$/).withMessage('Số điện thoại không hợp lệ'),
  body('email').trim().isEmail().withMessage('Email không hợp lệ'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Địa chỉ quá dài')
], validateRequest, asyncHandler(customerController.updateProfile));

module.exports = router;
