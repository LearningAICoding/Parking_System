const express = require('express');
const controller = require('../controllers/slot.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();
router.use(requireAuth, authorizeRoles('MANAGER', 'STAFF'));
router.get('/', asyncHandler(controller.list));
router.get('/create', authorizeRoles('MANAGER'), controller.createPage);
router.post('/create', authorizeRoles('MANAGER'), verifyCsrf, asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.detail));
router.post('/:id/edit', authorizeRoles('MANAGER'), verifyCsrf, asyncHandler(controller.update));
router.get('/:id/edit', authorizeRoles('MANAGER'), asyncHandler(controller.editPage));
router.delete('/:id', authorizeRoles('MANAGER'), verifyCsrf, asyncHandler(controller.remove));
module.exports = router;
