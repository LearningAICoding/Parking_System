const path = require('path');
const express = require('express');
const slotRoutes = require('../../src/routes/slot.routes');
const parkingMapRoutes = require('../../src/routes/parking-map.routes');
const { csrfToken } = require('../../src/middlewares/csrf.middleware');
const { errorHandler } = require('../../src/middlewares/error-handler.middleware');

const CSRF = 'test-csrf-token';
const USERS = {
  MANAGER: { id: 1, role: 'MANAGER', fullName: 'Quản lý' },
  STAFF: { id: 2, role: 'STAFF', fullName: 'Nhân viên' },
  CUSTOMER: { id: 3, role: 'CUSTOMER', customerId: 1, fullName: 'Khách' }
};

// Session giả lập theo header x-test-role để test không phụ thuộc Task 1 (đăng nhập).
function buildSlotApp({ flash } = {}) {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../../src/views'));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use((req, _res, next) => {
    const role = req.get('x-test-role');
    req.session = { csrfToken: CSRF, ...(role ? { user: USERS[role] } : {}), ...(flash ? { flash } : {}) };
    next();
  });
  app.use(csrfToken);
  app.use(slotRoutes);
  app.use(parkingMapRoutes);
  app.use(errorHandler);
  return app;
}

const as = (role) => (req) => (role ? req.set('x-test-role', role) : req);

module.exports = { buildSlotApp, as, CSRF };
