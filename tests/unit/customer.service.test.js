jest.mock('../../src/models/customer.model', () => ({
  pool: { getConnection: jest.fn() },
  findProfileByUserId: jest.fn(),
  findProfileById: jest.fn(),
  findEmailConflict: jest.fn(),
  updateProfile: jest.fn()
}));
jest.mock('../../src/models/my-vehicles.model', () => ({ listByCustomerId: jest.fn() }));

const customerModel = require('../../src/models/customer.model');
const myVehiclesModel = require('../../src/models/my-vehicles.model');
const customerService = require('../../src/services/customer.service');

describe('customer.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns only vehicles selected by the session customer id', async () => {
    myVehiclesModel.listByCustomerId.mockResolvedValue([{ id: 1, derivedStatus: 'REGISTERED', isVisitor: false }]);
    await expect(customerService.getMyVehicles(12)).resolves.toEqual([{ id: 1, derivedStatus: 'REGISTERED', isVisitor: false }]);
    expect(myVehiclesModel.listByCustomerId).toHaveBeenCalledWith(12);
  });

  test('updates customer and user email in one transaction', async () => {
    const conn = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
    customerModel.pool.getConnection.mockResolvedValue(conn);
    customerModel.findProfileById.mockResolvedValue({ id: 12, userId: 3 });
    customerModel.findEmailConflict.mockResolvedValue(false);
    await expect(customerService.updateProfile(3, 12, { fullName: 'Tên mới', phone: '0901234567', email: 'new@example.test', address: 'Hà Nội' })).resolves.toBeUndefined();
    expect(customerModel.updateProfile).toHaveBeenCalledWith(conn, 12, 3, expect.objectContaining({ phone: '0901234567' }));
    expect(conn.commit).toHaveBeenCalled();
  });

  test('rolls back when the new email conflicts', async () => {
    const conn = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
    customerModel.pool.getConnection.mockResolvedValue(conn);
    customerModel.findProfileById.mockResolvedValue({ id: 12, userId: 3 });
    customerModel.findEmailConflict.mockResolvedValue(true);
    await expect(customerService.updateProfile(3, 12, { fullName: 'Tên mới', phone: '0901234567', email: 'duplicate@example.test', address: '' })).rejects.toMatchObject({ statusCode: 409 });
    expect(customerModel.updateProfile).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalled();
  });
});
