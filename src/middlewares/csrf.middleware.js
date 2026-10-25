const crypto = require('node:crypto');
const AppError = require('../utils/app-error');
function issueCsrf(req, res, next) { if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex'); res.locals.csrfToken = req.session.csrfToken; next(); }
function verifyCsrf(req, res, next) { const supplied = req.get('X-CSRF-Token') || req.body?._csrf; const expected = req.session?.csrfToken; if (!supplied || !expected || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return next(new AppError('Phiên biểu mẫu đã hết hạn. Vui lòng tải lại trang và thử lại.', 403)); next(); }
function rotateCsrf(req) { req.session.csrfToken = crypto.randomBytes(32).toString('hex'); }
module.exports = { issueCsrf, verifyCsrf, rotateCsrf };
