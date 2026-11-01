const { sendError } = require('../utils/api-response');

function errorHandler(error, req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? 'Đã xảy ra lỗi máy chủ' : error.message;
  if (req.path.startsWith('/api') || (req.get('Accept') || '').includes('application/json')) {
    return sendError(res, statusCode, message, error.errors || []);
  }
  if (statusCode === 401) return res.redirect('/login');
  if (statusCode === 403) return res.status(403).render('errors/403', { title: 'Không có quyền', currentUser: req.session?.user || null });
  if (statusCode === 404) return res.status(404).render('errors/404', { title: 'Không tìm thấy', currentUser: req.session?.user || null });
  return res.status(statusCode).render('errors/500', { title: 'Lỗi máy chủ', currentUser: req.session?.user || null });
}

module.exports = errorHandler;
