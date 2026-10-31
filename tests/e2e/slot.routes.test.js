jest.mock('../../src/services/slot.service');

const request = require('supertest');
const cheerio = require('cheerio');
const slotService = require('../../src/services/slot.service');
const AppError = require('../../src/utils/app-error');
const { buildSlotApp, as, CSRF } = require('../helpers/slot-app');

const app = buildSlotApp();
const slots = [
  { id: 1, slotCode: 'A-01', zone: 'B1-A', status: 'AVAILABLE', currentVehicleId: null },
  { id: 3, slotCode: 'A-03', zone: 'B1-A', status: 'OCCUPIED', currentVehicleId: 2 }
];

beforeEach(() => {
  slotService.isModifiable.mockImplementation(jest.requireActual('../../src/services/slot.service').isModifiable);
  slotService.listZones.mockResolvedValue(['B1-A', 'B1-B']);
  slotService.listSlots.mockResolvedValue(slots);
  slotService.getSlot.mockResolvedValue({ id: 1, slotCode: 'A-01', zone: 'B1-A', status: 'AVAILABLE', note: null });
  slotService.getSlotDetail.mockResolvedValue({
    id: 3, slotCode: 'A-03', zone: 'B1-A', status: 'OCCUPIED', note: null, vehicleId: 2,
    licensePlate: '51F12345', vehicleName: 'Honda City', brand: 'Honda', vehicleType: 'CAR',
    customerName: '<b>Nguyễn Văn A</b>', customerEmail: 'a@example.com', customerPhone: '0901234567'
  });
});

describe('RBAC ma trận vị trí đỗ (AGENTS.md mục 4)', () => {
  test.each([
    ['get', '/slots', null, 302], ['get', '/slots', 'CUSTOMER', 403], ['get', '/slots', 'STAFF', 200], ['get', '/slots', 'MANAGER', 200],
    ['get', '/slots/3', 'CUSTOMER', 403], ['get', '/slots/3', 'STAFF', 200], ['get', '/slots/3', 'MANAGER', 200],
    ['get', '/slots/create', 'STAFF', 403], ['get', '/slots/create', 'MANAGER', 200],
    ['get', '/slots/1/edit', 'STAFF', 403], ['get', '/slots/1/edit', 'MANAGER', 200],
    ['post', '/slots/create', 'STAFF', 403], ['post', '/slots/1/edit', 'STAFF', 403],
    ['delete', '/slots/1', null, 401], ['delete', '/slots/1', 'STAFF', 403], ['delete', '/slots/1', 'CUSTOMER', 403]
  ])('%s %s với %s -> %i', async (method, url, role, status) => {
    let req = request(app)[method](url);
    if (method === 'delete') req = req.set('Accept', 'application/json');
    const res = await as(role)(req).set('X-CSRF-Token', CSRF);
    expect(res.status).toBe(status);
  });

  test('chưa đăng nhập vào trang web -> redirect /login', async () => {
    const res = await request(app).get('/slots');
    expect(res.headers.location).toBe('/login?next=%2Fslots');
  });
});

