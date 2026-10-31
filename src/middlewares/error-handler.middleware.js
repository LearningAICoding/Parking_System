function errorHandler(error, req, res, _next) {
  const status = error.statusCode || 500;
  const message = status === 500 ? 'Có lỗi hệ thống, vui lòng thử lại sau' : error.message;
  if (req.path.startsWith('/api/') || req.method === 'DELETE') {
    return res.status(status).json({ success: false, message, data: null, errors: error.errors || [] });
  }
  return res.status(status).render(`errors/${status === 403 ? '403' : status === 404 ? '404' : '500'}`, {
    title: 'Có lỗi xảy ra', message, currentUser: req.session?.user || null
  });
}

module.exports = { errorHandler };
