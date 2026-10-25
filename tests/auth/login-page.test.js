process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';

jest.mock('../../src/services/auth.service', () => ({
  login: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn()
}));

const request = require('supertest');
const app = require('../../src/app');
const authService = require('../../src/services/auth.service');

describe('GET /login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with CSRF token and optional messages initialized', async () => {
    const response = await request(app).get('/login');

    expect(response.status).toBe(200);
    expect(response.text).toContain('name="_csrf"');
    expect(response.text).toContain('name="next"');
    expect(response.text).not.toContain('ReferenceError');
  });

  test('rejects an external redirect target containing URL-parser backslashes', async () => {
    const response = await request(app).get('/login?next=%2F%5Cevil.com');

    expect(response.status).toBe(200);
    expect(response.text).toContain('name="next" value="/"');
  });

  test('does not report a database error as invalid credentials', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/login');
    const csrfToken = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
    authService.login.mockRejectedValue(new Error('database unavailable'));
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const response = await agent.post('/login').type('form').send({
        login: 'manager',
        password: 'password',
        _csrf: csrfToken
      }).expect(500);
      expect(response.text).toContain('Đã xảy ra lỗi hệ thống.');
      expect(response.text).not.toContain('database unavailable');
    } finally {
      errorLog.mockRestore();
    }
  });

  test('renders the forgot-password form with a CSRF token', async () => {
    const response = await request(app).get('/forgot-password');

    expect(response.status).toBe(200);
    expect(response.text).toContain('action="/forgot-password"');
    expect(response.text).toContain('name="_csrf"');
    expect(response.text).not.toContain('ReferenceError');
  });

  test('submits the forgot-password form with CSRF and a generic confirmation', async () => {
    const agent = request.agent(app);
    authService.requestPasswordReset.mockResolvedValue(undefined);
    const page = await agent.get('/forgot-password');
    const csrfToken = page.text.match(/name="_csrf" value="([^"]+)"/)[1];

    const response = await agent.post('/forgot-password').type('form').send({
      email: 'user@example.test',
      _csrf: csrfToken
    }).expect(200);

    expect(response.text).toContain('Nếu email tồn tại trong hệ thống');
    expect(response.text).not.toContain('user@example.test');
    expect(authService.requestPasswordReset).toHaveBeenCalledWith(
      'user@example.test',
      expect.stringMatching(/^https?:\/\//)
    );
  });
});
