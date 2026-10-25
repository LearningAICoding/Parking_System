const express = require('express');
const path = require('node:path');

const app = express();
const viewsDirectory = path.join(__dirname, 'views');
const publicDirectory = path.join(__dirname, '../public');
const port = Number(process.env.DEMO_PREVIEW_PORT || 3002);

const sampleCustomers = [
  { id: 1, fullName: 'Nguyễn Minh Anh', phone: '0901234567', email: 'minhanh@example.test', username: 'minhanh' },
  { id: 2, fullName: 'Trần Quốc Bảo', phone: '0912345678', email: 'quocbao@example.test', username: 'quocbao' }
];
const sampleEmployees = [
  { id: 1, fullName: 'Lê Thu Hà', username: 'thuhale', email: 'ha@example.test', phone: '0987654321', role: 'MANAGER', position: 'Quản lý' },
  { id: 2, fullName: 'Phạm Văn Nam', username: 'nampham', email: 'nam@example.test', phone: '0971234567', role: 'STAFF', position: 'Nhân viên vận hành' }
];
const sampleVehicles = [
  { id: 1, licensePlate: '51F12345', vehicleName: 'Honda City', brand: 'Honda', vehicleType: 'CAR', derivedStatus: 'PARKED', isVisitor: false, slotCode: 'A-01', checkInTime: '2026-10-24T08:30:00+07:00', lastExitTime: null },
  { id: 2, licensePlate: '59A67890', vehicleName: 'Yamaha Grande', brand: 'Yamaha', vehicleType: 'MOTORBIKE', derivedStatus: 'REGISTERED', isVisitor: false, slotCode: null, checkInTime: null, lastExitTime: '2026-10-23T17:10:00+07:00' }
];
const sampleSlots = [
  { id: 1, slotCode: 'A-01', zone: 'A', status: 'OCCUPIED', note: 'Gần lối vào' },
  { id: 2, slotCode: 'A-02', zone: 'A', status: 'AVAILABLE', note: '' },
  { id: 3, slotCode: 'A-03', zone: 'A', status: 'RESERVED', note: '' },
  { id: 4, slotCode: 'B-01', zone: 'B', status: 'MAINTENANCE', note: 'Kiểm tra định kỳ' }
];
const sampleTickets = [
  { id: 1, ticketCode: 'T-20261024-0001', licensePlate: '51F12345', vehicleName: 'Honda City', slotId: 1, slotCode: 'A-01', ticketType: 'DAILY', price: '50000.00', startDate: '2026-10-24', endDate: '2026-10-24', status: 'ACTIVE', createdAt: '2026-10-24 08:15:00' },
  { id: 2, ticketCode: 'T-20261023-0002', licensePlate: '59A67890', vehicleName: 'Yamaha Grande', slotId: 3, slotCode: 'A-03', ticketType: 'DAILY', price: '20000.00', startDate: '2026-10-23', endDate: '2026-10-23', status: 'EXPIRED', createdAt: '2026-10-23 09:00:00' }
];

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(publicDirectory));
app.set('view engine', 'ejs');
app.set('views', viewsDirectory);
app.use((req, res, next) => {
  const requestedRole = ['MANAGER', 'STAFF', 'CUSTOMER'].includes(req.query.role)
    ? req.query.role
    : null;
  const storedRole = req.headers.cookie?.match(/(?:^|;\s*)parking-demo-role=(MANAGER|STAFF|CUSTOMER)(?:;|$)/)?.[1];
  const role = requestedRole || storedRole || 'MANAGER';
  if (requestedRole) res.setHeader('Set-Cookie', `parking-demo-role=${requestedRole}; Path=/; SameSite=Lax`);
  res.locals.currentUser = role === 'CUSTOMER'
    ? { id: 3, customerId: 1, fullName: 'Nguyễn Minh Anh', role: 'CUSTOMER' }
    : { id: role === 'MANAGER' ? 1 : 2, fullName: role === 'MANAGER' ? 'Lê Thu Hà' : 'Phạm Văn Nam', role };
  res.locals.path = req.path;
  res.locals.notice = req.query.notice || null;
  res.locals.csrfToken = 'demo-preview-token-not-valid-for-real-app';
  res.locals.demoPreview = true;
  res.locals.demoRoleUrl = (targetRole) => {
    const targetPath = req.path === '/parking/map' && targetRole === 'CUSTOMER'
      ? '/customer/parking-map'
      : req.path === '/customer/parking-map' && targetRole !== 'CUSTOMER'
        ? '/parking/map'
        : req.path;
    return `${targetPath}?role=${targetRole}`;
  };
  if (role === 'CUSTOMER' && ['/employees', '/customers', '/parking/checkin-checkout', '/parking/map', '/tickets', '/slots', '/stats'].some((route) => req.path === route || req.path.startsWith(`${route}/`))) {
    return res.redirect(`/customer/parking-map?role=${role}`);
  }
  if (role !== 'CUSTOMER' && ['/my-vehicles', '/profile', '/customer/parking-map'].some((route) => req.path === route || req.path.startsWith(`${route}/`))) {
    return res.redirect(`/?role=${role}`);
  }
  next();
});

