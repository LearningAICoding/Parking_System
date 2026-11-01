const asyncHandler = require('../utils/async-handler');
const env = require('../config/env');
const vehicleService = env.USE_MOCK ? require('../services/mock-vehicle.service') : require('../services/vehicle.service'); // placeholder for real service

// List vehicles of a specific customer (MANAGER/STAFF)
exports.listByCustomer = asyncHandler(async (req, res) => {
  const customerId = Number(req.params.id);
  const vehicles = await vehicleService.getVehiclesByCustomer(customerId);
  res.render('vehicles/list', { title: `Xe của khách hàng #${customerId}`, vehicles, customerId });
});

// List vehicles for the logged‑in CUSTOMER
exports.myVehicles = asyncHandler(async (req, res) => {
  const customerId = req.session && req.session.user && req.session.user.id;
  const vehicles = await vehicleService.getMyVehicles(customerId);
  res.render('vehicles/my-vehicles', { title: 'Xe của tôi', vehicles });
});

// Add a vehicle (available to all roles)
exports.addVehicle = asyncHandler(async (req, res) => {
  const { licensePlate, vehicleName, brand, vehicleType, ownerCustomerId } = req.body;
  const role = req.session && req.session.user && req.session.user.role;
  let ownerId = null;
  if (role === 'CUSTOMER') {
    // CUSTOMER can only add to own account
    ownerId = req.session.user.id;
  } else if (ownerCustomerId) {
    ownerId = Number(ownerCustomerId);
  }
  try {
    await vehicleService.addVehicle({ licensePlate, vehicleName, brand, vehicleType }, ownerId);
    // Success: redirect back to appropriate list page
    const redirect = role === 'CUSTOMER' ? '/my-vehicles' : req.get('referer') || '/';
    res.redirect(redirect);
  } catch (err) {
    // On error render a simple error page (could be improved)
    res.status(400).render('errors/400', { message: err.message });
  }
});
