const express = require('express');
const { requireAuth, authorizeRoles } = require('../middlewares/auth.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const asyncHandler = require('../utils/async-handler');
const controller = require('../controllers/admin-customer.controller');
const router = express.Router();

router.get('/customers', requireAuth, authorizeRoles('MANAGER', 'STAFF'), asyncHandler(controller.list));
router.get('/customers/create', requireAuth, authorizeRoles('MANAGER', 'STAFF'), controller.createPage);
router.post('/customers/create', requireAuth, authorizeRoles('MANAGER', 'STAFF'), verifyCsrf, asyncHandler(controller.create));
router.get('/customers/:id/vehicles', requireAuth, authorizeRoles('MANAGER', 'STAFF'), asyncHandler(controller.vehicles));
router.get('/customers/:id/edit', requireAuth, authorizeRoles('MANAGER', 'STAFF'), asyncHandler(controller.editPage));
router.post('/customers/:id/edit', requireAuth, authorizeRoles('MANAGER', 'STAFF'), verifyCsrf, asyncHandler(controller.update));
router.delete('/customers/:id', requireAuth, authorizeRoles('MANAGER', 'STAFF'), verifyCsrf, asyncHandler(controller.remove));

module.exports = router;
