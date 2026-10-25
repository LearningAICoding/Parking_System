jest.mock('../../src/models/slot.model', () => ({
  db: { getConnection: jest.fn() },
  list: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  lockSlot: jest.fn(),
  update: jest.fn(),
  ticketReferences: jest.fn(),
  sessionReferences: jest.fn(),
  deleteSlot: jest.fn()
}));

const model = require('../../src/models/slot.model');
const service = require('../../src/services/slot.service');

function connection() {
  const conn = {
    query: jest.fn().mockResolvedValue([[], []]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
  model.db.getConnection.mockResolvedValue(conn);
  return conn;
}

describe('slot service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates a slot with normalized code and AVAILABLE as the default', async () => {
    model.create.mockResolvedValue(5);

    await expect(service.create({ slotCode: ' a-01 ', zone: 'A' })).resolves.toBe(5);

    expect(model.create).toHaveBeenCalledWith({
      slotCode: 'A-01',
      zone: 'A',
      status: 'AVAILABLE',
      note: ''
    });
  });

  test('rejects status values outside AVAILABLE and MAINTENANCE', async () => {
    await expect(service.create({
      slotCode: 'A-01',
      zone: 'A',
      status: 'OCCUPIED'
    })).rejects.toMatchObject({ statusCode: 400 });
    expect(model.create).not.toHaveBeenCalled();
  });

  test('updates an AVAILABLE slot to MAINTENANCE transactionally', async () => {
    const conn = connection();
    model.lockSlot.mockResolvedValue({ id: 3, status: 'AVAILABLE', currentVehicleId: null });

    await service.update(3, { zone: 'B', status: 'MAINTENANCE' });

    expect(model.update).toHaveBeenCalledWith(conn, 3, {
      slotCode: '',
      zone: 'B',
      status: 'MAINTENANCE',
      note: ''
    });
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  test('retries a deadlocked slot update with a fresh transaction', async () => {
    const firstConnection = connection();
    const secondConnection = {
      query: jest.fn().mockResolvedValue([[], []]),
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn()
    };
    model.db.getConnection.mockReset()
      .mockResolvedValueOnce(firstConnection)
      .mockResolvedValueOnce(secondConnection);
    model.lockSlot.mockRejectedValueOnce({ code: 'ER_LOCK_DEADLOCK' })
      .mockResolvedValueOnce({ id: 3, status: 'AVAILABLE', currentVehicleId: null });

    await service.update(3, { zone: 'B', status: 'AVAILABLE' });

    expect(model.db.getConnection).toHaveBeenCalledTimes(2);
    expect(firstConnection.rollback).toHaveBeenCalledTimes(1);
    expect(firstConnection.release).toHaveBeenCalledTimes(1);
    expect(secondConnection.commit).toHaveBeenCalledTimes(1);
  });

  test('does not update an occupied slot and rolls back', async () => {
    const conn = connection();
    model.lockSlot.mockResolvedValue({ id: 3, status: 'OCCUPIED', currentVehicleId: 12 });

    await expect(service.update(3, { zone: 'B', status: 'AVAILABLE' })).rejects.toMatchObject({ statusCode: 409 });

    expect(model.update).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledTimes(1);
  });

  test('blocks deletion when ticket history references the slot', async () => {
    const conn = connection();
    model.lockSlot.mockResolvedValue({ id: 3, status: 'AVAILABLE', currentVehicleId: null });
    model.ticketReferences.mockResolvedValue([{ id: 11 }]);
    model.sessionReferences.mockResolvedValue([]);

    await expect(service.remove(3)).rejects.toMatchObject({ statusCode: 409 });

    expect(model.deleteSlot).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledTimes(1);
  });

  test('deletes an unreferenced available slot', async () => {
    const conn = connection();
    model.lockSlot.mockResolvedValue({ id: 3, status: 'AVAILABLE', currentVehicleId: null });
    model.ticketReferences.mockResolvedValue([]);
    model.sessionReferences.mockResolvedValue([]);

    await service.remove(3);

    expect(model.deleteSlot).toHaveBeenCalledWith(conn, 3);
    expect(conn.commit).toHaveBeenCalledTimes(1);
  });
});
