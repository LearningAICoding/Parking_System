const express = require('express');
const controller = require('../controllers/customer.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();
router.use(requireAuth);
router.get('/', authorizeRoles('MANAGER', 'STAFF'), asyncHandler(controller.list));
router.get('/create', authorizeRoles('MANAGER', 'STAFF'), controller.createPage);
router.post('/create', authorizeRoles('MANAGER', 'STAFF'), verifyCsrf, asyncHandler(controller.create));
router.get('/:id/vehicles', authorizeRoles('MANAGER', 'STAFF'), asyncHandler(controller.vehicles));
router.get('/:id/edit', authorizeRoles('MANAGER', 'STAFF'), asyncHandler(controller.editPage));
router.post('/:id/edit', authorizeRoles('MANAGER', 'STAFF'), verifyCsrf, asyncHandler(controller.update));
router.delete('/:id', authorizeRoles('MANAGER', 'STAFF'), verifyCsrf, asyncHandler(controller.remove));
module.exports = router;
