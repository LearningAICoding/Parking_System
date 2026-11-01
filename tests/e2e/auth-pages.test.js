const request = require('supertest');

jest.mock('../../src/models/auth.model', () => ({
  findUserByEmail: jest.fn().mockResolvedValue(null)
}));

const app = require('../../src/app');

describe('auth pages', () => {
  test('renders login page with CSRF token and accessible fields', async () => {
    const response = await request(app).get('/login');
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('name="_csrf"');
    expect(response.text).toContain('id="username"');
    expect(response.text).toContain('id="password"');
  });

  test('rejects login mutation without CSRF token', async () => {
    const response = await request(app)
      .post('/login')
      .type('form')
      .send({ username: 'manager.seed', password: 'Password123!' });
    expect(response.statusCode).toBe(403);
    expect(response.text).toContain('Không có quyền');
  });

  test('renders forgot password page without account enumeration', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/forgot-password');
    const csrf = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
    const response = await agent
      .post('/forgot-password')
      .type('form')
      .send({ _csrf: csrf, email: 'missing@example.test' });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/forgot-password?sent=1');
  });
});
