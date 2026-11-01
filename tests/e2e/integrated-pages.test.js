const bcrypt = require('bcrypt');
const request = require('supertest');

jest.mock('../../src/models/auth.model', () => ({ findUserByUsername: jest.fn(), findUserByEmail: jest.fn() }));
jest.mock('../../src/models/employee.model', () => ({ list: jest.fn().mockResolvedValue([]) }));
jest.mock('../../src/models/admin-customer.model', () => ({ list: jest.fn().mockResolvedValue([]) }));
jest.mock('../../src/models/slot.model', () => ({ list: jest.fn().mockResolvedValue([]), listZones: jest.fn().mockResolvedValue([]) }));

const authModel = require('../../src/models/auth.model');
const app = require('../../src/app');

async function loginAs(role) {
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
  authModel.findUserByUsername.mockResolvedValueOnce({
    id: role === 'MANAGER' ? 1 : 2, username: role.toLowerCase(),
    email: `${role.toLowerCase()}@example.test`, password_hash: await bcrypt.hash('Password123!', 10),
    role, is_active: 1, customer_id: null, full_name: role
  });
  await agent.post('/login').type('form').send({ _csrf: token, username: role.toLowerCase(), password: 'Password123!' }).expect(302);
  return agent;
}

describe('integrated task pages and roles', () => {
  test('manager can render employee, customer, statistics and slot pages', async () => {
    const agent = await loginAs('MANAGER');
    for (const [path, heading] of [
      ['/employees', 'Danh sách nhân viên'], ['/employees/create', 'Thêm nhân viên'],
      ['/customers', 'Danh sách khách hàng'], ['/customers/create', 'Thêm khách hàng'],
      ['/stats', 'Thống kê bãi đỗ'], ['/slots', 'Danh sách vị trí'], ['/slots/create', 'Thêm mới vị trí']
    ]) {
      const response = await agent.get(path);
      expect(response.statusCode).toBe(200);
      expect(response.text).toContain(heading);
    }
  });

  test('staff cannot access manager mutations or statistics', async () => {
    const agent = await loginAs('STAFF');
    await agent.get('/employees').expect(403);
    await agent.get('/stats').expect(403);
    await agent.get('/slots/create').expect(403);
    await agent.get('/customers').expect(200);
  });
});
