const service = require('../services/admin-customer.service');
const auditLog = require('../utils/audit-log');

function whitelist(body, fields) {
  return Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
}

exports.list = async (req, res) => res.render('customers/list', {
  title: 'Quản lý khách hàng',
  customers: await service.list(req.query.q || ''),
  q: req.query.q || ''
});

exports.createPage = (req, res) => res.render('customers/form', {
  title: 'Thêm khách hàng',
  customer: null,
  error: null
});

exports.create = async (req, res) => {
  const input = whitelist(req.body, ['fullName', 'phone', 'email', 'address', 'username', 'password']);
  try {
    await service.create(input);
    auditLog('customer_created', { actorUserId: req.session.user.id });
    res.redirect('/customers?notice=created');
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      const customer = whitelist(input, ['fullName', 'phone', 'email', 'address', 'username']);
      return res.status(error.statusCode).render('customers/form', {
        title: 'Thêm khách hàng',
        customer,
        error: error.message
      });
    }
    throw error;
  }
};

exports.editPage = async (req, res) => res.render('customers/form', {
  title: 'Sửa khách hàng',
  customer: await service.get(req.params.id),
  error: null
});

exports.update = async (req, res) => {
  const input = whitelist(req.body, ['fullName', 'phone', 'email', 'address']);
  try {
    await service.update(req.params.id, input);
    auditLog('customer_updated', { actorUserId: req.session.user.id, customerId: Number(req.params.id) });
    res.redirect('/customers?notice=updated');
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).render('customers/form', {
        title: 'Sửa khách hàng',
        customer: { id: req.params.id, ...input },
        error: error.message
      });
    }
    throw error;
  }
};

exports.remove = async (req, res) => {
  await service.remove(req.params.id);
  auditLog('customer_deleted', { actorUserId: req.session.user.id, customerId: Number(req.params.id) });
  res.json({ success: true, message: 'Đã xóa khách hàng.', data: { id: Number(req.params.id) }, errors: [] });
};

exports.vehicles = async (req, res) => res.render('customers/vehicles', {
  title: 'Thông tin xe khách hàng',
  customer: await service.get(req.params.id),
  vehicles: await service.getVehiclesForCustomer(req.params.id)
});

exports.myVehiclesPage = async (req, res) => res.render('customer/my-vehicles', {
  title: 'Xe của tôi',
  vehicles: await service.getVehiclesForUser(req.session.user.id)
});

exports.profilePage = async (req, res) => res.render('customer/profile', {
  title: 'Hồ sơ của tôi',
  customer: await service.getOwnProfile(req.session.user.id),
  error: null
});

exports.updateProfile = async (req, res) => {
  const input = whitelist(req.body, ['fullName', 'phone', 'email', 'address']);
  try {
    const customer = await service.updateOwnProfile(req.session.user.id, input);
    req.session.user.fullName = customer.fullName;
    req.session.user.email = customer.email;
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    res.redirect('/profile?notice=updated');
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      const customer = await service.getOwnProfile(req.session.user.id);
      return res.status(error.statusCode).render('customer/profile', {
        title: 'Hồ sơ của tôi',
        customer: { ...customer, ...input },
        error: error.message
      });
    }
    throw error;
  }
};
