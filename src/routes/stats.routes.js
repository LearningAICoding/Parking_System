const express = require('express');
const controller = require('../controllers/stats.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();
router.use(requireAuth, authorizeRoles('MANAGER'));
router.get('/stats', controller.page);
router.get('/stats/report', asyncHandler(controller.report));
module.exports = router;
