const customerService = require('../services/customer.service');

async function renderMyVehicles(req, res) {
  const items = await customerService.getMyVehicles(req.session.user.customerId);
  return res.render('customer/my-vehicles', { title: 'Xe của tôi', items });
}

async function listMyVehicles(req, res, next) {
  try {
    const items = await customerService.getMyVehicles(req.session.user.customerId);
    return res.json({ success: true, message: '', data: { items }, errors: [] });
  } catch (error) { return next(error); }
}

async function renderProfile(req, res, next) {
  try {
    const profile = await customerService.getProfile(req.session.user.id);
    return res.render('customer/profile', { title: 'Hồ sơ khách hàng', profile, formError: null });
  } catch (error) { return next(error); }
}

async function updateProfile(req, res, next) {
  try {
    if (req.validationErrors?.length) {
      const profile = await customerService.getProfile(req.session.user.id);
      return res.status(400).render('customer/profile', { title: 'Hồ sơ khách hàng', profile, values: req.body, formError: req.validationErrors[0].message });
    }
    await customerService.updateProfile(req.session.user.id, req.session.user.customerId, req.body);
    req.session.user.fullName = req.body.fullName;
    return res.redirect('/profile?updated=1');
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      const profile = await customerService.getProfile(req.session.user.id).catch(() => null);
      return res.status(error.statusCode).render('customer/profile', { title: 'Hồ sơ khách hàng', profile, values: req.body, formError: error.message });
    }
    return next(error);
  }
}

module.exports = { renderMyVehicles, listMyVehicles, renderProfile, updateProfile };
