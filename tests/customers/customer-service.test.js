jest.mock('../../src/config/database', () => ({
  getConnection: jest.fn()
}));
jest.mock('../../src/models/customer.model', () => ({
  list: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  insertUser: jest.fn(),
  insertCustomer: jest.fn(),
  updateCustomer: jest.fn(),
  updateUserEmail: jest.fn(),
  lockSlotsForCustomer: jest.fn(),
  lockVehiclesForCustomer: jest.fn(),
  lockCustomer: jest.fn(),
  lockCustomerTickets: jest.fn(),
  hasOpenSession: jest.fn(),
  softDelete: jest.fn(),
  deactivateUser: jest.fn(),
  listVehicles: jest.fn()
}));
jest.mock('bcrypt', () => ({ hash: jest.fn() }));

const db = require('../../src/config/database');
const model = require('../../src/models/customer.model');
const bcrypt = require('bcrypt');
const service = require('../../src/services/customer.service');

function connection() {
  const conn = {
    query: jest.fn().mockResolvedValue([[], []]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
  db.getConnection.mockResolvedValue(conn);
  return conn;
}

describe('customer service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates a CUSTOMER account and customer record in one transaction', async () => {
    const conn = connection();
    bcrypt.hash.mockResolvedValue('hashed-password');
    model.insertUser.mockResolvedValue([{ insertId: 12 }, []]);
    model.insertCustomer.mockResolvedValue([{ insertId: 21 }, []]);

    await expect(service.create({
      fullName: ' Nguyen A ',
      phone: '+84901234567',
      email: ' CUSTOMER@EXAMPLE.TEST ',
      address: ' Hanoi ',
      username: 'customer.a',
      password: 'StrongPassword123',
      role: 'MANAGER',
      customerId: 999
    })).resolves.toBe(21);

    expect(model.insertUser).toHaveBeenCalledWith(conn, expect.objectContaining({
      email: 'customer@example.test',
      phone: '0901234567',
      passwordHash: 'hashed-password'
    }));
    expect(model.insertCustomer).toHaveBeenCalledWith(conn, 12, expect.objectContaining({
      fullName: 'Nguyen A'
    }));
    expect(conn.commit).toHaveBeenCalledTimes(1);
  });

  test('requires account credentials and strong password during creation', async () => {
    await expect(service.create({
      fullName: 'Customer',
      phone: '0901234567',
      email: 'customer@example.test',
      username: 'customer.a',
      password: 'weak'
    })).rejects.toMatchObject({ statusCode: 400 });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  test('blocks customer deletion while vehicles remain and rolls back', async () => {
    const conn = connection();
    model.lockSlotsForCustomer.mockResolvedValue([]);
    model.lockVehiclesForCustomer.mockResolvedValue([{ id: 5 }]);
    model.lockCustomer.mockResolvedValue({ id: 2, userId: 7 });
    model.lockCustomerTickets.mockResolvedValue([]);
    model.hasOpenSession.mockResolvedValue(false);

    await expect(service.remove(2)).rejects.toMatchObject({ statusCode: 409 });

    expect(model.lockSlotsForCustomer).toHaveBeenCalledWith(conn, 2);
    expect(model.lockVehiclesForCustomer).toHaveBeenCalledWith(conn, 2);
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(model.softDelete).not.toHaveBeenCalled();
  });

  test('soft deletes eligible customer and deactivates linked account', async () => {
    const conn = connection();
    model.lockSlotsForCustomer.mockResolvedValue([]);
    model.lockVehiclesForCustomer.mockResolvedValue([]);
    model.lockCustomer.mockResolvedValue({ id: 2, userId: 7 });
    model.lockCustomerTickets.mockResolvedValue([]);
    model.hasOpenSession.mockResolvedValue(false);

    await service.remove(2);

    expect(model.softDelete).toHaveBeenCalledWith(conn, 2);
    expect(model.deactivateUser).toHaveBeenCalledWith(conn, 7);
    expect(conn.commit).toHaveBeenCalledTimes(1);
  });

  test('lists vehicles only for the customer represented by user id', async () => {
    model.findByUserId.mockResolvedValue({ id: 2 });
    model.listVehicles.mockResolvedValue([{ id: 1 }]);

    await expect(service.getVehiclesForUser(6)).resolves.toEqual([{ id: 1 }]);

    expect(model.findByUserId).toHaveBeenCalledWith(6);
    expect(model.listVehicles).toHaveBeenCalledWith(2);
  });
});
