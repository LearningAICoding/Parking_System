jest.mock('../../src/models/employee.model', () => ({
  list: jest.fn(),
  findById: jest.fn(),
  insertUser: jest.fn(),
  insertEmployee: jest.fn(),
  lockActiveManagers: jest.fn(),
  findForUpdate: jest.fn(),
  updateEmployee: jest.fn(),
  updateUserEmail: jest.fn(),
  softDeleteEmployee: jest.fn(),
  deactivateUser: jest.fn()
}));
jest.mock('../../src/config/database', () => ({
  getConnection: jest.fn()
}));
jest.mock('bcrypt');

const bcrypt = require('bcrypt');
const db = require('../../src/config/database');
const model = require('../../src/models/employee.model');
const service = require('../../src/services/employee.service');

function makeConnection() {
  const connection = {
    query: jest.fn().mockResolvedValue([[], []]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
  db.getConnection.mockResolvedValue(connection);
  return connection;
}

describe('employee service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates linked account and employee in one transaction without passing plaintext password to model', async () => {
    const connection = makeConnection();
    bcrypt.hash.mockResolvedValue('bcrypt-hash');
    model.insertUser.mockResolvedValue([{ insertId: 15 }, []]);

    await expect(service.create({
      fullName: '  Nguyen Van A ',
      username: 'staff.a',
      email: ' STAFF@EXAMPLE.TEST ',
      password: ' StrongPassword123 ',
      phone: '0901234567',
      address: ' Address ',
      position: ' Staff ',
      role: 'STAFF',
      isActive: false,
      userId: 999
    })).resolves.toBe(15);

    expect(bcrypt.hash).toHaveBeenCalledWith(' StrongPassword123 ', 12);
    expect(model.insertUser).toHaveBeenCalledWith(connection, {
      fullName: 'Nguyen Van A',
      username: 'staff.a',
      email: 'staff@example.test',
      phone: '0901234567',
      address: 'Address',
      position: 'Staff',
      role: 'STAFF',
      passwordHash: 'bcrypt-hash'
    });
    expect(model.insertUser.mock.calls[0][1]).not.toHaveProperty('password');
    expect(model.insertEmployee).toHaveBeenCalledWith(connection, 15, expect.objectContaining({
      fullName: 'Nguyen Van A'
    }));
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('rolls back duplicate-account conflicts', async () => {
    const connection = makeConnection();
    bcrypt.hash.mockResolvedValue('bcrypt-hash');
    const duplicate = Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
    model.insertUser.mockRejectedValue(duplicate);

    await expect(service.create({
      fullName: 'Nguyen Van A',
      username: 'staff.a',
      email: 'staff@example.test',
      password: 'StrongPassword123',
      role: 'STAFF'
    })).rejects.toMatchObject({ statusCode: 409 });

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('rolls back the account insert when employee profile creation fails', async () => {
    const connection = makeConnection();
    bcrypt.hash.mockResolvedValue('bcrypt-hash');
    model.insertUser.mockResolvedValue([{ insertId: 15 }, []]);
    model.insertEmployee.mockRejectedValue(new Error('profile insert failed'));

    await expect(service.create({
      fullName: 'Nguyen Van A',
      username: 'staff.a',
      email: 'staff@example.test',
      password: 'StrongPassword123',
      role: 'STAFF'
    })).rejects.toThrow('profile insert failed');

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('retries deadlocked transactions with a new connection', async () => {
    const firstConnection = makeConnection();
    const secondConnection = {
      query: jest.fn().mockResolvedValue([[], []]),
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn()
    };
    db.getConnection.mockResolvedValueOnce(firstConnection).mockResolvedValueOnce(secondConnection);
    model.findForUpdate
      .mockRejectedValueOnce(Object.assign(new Error('deadlock'), { code: 'ER_LOCK_DEADLOCK' }))
      .mockResolvedValueOnce({ userId: 17, role: 'STAFF' });

    await service.update(20, {
      fullName: 'Nguyen Van B',
      email: 'staff.b@example.test'
    });

    expect(firstConnection.rollback).toHaveBeenCalledTimes(1);
    expect(firstConnection.release).toHaveBeenCalledTimes(1);
    expect(secondConnection.commit).toHaveBeenCalledTimes(1);
    expect(secondConnection.release).toHaveBeenCalledTimes(1);
  });

  test('does not create an employee with a weak password', async () => {
    await expect(service.create({
      fullName: 'Nguyen Van A',
      username: 'staff.a',
      email: 'staff@example.test',
      password: 'weak',
      role: 'STAFF'
    })).rejects.toMatchObject({ statusCode: 400 });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  test('updates only profile fields and email in one transaction', async () => {
    const connection = makeConnection();
    model.findForUpdate.mockResolvedValue({ userId: 17, role: 'STAFF' });

    await service.update(20, {
      fullName: 'Nguyen Van B',
      email: ' STAFF.B@EXAMPLE.TEST ',
      phone: '0901234567',
      address: 'Address',
      position: 'Staff',
      password: 'ignored',
      role: 'MANAGER',
      isActive: false
    });

    expect(model.findForUpdate).toHaveBeenCalledWith(connection, 20);
    expect(model.updateEmployee).toHaveBeenCalledWith(connection, 20, expect.objectContaining({
      fullName: 'Nguyen Van B',
      email: 'staff.b@example.test'
    }));
    expect(model.updateUserEmail).toHaveBeenCalledWith(connection, 17, 'staff.b@example.test');
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test('passes the authenticated manager id into transactional deletion', async () => {
    const connection = makeConnection();
    model.lockActiveManagers.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    model.findForUpdate.mockResolvedValue({ userId: 7, role: 'STAFF' });

    await service.remove('12', '4');

    expect(model.lockActiveManagers).toHaveBeenCalledWith(connection);
    expect(model.findForUpdate).toHaveBeenCalledWith(connection, 12);
    expect(model.softDeleteEmployee).toHaveBeenCalledWith(connection, 12);
    expect(model.deactivateUser).toHaveBeenCalledWith(connection, 7);
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['currently signed in account', [{ id: 1 }], { userId: 4, role: 'MANAGER' }, 4, 'Không thể xóa tài khoản đang đăng nhập.'],
    ['last active manager', [{ id: 4 }], { userId: 4, role: 'MANAGER' }, 9, 'Không thể xóa quản lý cuối cùng đang hoạt động.']
  ])('blocks deleting the %s', async (_name, managers, employee, currentUserId, message) => {
    const connection = makeConnection();
    model.lockActiveManagers.mockResolvedValue(managers);
    model.findForUpdate.mockResolvedValue(employee);

    await expect(service.remove(12, currentUserId))
      .rejects.toMatchObject({ statusCode: 409, message });

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(model.softDeleteEmployee).not.toHaveBeenCalled();
    expect(model.deactivateUser).not.toHaveBeenCalled();
  });

  test('blocks deleting the last active manager when requester is another manager', async () => {
    const connection = makeConnection();
    model.lockActiveManagers.mockResolvedValue([{ id: 4 }]);
    model.findForUpdate.mockResolvedValue({ userId: 4, role: 'MANAGER' });

    await expect(service.remove(12, 9)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Không thể xóa quản lý cuối cùng đang hoạt động.'
    });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
  });

  test('returns not found if the employee was already deleted', async () => {
    const connection = makeConnection();
    model.lockActiveManagers.mockResolvedValue([{ id: 4 }, { id: 9 }]);
    model.findForUpdate.mockResolvedValue(null);

    await expect(service.remove(12, 9)).rejects.toMatchObject({ statusCode: 404 });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
  });
});
