const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/rbac.middleware');
const customersController = require('../controllers/customers.controller');

// List customers (MANAGER, STAFF)
router.get('/customers', requireAuth, authorizeRoles('MANAGER', 'STAFF'), customersController.listCustomers);

// Soft delete customer (POST) – CSRF protected via middleware globally
router.post('/customers/:id/delete', requireAuth, authorizeRoles('MANAGER'), customersController.softDeleteCustomer);

module.exports = router;
