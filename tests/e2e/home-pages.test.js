const bcrypt = require('bcrypt');
const request = require('supertest');

jest.mock('../../src/models/home.model', () => ({
  getDashboardSummary: jest.fn().mockResolvedValue({
    vehicleCount: 4,
    occupiedSlots: 2,
    availableSlots: 3,
    entriesToday: 5,
    exitsToday: 4
  }),
  listPublishedNews: jest.fn().mockResolvedValue([
    { id: 1, title: 'Thông báo vận hành', summary: 'Bãi đỗ hoạt động bình thường.', content: 'Nội dung', published_at: '2026-10-24T08:00:00+07:00' }
  ])
}));

jest.mock('../../src/models/auth.model', () => ({
  findUserByUsername: jest.fn(),
  findUserByEmail: jest.fn().mockResolvedValue(null)
}));

const authModel = require('../../src/models/auth.model');
const app = require('../../src/app');

async function loginAs(user) {
  const agent = request.agent(app);
  const loginPage = await agent.get('/login');
  const csrf = loginPage.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const passwordHash = await bcrypt.hash('Password123!', 10);
  authModel.findUserByUsername.mockResolvedValueOnce({
    id: user.id,
    username: user.username,
    email: `${user.username}@example.test`,
    password_hash: passwordHash,
    role: user.role,
    is_active: 1,
    customer_id: user.role === 'CUSTOMER' ? 2 : null,
    full_name: user.fullName
  });
  await agent.post('/login').type('form').send({
    _csrf: csrf,
    username: user.username,
    password: 'Password123!'
  }).expect(302);
  return agent;
}

describe('home and shared shell', () => {
  test('redirects anonymous visitors to login', async () => {
    await request(app).get('/').expect(302).expect('Location', /\/login/);
  });

  test('renders an operational dashboard for MANAGER', async () => {
    const agent = await loginAs({ id: 1, username: 'manager', role: 'MANAGER', fullName: 'Quản lý' });
    const response = await agent.get('/');
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Tổng quan hôm nay');
    expect(response.text).toContain('Nhân viên');
    expect(response.text).toContain('Thông báo vận hành');
  });

  test('renders CUSTOMER home without administration links', async () => {
    const agent = await loginAs({ id: 2, username: 'customer', role: 'CUSTOMER', fullName: 'Khách hàng' });
    const response = await agent.get('/');
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Xe của tôi');
    expect(response.text).not.toContain('href="/employees"');
    expect(response.text).not.toContain('href="/tickets"');
  });

  test('renders the shared news page for authenticated users', async () => {
    const agent = await loginAs({ id: 1, username: 'manager-news', role: 'MANAGER', fullName: 'Quản lý' });
    const response = await agent.get('/news');
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Tin tức bãi đỗ xe');
    expect(response.text).toContain('Thông báo vận hành');
  });
});
