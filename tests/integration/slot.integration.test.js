// Integration Task 14–16 trên MySQL thật (parking_test_db). Chạy: npm run test:integration
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const request = require('supertest');
const cheerio = require('cheerio');
const pool = require('../../src/config/db');
const { buildSlotApp, as, CSRF } = require('../helpers/slot-app');

if (process.env.DB_NAME !== 'parking_test_db') {
  throw new Error('Integration test chỉ chạy trên DB_NAME=parking_test_db');
}

const SEED_SQL = fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8');
const app = buildSlotApp();
let admin;

async function slotRow(slotCode) {
  const [rows] = await admin.query('SELECT id, slot_code, zone, status, note FROM parking_slots WHERE slot_code = ?', [slotCode]);
  return rows[0] || null;
}

async function insertFreeSlot(slotCode) {
  const [result] = await admin.query("INSERT INTO parking_slots (slot_code, zone, status) VALUES (?, 'B9', 'AVAILABLE')", [slotCode]);
  return result.insertId;
}

const deleteSlot = (id) => as('MANAGER')(request(app).delete(`/slots/${id}`)).set('X-CSRF-Token', CSRF);
const editSlot = (id, body) => as('MANAGER')(request(app).post(`/slots/${id}/edit`)).type('form').send({ _csrf: CSRF, ...body });

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

describe('Task 14 – danh sách (DB thật)', () => {
  test('MANAGER thấy toàn bộ 7 vị trí seed và 4 khu vực', async () => {
    const res = await as('MANAGER')(request(app).get('/slots'));
    const $ = cheerio.load(res.text);
    expect(res.status).toBe(200);
    expect($('tbody tr[data-slot-id]')).toHaveLength(7);
    expect($('#zone option').map((_i, el) => $(el).val()).get()).toEqual(['', 'B1-A', 'B1-B', 'B2-C', 'B2-D']);
  });

  test('lọc theo tầng B1-B chỉ còn A-04, B-01', async () => {
    const res = await as('STAFF')(request(app).get('/slots?zone=B1-B'));
    const $ = cheerio.load(res.text);
    expect($('tbody tr[data-slot-row] td:first-child').map((_i, el) => $(el).text()).get()).toEqual(['A-04', 'B-01']);
  });
});

describe('Task 15 – thêm/sửa (DB thật)', () => {
  test('thêm thành công lưu mã in hoa', async () => {
    const res = await as('MANAGER')(request(app).post('/slots/create'))
      .type('form').send({ _csrf: CSRF, slotCode: 'c-01', zone: 'B3', status: 'MAINTENANCE', note: 'mới' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/slots?zone=B3');
    expect(await slotRow('C-01')).toMatchObject({ zone: 'B3', status: 'MAINTENANCE', note: 'mới' });
  });

  test('trùng mã A-01 -> 409, không thêm bản ghi', async () => {
    const res = await as('MANAGER')(request(app).post('/slots/create')).type('form').send({ _csrf: CSRF, slotCode: 'A-01', zone: 'X' });
    expect(res.status).toBe(409);
    const [[{ total }]] = await admin.query('SELECT COUNT(*) AS total FROM parking_slots');
    expect(total).toBe(7);
  });

  test('sửa A-01 sang Bảo trì được lưu', async () => {
    const res = await editSlot(1, { zone: 'B1-A', status: 'MAINTENANCE', note: 'Sửa đèn' });
    expect(res.status).toBe(302);
    expect(await slotRow('A-01')).toMatchObject({ status: 'MAINTENANCE', note: 'Sửa đèn' });
  });

  test('sửa A-03 đang có xe -> 409, dữ liệu giữ nguyên', async () => {
    const res = await editSlot(3, { zone: 'Z', status: 'AVAILABLE' });
    expect(res.status).toBe(409);
    expect(await slotRow('A-03')).toMatchObject({ zone: 'B1-A', status: 'OCCUPIED' });
  });

  test('sửa vị trí không tồn tại -> 404', async () => {
    const res = await editSlot(999, { zone: 'B1', status: 'AVAILABLE' });
    expect(res.status).toBe(404);
  });
});

describe('Task 16 – chi tiết/xóa (DB thật)', () => {
  test('chi tiết A-03 hiển thị khách hàng và xe đang đỗ', async () => {
    const res = await as('STAFF')(request(app).get('/slots/3'));
    const text = cheerio.load(res.text)('dd').text();
    expect(res.status).toBe(200);
    expect(text).toContain('51F67890');
  });

  test('chi tiết B-02 xe vãng lai', async () => {
    const res = await as('MANAGER')(request(app).get('/slots/6'));
    expect(cheerio.load(res.text)('dd').text()).toContain('Xe vãng lai');
  });

  test.each([
    [2, 'RESERVED'], [3, 'OCCUPIED']
  ])('xóa ô %i (%s) -> 409', async (id) => {
    const res = await deleteSlot(id);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('không thể xóa');
  });

  test.each([
    [1, 'có session/ticket EXPIRED'], [5, 'có ticket CANCELLED']
  ])('xóa ô %i (%s) -> 409 vì có vé/lịch sử', async (id) => {
    const res = await deleteSlot(id);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Vị trí đã có vé hoặc lịch sử đỗ xe, không thể xóa');
  });

  test('xóa A-04 (bảo trì, không có lịch sử) thành công, xóa lần hai -> 404', async () => {
    const first = await deleteSlot(4);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ success: true, message: 'Đã xóa vị trí A-04', data: { id: 4 }, errors: [] });
    expect(await slotRow('A-04')).toBeNull();
    expect((await deleteSlot(4)).status).toBe(404);
  });

  test('hai yêu cầu xóa đồng thời -> đúng một 200, một 404', async () => {
    const id = await insertFreeSlot('Z-01');
    const statuses = (await Promise.all([deleteSlot(id), deleteSlot(id)])).map((res) => res.status).sort();
    expect(statuses).toEqual([200, 404]);
  });

  test('sửa và xóa đồng thời -> kết quả nhất quán với DB', async () => {
    const id = await insertFreeSlot('Z-02');
    const [edit, del] = await Promise.all([editSlot(id, { zone: 'B9', status: 'MAINTENANCE' }), deleteSlot(id)]);
    const row = await slotRow('Z-02');
    expect(del.status).toBe(200);
    expect(row).toBeNull();
    expect([302, 404]).toContain(edit.status);
  });
});
