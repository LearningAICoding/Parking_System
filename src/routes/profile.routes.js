const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/rbac.middleware');
const profileController = require('../controllers/profile.controller');

// CUSTOMER profile page (view & edit own info)
router.get('/profile', requireAuth, authorizeRoles('CUSTOMER'), profileController.viewProfile);
router.post('/profile', requireAuth, authorizeRoles('CUSTOMER'), profileController.updateProfile);

module.exports = router;
