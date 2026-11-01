jest.mock('../../src/models/parking.model', () => ({
  pool: { getConnection: jest.fn() },
  lockSlot: jest.fn(),
  lockVehicle: jest.fn(),
  findOpenSessionForVehicle: jest.fn(),
  updateSlotState: jest.fn()
}));
jest.mock('../../src/models/parking-map.model', () => ({
  findVehicleAtSlot: jest.fn(),
  findVehicleSlot: jest.fn(),
  insertDailyTicket: jest.fn()
}));

const parkingModel = require('../../src/models/parking.model');
const mapModel = require('../../src/models/parking-map.model');
const mapService = require('../../src/services/parking-map.service');

function connection() {
  return { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
}

describe('parking-map.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a CUSTOMER trying to register another customer vehicle', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.lockSlot.mockResolvedValue({ id: 1, slot_code: 'A-01', status: 'AVAILABLE' });
    parkingModel.lockVehicle.mockResolvedValue({ id: 5, customer_id: 99, vehicle_type: 'CAR' });
    await expect(mapService.registerParkingSlot({ slotId: 1, vehicleId: 5, actor: { role: 'CUSTOMER', customerId: 12 } })).rejects.toMatchObject({ statusCode: 403 });
    expect(conn.rollback).toHaveBeenCalled();
  });

  test('registers an owned vehicle and creates a DAILY ticket', async () => {
    const conn = connection();
    parkingModel.pool.getConnection.mockResolvedValue(conn);
    parkingModel.lockSlot.mockResolvedValue({ id: 1, slot_code: 'A-01', status: 'AVAILABLE' });
    parkingModel.lockVehicle.mockResolvedValue({ id: 5, customer_id: 12, vehicle_type: 'CAR' });
    mapModel.findVehicleSlot.mockResolvedValue(null);
    parkingModel.findOpenSessionForVehicle.mockResolvedValue(null);
    mapModel.insertDailyTicket.mockResolvedValue(44);
    const result = await mapService.registerParkingSlot({ slotId: 1, vehicleId: 5, actor: { role: 'CUSTOMER', customerId: 12 } });
    expect(result).toMatchObject({ slotId: 1, slotCode: 'A-01', status: 'RESERVED', vehicleId: 5, ticketId: 44, price: '50000.00' });
    expect(parkingModel.updateSlotState).toHaveBeenCalledWith(conn, 1, 'RESERVED', 5);
    expect(conn.commit).toHaveBeenCalled();
  });
});
