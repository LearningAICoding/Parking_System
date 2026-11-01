const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { requireAuth } = require('../middlewares/auth.middleware');
const homeController = require('../controllers/home.controller');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(homeController.renderHome));
router.get('/news', requireAuth, asyncHandler(homeController.renderNews));

module.exports = router;
