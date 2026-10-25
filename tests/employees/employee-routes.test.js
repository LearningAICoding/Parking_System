process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';

jest.mock('../../src/services/auth.service', () => ({
  login: jest.fn()
}));
jest.mock('../../src/services/employee.service', () => ({
  list: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn()
}));

const request = require('supertest');
const app = require('../../src/app');
const authService = require('../../src/services/auth.service');
const employeeService = require('../../src/services/employee.service');

async function authenticatedAgent(role = 'MANAGER') {
  const agent = request.agent(app);
  const loginPage = await agent.get('/login');
  const oldToken = loginPage.text.match(/name="_csrf" value="([^"]+)"/)[1];
  authService.login.mockResolvedValue({
    id: role === 'MANAGER' ? 1 : 2,
    username: role.toLowerCase(),
    role,
    fullName: role
  });

  await agent.post('/login').type('form').send({
    login: role.toLowerCase(),
    password: 'StrongPassword123',
    next: '/',
    _csrf: oldToken
  }).expect(302);

  const pageWithNewToken = await agent.get('/login');
  const csrfToken = pageWithNewToken.text.match(/name="_csrf" value="([^"]+)"/)[1];
  return { agent, csrfToken };
}

describe('employee routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    employeeService.list.mockResolvedValue([{
      id: 3,
      fullName: 'Nguyen Van B',
      username: 'staff.b',
      email: 'staff@example.test',
      phone: '0901234567',
      role: 'STAFF',
      position: 'Nhân viên'
    }]);
    employeeService.get.mockResolvedValue({
      id: 3,
      fullName: 'Nguyen Van B',
      username: 'staff.b',
      email: 'staff@example.test',
      phone: '0901234567',
      role: 'STAFF',
      position: 'Nhân viên'
    });
    employeeService.create.mockResolvedValue(10);
    employeeService.update.mockResolvedValue(undefined);
    employeeService.remove.mockResolvedValue(undefined);
  });

  test('renders the employee list for a manager', async () => {
    const { agent } = await authenticatedAgent();

    const response = await agent.get('/employees').expect(200);

    expect(response.text).toContain('Danh sách nhân viên');
    expect(response.text).toContain('Nguyen Van B');
    expect(response.text).toContain('aria-label="Điều hướng chính"');
    expect(response.text).toContain('data-confirm-delete');
    expect(response.text).toContain('id="delete-confirmation-modal"');
    expect(response.text).toContain('/js/delete-confirmation.js');
    expect(employeeService.list).toHaveBeenCalledWith('');
  });

  test('allows a manager to create an employee using a CSRF-protected form', async () => {
    const { agent, csrfToken } = await authenticatedAgent();

    const response = await agent.post('/employees/create').type('form').send({
      _csrf: csrfToken,
      fullName: 'Nguyen Van C',
      username: 'staff.c',
      email: 'staff.c@example.test',
      password: 'StrongPassword123',
      role: 'STAFF'
    }).expect(302);

    expect(response.headers.location).toBe('/employees?notice=created');
    expect(employeeService.create).toHaveBeenCalledWith(expect.objectContaining({
      fullName: 'Nguyen Van C',
      password: 'StrongPassword123'
    }));
    expect(employeeService.create.mock.calls[0][0]).not.toHaveProperty('isActive');
  });

  test('allows a manager to update only editable employee fields', async () => {
    const { agent, csrfToken } = await authenticatedAgent();

    const response = await agent.post('/employees/3/edit').type('form').send({
      _csrf: csrfToken,
      fullName: 'Nguyen Van D',
      email: 'staff.d@example.test',
      phone: '0901234567',
      address: 'Address',
      position: 'Staff lead',
      username: 'attacker-controlled',
      password: 'SensitivePassword123',
      role: 'MANAGER',
      isActive: '0',
      deletedAt: '2020-01-01'
    }).expect(302);

    expect(response.headers.location).toBe('/employees?notice=updated');
    expect(employeeService.update).toHaveBeenCalledWith('3', {
      fullName: 'Nguyen Van D',
      email: 'staff.d@example.test',
      phone: '0901234567',
      address: 'Address',
      position: 'Staff lead'
    });
  });

  test('does not render a submitted password when create validation fails', async () => {
    const { agent, csrfToken } = await authenticatedAgent();
    employeeService.create.mockRejectedValue({
      statusCode: 400,
      message: 'Dữ liệu không hợp lệ.'
    });

    const response = await agent.post('/employees/create').type('form').send({
      _csrf: csrfToken,
      fullName: 'Nguyen Van C',
      username: 'staff.c',
      email: 'staff.c@example.test',
      password: 'SensitivePassword123',
      role: 'STAFF'
    }).expect(400);

    expect(response.text).not.toContain('SensitivePassword123');
    expect(response.text).toContain('Dữ liệu không hợp lệ.');
  });

  test('supports CSRF-protected JSON employee deletion', async () => {
    const { agent, csrfToken } = await authenticatedAgent();

    const response = await agent.delete('/employees/3')
      .set('X-CSRF-Token', csrfToken)
      .set('Accept', 'application/json')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Đã xóa nhân viên.',
      data: { id: 3 },
      errors: []
    });
    expect(employeeService.remove).toHaveBeenCalledWith('3', 1);
  });

  test('rejects staff access to the employee list and mutations', async () => {
    const { agent, csrfToken } = await authenticatedAgent('STAFF');

    const home = await agent.get('/').expect(200);
    expect(home.text).toContain('Xin chào, STAFF');
    expect(home.text).not.toContain('Mở quản lý nhân viên');
    await agent.get('/employees').expect(403);
    await agent.delete('/employees/3')
      .set('X-CSRF-Token', csrfToken)
      .set('Accept', 'application/json')
      .expect(403);

    expect(employeeService.list).not.toHaveBeenCalled();
    expect(employeeService.remove).not.toHaveBeenCalled();
  });

  test('renders the role-appropriate home and shared news page', async () => {
    const { agent } = await authenticatedAgent('STAFF');

    const home = await agent.get('/').expect(200);
    expect(home.text).toContain('Trang chủ vận hành');
    expect(home.text).toContain('href="/parking/map"');
    expect(home.text).not.toContain('Thống kê</a>');

    const news = await agent.get('/news').expect(200);
    expect(news.text).toContain('Tin tức và thông báo');
    expect(news.text).toContain('aria-label="Điều hướng chính"');
  });

  test('renders the CUSTOMER home separately from the operations dashboard', async () => {
    const { agent } = await authenticatedAgent('CUSTOMER');

    const home = await agent.get('/').expect(200);

    expect(home.text).toContain('đăng ký vị trí đỗ còn trống');
    expect(home.text).toContain('href="/customer/parking-map"');
    expect(home.text).not.toContain('Trang chủ vận hành');
    expect(home.text).not.toContain('Tìm xe');
  });

  test('rejects employee deletion without CSRF', async () => {
    const { agent } = await authenticatedAgent();

    const response = await agent.delete('/employees/3')
      .set('Accept', 'application/json')
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(employeeService.remove).not.toHaveBeenCalled();
  });
});
