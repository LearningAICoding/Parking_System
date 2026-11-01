jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }));
jest.mock('../../src/utils/ocr-plate-reader');
jest.mock('../../src/models/parking.model', () => ({
  pool: { getConnection: jest.fn() },
  findVehicleForScan: jest.fn(),
  insertScanToken: jest.fn(),
  lockSlot: jest.fn(),
  lockVehicle: jest.fn(),
  findOpenSessionForVehicle: jest.fn(),
  findCurrentSlotForVehicle: jest.fn(),
  lockTicket: jest.fn(),
  findActiveTicketForVehicleSlot: jest.fn(),
  lockScanToken: jest.fn(),
  markScanTokenUsed: jest.fn(),
  insertOpenSession: jest.fn(),
  updateSlotState: jest.fn(),
  findSessionSlotId: jest.fn(),
  lockSession: jest.fn(),
  closeSession: jest.fn(),
  updateTicketStatus: jest.fn()
}));

const fs = require('node:fs/promises');
const ocrReader = require('../../src/utils/ocr-plate-reader');
const parkingModel = require('../../src/models/parking.model');
const parkingService = require('../../src/services/parking.service');

function connection() {
  return {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
  };
}

describe('parking.service', () => {
  beforeEach(() => jest.resetAllMocks());
  afterEach(() => jest.useRealTimers());

  test('normalizes OCR plate, finds vehicle and persists opaque scan token', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    fs.readFile.mockResolvedValue(Buffer.from([0xff, 0xd8, 0xff, 0x00]));
    ocrReader.readPlate.mockResolvedValue('51f-123.45');
    parkingModel.findVehicleForScan.mockResolvedValue({
      id: 10,
      license_plate: '51F12345',
      vehicle_name: 'Honda City',
      brand: 'Honda',
      customer_name: 'Nguyễn Văn A',
      phone: '0901234567',
      slot_code: 'A-01'
    });

    const result = await parkingService.scanPlate({
      file: { path: 'plate.jpg', filename: '00000000-0000-0000-0000-000000000000.jpg', originalname: 'plate.jpg' },
      sessionId: 'session-id',
      userId: 2
    });

    expect(result).toMatchObject({ exists: true, licensePlate: '51F12345', vehicleId: 10, slotCode: 'A-01' });
    expect(result.scanToken).toHaveLength(64);
    expect(parkingModel.insertScanToken).toHaveBeenCalledWith(conn, expect.objectContaining({ vehicleId: 10, normalizedPlate: '51F12345' }));
  });

  test('checks slot before vehicle and creates an occupied session', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.lockSlot.mockResolvedValue({ id: 3, slot_code: 'A-01', status: 'AVAILABLE', current_vehicle_id: null });
    parkingModel.lockVehicle.mockResolvedValue({ id: 10, license_plate: '51F12345', vehicle_type: 'CAR' });
    parkingModel.findOpenSessionForVehicle.mockResolvedValue(null);
    parkingModel.findActiveTicketForVehicleSlot.mockResolvedValue(null);
    parkingModel.insertOpenSession.mockResolvedValue(100);

    const result = await parkingService.checkIn({ vehicleId: 10, slotId: 3, sessionId: 'session', userId: 2 });
    expect(result).toMatchObject({ sessionId: 100, slotCode: 'A-01', ticketId: null });
    expect(parkingModel.lockSlot.mock.invocationCallOrder[0]).toBeLessThan(parkingModel.lockVehicle.mock.invocationCallOrder[0]);
    expect(parkingModel.updateSlotState).toHaveBeenCalledWith(conn, 3, 'OCCUPIED', 10);
    expect(conn.commit).toHaveBeenCalled();
  });

  test('rolls back when a vehicle already has an open session', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.lockSlot.mockResolvedValue({ id: 3, slot_code: 'A-01', status: 'AVAILABLE', current_vehicle_id: null });
    parkingModel.lockVehicle.mockResolvedValue({ id: 10, license_plate: '51F12345', vehicle_type: 'CAR' });
    parkingModel.findOpenSessionForVehicle.mockResolvedValue({ id: 99 });

    await expect(parkingService.checkIn({ vehicleId: 10, slotId: 3, sessionId: 'session', userId: 2 })).rejects.toMatchObject({ statusCode: 409 });
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });

  test('rejects check-in when the vehicle is reserved in another slot', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.lockSlot.mockResolvedValue({ id: 3, slot_code: 'A-01', status: 'AVAILABLE', current_vehicle_id: null });
    parkingModel.lockVehicle.mockResolvedValue({ id: 10, license_plate: '51F12345', vehicle_type: 'CAR' });
    parkingModel.findCurrentSlotForVehicle.mockResolvedValue(2);
    await expect(parkingService.checkIn({ vehicleId: 10, slotId: 3, sessionId: 'session', userId: 2 }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(conn.rollback).toHaveBeenCalled();
    expect(parkingModel.insertOpenSession).not.toHaveBeenCalled();
  });

  test('checks out a valid daily ticket at zero fee and frees the slot', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-24T12:00:00+07:00'));
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.findSessionSlotId.mockResolvedValue(3);
    parkingModel.lockSlot.mockResolvedValue({ id: 3, status: 'OCCUPIED', current_vehicle_id: 10 });
    parkingModel.lockSession.mockResolvedValue({
      id: 100,
      vehicle_id: 10,
      ticket_id: 25,
      slot_id: 3,
      slot_code: 'A-01',
      slot_status: 'OCCUPIED',
      current_vehicle_id: 10,
      vehicle_type: 'CAR',
      check_in_time: '2026-10-24 08:00:00',
      check_out_time: null
    });
    parkingModel.lockTicket.mockResolvedValue({ id: 25, status: 'ACTIVE', start_date: '2026-10-24', end_date: '2026-10-24', deleted_at: null });

    const result = await parkingService.checkOut({ sessionId: 100 });
    expect(result.fee).toBe('0.00');
    expect(parkingModel.closeSession).toHaveBeenCalledWith(conn, 100, expect.any(Date), 0);
    expect(parkingModel.updateSlotState).toHaveBeenCalledWith(conn, 3, 'AVAILABLE', null);
    expect(parkingModel.lockSlot.mock.invocationCallOrder[0]).toBeLessThan(parkingModel.lockSession.mock.invocationCallOrder[0]);
    expect(conn.commit).toHaveBeenCalled();
  });

  test('expires a DAILY ticket at midnight after its end date and charges casual parking', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-25T00:00:00+07:00'));
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.findSessionSlotId.mockResolvedValue(3);
    parkingModel.lockSlot.mockResolvedValue({ id: 3, status: 'OCCUPIED', current_vehicle_id: 10 });
    parkingModel.lockSession.mockResolvedValue({
      id: 100, vehicle_id: 10, ticket_id: 25, slot_id: 3, slot_code: 'A-01',
      slot_status: 'OCCUPIED', current_vehicle_id: 10, vehicle_type: 'MOTORBIKE',
      check_in_time: '2026-10-24 23:30:00', check_out_time: null
    });
    parkingModel.lockTicket.mockResolvedValue({
      id: 25, status: 'ACTIVE', start_date: '2026-10-24', end_date: '2026-10-24', deleted_at: null
    });
    const result = await parkingService.checkOut({ sessionId: 100 });
    expect(result.fee).toBe('10000.00');
    expect(parkingModel.updateTicketStatus).toHaveBeenCalledWith(conn, 25, 'EXPIRED');
    expect(parkingModel.closeSession).toHaveBeenCalledWith(conn, 100, expect.any(Date), 10000);
  });

  test('does not attach a DAILY ticket outside its valid date window', () => {
    expect(parkingService.ticketIsUsableForCheckIn({
      status: 'ACTIVE', deleted_at: null, start_date: '2026-10-24', end_date: '2026-10-24'
    }, new Date('2026-10-25T00:00:00+07:00'))).toBe(false);
    expect(parkingService.ticketIsUsableForCheckIn({
      status: 'ACTIVE', deleted_at: null, start_date: '2026-10-24', end_date: '2026-10-24'
    }, new Date('2026-10-24T23:59:59+07:00'))).toBe(true);
  });

  test('rejects a missing or forged image before creating a scan token', async () => {
    await expect(parkingService.scanPlate({ file: null, sessionId: 's', userId: 2 }))
      .rejects.toMatchObject({ statusCode: 400 });
    fs.readFile.mockResolvedValue(Buffer.from('not-an-image'));
    await expect(parkingService.scanPlate({ file: { path: 'fake.png', filename: 'fake.png' }, sessionId: 's', userId: 2 }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(parkingModel.pool.getConnection).not.toHaveBeenCalled();
  });

  test('scans an unknown plate without creating a vehicle', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    fs.readFile.mockResolvedValue(Buffer.from('89504e470d0a1a0a', 'hex'));
    ocrReader.readPlate.mockResolvedValue('29c-444.44');
    parkingModel.findVehicleForScan.mockResolvedValue(null);
    const result = await parkingService.scanPlate({
      file: { path: 'visitor.png', filename: '00000000-0000-0000-0000-000000000000.png' },
      sessionId: 'session', userId: 2
    });
    expect(result).toMatchObject({ exists: false, licensePlate: '29C44444', vehicleId: null, customerName: null });
    expect(parkingModel.insertScanToken).toHaveBeenCalledWith(conn, expect.objectContaining({ vehicleId: null }));
    expect(conn.release).toHaveBeenCalled();
  });

  test('consumes a valid scan token only after a successful check-in', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.lockSlot.mockResolvedValue({ id: 3, slot_code: 'A-01', status: 'AVAILABLE', current_vehicle_id: null });
    parkingModel.lockVehicle.mockResolvedValue({ id: 10, license_plate: '51F12345', vehicle_type: 'CAR' });
    parkingModel.findOpenSessionForVehicle.mockResolvedValue(null);
    parkingModel.findActiveTicketForVehicleSlot.mockResolvedValue(null);
    parkingModel.lockScanToken.mockResolvedValue({
      id: 7, user_id: 2, session_id_hash: parkingService.sha256('session'),
      vehicle_id: null, normalized_plate: '51F12345', plate_image_url: '/files/plates/plate.jpg',
      expires_at: new Date(Date.now() + 60000), used_at: null
    });
    parkingModel.insertOpenSession.mockResolvedValue(101);
    await parkingService.checkIn({ vehicleId: 10, slotId: 3, scanToken: 'token', sessionId: 'session', userId: 2 });
    expect(parkingModel.insertOpenSession).toHaveBeenCalledWith(conn, expect.objectContaining({ plateImageUrl: '/files/plates/plate.jpg' }));
    expect(parkingModel.markScanTokenUsed).toHaveBeenCalledWith(conn, 7);
    expect(parkingModel.markScanTokenUsed.mock.invocationCallOrder[0]).toBeLessThan(conn.commit.mock.invocationCallOrder[0]);
  });

  test('rejects a scan token from another session and rolls back', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.lockSlot.mockResolvedValue({ id: 3, slot_code: 'A-01', status: 'AVAILABLE', current_vehicle_id: null });
    parkingModel.lockVehicle.mockResolvedValue({ id: 10, license_plate: '51F12345', vehicle_type: 'CAR' });
    parkingModel.findOpenSessionForVehicle.mockResolvedValue(null);
    parkingModel.findActiveTicketForVehicleSlot.mockResolvedValue(null);
    parkingModel.lockScanToken.mockResolvedValue({ user_id: 2, session_id_hash: parkingService.sha256('other-session') });
    await expect(parkingService.checkIn({ vehicleId: 10, slotId: 3, scanToken: 'token', sessionId: 'session', userId: 2 }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(conn.rollback).toHaveBeenCalled();
    expect(parkingModel.insertOpenSession).not.toHaveBeenCalled();
  });

  test('expires an old active ticket and starts a casual parking session', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-02T10:00:00+07:00'));
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.lockSlot.mockResolvedValue({ id: 3, slot_code: 'A-01', status: 'AVAILABLE', current_vehicle_id: null });
    parkingModel.lockVehicle.mockResolvedValue({ id: 10, license_plate: '51F12345', vehicle_type: 'CAR' });
    parkingModel.findOpenSessionForVehicle.mockResolvedValue(null);
    parkingModel.findActiveTicketForVehicleSlot.mockResolvedValue({
      id: 25, status: 'ACTIVE', start_date: '2026-10-18', end_date: '2026-10-18', deleted_at: null
    });
    parkingModel.insertOpenSession.mockResolvedValue(102);
    const result = await parkingService.checkIn({ vehicleId: 10, slotId: 3, sessionId: 'session', userId: 2 });
    expect(result.ticketId).toBeNull();
    expect(parkingModel.updateTicketStatus).toHaveBeenCalledWith(conn, 25, 'EXPIRED');
    expect(parkingModel.insertOpenSession).toHaveBeenCalledWith(conn, expect.objectContaining({ ticketId: null }));
  });

  test('blocks checkout when the slot no longer matches the open session', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.findSessionSlotId.mockResolvedValue(3);
    parkingModel.lockSlot.mockResolvedValue({ id: 3, status: 'AVAILABLE', current_vehicle_id: null });
    parkingModel.lockSession.mockResolvedValue({
      id: 100, vehicle_id: 10, slot_id: 3, slot_status: 'AVAILABLE', current_vehicle_id: null,
      check_out_time: null
    });
    await expect(parkingService.checkOut({ sessionId: 100 })).rejects.toMatchObject({ statusCode: 409 });
    expect(conn.rollback).toHaveBeenCalled();
    expect(parkingModel.closeSession).not.toHaveBeenCalled();
  });

  test('charges a minimum hour and rounds a longer casual stay up', () => {
    expect(parkingService.calculateFee({
      checkInTime: '2026-10-24 08:00:00', checkOutTime: new Date('2026-10-24T08:00:00+07:00'),
      vehicleType: 'MOTORBIKE', ticket: null
    })).toBe(10000);
    expect(parkingService.calculateFee({
      checkInTime: '2026-10-24 08:00:00', checkOutTime: new Date('2026-10-24T09:01:00+07:00'),
      vehicleType: 'MOTORBIKE', ticket: null
    })).toBe(20000);
  });
});
