const express = require('express');
const session = require('express-session');
const path = require('path');
const env = require('./config/env');
const csrfProtection = require('./middlewares/csrf.middleware');
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
const { ensureCsrfToken } = require('./middlewares/csrf.middleware');
const errorHandler = require('./middlewares/error-handler.middleware');

const app = express();

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Session (simple memory store for development)
app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000 } // 2h
}));

// CSRF protection
app.use(csrfProtection);

// Make current user and CSRF token available to views
app.use((req, res, next) => {
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  // csurf adds a req.csrfToken() function
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  next();
});

const homeRoutes = require('./routes/home.routes');

const customersRoutes = require('./routes/customers.routes');
const vehiclesRoutes = require('./routes/vehicles.routes');
const profileRoutes = require('./routes/profile.routes');


app.use('/', homeRoutes);
app.use('/', customersRoutes);
app.use('/', vehiclesRoutes);
app.use('/', profileRoutes);





// Error handling – must be after all routes
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'style-src': ["'self'", 'https://cdn.jsdelivr.net'],
      'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
      'connect-src': ["'self'", 'https://cdn.jsdelivr.net'],
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

app.use((req, _res, next) => {
  const error = new Error('Not found');
  error.statusCode = 404;
  next(error);
});
app.use(errorHandler);

module.exports = app;