function render(view, title, locals = () => ({})) {
  return (req, res) => res.render(view, { title, ...locals(req), ...res.locals });
}

app.get('/', render('home', 'Trang chủ'));
app.get('/news', render('news', 'Tin tức'));
app.get('/employees', render('employees/list', 'Danh sách nhân viên', () => ({ employees: sampleEmployees, q: '' })));
app.get('/employees/create', render('employees/form', 'Thêm nhân viên', () => ({ employee: null, error: null })));
app.get('/employees/:id/edit', render('employees/form', 'Sửa nhân viên', () => ({ employee: sampleEmployees[0], error: null })));
app.get('/customers', render('customers/list', 'Danh sách khách hàng', () => ({ customers: sampleCustomers, q: '' })));
app.get('/customers/create', render('customers/form', 'Thêm khách hàng', () => ({ customer: null, error: null })));
app.get('/customers/:id/edit', render('customers/form', 'Sửa khách hàng', () => ({ customer: sampleCustomers[0], error: null })));
app.get('/customers/:id/vehicles', render('customers/vehicles', 'Thông tin xe', () => ({ customer: sampleCustomers[0], vehicles: sampleVehicles })));
app.get('/my-vehicles', render('customer/my-vehicles', 'Xe của tôi', () => ({ vehicles: sampleVehicles })));
app.get('/profile', render('customer/profile', 'Hồ sơ', () => ({ customer: { ...sampleCustomers[0], address: 'Quận 1, TP. Hồ Chí Minh' }, error: null })));
app.get('/parking/checkin-checkout', render('parking/checkin-checkout', 'Xe vào / ra', () => ({
  slots: sampleSlots.map(({ id, slotCode, status }) => ({ id, slotCode, status })),
  sessions: [{ sessionId: 101, licensePlate: '51F12345', vehicleName: 'Honda City', slotCode: 'A-01' }]
})));
app.get('/parking/map', render('parking/map', 'Bản đồ vị trí'));
app.get('/customer/parking-map', render('customer/parking-map', 'Bản đồ bãi đỗ'));
app.get('/tickets', render('tickets/list', 'Danh sách vé', () => ({ tickets: sampleTickets })));
app.get('/tickets/:id/edit', render('tickets/edit', 'Sửa vé', () => ({ ticket: sampleTickets[0], error: null })));
app.get('/slots', render('slots/list', 'Danh sách vị trí', () => ({ slots: sampleSlots })));
app.get('/slots/create', render('slots/form', 'Thêm vị trí', () => ({ slot: null, error: null })));
app.get('/slots/:id', render('slots/detail', 'Chi tiết vị trí', () => ({ slot: sampleSlots[0] })));
app.get('/slots/:id/edit', render('slots/form', 'Sửa vị trí', () => ({ slot: sampleSlots[0], error: null })));
app.get('/stats', render('stats/report', 'Thống kê'));

