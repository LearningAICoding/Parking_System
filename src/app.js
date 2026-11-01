const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const sessionMiddleware = require('./config/session');
const authRoutes = require('./routes/auth.routes');
const homeRoutes = require('./routes/home.routes');
const parkingRoutes = require('./routes/parking.routes');
const fileRoutes = require('./routes/file.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const ticketRoutes = require('./routes/ticket.routes');
const customerRoutes = require('./routes/customer.routes');
const parkingMapRoutes = require('./routes/parking-map.routes');
const employeeRoutes = require('./routes/employee.routes');
const adminCustomerRoutes = require('./routes/admin-customer.routes');
const statsRoutes = require('./routes/stats.routes');
const slotRoutes = require('./routes/slot.routes');
const { ensureCsrfToken } = require('./middlewares/csrf.middleware');
const errorHandler = require('./middlewares/error-handler.middleware');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'style-src': ["'self'"],
      'script-src': ["'self'"],
      'connect-src': ["'self'"],
      'img-src': ["'self'", 'data:']
    }
  }
}));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(sessionMiddleware);
app.use(ensureCsrfToken);
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.csrfToken = req.csrfToken();
  res.locals.req = req;
  res.locals.formError = null;
  res.locals.values = {};
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => res.json({ success: true, message: 'ok', data: {}, errors: [] }));
app.use(authRoutes);
app.use(homeRoutes);
app.use(parkingRoutes);
app.use(fileRoutes);
app.use(vehicleRoutes);
app.use(ticketRoutes);
app.use(customerRoutes);
app.use(parkingMapRoutes);
app.use(employeeRoutes);
app.use(adminCustomerRoutes);
app.use(statsRoutes);
app.use(slotRoutes);

app.use((req, _res, next) => {
  const error = new Error('Not found');
  error.statusCode = 404;
  next(error);
});
app.use(errorHandler);

module.exports = app;
