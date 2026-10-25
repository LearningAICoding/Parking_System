const express = require('express');
const controller = require('../controllers/customer.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();
router.use(requireAuth, authorizeRoles('CUSTOMER'));
router.get('/my-vehicles', asyncHandler(controller.myVehiclesPage));
router.get('/profile', asyncHandler(controller.profilePage));
router.post('/profile', verifyCsrf, asyncHandler(controller.updateProfile));
module.exports = router;