app.get('/api/slots', (req, res) => {
  const slots = sampleSlots.filter((slot) => (!req.query.zone || slot.zone === req.query.zone)
    && (!req.query.status || slot.status === req.query.status))
    .map(({ id, slotCode, zone, status }) => ({ id, slotCode, zone, status }));
  res.json({ success: true, data: { items: slots }, errors: [] });
});
app.get('/api/my-vehicles', (req, res) => res.json({ success: true, data: { items: sampleVehicles }, errors: [] }));
app.get('/api/vehicles/search', (req, res) => {
  const keyword = String(req.query.keyword || '').toLowerCase();
  const items = sampleVehicles.filter((vehicle) => vehicle.licensePlate.toLowerCase().includes(keyword))
    .map((vehicle) => ({ ...vehicle, customerName: 'Nguyễn Minh Anh', phone: '0901234567', customerId: 1 }));
  res.json({ success: true, data: { items: items.slice(0, 20) }, errors: [] });
});
app.get('/stats/report', (req, res) => res.json({
  success: true,
  data: {
    summary: { entries: 8, exits: 6, ticketRevenue: '240000.00', casualParkingRevenue: '60000.00', availableSlots: 12, occupiedSlots: 5 },
    series: [{ period: String(req.query.from || '2026-10-24'), entries: 8, exits: 6, ticketRevenue: '240000.00', casualParkingRevenue: '60000.00' }]
  },
  errors: []
}));
app.get('/api/slots/:id/vehicle', (req, res) => res.json({
  success: true,
  data: Number(req.params.id) === 1
    ? { vehicleId: 1, licensePlate: '51F12345', vehicleName: 'Honda City', brand: 'Honda', vehicleType: 'CAR', customerName: 'Nguyễn Minh Anh', phone: '0901234567', slotCode: 'A-01', sessionId: 101, checkInTime: '2026-10-24T08:30:00+07:00' }
    : null,
  errors: []
}));
app.post('/api/slots/:id/register', (req, res) => res.status(201).json({
  success: true,
  message: 'Đã đăng ký vị trí (bản xem trước).',
  data: { slotId: Number(req.params.id), slotCode: 'A-02', status: 'RESERVED', vehicleId: Number(req.body.vehicleId), ticketId: 3, ticketCode: 'DEMO-ONLY-0003', startDate: '2026-10-24', endDate: '2026-10-24', price: '50000.00' },
  errors: []
}));
app.post('/api/vehicles', (req, res) => res.status(201).json({
  success: true,
  message: 'Đã thêm xe (bản xem trước).',
  data: { id: 99, licensePlate: String(req.body.licensePlate || '').replace(/[^0-9A-Z]/gi, '').toUpperCase(), vehicleName: req.body.vehicleName || 'Xe demo', brand: req.body.brand || '', vehicleType: req.body.vehicleType || 'CAR', customerId: Number(req.body.customerId) || null },
  errors: []
}));
app.post('/api/parking/scan-plate', (req, res) => res.status(400).json({
  success: false,
  message: 'Scan ảnh không hoạt động trong bản xem trước offline.',
  data: null,
  errors: []
}));
app.post('/api/parking/check-in', (req, res) => res.status(201).json({ success: true, message: 'Check-in mô phỏng hoàn tất.', data: { slotCode: 'A-02' }, errors: [] }));
app.post('/api/parking/check-out', (req, res) => res.json({ success: true, message: 'Check-out mô phỏng hoàn tất.', data: { fee: '20000.00' }, errors: [] }));
app.delete('/employees/:id', (req, res) => res.json({ success: true, message: 'Đã xóa nhân viên (bản xem trước).', data: { id: Number(req.params.id) }, errors: [] }));
app.delete('/customers/:id', (req, res) => res.json({ success: true, message: 'Đã xóa khách hàng (bản xem trước).', data: { id: Number(req.params.id) }, errors: [] }));
app.delete('/tickets/:id', (req, res) => res.json({ success: true, message: 'Đã xóa vé (bản xem trước).', data: { id: Number(req.params.id) }, errors: [] }));
app.delete('/slots/:id', (req, res) => res.json({ success: true, message: 'Đã xóa vị trí (bản xem trước).', data: { id: Number(req.params.id) }, errors: [] }));
app.post(['/employees/create', '/employees/:id/edit', '/customers/create', '/customers/:id/edit', '/tickets/:id/edit', '/slots/create', '/slots/:id/edit', '/profile'], (req, res) => res.redirect(req.get('referer') || '/'));
app.use((req, res) => res.status(404).send('Không tìm thấy trang xem trước.'));

const server = app.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Demo preview (mock data only) listening on http://127.0.0.1:${port}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
