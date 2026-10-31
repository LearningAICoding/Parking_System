// Server preview CHỈ DÙNG DEV cho Task 10 và Task 14–16, khi chưa có app.js/đăng nhập (Task 1–2).
// Không dùng cho production; xóa khi app.js chính thức đã mount slot.routes và parking-map.routes.
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const pool = require('../src/config/db');
const slotRoutes = require('../src/routes/slot.routes');
const parkingMapRoutes = require('../src/routes/parking-map.routes');
const { requireAuth } = require('../src/middlewares/auth.middleware');
const { authorizeRoles } = require('../src/middlewares/rbac.middleware');
const asyncHandler = require('../src/utils/async-handler');
const { csrfToken } = require('../src/middlewares/csrf.middleware');
const { errorHandler } = require('../src/middlewares/error-handler.middleware');

const DEV_USERS = {
  MANAGER: { id: 1, role: 'MANAGER', fullName: 'Quản lý (dev)' },
  STAFF: { id: 2, role: 'STAFF', fullName: 'Nhân viên (dev)' },
  CUSTOMER: { id: 3, role: 'CUSTOMER', customerId: 1, fullName: 'Khách hàng (dev)' }
};

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../src/views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'dev-only-secret', resave: false, saveUninitialized: true }));
app.use(csrfToken);

// Thay cho màn hình đăng nhập: chọn vai trò để xem giao diện
app.get(['/', '/login'], (req, res) => {
  const next = typeof req.query.next === 'string' && req.query.next.startsWith('/') ? req.query.next : '/slots';
  const links = Object.keys(DEV_USERS)
    .map((role) => `<a class="btn btn-outline-primary me-2" href="/dev-login?role=${role}&next=${encodeURIComponent(next)}">${role}</a>`)
    .join('');
  res.send(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Dev login</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"></head>
<body class="container py-5"><h1 class="h4">Preview Task 10, 14–16 – chọn vai trò</h1>
<p class="text-muted">Đang đăng nhập: ${req.session.user ? req.session.user.role : 'chưa'}</p>${links}
<p class="mt-4 mb-1">Sau khi chọn vai trò, mở:</p>
<ul><li><a href="/slots">/slots</a> – Quản lý vị trí đỗ (Task 14–16)</li>
<li><a href="/parking/map">/parking/map</a> – Bản đồ vị trí bãi đỗ (Task 10)</li></ul></body></html>`);
});

app.get('/dev-login', (req, res) => {
  req.session.user = DEV_USERS[req.query.role] || DEV_USERS.MANAGER;
  const next = typeof req.query.next === 'string' && req.query.next.startsWith('/') ? req.query.next : '/slots';
  res.redirect(next);
});

// STUB DEV cho API thuộc Task 9 (/api/vehicles/search) và Task 6 (/api/my-vehicles) để bản đồ chạy được.
// Xóa khi các Task đó merge; code chính thức phải đi qua controller/service/model.
app.get('/api/vehicles/search', requireAuth, authorizeRoles('MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const keyword = String(req.query.keyword || '').trim().slice(0, 50);
  const like = `%${keyword.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  const plate = `%${keyword.toUpperCase().replace(/[^0-9A-Z]/g, '')}%`;
  const [items] = await pool.execute(
    `SELECT v.id, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName, v.brand,
      c.full_name AS customerName, c.phone, c.id AS customerId
     FROM vehicles v LEFT JOIN customers c ON c.id = v.customer_id AND c.deleted_at IS NULL
     WHERE v.license_plate LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ? ORDER BY v.license_plate LIMIT 20`,
    [plate, like, like]
  );
  res.json({ success: true, message: '', data: { items }, errors: [] });
}));

app.get('/api/my-vehicles', requireAuth, authorizeRoles('CUSTOMER'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT v.id, v.license_plate AS licensePlate, v.vehicle_name AS vehicleName, v.brand, v.vehicle_type AS vehicleType,
      s.slot_code AS slotCode, s.status AS slotStatus
     FROM vehicles v LEFT JOIN parking_slots s ON s.current_vehicle_id = v.id
     WHERE v.customer_id = ? ORDER BY v.license_plate`, [req.session.user.customerId]
  );
  const items = rows.map(({ slotStatus, ...vehicle }) => ({
    ...vehicle,
    derivedStatus: slotStatus === 'OCCUPIED' ? 'PARKED' : slotStatus === 'RESERVED' ? 'RESERVED' : 'REGISTERED',
    isVisitor: false, checkInTime: null, lastExitTime: null
  }));
  res.json({ success: true, message: '', data: { items }, errors: [] });
}));

app.use(slotRoutes);
app.use(parkingMapRoutes);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Preview Task 10, 14–16: http://localhost:${port}/login`);
});
