const express = require('express');
const { requireAuth, authorizeRoles } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/async-handler');
const controller = require('../controllers/stats.controller');
const router = express.Router();

router.get('/stats', requireAuth, authorizeRoles('MANAGER'), controller.page);
router.get('/stats/report', requireAuth, authorizeRoles('MANAGER'), asyncHandler(controller.report));
module.exports = router;
