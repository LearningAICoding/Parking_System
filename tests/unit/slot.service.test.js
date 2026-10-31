jest.mock('../../src/config/db', () => ({ getConnection: jest.fn() }));
jest.mock('../../src/models/slot.model');

const pool = require('../../src/config/db');
const slotModel = require('../../src/models/slot.model');
const slotService = require('../../src/services/slot.service');
const AppError = require('../../src/utils/app-error');

function mockConnection() {
  const conn = {
    query: jest.fn().mockResolvedValue(),
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn()
  };
  pool.getConnection.mockResolvedValue(conn);
  return conn;
}

const dbError = (code) => Object.assign(new Error(code), { code });
const slot = (overrides = {}) => ({ id: 1, slotCode: 'A-01', zone: 'B1-A', status: 'AVAILABLE', currentVehicleId: null, ...overrides });

describe('slot.service – Task 14 danh sách', () => {
  test('lọc theo khu vực/tầng đã trim', async () => {
    slotModel.list.mockResolvedValue([slot()]);
    await expect(slotService.listSlots({ zone: ' B1-A ' })).resolves.toHaveLength(1);
    expect(slotModel.list).toHaveBeenCalledWith({ zone: 'B1-A', status: undefined });
  });

  test('lỗi kết nối -> 503 tiếng Việt', async () => {
    slotModel.listZones.mockRejectedValue(dbError('ECONNREFUSED'));
    await expect(slotService.listZones()).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('slot.service – Task 15 thêm mới', () => {
  test('thành công: chuẩn hóa mã in hoa, status mặc định AVAILABLE', async () => {
    slotModel.create.mockResolvedValue(slot());
    await slotService.createSlot({ slotCode: ' a-01 ', zone: 'B1-A' });
    expect(slotModel.create).toHaveBeenCalledWith({ slotCode: 'A-01', zone: 'B1-A', status: 'AVAILABLE', note: '' });
  });

  test.each([
    [{ slotCode: '', zone: 'B1-A' }, 'slotCode'],
    [{ slotCode: 'A_01', zone: 'B1-A' }, 'slotCode'],
    [{ slotCode: 'A'.repeat(21), zone: 'B1-A' }, 'slotCode'],
    [{ slotCode: 'A-01', zone: '  ' }, 'zone'],
    [{ slotCode: 'A-01', zone: 'Z'.repeat(21) }, 'zone'],
    [{ slotCode: 'A-01', zone: 'B1', status: 'OCCUPIED' }, 'status']
  ])('dữ liệu không hợp lệ %p -> 400 tại %s', async (input, field) => {
    const error = await slotService.createSlot(input).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.errors.map((e) => e.field)).toContain(field);
    expect(slotModel.create).not.toHaveBeenCalled();
  });

  test('trùng mã vị trí -> 409', async () => {
    slotModel.create.mockRejectedValue(dbError('ER_DUP_ENTRY'));
    await expect(slotService.createSlot({ slotCode: 'A-01', zone: 'B1-A' }))
      .rejects.toMatchObject({ statusCode: 409, message: 'Mã vị trí đã tồn tại' });
  });

  test('lỗi kết nối -> 503', async () => {
    slotModel.create.mockRejectedValue(dbError('PROTOCOL_CONNECTION_LOST'));
    await expect(slotService.createSlot({ slotCode: 'A-01', zone: 'B1-A' })).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('slot.service – Task 15 sửa', () => {
  test('thành công trong transaction READ COMMITTED, khóa FOR UPDATE', async () => {
    const conn = mockConnection();
    slotModel.findById.mockResolvedValue(slot());
    slotModel.update.mockResolvedValue(slot({ status: 'MAINTENANCE' }));
    await slotService.editSlot(1, { zone: 'B1-A', status: 'MAINTENANCE', note: 'x' });
    expect(conn.query).toHaveBeenCalledWith('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    expect(slotModel.findById).toHaveBeenCalledWith(1, conn, true);
    expect(slotModel.update).toHaveBeenCalledWith(1, { zone: 'B1-A', status: 'MAINTENANCE', note: 'x' }, conn);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });

  test('bỏ qua slotCode/currentVehicleId gửi lên (mass assignment)', async () => {
    mockConnection();
    slotModel.findById.mockResolvedValue(slot());
    slotModel.update.mockResolvedValue(slot());
    await slotService.editSlot(1, { zone: 'B1-A', status: 'AVAILABLE', slotCode: 'HACK', currentVehicleId: 9 });
    expect(slotModel.update.mock.calls[0][1]).toEqual({ zone: 'B1-A', status: 'AVAILABLE', note: '' });
  });

  test('dữ liệu không hợp lệ -> 400, không mở transaction', async () => {
    await expect(slotService.editSlot(1, { zone: '', status: 'RESERVED' })).rejects.toMatchObject({ statusCode: 400 });
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test('không tồn tại -> 404 và rollback', async () => {
    const conn = mockConnection();
    slotModel.findById.mockResolvedValue(null);
    await expect(slotService.editSlot(9, { zone: 'B1', status: 'AVAILABLE' })).rejects.toMatchObject({ statusCode: 404 });
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });

  test.each(['RESERVED', 'OCCUPIED'])('ô %s -> 409', async (status) => {
    mockConnection();
    slotModel.findById.mockResolvedValue(slot({ status, currentVehicleId: 2 }));
    await expect(slotService.editSlot(1, { zone: 'B1', status: 'AVAILABLE' })).rejects.toMatchObject({ statusCode: 409 });
    expect(slotModel.update).not.toHaveBeenCalled();
  });

  test('deadlock được retry rồi thành công', async () => {
    mockConnection();
    slotModel.findById.mockRejectedValueOnce(dbError('ER_LOCK_DEADLOCK')).mockResolvedValue(slot());
    slotModel.update.mockResolvedValue(slot());
    await expect(slotService.editSlot(1, { zone: 'B1', status: 'AVAILABLE' })).resolves.toBeTruthy();
    expect(pool.getConnection).toHaveBeenCalledTimes(2);
  });

  test('xung đột đồng thời kéo dài -> 409 sau 3 lần retry', async () => {
    mockConnection();
    slotModel.findById.mockRejectedValue(dbError('ER_LOCK_WAIT_TIMEOUT'));
    await expect(slotService.editSlot(1, { zone: 'B1', status: 'AVAILABLE' })).rejects.toMatchObject({ statusCode: 409 });
    expect(pool.getConnection).toHaveBeenCalledTimes(4);
  });

  test('không lấy được connection -> 503', async () => {
    pool.getConnection.mockRejectedValue(dbError('ECONNREFUSED'));
    await expect(slotService.editSlot(1, { zone: 'B1', status: 'AVAILABLE' })).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('slot.service – isModifiable', () => {
  test.each([
    ['AVAILABLE', null, true], ['MAINTENANCE', null, true],
    ['RESERVED', 2, false], ['OCCUPIED', 2, false], ['AVAILABLE', 2, false]
  ])('%s, xe %p -> %p', (status, currentVehicleId, expected) => {
    expect(slotService.isModifiable({ status, currentVehicleId })).toBe(expected);
  });
});

describe('slot.service – Task 16 chi tiết/xóa', () => {
  test('chi tiết không tồn tại -> 404', async () => {
    slotModel.findDetail.mockResolvedValue(null);
    await expect(slotService.getSlotDetail(5)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('getSlot trả slot', async () => {
    slotModel.findById.mockResolvedValue(slot());
    await expect(slotService.getSlot(1)).resolves.toMatchObject({ slotCode: 'A-01' });
  });

  test('xóa thành công trả { id, slotCode }', async () => {
    const conn = mockConnection();
    slotModel.findById.mockResolvedValue(slot({ status: 'MAINTENANCE' }));
    slotModel.hasHistoryOrTickets.mockResolvedValue(false);
    await expect(slotService.deleteSlot(1)).resolves.toEqual({ id: 1, slotCode: 'A-01' });
    expect(slotModel.remove).toHaveBeenCalledWith(1, conn);
    expect(conn.commit).toHaveBeenCalled();
  });

  test('đã bị người khác xóa -> 404', async () => {
    mockConnection();
    slotModel.findById.mockResolvedValue(null);
    await expect(slotService.deleteSlot(1)).rejects.toMatchObject({ statusCode: 404 });
  });

  test.each(['RESERVED', 'OCCUPIED'])('ô %s có xe đăng ký -> 409', async (status) => {
    mockConnection();
    slotModel.findById.mockResolvedValue(slot({ status, currentVehicleId: 3 }));
    await expect(slotService.deleteSlot(1)).rejects.toMatchObject({ statusCode: 409 });
    expect(slotModel.remove).not.toHaveBeenCalled();
  });

  test('có vé/lịch sử -> 409', async () => {
    const conn = mockConnection();
    slotModel.findById.mockResolvedValue(slot());
    slotModel.hasHistoryOrTickets.mockResolvedValue(true);
    await expect(slotService.deleteSlot(1)).rejects.toMatchObject({ statusCode: 409 });
    expect(conn.rollback).toHaveBeenCalled();
  });

  test('FK chặn xóa -> 409', async () => {
    mockConnection();
    slotModel.findById.mockResolvedValue(slot());
    slotModel.hasHistoryOrTickets.mockResolvedValue(false);
    slotModel.remove.mockRejectedValue(dbError('ER_ROW_IS_REFERENCED_2'));
    await expect(slotService.deleteSlot(1)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('lỗi không lường trước được ném nguyên', async () => {
    mockConnection();
    slotModel.findById.mockRejectedValue(new Error('boom'));
    await expect(slotService.deleteSlot(1)).rejects.toThrow('boom');
  });
});
