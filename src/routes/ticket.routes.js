const express = require('express');
const { param, query } = require('express-validator');
const { requireAuth, authorizeRoles } = require('../middlewares/auth.middleware');
const { verifyCsrf } = require('../middlewares/csrf.middleware');
const { validateRequest } = require('../middlewares/validate.middleware');
const asyncHandler = require('../utils/async-handler');
const ticketController = require('../controllers/ticket.controller');

const router = express.Router();

router.get('/tickets', requireAuth, authorizeRoles('MANAGER', 'STAFF'), query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 50 }), validateRequest, asyncHandler(ticketController.renderTickets));
router.delete('/tickets/:id', requireAuth, authorizeRoles('MANAGER'), verifyCsrf, param('id').isInt({ min: 1 }), validateRequest, asyncHandler(ticketController.deleteTicket));
router.get('/tickets/:id/edit', requireAuth, authorizeRoles('MANAGER'), param('id').isInt({ min: 1 }), validateRequest, asyncHandler(ticketController.renderEditTicket));
router.post('/tickets/:id/edit', requireAuth, authorizeRoles('MANAGER'), verifyCsrf, param('id').isInt({ min: 1 }), [
  require('express-validator').body('startDate').isISO8601({ strict: true, strictSeparator: true }).withMessage('Ngày bắt đầu không hợp lệ'),
  require('express-validator').body('endDate').isISO8601({ strict: true, strictSeparator: true }).withMessage('Ngày kết thúc không hợp lệ')
], validateRequest, asyncHandler(ticketController.editTicket));

module.exports = router;
