// Integration Task 10 trên MySQL thật (parking_test_db). Chạy: npm run test:integration
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const request = require('supertest');
const pool = require('../../src/config/db');
const { buildSlotApp, as, CSRF } = require('../helpers/slot-app');
const { toBusinessDate } = require('../../src/utils/date-helper');

if (process.env.DB_NAME !== 'parking_test_db') {
  throw new Error('Integration test chỉ chạy trên DB_NAME=parking_test_db');
}

const SEED_SQL = fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8');
const app = buildSlotApp();
let admin;

const register = (role, slotId, vehicleId) => as(role)(request(app).post(`/api/slots/${slotId}/register`))
  .set('X-CSRF-Token', CSRF).send({ vehicleId });

async function addVehicle({ plate, customerId = null, type = 'CAR' }) {
  const [result] = await admin.query(
    'INSERT INTO vehicles (customer_id, license_plate, vehicle_name, brand, vehicle_type) VALUES (?, ?, ?, ?, ?)',
    [customerId, plate, 'Xe test', 'Test', type]
  );
  return result.insertId;
}

async function slotState(id) {
  const [[row]] = await admin.query('SELECT status, current_vehicle_id AS vehicleId FROM parking_slots WHERE id = ?', [id]);
  return row;
}

async function ticketCount() {
  const [[{ total }]] = await admin.query('SELECT COUNT(*) AS total FROM tickets');
  return total;
}

beforeAll(async () => {
  admin = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, multipleStatements: true, charset: 'utf8mb4'
  });
});

beforeEach(async () => { await admin.query(SEED_SQL); });

afterAll(async () => {
  await admin.end();
  await pool.end();
});

describe('GET /api/slots và /api/slots/:id/vehicle (DB thật)', () => {
  test('CUSTOMER nhận đủ 7 ô, chỉ 4 trường', async () => {
    const res = await as('CUSTOMER')(request(app).get('/api/slots'));
    expect(res.body.data.items).toHaveLength(7);
    res.body.data.items.forEach((item) => expect(Object.keys(item).sort()).toEqual(['id', 'slotCode', 'status', 'zone']));
  });

  test('lọc theo trạng thái', async () => {
    const res = await as('STAFF')(request(app).get('/api/slots?status=OCCUPIED'));
    expect(res.body.data.items.map((slot) => slot.slotCode)).toEqual(['A-03', 'B-03']);
  });

  test('ô A-03 có xe đang đỗ: trả xe, khách hàng và giờ vào +07:00', async () => {
    const res = await as('STAFF')(request(app).get('/api/slots/3/vehicle'));
    expect(res.body.data).toEqual({
      vehicleId: 2, licensePlate: '51F67890', vehicleName: 'Mazda 3', brand: 'Mazda', vehicleType: 'CAR',
      customerName: 'Khách hàng mẫu hai', phone: '0900000012', slotCode: 'A-03', sessionId: 2,
      checkInTime: '2026-10-18T08:00:00+07:00'
    });
  });

  test('ô B-03 xe vãng lai: customerName/phone null', async () => {
    const res = await as('MANAGER')(request(app).get('/api/slots/7/vehicle'));
    expect(res.body.data).toMatchObject({ licensePlate: '30H22222', customerName: null, phone: null });
  });

  test.each([[1, 'AVAILABLE'], [2, 'RESERVED chưa vào bãi']])('ô %i (%s) -> data null', async (id) => {
    const res = await as('MANAGER')(request(app).get(`/api/slots/${id}/vehicle`));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  test('ô không tồn tại -> 404', async () => {
    expect((await as('MANAGER')(request(app).get('/api/slots/999/vehicle'))).status).toBe(404);
  });
});

describe('POST /api/slots/:id/register (DB thật)', () => {
  test('STAFF đăng ký xe vãng lai 5 vào A-01: slot RESERVED, sinh vé DAILY 20.000', async () => {
    const res = await register('STAFF', 1, 5);
    const today = toBusinessDate();
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      slotId: 1, slotCode: 'A-01', status: 'RESERVED', vehicleId: 5, ticketId: 7,
      ticketCode: `T-${today.replaceAll('-', '')}-00007`, startDate: today, endDate: today, price: '20000.00'
    });
    expect(await slotState(1)).toEqual({ status: 'RESERVED', vehicleId: 5 });
    const [[ticket]] = await admin.query('SELECT vehicle_id, slot_id, ticket_type, status FROM tickets WHERE id = 7');
    expect(ticket).toEqual({ vehicle_id: 5, slot_id: 1, ticket_type: 'DAILY', status: 'ACTIVE' });
  });

  test('CUSTOMER đăng ký xe ô tô của mình -> 50.000', async () => {
    const vehicleId = await addVehicle({ plate: '30K99999', customerId: 1 });
    const res = await register('CUSTOMER', 5, vehicleId);
    expect(res.status).toBe(201);
    expect(res.body.data.price).toBe('50000.00');
  });

  test('CUSTOMER dùng xe của khách khác -> 403, không ghi DB', async () => {
    const vehicleId = await addVehicle({ plate: '30K88888', customerId: 2 });
    const res = await register('CUSTOMER', 1, vehicleId);
    expect(res.status).toBe(403);
    expect(await slotState(1)).toEqual({ status: 'AVAILABLE', vehicleId: null });
    expect(await ticketCount()).toBe(6);
  });

  test.each([[2, 'RESERVED'], [3, 'OCCUPIED'], [4, 'MAINTENANCE']])('ô %i (%s) -> 409', async (slotId) => {
    const res = await register('MANAGER', slotId, 5);
    expect(res.status).toBe(409);
    expect(await ticketCount()).toBe(6);
  });

  test('xe 1 đang giữ A-02 -> 409', async () => {
    const res = await register('MANAGER', 1, 1);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('A-02');
  });

  test('xe không tồn tại -> 404', async () => {
    expect((await register('MANAGER', 1, 999)).status).toBe(404);
  });

  test('hai yêu cầu đồng thời cùng một ô -> đúng một 201, một 409', async () => {
    const otherVehicle = await addVehicle({ plate: '30K77777' });
    const statuses = (await Promise.all([register('STAFF', 1, 5), register('MANAGER', 1, otherVehicle)]))
      .map((res) => res.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(await ticketCount()).toBe(7);
  });

  test('một xe đăng ký đồng thời hai ô -> đúng một 201, một 409', async () => {
    const statuses = (await Promise.all([register('STAFF', 1, 5), register('MANAGER', 5, 5)]))
      .map((res) => res.status).sort();
    expect(statuses).toEqual([201, 409]);
    const [[{ held }]] = await admin.query('SELECT COUNT(*) AS held FROM parking_slots WHERE current_vehicle_id = 5');
    expect(held).toBe(1);
  });
});
