jest.mock('../../src/services/parking-map.service');

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { JSDOM } = require('jsdom');
const { buildSlotApp, as } = require('../helpers/slot-app');

const CLIENT_JS = fs.readFileSync(path.join(__dirname, '../../public/js/parking-map.js'), 'utf8');
const app = buildSlotApp();

const SLOTS = [
  { id: 1, slotCode: 'A-01', zone: 'B1-A', status: 'AVAILABLE' },
  { id: 2, slotCode: 'A-02', zone: 'B1-A', status: 'RESERVED' },
  { id: 3, slotCode: 'A-03', zone: 'B1-A', status: 'OCCUPIED' },
  { id: 4, slotCode: 'B-01', zone: 'B2', status: 'MAINTENANCE' }
];
const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const ok = (data) => json(200, { success: true, message: '', data, errors: [] });
const flush = () => new Promise((resolve) => { setTimeout(resolve, 0); });
const openWindows = [];

// Đóng JSDOM để dừng setInterval tự làm mới bản đồ
afterEach(() => { openWindows.splice(0).forEach((window) => window.close()); });

// Render trang thật từ server, chạy public/js/parking-map.js trong JSDOM với fetch giả lập.
async function loadMap(role, routes = {}) {
  const res = await as(role)(request(app).get('/parking/map'));
  const html = res.text.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/parking/map', pretendToBeVisual: true });
  const fetch = jest.fn((url, options = {}) => {
    const key = `${options.method || 'GET'} ${url.split('?')[0]}`;
    const handler = routes[key] || (key === 'GET /api/slots' ? () => ok({ items: SLOTS }) : () => json(404, { success: false, message: 'Không tìm thấy' }));
    return handler(url, options);
  });
  dom.window.fetch = fetch;
  openWindows.push(dom.window);
  dom.window.eval(CLIENT_JS);
  await flush();
  return { window: dom.window, document: dom.window.document, fetch };
}

const tile = (document, id) => document.querySelector(`[data-slot-tile="${id}"]`);

describe('Bản đồ – dựng lưới', () => {
  test('nhóm theo khu vực, đếm trạng thái, không hiển thị biển số', async () => {
    const { document } = await loadMap('STAFF');
    expect(document.querySelectorAll('[data-slot-tile]')).toHaveLength(4);
    expect(Array.from(document.querySelectorAll('[data-map-board] h2')).map((h) => h.textContent.replace(/\s+/g, ' ').trim()))
      .toEqual(['Khu vực B1-A 1/3 trống', 'Khu vực B2 0/1 trống']);
    expect(document.querySelector('[data-count="AVAILABLE"]').textContent).toBe('1');
    expect(Array.from(document.querySelectorAll('[data-map-zone] option')).map((o) => o.value)).toEqual(['', 'B1-A', 'B2']);
  });

  test('lọc theo khu vực và trạng thái', async () => {
    const { window, document } = await loadMap('STAFF');
    const zone = document.querySelector('[data-map-zone]');
    zone.value = 'B1-A';
    zone.dispatchEvent(new window.Event('change'));
    expect(document.querySelectorAll('[data-slot-tile]')).toHaveLength(3);
    document.querySelector('[data-status-filter="OCCUPIED"]').click();
    expect(Array.from(document.querySelectorAll('[data-slot-tile]')).map((t) => t.dataset.slotTile)).toEqual(['3']);
  });

  test('lỗi tải bản đồ hiển thị thông báo', async () => {
    const { document } = await loadMap('STAFF', { 'GET /api/slots': () => Promise.reject(new Error('offline')) });
    const alert = document.querySelector('[data-map-alert]');
    expect(alert.hidden).toBe(false);
    expect(alert.textContent).toContain('Không kết nối được máy chủ');
  });
});

describe('Bản đồ – menu khi bấm vào vị trí', () => {
  test('STAFF: menu có 2 mục; ô OCCUPIED không cho đăng ký', async () => {
    const { document } = await loadMap('STAFF');
    tile(document, 3).click();
    const menu = document.querySelector('[data-slot-menu]');
    expect(menu.classList.contains('show')).toBe(true);
    expect(document.querySelector('[data-menu-action="vehicle"]').disabled).toBe(false);
    expect(document.querySelector('[data-menu-action="register"]').disabled).toBe(true);
    expect(document.querySelector('[data-slot-menu-note]').textContent).toContain('đang có xe');
  });

  test('CUSTOMER: chỉ có mục Đăng ký đỗ xe', async () => {
    const { document } = await loadMap('CUSTOMER', { 'GET /api/my-vehicles': () => ok({ items: [] }) });
    tile(document, 1).click();
    expect(document.querySelector('[data-menu-action="vehicle"]')).toBeNull();
    expect(document.querySelector('[data-menu-action="register"]').disabled).toBe(false);
  });

  test('Xem thông tin xe gọi API riêng và hiển thị kết quả', async () => {
    const vehicle = {
      vehicleId: 2, licensePlate: '51F67890', vehicleName: 'Mazda 3', brand: 'Mazda', vehicleType: 'CAR',
      customerName: null, phone: null, slotCode: 'A-03', sessionId: 2, checkInTime: '2026-10-18T08:00:00+07:00'
    };
    const { document, fetch } = await loadMap('MANAGER', { 'GET /api/slots/3/vehicle': () => ok(vehicle) });
    tile(document, 3).click();
    document.querySelector('[data-menu-action="vehicle"]').click();
    await flush();
    expect(fetch).toHaveBeenCalledWith('/api/slots/3/vehicle', expect.anything());
    const field = (name) => document.querySelector(`[data-vehicle-field="${name}"]`).textContent;
    expect(field('licensePlate')).toBe('51F67890');
    expect(field('customerName')).toBe('Xe vãng lai');
    expect(field('vehicleType')).toBe('Ô tô');
    expect(field('checkInTime')).toBe('18/10/2026 08:00');
  });
});

