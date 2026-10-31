jest.mock('../../src/config/db', () => ({ getConnection: jest.fn() }));
jest.mock('../../src/models/slot.model');
jest.mock('../../src/models/parking-map.model');

const pool = require('../../src/config/db');
const slotModel = require('../../src/models/slot.model');
const mapModel = require('../../src/models/parking-map.model');
const service = require('../../src/services/parking-map.service');
const { toBusinessDate } = require('../../src/utils/date-helper');

const MANAGER = { id: 1, role: 'MANAGER' };
const CUSTOMER = { id: 3, role: 'CUSTOMER', customerId: 1 };
const dbError = (code) => Object.assign(new Error(code), { code });

function mockConnection() {
  const conn = {
    query: jest.fn().mockResolvedValue(), beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(), rollback: jest.fn().mockResolvedValue(), release: jest.fn()
  };
  pool.getConnection.mockResolvedValue(conn);
  return conn;
}

function mockHappyRegister({ vehicle = { id: 10, customerId: 1, vehicleType: 'CAR', customerDeletedAt: null } } = {}) {
  const conn = mockConnection();
  slotModel.findById.mockResolvedValue({ id: 3, slotCode: 'A-01', status: 'AVAILABLE', currentVehicleId: null });
  mapModel.lockVehicle.mockResolvedValue(vehicle);
  mapModel.findSlotHeldByVehicle.mockResolvedValue(null);
  mapModel.hasOpenSession.mockResolvedValue(false);
  mapModel.reserveSlot.mockResolvedValue(1);
  mapModel.insertTicket.mockResolvedValue(25);
  mapModel.findTicket.mockImplementation(async () => ({
    id: 25, ticketCode: mapModel.setTicketCode.mock.calls[0][2], price: '50000.00',
    startDate: toBusinessDate(), endDate: toBusinessDate()
  }));
  return conn;
}

