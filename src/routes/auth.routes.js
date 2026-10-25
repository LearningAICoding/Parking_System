const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/auth.controller');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();
const rateKey = (req, field) => JSON.stringify([
  req.ip || req.socket.remoteAddress || 'unknown',
  String(req.body?.[field] || '').trim().toLowerCase()
]);
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => rateKey(req, 'login'),
  message: 'Quá nhiều lần thử. Vui lòng chờ 15 phút.'
});
const forgotLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => rateKey(req, 'email'),
  message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
});

router.get('/login', controller.loginPage);
router.post('/login', loginLimit, verifyCsrf, asyncHandler(controller.login));
router.post('/logout', verifyCsrf, controller.logout);
router.get('/forgot-password', controller.forgotPage);
router.post('/forgot-password', forgotLimit, verifyCsrf, asyncHandler(controller.forgot));
router.get('/reset-password/:token', controller.resetPage);
router.post('/reset-password/:token', verifyCsrf, asyncHandler(controller.reset));

module.exports = router;
