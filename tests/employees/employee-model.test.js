jest.mock('../../src/config/database', () => ({
  execute: jest.fn()
}));

const db = require('../../src/config/database');
const model = require('../../src/models/employee.model');

describe('employee model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('escapes wildcard characters in employee list searches', async () => {
    db.execute.mockResolvedValue([[], []]);

    await model.list({ q: 'A_%\\B' });

    expect(db.execute.mock.calls[0][1]).toEqual([
      'A_%\\B',
      '%A\\_\\%\\\\B%',
      '%A\\_\\%\\\\B%',
      '%A\\_\\%\\\\B%',
      '%A\\_\\%\\\\B%'
    ]);
  });

  test('uses the provided connection to lock active managers', async () => {
    const connection = { execute: jest.fn().mockResolvedValue([[{ id: 1 }], []]) };

    await expect(model.lockActiveManagers(connection)).resolves.toEqual([{ id: 1 }]);

    expect(connection.execute.mock.calls[0][0]).toContain('ORDER BY id FOR UPDATE');
    expect(db.execute).not.toHaveBeenCalled();
  });

  test('uses the provided connection to lock an employee record', async () => {
    const employee = { userId: 7, role: 'STAFF' };
    const connection = { execute: jest.fn().mockResolvedValue([[employee], []]) };

    await expect(model.findForUpdate(connection, 12)).resolves.toBe(employee);

    expect(connection.execute.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(connection.execute.mock.calls[0][1]).toEqual([12]);
    expect(db.execute).not.toHaveBeenCalled();
  });
});
