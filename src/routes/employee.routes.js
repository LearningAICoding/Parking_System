const express = require('express');
const { requireAuth, authorizeRoles } = require('../middlewares/auth.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const asyncHandler = require('../utils/async-handler');
const controller = require('../controllers/employee.controller');

const router = express.Router();
router.get('/employees', requireAuth, authorizeRoles('MANAGER'), asyncHandler(controller.list));
router.get('/employees/create', requireAuth, authorizeRoles('MANAGER'), controller.createPage);
router.post('/employees/create', requireAuth, authorizeRoles('MANAGER'), verifyCsrf, asyncHandler(controller.create));
router.get('/employees/:id/edit', requireAuth, authorizeRoles('MANAGER'), asyncHandler(controller.editPage));
router.post('/employees/:id/edit', requireAuth, authorizeRoles('MANAGER'), verifyCsrf, asyncHandler(controller.update));
router.delete('/employees/:id', requireAuth, authorizeRoles('MANAGER'), verifyCsrf, asyncHandler(controller.remove));

module.exports = router;
