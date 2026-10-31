const express = require('express');
const { param } = require('express-validator');
const slotController = require('../controllers/slot.controller');
const asyncHandler = require('../utils/async-handler');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/rbac.middleware');
const { requireCsrf } = require('../middlewares/csrf.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { viewLabels } = require('../middlewares/view-locals.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(viewLabels);

const viewers = [requireAuth, authorizeRoles(ROLES.MANAGER, ROLES.STAFF)];
const managerOnly = [requireAuth, authorizeRoles(ROLES.MANAGER)];
const validId = [param('id').isInt({ min: 1 }).withMessage('Mã vị trí không hợp lệ'), validate];

// Task 14: danh sách vị trí
router.get('/slots', viewers, asyncHandler(slotController.list));

// Task 15: thêm/sửa vị trí (đặt trước /slots/:id)
router.get('/slots/create', managerOnly, slotController.createForm);
router.post('/slots/create', managerOnly, requireCsrf, asyncHandler(slotController.create));
router.get('/slots/:id/edit', managerOnly, validId, asyncHandler(slotController.editForm));
router.post('/slots/:id/edit', managerOnly, requireCsrf, validId, asyncHandler(slotController.edit));

// Task 16: chi tiết/xóa vị trí
router.get('/slots/:id', viewers, validId, asyncHandler(slotController.detail));
router.delete('/slots/:id', managerOnly, requireCsrf, validId, asyncHandler(slotController.remove));

module.exports = router;