describe('Task 14 – danh sách vị trí', () => {
  test('MANAGER thấy link Thêm/Sửa/Xóa/Chi tiết và dropdown tầng', async () => {
    const res = await as('MANAGER')(request(app).get('/slots?zone=B1-A'));
    const $ = cheerio.load(res.text);
    expect($('[data-testid="slot-add"]').attr('href')).toBe('/slots/create?zone=B1-A');
    expect($('tbody tr[data-slot-row]')).toHaveLength(2);
    expect($('a[href="/slots/1/edit"]').text()).toBe('Sửa');
    expect($('[data-slot-delete][data-slot-id="1"]').text()).toBe('Xóa');
    expect($('a.btn[href="/slots/1"]').text()).toBe('Chi tiết');
    expect($('#zone option:selected').val()).toBe('B1-A');
    expect(slotService.listSlots).toHaveBeenCalledWith({ zone: 'B1-A' });
    expect($('meta[name="csrf-token"]').attr('content')).toBe(CSRF);
  });

  test('STAFF chỉ thấy Chi tiết, không có Thêm/Sửa/Xóa', async () => {
    const res = await as('STAFF')(request(app).get('/slots'));
    const $ = cheerio.load(res.text);
    expect($('[data-testid="slot-add"]')).toHaveLength(0);
    expect($('[data-slot-delete]')).toHaveLength(0);
    expect($('#slotDeleteModal')).toHaveLength(0);
    expect($('a.btn[href="/slots/1"]').text()).toBe('Chi tiết');
  });

  test('lỗi kết nối hiển thị thông báo, không lộ chi tiết', async () => {
    slotService.listZones.mockRejectedValue(new AppError('Không kết nối được cơ sở dữ liệu, vui lòng thử lại sau', 503));
    const res = await as('MANAGER')(request(app).get('/slots'));
    expect(res.status).toBe(503);
    expect(res.text).toContain('Không kết nối được cơ sở dữ liệu');
  });
});