describe('getMapSlots – GET /api/slots', () => {
  test('chỉ trả id, slotCode, zone, status', async () => {
    mapModel.listMapSlots.mockResolvedValue([{ id: 1, slotCode: 'A-01', zone: 'B1', status: 'AVAILABLE', note: 'x', currentVehicleId: 5 }]);
    await expect(service.getMapSlots({ zone: ' B1 ' })).resolves.toEqual([{ id: 1, slotCode: 'A-01', zone: 'B1', status: 'AVAILABLE' }]);
    expect(mapModel.listMapSlots).toHaveBeenCalledWith({ zone: 'B1', status: '' });
  });

  test.each([[{ status: 'FREE' }], [{ zone: 'Z'.repeat(21) }]])('bộ lọc sai %p -> 400', async (filters) => {
    await expect(service.getMapSlots(filters)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('lỗi kết nối -> 503', async () => {
    mapModel.listMapSlots.mockRejectedValue(dbError('ECONNREFUSED'));
    await expect(service.getMapSlots()).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('getVehicleAtSlot – GET /api/slots/:id/vehicle', () => {
  test('ô không tồn tại -> 404', async () => {
    slotModel.findById.mockResolvedValue(null);
    await expect(service.getVehicleAtSlot(9)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('ô không có xe đang đỗ -> null', async () => {
    slotModel.findById.mockResolvedValue({ id: 1 });
    mapModel.findParkedVehicle.mockResolvedValue(null);
    await expect(service.getVehicleAtSlot(1)).resolves.toBeNull();
  });

  test('checkInTime trả ISO kèm +07:00', async () => {
    slotModel.findById.mockResolvedValue({ id: 3 });
    mapModel.findParkedVehicle.mockResolvedValue({ vehicleId: 2, checkInTime: new Date('2026-10-18T01:00:00Z') });
    await expect(service.getVehicleAtSlot(3)).resolves.toMatchObject({ checkInTime: '2026-10-18T08:00:00+07:00' });
  });
});

describe('registerParkingSlot – POST /api/slots/:id/register', () => {
  test('thành công: khóa slot trước vehicle, giá theo pricing, mã vé T-YYYYMMDD-00025', async () => {
    const conn = mockHappyRegister();
    const result = await service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER });
    const today = toBusinessDate();
    expect(result).toEqual({
      slotId: 3, slotCode: 'A-01', status: 'RESERVED', vehicleId: 10, ticketId: 25,
      ticketCode: `T-${today.replaceAll('-', '')}-00025`, startDate: today, endDate: today, price: '50000.00'
    });
    expect(slotModel.findById).toHaveBeenCalledWith(3, conn, true);
    expect(slotModel.findById.mock.invocationCallOrder[0]).toBeLessThan(mapModel.lockVehicle.mock.invocationCallOrder[0]);
    expect(mapModel.insertTicket.mock.calls[0][1]).toMatchObject({ ticketType: 'DAILY', status: 'ACTIVE', price: 50000, startDate: today, endDate: today });
    expect(conn.commit).toHaveBeenCalled();
  });

  test('xe máy dùng giá 20.000', async () => {
    mockHappyRegister({ vehicle: { id: 10, customerId: null, vehicleType: 'MOTORBIKE' } });
    await service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER });
    expect(mapModel.insertTicket.mock.calls[0][1].price).toBe(20000);
  });

  test('CUSTOMER đăng ký xe của mình thành công', async () => {
    mockHappyRegister();
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: CUSTOMER })).resolves.toMatchObject({ status: 'RESERVED' });
  });

  test.each([
    ['xe của người khác', { id: 10, customerId: 2, vehicleType: 'CAR' }],
    ['xe vãng lai', { id: 10, customerId: null, vehicleType: 'CAR' }],
    ['xe không tồn tại', null]
  ])('CUSTOMER dùng %s -> 403', async (_label, vehicle) => {
    const conn = mockHappyRegister();
    mapModel.lockVehicle.mockResolvedValue(vehicle);
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: CUSTOMER })).rejects.toMatchObject({ statusCode: 403 });
    expect(mapModel.reserveSlot).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalled();
  });

  test('MANAGER chọn xe không tồn tại -> 404', async () => {
    mockHappyRegister();
    mapModel.lockVehicle.mockResolvedValue(null);
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 99, user: MANAGER })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('ô không tồn tại -> 404', async () => {
    mockHappyRegister();
    slotModel.findById.mockResolvedValue(null);
    await expect(service.registerParkingSlot({ slotId: 99, vehicleId: 10, user: MANAGER })).rejects.toMatchObject({ statusCode: 404 });
  });

  test.each(['RESERVED', 'OCCUPIED', 'MAINTENANCE'])('ô %s -> 409, không khóa xe', async (status) => {
    mockHappyRegister();
    slotModel.findById.mockResolvedValue({ id: 3, slotCode: 'A-01', status });
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER })).rejects.toMatchObject({ statusCode: 409 });
    expect(mapModel.lockVehicle).not.toHaveBeenCalled();
  });

  test('xe đang giữ ô khác -> 409 nêu mã ô', async () => {
    mockHappyRegister();
    mapModel.findSlotHeldByVehicle.mockResolvedValue({ id: 5, slotCode: 'B-01' });
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER }))
      .rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('B-01') });
  });

  test('xe có session mở -> 409', async () => {
    mockHappyRegister();
    mapModel.hasOpenSession.mockResolvedValue(true);
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('khách hàng của xe đã bị xóa -> 409', async () => {
    mockHappyRegister({ vehicle: { id: 10, customerId: 2, vehicleType: 'CAR', customerDeletedAt: new Date() } });
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('UPDATE không ảnh hưởng dòng nào (ô vừa bị chiếm) -> 409', async () => {
    mockHappyRegister();
    mapModel.reserveSlot.mockResolvedValue(0);
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER })).rejects.toMatchObject({ statusCode: 409 });
    expect(mapModel.insertTicket).not.toHaveBeenCalled();
  });

  test('vi phạm unique current_vehicle_id -> 409', async () => {
    mockHappyRegister();
    mapModel.reserveSlot.mockRejectedValue(dbError('ER_DUP_ENTRY'));
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('deadlock kéo dài -> 409 sau khi retry', async () => {
    mockHappyRegister();
    slotModel.findById.mockRejectedValue(dbError('ER_LOCK_DEADLOCK'));
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER })).rejects.toMatchObject({ statusCode: 409 });
    expect(pool.getConnection).toHaveBeenCalledTimes(4);
  });

  test('mất kết nối -> 503', async () => {
    pool.getConnection.mockRejectedValue(dbError('PROTOCOL_CONNECTION_LOST'));
    await expect(service.registerParkingSlot({ slotId: 3, vehicleId: 10, user: MANAGER })).rejects.toMatchObject({ statusCode: 503 });
  });
});
