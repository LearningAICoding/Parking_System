jest.mock('../../src/services/parking-map.service');

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const cheerio = require('cheerio');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const service = require('../../src/services/parking-map.service');
const AppError = require('../../src/utils/app-error');
const { buildSlotApp, as, CSRF } = require('../helpers/slot-app');

const app = buildSlotApp();
const ajv = addFormats(new Ajv2020({ strict: false }));
const schema = (name) => ajv.compile(JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../docs/contracts/schemas', `${name}.json`), 'utf8'
)));

const REGISTRATION = {
  slotId: 1, slotCode: 'A-01', status: 'RESERVED', vehicleId: 5, ticketId: 7,
  ticketCode: 'T-20261031-00007', startDate: '2026-10-31', endDate: '2026-10-31', price: '20000.00'
};
const register = (role, body = { vehicleId: 5 }) => as(role)(request(app).post('/api/slots/1/register'))
  .set('X-CSRF-Token', CSRF).send(body);

beforeEach(() => {
  service.getMapSlots.mockResolvedValue([{ id: 1, slotCode: 'A-01', zone: 'B1-A', status: 'AVAILABLE' }]);
  service.getVehicleAtSlot.mockResolvedValue(null);
  service.registerParkingSlot.mockResolvedValue(REGISTRATION);
});

describe('RBAC bản đồ (AGENTS.md mục 4, testing.md)', () => {
  test.each([
    ['get', '/parking/map', null, 302], ['get', '/parking/map', 'CUSTOMER', 200], ['get', '/parking/map', 'STAFF', 200],
    ['get', '/api/slots', null, 401], ['get', '/api/slots', 'CUSTOMER', 200], ['get', '/api/slots', 'STAFF', 200], ['get', '/api/slots', 'MANAGER', 200],
    ['get', '/api/slots/1/vehicle', null, 401], ['get', '/api/slots/1/vehicle', 'CUSTOMER', 403],
    ['get', '/api/slots/1/vehicle', 'STAFF', 200], ['get', '/api/slots/1/vehicle', 'MANAGER', 200],
    ['post', '/api/slots/1/register', null, 401], ['post', '/api/slots/1/register', 'CUSTOMER', 201],
    ['post', '/api/slots/1/register', 'STAFF', 201], ['post', '/api/slots/1/register', 'MANAGER', 201]
  ])('%s %s với %s -> %i', async (method, url, role, status) => {
    const res = await as(role)(request(app)[method](url)).set('X-CSRF-Token', CSRF).send({ vehicleId: 5 });
    expect(res.status).toBe(status);
  });

  test('đăng ký thiếu CSRF -> 403', async () => {
    const res = await as('CUSTOMER')(request(app).post('/api/slots/1/register')).send({ vehicleId: 5 });
    expect(res.status).toBe(403);
    expect(service.registerParkingSlot).not.toHaveBeenCalled();
  });
});

describe('Hợp đồng JSON (docs/contracts/schemas)', () => {
  test('GET /api/slots khớp slots.response.json', async () => {
    const res = await as('CUSTOMER')(request(app).get('/api/slots?zone=B1-A&status=AVAILABLE'));
    expect(schema('slots.response')(res.body)).toBe(true);
    expect(service.getMapSlots).toHaveBeenCalledWith({ zone: 'B1-A', status: 'AVAILABLE' });
  });

  test('GET /api/slots/:id/vehicle khớp slot-vehicle.response.json (null và có xe)', async () => {
    const validate = schema('slot-vehicle.response');
    expect(validate((await as('STAFF')(request(app).get('/api/slots/1/vehicle'))).body)).toBe(true);
    service.getVehicleAtSlot.mockResolvedValue({
      vehicleId: 2, licensePlate: '51F67890', vehicleName: 'Mazda 3', brand: 'Mazda', vehicleType: 'CAR',
      customerName: 'Khách hàng mẫu hai', phone: '0900000012', slotCode: 'A-03', sessionId: 2, checkInTime: '2026-10-18T08:00:00+07:00'
    });
    expect(validate((await as('STAFF')(request(app).get('/api/slots/3/vehicle'))).body)).toBe(true);
  });

  test('POST register 201 khớp registration.response.json và truyền user từ session', async () => {
    const res = await register('CUSTOMER', { vehicleId: 5, customerId: 99 });
    expect(res.status).toBe(201);
    expect(schema('registration.response')(res.body)).toBe(true);
    expect(service.registerParkingSlot).toHaveBeenCalledWith({
      slotId: 1, vehicleId: 5, user: expect.objectContaining({ role: 'CUSTOMER', customerId: 1 })
    });
  });

  test.each([[{}], [{ vehicleId: 'abc' }], [{ vehicleId: 0 }]])('vehicleId không hợp lệ %p -> 400', async (body) => {
    const res = await register('STAFF', body);
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatchObject({ field: 'vehicleId' });
  });

  test('id ô không hợp lệ -> 400', async () => {
    const res = await as('STAFF')(request(app).get('/api/slots/abc/vehicle'));
    expect(res.status).toBe(400);
  });

  test('409 trả envelope lỗi với message tiếng Việt', async () => {
    service.registerParkingSlot.mockRejectedValue(new AppError('Vị trí đã được đăng ký, vui lòng chọn vị trí khác', 409));
    const res = await register('MANAGER');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, message: 'Vị trí đã được đăng ký, vui lòng chọn vị trí khác', data: null, errors: [] });
  });
});

describe('Giao diện bản đồ', () => {
  test('MANAGER/STAFF có menu "Xem thông tin xe" và ô tìm xe', async () => {
    const $ = cheerio.load((await as('STAFF')(request(app).get('/parking/map'))).text);
    expect($('[data-parking-map]').attr('data-mode')).toBe('operator');
    expect($('[data-menu-action="vehicle"]').text()).toBe('Xem thông tin xe');
    expect($('[data-menu-action="register"]').text()).toBe('Đăng ký đỗ xe');
    expect($('#vehicleModal')).toHaveLength(1);
    expect($('[data-vehicle-keyword]')).toHaveLength(1);
  });

  test('CUSTOMER không có "Xem thông tin xe", có danh sách xe của tôi', async () => {
    const res = await as('CUSTOMER')(request(app).get('/parking/map'));
    const $ = cheerio.load(res.text);
    expect($('[data-parking-map]').attr('data-mode')).toBe('customer');
    expect(res.text).not.toContain('Xem thông tin xe');
    expect($('#vehicleModal')).toHaveLength(0);
    expect($('[data-my-vehicles]')).toHaveLength(1);
    expect($('[data-menu-action="register"]')).toHaveLength(1);
  });

  test('trang không render sẵn dữ liệu ô/biển số; có CSRF meta và giá vé từ pricing', async () => {
    const $ = cheerio.load((await as('MANAGER')(request(app).get('/parking/map'))).text);
    expect($('[data-map-board] [data-slot-tile]')).toHaveLength(0);
    expect($('template[data-tpl="slot-tile"]')).toHaveLength(1);
    expect($('meta[name="csrf-token"]').attr('content')).toBe(CSRF);
    expect($('#registerModal').text()).toMatch(/20\.000 đ[\s\S]*50\.000 đ/);
  });
});
