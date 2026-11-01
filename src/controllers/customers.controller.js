const asyncHandler = require('../utils/async-handler');
const env = require('../config/env');
const customerService = env.USE_MOCK ? require('../services/mock-customer.service') : require('../services/customer.service'); // real service placeholder

// Render customer list page with optional search
exports.listCustomers = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword || '';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const allCustomers = keyword
    ? await customerService.searchCustomers(keyword)
    : await customerService.getCustomers();
  const total = allCustomers.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const customers = allCustomers.slice(offset, offset + limit);
  res.render('customers/list', {
    title: 'Danh sách khách hàng',
    customers,
    keyword,
    pagination: { page, totalPages, total },
  });
});
  const keyword = req.query.keyword || '';
  const customers = keyword
    ? await customerService.searchCustomers(keyword)
    : await customerService.getCustomers();
  res.render('customers/list', { title: 'Danh sách khách hàng', customers, keyword });
});

// Soft delete – invoked via POST from UI
exports.softDeleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await customerService.softDeleteCustomer(id);
  // after delete, redirect back to list (preserve any search keyword)
  const redirectUrl = req.get('referer') || '/customers';
  res.redirect(redirectUrl);
});