describe('Task 15 – thêm/sửa vị trí', () => {
  test('form thêm có CSRF và nút Thêm', async () => {
    const res = await as('MANAGER')(request(app).get('/slots/create'));
    const $ = cheerio.load(res.text);
    expect($('form input[name="_csrf"]').val()).toBe(CSRF);
    expect($('form').attr('action')).toBe('/slots/create');
    expect($('button[type="submit"]').text()).toBe('Thêm');
  });

  test('thêm thành công -> redirect danh sách, chỉ nhận field cho phép', async () => {
    slotService.createSlot.mockResolvedValue({ id: 8, slotCode: 'C-01' });
    const res = await as('MANAGER')(request(app).post('/slots/create'))
      .type('form').send({ _csrf: CSRF, slotCode: 'c-01', zone: 'B2', status: 'AVAILABLE', note: '', currentVehicleId: '5' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/slots');
    expect(slotService.createSlot).toHaveBeenCalledWith({ slotCode: 'c-01', zone: 'B2', status: 'AVAILABLE', note: '' });
  });

  test('thiếu CSRF -> 403', async () => {
    const res = await as('MANAGER')(request(app).post('/slots/create')).type('form').send({ slotCode: 'C-01', zone: 'B2' });
    expect(res.status).toBe(403);
    expect(slotService.createSlot).not.toHaveBeenCalled();
  });

  test('trùng mã -> 409, giữ dữ liệu và hiện lỗi tại trường', async () => {
    slotService.createSlot.mockRejectedValue(new AppError('Mã vị trí đã tồn tại', 409,
      [{ field: 'slotCode', message: 'Mã vị trí đã tồn tại', code: 'DUPLICATE' }]));
    const res = await as('MANAGER')(request(app).post('/slots/create')).type('form').send({ _csrf: CSRF, slotCode: 'A-01', zone: 'B1' });
    const $ = cheerio.load(res.text);
    expect(res.status).toBe(409);
    expect($('#slotCode').val()).toBe('A-01');
    expect($('#slotCode').hasClass('is-invalid')).toBe(true);
    expect($('.alert-danger').text()).toContain('Mã vị trí đã tồn tại');
  });

  test('form sửa: mã vị trí chỉ đọc, có Lưu và Hủy', async () => {
    const res = await as('MANAGER')(request(app).get('/slots/1/edit'));
    const $ = cheerio.load(res.text);
    expect($('#slotCode').attr('readonly')).toBeDefined();
    expect($('#slotCode').attr('name')).toBeUndefined();
    expect($('button[type="submit"]').text()).toBe('Lưu');
    expect($('[data-form-cancel]').attr('href')).toBe('/slots');
    expect($('[data-form-cancel]').text()).toBe('Hủy');
  });

  test('sửa thành công -> redirect danh sách', async () => {
    slotService.editSlot.mockResolvedValue({ id: 1, slotCode: 'A-01' });
    const res = await as('MANAGER')(request(app).post('/slots/1/edit'))
      .type('form').send({ _csrf: CSRF, zone: 'B1-A', status: 'MAINTENANCE', note: 'x' });
    expect(res.headers.location).toBe('/slots');
    expect(slotService.editSlot).toHaveBeenCalledWith(1, { zone: 'B1-A', status: 'MAINTENANCE', note: 'x' });
  });

  test('sửa ô đang có xe -> 409 hiển thị trên form', async () => {
    slotService.editSlot.mockRejectedValue(new AppError('Vị trí đang được sử dụng, không thể cập nhật', 409));
    const res = await as('MANAGER')(request(app).post('/slots/1/edit')).type('form').send({ _csrf: CSRF, zone: 'B1', status: 'AVAILABLE' });
    expect(res.status).toBe(409);
    expect(res.text).toContain('Vị trí đang được sử dụng');
  });

  test('id không hợp lệ -> 400', async () => {
    const res = await as('MANAGER')(request(app).get('/slots/abc/edit'));
    expect(res.status).toBe(400);
  });
});

describe('Task 16 – chi tiết/xóa vị trí', () => {
  test('chi tiết hiển thị khách hàng/xe, escape HTML, có Quay lại', async () => {
    const res = await as('STAFF')(request(app).get('/slots/3'));
    const $ = cheerio.load(res.text);
    expect(res.text).not.toContain('<b>Nguyễn Văn A</b>');
    expect($('dd').text()).toContain('<b>Nguyễn Văn A</b>');
    expect($('dd').text()).toContain('51F12345');
    expect($('[data-slot-back]').text()).toBe('Quay lại');
    expect($('[data-slot-delete]')).toHaveLength(0);
  });

  test('vị trí chưa có xe hiển thị thông báo', async () => {
    slotService.getSlotDetail.mockResolvedValue({ id: 1, slotCode: 'A-01', zone: 'B1-A', status: 'AVAILABLE', vehicleId: null });
    const res = await as('MANAGER')(request(app).get('/slots/1'));
    const $ = cheerio.load(res.text);
    expect($('[data-testid="slot-no-vehicle"]')).toHaveLength(1);
    expect($('#slotDeleteModal')).toHaveLength(1);
  });

  test('xóa thành công -> envelope chuẩn', async () => {
    slotService.deleteSlot.mockResolvedValue({ id: 1, slotCode: 'A-01' });
    const res = await as('MANAGER')(request(app).delete('/slots/1')).set('X-CSRF-Token', CSRF);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Đã xóa vị trí A-01', data: { id: 1 }, errors: [] });
  });

  test('xóa ô có xe -> 409 JSON tiếng Việt', async () => {
    slotService.deleteSlot.mockRejectedValue(new AppError('Vị trí đang có xe đăng ký hoặc đang được sử dụng, không thể xóa', 409));
    const res = await as('MANAGER')(request(app).delete('/slots/3')).set('X-CSRF-Token', CSRF);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, message: expect.stringContaining('không thể xóa') });
  });

  test('xóa thiếu CSRF -> 403', async () => {
    const res = await as('MANAGER')(request(app).delete('/slots/1'));
    expect(res.status).toBe(403);
    expect(slotService.deleteSlot).not.toHaveBeenCalled();
  });
});

