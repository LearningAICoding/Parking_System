jest.mock('../../src/config/db', () => ({
  getConnection: jest.fn()
}));
jest.mock('../../src/models/employee.model', () => ({
  list: jest.fn(), findForUpdate: jest.fn(), lockActiveManagers: jest.fn(),
  softDeleteEmployee: jest.fn(), deactivateUser: jest.fn()
}));

const db = require('../../src/config/db');
const model = require('../../src/models/employee.model');
const service = require('../../src/services/employee.service');

describe('Task 3: employee list and deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.getConnection.mockResolvedValue({
      query: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(),
      rollback: jest.fn(), release: jest.fn()
    });
    model.lockActiveManagers.mockResolvedValue([{ id: 1 }]);
  });

  test('search limits keyword length', async () => {
    await expect(service.list('x'.repeat(51))).rejects.toMatchObject({ statusCode: 400 });
    expect(model.list).not.toHaveBeenCalled();
  });

  test('cannot delete the current account', async () => {
    model.findForUpdate.mockResolvedValue({ userId: 7, role: 'MANAGER' });
    await expect(service.remove(3, 7)).rejects.toMatchObject({ statusCode: 409 });
    expect(model.softDeleteEmployee).not.toHaveBeenCalled();
  });

  test('cannot delete the last active manager', async () => {
    model.findForUpdate.mockResolvedValue({ userId: 8, role: 'MANAGER' });
    await expect(service.remove(3, 7)).rejects.toMatchObject({ statusCode: 409 });
    expect(model.deactivateUser).not.toHaveBeenCalled();
  });

  test('Task 4 rejects a weak password before writing', async () => {
    await expect(service.create({
      fullName: 'Test User', username: 'testuser', email: 'test@example.com',
      password: 'short', role: 'STAFF'
    })).rejects.toMatchObject({ statusCode: 400 });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  test('Task 4 rejects invalid editable fields before writing', async () => {
    await expect(service.update(1, { fullName: '', email: 'bad' }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(db.getConnection).not.toHaveBeenCalled();
  });
});
