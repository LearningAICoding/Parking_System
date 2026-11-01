const asyncHandler = require('../utils/async-handler');
const env = require('../config/env');
const customerService = env.USE_MOCK ? require('../services/mock-customer.service') : require('../services/customer.service'); // placeholder

// Render CUSTOMER's personal profile page
exports.viewProfile = asyncHandler(async (req, res) => {
  const userId = req.session && req.session.user && req.session.user.id;
  // In mock mode we can reuse getCustomers and filter
  const customers = await customerService.getCustomers();
  const profile = customers.find(c => c.id === userId);
  res.render('profile/edit', { title: 'Hồ sơ cá nhân', profile });
});

// Handle profile update (POST)
exports.updateProfile = asyncHandler(async (req, res) => {
  const userId = req.session && req.session.user && req.session.user.id;
  const { fullName, phone, email, address } = req.body;
  try {
    await customerService.updateCustomer(userId, { fullName, phone, email, address });
    // Success: redirect back with a flash (simple query param)
    res.redirect('/profile?updated=1');
  } catch (err) {
    res.status(400).render('errors/400', { message: err.message });
  }
});
