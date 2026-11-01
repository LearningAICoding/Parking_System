const authService = require('../services/auth.service');

function renderAuthView(res, view, title, data = {}) {
  return res.render(view, { title, ...data });
}

function validationData(req) {
  return { validationErrors: req.validationErrors || [] };
}

async function showLogin(req, res) {
  return renderAuthView(res, 'auth/login', 'Đăng nhập', {
    returnTo: typeof req.query.returnTo === 'string' ? req.query.returnTo : '/',
    ...validationData(req)
  });
}

async function login(req, res, next) {
  try {
    if (req.validationErrors?.length) return showLogin(req, res);
    const user = await authService.authenticate(req.body.username, req.body.password);
    await new Promise((resolve, reject) => req.session.regenerate((error) => (error ? reject(error) : resolve())));
    req.session.user = user;
    const returnTo = typeof req.body.returnTo === 'string' && req.body.returnTo.startsWith('/')
      ? req.body.returnTo : '/';
    return res.redirect(returnTo);
  } catch (error) {
    if (error.statusCode === 401) {
      return renderAuthView(res, 'auth/login', 'Đăng nhập', {
        returnTo: req.body.returnTo || '/',
        formError: error.message,
        values: { username: req.body.username || '' },
        ...validationData(req)
      });
    }
    return next(error);
  }
}

async function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('parking.sid');
    return res.redirect('/login');
  });
}

async function showForgotPassword(req, res) {
  return renderAuthView(res, 'auth/forgot-password', 'Quên mật khẩu', {
    sent: req.query.sent === '1',
    ...validationData(req)
  });
}

async function forgotPassword(req, res, next) {
  try {
    if (req.validationErrors?.length) return showForgotPassword(req, res);
    await authService.requestPasswordReset(req.body.email);
    return res.redirect('/forgot-password?sent=1');
  } catch (error) {
    return next(error);
  }
}

async function showResetPassword(req, res) {
  if (req.validationErrors?.length) {
    return res.status(400).render('auth/reset-password', {
      title: 'Đặt lại mật khẩu', token: req.params.token,
      formError: req.validationErrors[0].message, validationErrors: req.validationErrors
    });
  }
  return renderAuthView(res, 'auth/reset-password', 'Đặt lại mật khẩu', {
    token: req.params.token,
    ...validationData(req)
  });
}

async function resetPassword(req, res, next) {
  try {
    if (req.validationErrors?.length) return showResetPassword(req, res);
    await authService.resetPassword(req.params.token, req.body.password);
    return res.redirect('/login?reset=1');
  } catch (error) {
    if (error.statusCode === 400) {
      return renderAuthView(res, 'auth/reset-password', 'Đặt lại mật khẩu', {
        token: req.params.token,
        formError: error.message,
        ...validationData(req)
      });
    }
    return next(error);
  }
}

module.exports = {
  showLogin,
  login,
  logout,
  showForgotPassword,
  forgotPassword,
  showResetPassword,
  resetPassword
};