describe('Bản đồ – đăng ký đỗ xe', () => {
  const MY_VEHICLES = [
    { id: 1, licensePlate: '30A12345', vehicleName: 'Civic', brand: 'Honda', vehicleType: 'CAR', derivedStatus: 'RESERVED', isVisitor: false, slotCode: 'A-02', checkInTime: null, lastExitTime: null },
    { id: 9, licensePlate: '30K99999', vehicleName: 'Vios', brand: 'Toyota', vehicleType: 'CAR', derivedStatus: 'REGISTERED', isVisitor: false, slotCode: null, checkInTime: null, lastExitTime: null }
  ];
  const RECEIPT = {
    slotId: 1, slotCode: 'A-01', status: 'RESERVED', vehicleId: 9, ticketId: 7,
    ticketCode: 'T-20261031-00007', startDate: '2026-10-31', endDate: '2026-10-31', price: '50000.00'
  };

  test('CUSTOMER: xe đang giữ chỗ bị khóa; đăng ký thành công hiện biên nhận và tải lại dữ liệu', async () => {
    const { document, fetch } = await loadMap('CUSTOMER', {
      'GET /api/my-vehicles': () => ok({ items: MY_VEHICLES }),
      'POST /api/slots/1/register': () => json(201, { success: true, message: 'Đăng ký đỗ xe thành công', data: RECEIPT, errors: [] })
    });
    tile(document, 1).click();
    document.querySelector('[data-menu-action="register"]').click();
    await flush();

    const radios = document.querySelectorAll('[data-vehicle-options] input[name="vehicleId"]');
    expect(radios[0].disabled).toBe(true);
    expect(document.querySelector('[data-vehicle-options]').textContent).toContain('Đang giữ chỗ tại A-02');
    const submit = document.querySelector('[data-register-submit]');
    expect(submit.disabled).toBe(true);

    radios[1].click();
    expect(submit.disabled).toBe(false);
    submit.click();
    await flush();
    await flush();

    const [, options] = fetch.mock.calls.find(([url]) => url === '/api/slots/1/register');
    expect(JSON.parse(options.body)).toEqual({ vehicleId: 9 });
    expect(options.headers['X-CSRF-Token']).toBeTruthy();
    const receipt = (name) => document.querySelector(`[data-receipt-field="${name}"]`).textContent;
    expect(receipt('ticketCode')).toBe('T-20261031-00007');
    expect(receipt('startDate')).toBe('31/10/2026');
    expect(receipt('price')).toMatch(/^50[.,]000 đ$/);
    expect(document.querySelector('[data-register-step="receipt"]').hidden).toBe(false);
    expect(fetch.mock.calls.filter(([url]) => url === '/api/slots')).toHaveLength(2);
    expect(fetch.mock.calls.filter(([url]) => url === '/api/my-vehicles').length).toBeGreaterThanOrEqual(3);
  });

  test('409: giữ modal ở bước chọn xe và hiển thị nguyên message server', async () => {
    const { document } = await loadMap('CUSTOMER', {
      'GET /api/my-vehicles': () => ok({ items: MY_VEHICLES }),
      'POST /api/slots/1/register': () => json(409, { success: false, message: 'Vị trí đã được đăng ký, vui lòng chọn vị trí khác', data: null, errors: [] })
    });
    tile(document, 1).click();
    document.querySelector('[data-menu-action="register"]').click();
    await flush();
    document.querySelectorAll('[data-vehicle-options] input')[1].click();
    document.querySelector('[data-register-submit]').click();
    await flush();
    const error = document.querySelector('[data-register-error]');
    expect(error.textContent).toBe('Vị trí đã được đăng ký, vui lòng chọn vị trí khác');
    expect(error.hidden).toBe(false);
    expect(document.querySelector('[data-register-step="form"]').hidden).toBe(false);
    expect(document.querySelector('[data-register-submit]').disabled).toBe(false);
  });

  test('STAFF tìm xe qua /api/vehicles/search rồi chọn', async () => {
    const { window, document, fetch } = await loadMap('STAFF', {
      'GET /api/vehicles/search': () => ok({ items: [{ id: 5, licensePlate: '43C33333', vehicleName: 'Yamaha NVX', brand: 'Yamaha', customerName: null, phone: null, customerId: null }] })
    });
    tile(document, 1).click();
    document.querySelector('[data-menu-action="register"]').click();
    const keyword = document.querySelector('[data-vehicle-keyword]');
    keyword.value = '43C';
    keyword.dispatchEvent(new window.Event('input'));
    await new Promise((resolve) => { setTimeout(resolve, 350); });
    await flush();
    expect(fetch).toHaveBeenCalledWith('/api/vehicles/search?keyword=43C', expect.anything());
    expect(document.querySelector('[data-vehicle-options]').textContent).toContain('43C33333');
    expect(document.querySelector('[data-vehicle-options]').textContent).toContain('Xe vãng lai');
  });
});
