jest.mock('../../src/config/db', () => ({ getConnection: jest.fn() }));
jest.mock('../../src/models/admin-customer.model', () => ({
  list: jest.fn(), lockSlotsForCustomer: jest.fn(), lockVehiclesForCustomer: jest.fn(),
  lockCustomer: jest.fn(), lockCustomerTickets: jest.fn(), hasOpenSession: jest.fn(),
  softDelete: jest.fn(), deactivateUser: jest.fn()
}));
const db = require('../../src/config/db');
const model = require('../../src/models/admin-customer.model');
const service = require('../../src/services/admin-customer.service');

describe('Task 5: customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.getConnection.mockResolvedValue({ query: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() });
    model.lockSlotsForCustomer.mockResolvedValue([]);
    model.lockVehiclesForCustomer.mockResolvedValue([]);
    model.lockCustomer.mockResolvedValue({ id: 3, userId: 5 });
    model.lockCustomerTickets.mockResolvedValue([]);
    model.hasOpenSession.mockResolvedValue(false);
  });
  test('rejects oversized search input', async () => {
    await expect(service.list('x'.repeat(51))).rejects.toMatchObject({ statusCode: 400 });
    expect(model.list).not.toHaveBeenCalled();
  });
  test('does not delete a customer with vehicles', async () => {
    model.lockVehiclesForCustomer.mockResolvedValue([{ id: 9 }]);
    await expect(service.remove(3)).rejects.toMatchObject({ statusCode: 409 });
    expect(model.softDelete).not.toHaveBeenCalled();
  });
  test('deactivates the linked account in the deletion transaction', async () => {
    await service.remove(3);
    expect(model.softDelete).toHaveBeenCalledWith(expect.anything(), 3);
    expect(model.deactivateUser).toHaveBeenCalledWith(expect.anything(), 5);
  });
  test('Task 6 rejects weak initial password', async () => {
    await expect(service.create({ fullName: 'A', phone: '0901234567', email: 'a@example.com', username: 'customer1', password: 'short' }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(db.getConnection).not.toHaveBeenCalled();
  });
  test('Task 7 rejects invalid profile fields', async () => {
    await expect(service.update(3, { fullName: '', phone: 'bad', email: 'bad' }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});
