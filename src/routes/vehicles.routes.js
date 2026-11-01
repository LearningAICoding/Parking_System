const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/rbac.middleware');
const vehiclesController = require('../controllers/vehicles.controller');

// Manager/Staff view a customer's vehicles
router.get('/customers/:id/vehicles', requireAuth, authorizeRoles('MANAGER', 'STAFF'), vehiclesController.listByCustomer);

// CUSTOMER view own vehicles
router.get('/my-vehicles', requireAuth, authorizeRoles('CUSTOMER'), vehiclesController.myVehicles);

// Add vehicle (available to all roles, but CUSTOMER can only add to own account)
router.post('/vehicles/add', requireAuth, authorizeRoles('MANAGER', 'STAFF', 'CUSTOMER'), vehiclesController.addVehicle);

module.exports = router;