describe('Trải nghiệm người dùng', () => {
  test('ô đang có xe: Sửa/Xóa bị vô hiệu kèm lý do', async () => {
    const res = await as('MANAGER')(request(app).get('/slots'));
    const $ = cheerio.load(res.text);
    const row = $('tr[data-slot-id="3"]');
    expect(row.find('[data-slot-locked]')).toHaveLength(2);
    expect(row.find('[data-slot-locked]').first().attr('disabled')).toBeDefined();
    expect(row.find('[title]').attr('title')).toContain('không thể sửa hoặc xóa');
    expect(row.find('a[href="/slots/3/edit"]')).toHaveLength(0);
  });

  test('bộ lọc trạng thái hiển thị số lượng và có ô tìm mã', async () => {
    const res = await as('STAFF')(request(app).get('/slots'));
    const $ = cheerio.load(res.text);
    expect($('[data-status-filter="AVAILABLE"] .pc-chip__count').text()).toBe('1');
    expect($('[data-status-filter="OCCUPIED"] .pc-chip__count').text()).toBe('1');
    expect($('[data-slot-search]')).toHaveLength(1);
  });

  test('sau khi thêm/sửa, dòng tương ứng được đánh dấu và có thông báo', async () => {
    const flashApp = buildSlotApp({ flash: { type: 'success', message: 'Đã thêm vị trí A-01', slotId: 1 } });
    const res = await as('MANAGER')(request(flashApp).get('/slots'));
    const $ = cheerio.load(res.text);
    expect($('tr[data-slot-id="1"]').attr('data-highlight')).toBeDefined();
    expect($('tr[data-slot-id="3"]').attr('data-highlight')).toBeUndefined();
    expect($('[data-autodismiss]').text()).toContain('Đã thêm vị trí A-01');
  });

  test('thêm thành công quay về đúng khu vực vừa thêm', async () => {
    slotService.createSlot.mockResolvedValue({ id: 8, slotCode: 'C-01', zone: 'B2 C' });
    const res = await as('MANAGER')(request(app).post('/slots/create')).type('form').send({ _csrf: CSRF, slotCode: 'C-01', zone: 'B2 C' });
    expect(res.headers.location).toBe('/slots?zone=B2%20C');
  });

  test('form thêm điền sẵn khu vực đang lọc và gợi ý danh sách khu vực', async () => {
    const res = await as('MANAGER')(request(app).get('/slots/create?zone=B1-B'));
    const $ = cheerio.load(res.text);
    expect($('#zone').val()).toBe('B1-B');
    expect($('#zoneOptions option').map((_i, el) => $(el).attr('value')).get()).toEqual(['B1-A', 'B1-B']);
    expect($('form').attr('data-focus')).toBe('slotCode');
  });

  test('form sửa ô đang có xe bị khóa và có cảnh báo', async () => {
    slotService.getSlot.mockResolvedValue({ id: 3, slotCode: 'A-03', zone: 'B1-A', status: 'OCCUPIED', currentVehicleId: 2 });
    const res = await as('MANAGER')(request(app).get('/slots/3/edit'));
    const $ = cheerio.load(res.text);
    expect($('[data-form-locked]')).toHaveLength(1);
    expect($('button[type="submit"]').attr('disabled')).toBeDefined();
  });

  test('form vẫn hiển thị khi không tải được gợi ý khu vực', async () => {
    slotService.listZones.mockRejectedValue(new Error('down'));
    const res = await as('MANAGER')(request(app).get('/slots/create'));
    expect(res.status).toBe(200);
  });

  test('lỗi validate đưa focus tới trường lỗi đầu tiên', async () => {
    slotService.createSlot.mockRejectedValue(new AppError('Dữ liệu vị trí đỗ không hợp lệ', 400,
      [{ field: 'zone', message: 'Khu vực/tầng là bắt buộc', code: 'REQUIRED' }]));
    const res = await as('MANAGER')(request(app).post('/slots/create')).type('form').send({ _csrf: CSRF, slotCode: 'A-09', zone: '' });
    const $ = cheerio.load(res.text);
    expect($('form').attr('data-focus')).toBe('zone');
    expect($('#zone').hasClass('is-invalid')).toBe(true);
  });

  test('chi tiết có vùng báo lỗi Quay lại (R4.4) và ẩn Xóa khi ô đang có xe', async () => {
    const res = await as('MANAGER')(request(app).get('/slots/3'));
    const $ = cheerio.load(res.text);
    expect($('[data-slot-back]').attr('href')).toBe('/slots');
    expect($('[data-slot-back-error]')).toHaveLength(1);
    expect($('#slotDeleteModal')).toHaveLength(0);
    expect($('[data-slot-locked]')).toHaveLength(2);
  });
});
