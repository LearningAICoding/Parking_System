const service = require('../services/auth.service');
const { rotateCsrf } = require('../middlewares/csrf.middleware');
const AppError = require('../utils/app-error');
const env = require('../config/env');
const auditLog = require('../utils/audit-log');

function safeNextPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  const destination = new URL(value, 'http://parking.local');
  if (destination.origin !== 'http://parking.local') return '/';
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

exports.loginPage = (req, res) => res.render('auth/login', {
  title: 'Đăng nhập',
  next: safeNextPath(req.query.next),
  error: null,
  success: null
});

exports.login = async (req, res) => {
  let user;
  try {
    user = await service.login(req.body.login, req.body.password);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    auditLog('login_failed');
    return res.status(error.statusCode).render('auth/login', {
      title: 'Đăng nhập',
      next: safeNextPath(req.body.next),
      error: error.message,
      success: null
    });
  }

  req.session.regenerate((error) => {
    if (error) return res.status(500).render('errors/error', {
      title: 'Lỗi',
      status: 500,
      message: 'Không thể tạo phiên đăng nhập.',
      currentUser: null
    });

    req.session.user = user;
    rotateCsrf(req);
    req.session.save((saveError) => {
      if (saveError) return res.status(500).render('errors/error', {
        title: 'Lỗi',
        status: 500,
        message: 'Không thể lưu phiên đăng nhập.',
        currentUser: null
      });
      auditLog('login_succeeded', { userId: user.id, role: user.role });
      res.redirect(safeNextPath(req.body.next));
    });
  });
};

exports.logout = (req, res, next) => {
  const userId = req.session.user?.id;
  req.session.destroy((error) => {
    if (error) return next(error);
    auditLog('logout_succeeded', { userId });
    res.clearCookie('parking.sid');
    res.redirect('/login');
  });
};

exports.forgotPage = (req, res) => res.render('auth/forgot-password', {
  title: 'Quên mật khẩu',
  notice: null
});

exports.forgot = async (req, res) => {
  await service.requestPasswordReset(req.body.email, env.appBaseUrl);
  auditLog('password_reset_requested');
  res.render('auth/forgot-password', {
    title: 'Quên mật khẩu',
    notice: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi. Vui lòng kiểm tra hộp thư.'
  });
};

exports.resetPage = (req, res) => res.render('auth/reset-password', {
  title: 'Đặt lại mật khẩu',
  token: req.params.token,
  error: null
});

exports.reset = async (req, res) => {
  try {
    await service.resetPassword(req.params.token, req.body.password);
    auditLog('password_reset_succeeded');
    res.render('auth/login', {
      title: 'Đăng nhập',
      next: '/',
      error: null,
      success: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.'
    });
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    auditLog('password_reset_failed', { statusCode: error.statusCode });
    return res.status(error.statusCode).render('auth/reset-password', {
      title: 'Đặt lại mật khẩu',
      token: req.params.token,
      error: error.message
    });
  }
};
