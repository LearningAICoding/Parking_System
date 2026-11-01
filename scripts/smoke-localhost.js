const assert = require('node:assert/strict');
const request = require('supertest');
const net = require('node:net');
const env = require('../src/config/env');
const pool = require('../src/config/db');

if (env.db.name !== 'parking_test_db') throw new Error('Smoke test requires DB_NAME=parking_test_db');
const base = process.env.SMOKE_URL || 'http://127.0.0.1:3107';
const results = [];
const receivedMail = [];

async function startSmtpServer() {
  if (!['localhost', '127.0.0.1', '::1'].includes(env.mail.host)) throw new Error('SMTP host must be loopback for smoke test');
  const server = net.createServer((socket) => {
    let pending = '';
    let inData = false;
    let body = [];
    socket.write('220 localhost smoke SMTP\r\n');
    socket.on('data', (chunk) => {
      pending += chunk.toString('utf8');
      while (pending.includes('\n')) {
        const offset = pending.indexOf('\n');
        const line = pending.slice(0, offset).replace(/\r$/, '');
        pending = pending.slice(offset + 1);
        if (inData) {
          if (line === '.') {
            receivedMail.push(body.join('\n'));
            body = [];
            inData = false;
            socket.write('250 queued\r\n');
          } else body.push(line);
        } else if (/^EHLO|^HELO/i.test(line)) socket.write('250-localhost\r\n250 OK\r\n');
        else if (/^DATA/i.test(line)) { inData = true; socket.write('354 end with dot\r\n'); }
        else if (/^QUIT/i.test(line)) { socket.write('221 bye\r\n'); socket.end(); }
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(env.mail.port, '127.0.0.1', resolve); });
  return server;
}

async function step(label, action) {
  try {
    await action();
    results.push({ label, status: 'PASS' });
    process.stdout.write(`PASS ${label}\n`);
  } catch (error) {
    results.push({ label, status: 'FAIL', detail: error.message });
    process.stderr.write(`FAIL ${label}: ${error.message}\n`);
  }
}

function csrf(html) {
  const value = html.match(/name="csrf-token" content="([^"]+)"/)?.[1]
    || html.match(/name="_csrf" value="([^"]+)"/)?.[1];
  assert.ok(value, 'CSRF token missing');
  return value;
}

async function login(username) {
  const agent = request.agent(base);
  const page = await agent.get('/login');
  assert.equal(page.status, 200);
  const response = await agent.post('/login').type('form').send({
    _csrf: csrf(page.text), username, password: 'Password123!'
  });
  assert.equal(response.status, 302, `${username} login: ${response.status}`);
  const home = await agent.get('/');
  assert.equal(home.status, 200, `${username} home: ${home.status}`);
  return { agent, token: csrf(home.text) };
}

function api(session, method, url) {
  return session.agent[method](url).set('X-CSRF-Token', session.token).set('Accept', 'application/json');
}

async function main() {
  const smtpServer = await startSmtpServer();
  await step('public health/login/forgot/reset pages', async () => {
    assert.equal((await request(base).get('/health')).status, 200);
    assert.equal((await request(base).get('/login')).status, 200);
    assert.equal((await request(base).get('/forgot-password')).status, 200);
    assert.equal((await request(base).get('/reset-password/invalid')).status, 400);
  });
  let manager; let staff; let customer; let smokeVehicleId; let registeredTicketId; let registeredDate;
  await step('login and role home pages', async () => {
    manager = await login('manager.seed');
    staff = await login('staff.seed');
    customer = await login('customer.one');
  });
  if (!manager || !staff || !customer) throw new Error('Cannot continue without all three sessions');

  await step('RBAC and CSRF', async () => {
    assert.equal((await staff.agent.get('/employees')).status, 403);
    assert.equal((await customer.agent.get('/tickets')).status, 403);
    assert.equal((await customer.agent.get('/api/slots/3/vehicle')).status, 403);
    assert.equal((await manager.agent.post('/employees/create').type('form').send({ fullName: 'X' })).status, 403);
    assert.equal((await request(base).get('/api/slots')).status, 401);
    assert.equal((await customer.agent.get('/files/plates/00000000-0000-0000-0000-000000000000.png')).status, 403);
  });

  await step('check-in rejects a vehicle reserved in another slot', async () => {
    const response = await api(staff, 'post', '/api/parking/check-in').send({ vehicleId: 1, slotId: 1 });
    assert.equal(response.status, 409, response.text);
    const [[slot]] = await pool.execute('SELECT status, current_vehicle_id FROM parking_slots WHERE id = 1');
    assert.equal(slot.status, 'AVAILABLE');
    assert.equal(slot.current_vehicle_id, null);
  });

  await step('forgot password avoids account disclosure', async () => {
    const agent = request.agent(base);
    let page = await agent.get('/forgot-password');
    let response = await agent.post('/forgot-password').type('form').send({ _csrf: csrf(page.text), email: 'missing@example.test' });
    assert.equal(response.status, 302);
    page = await agent.get('/forgot-password');
    response = await agent.post('/forgot-password').type('form').send({ _csrf: csrf(page.text), email: 'customer.two@example.test' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.location, '/forgot-password?sent=1');
    const [[row]] = await pool.execute('SELECT reset_token_hash IS NOT NULL AS issued FROM users WHERE id=4');
    assert.equal(row.issued, 1);
    assert.equal(receivedMail.length, 1);
  });

  await step('employee list/create/edit/delete', async () => {
    assert.equal((await manager.agent.get('/employees')).status, 200);
    let response = await api(manager, 'post', '/employees/create').type('form').send({
      fullName: 'Test Employee', username: 'smoke.employee', email: 'smoke.employee@example.test',
      password: 'Password123!', phone: '0900000099', address: 'Test', position: 'Staff', role: 'STAFF'
    });
    assert.equal(response.status, 302, response.text.slice(0, 200));
    const row = (await manager.agent.get('/employees')).text.match(/href="\/employees\/(\d+)\/edit"[^>]*>Sửa/);
    assert.ok(row);
    const id = row[1];
    assert.equal((await manager.agent.get(`/employees/${id}/edit`)).status, 200);
    response = await api(manager, 'post', `/employees/${id}/edit`).type('form').send({
      fullName: 'Test Employee Updated', email: 'smoke.employee@example.test', phone: '0900000099', address: 'Test', position: 'Staff'
    });
    assert.equal(response.status, 302);
    response = await api(manager, 'delete', `/employees/${id}`);
    assert.equal(response.status, 200, response.text);
  });

  await step('customer list/create/edit, vehicle and guarded delete', async () => {
    assert.equal((await staff.agent.get('/customers')).status, 200);
    let response = await api(staff, 'post', '/customers/create').type('form').send({
      fullName: 'Smoke Customer', phone: '0900000088', email: 'smoke.customer@example.test',
      address: 'Test', username: 'smoke.customer', password: 'Password123!'
    });
    assert.equal(response.status, 302, response.text.slice(0, 200));
    const customers = (await staff.agent.get('/customers')).text;
    const match = customers.match(/href="\/customers\/(\d+)\/vehicles"[^>]*>Xe/);
    assert.ok(match);
    const id = match[1];
    assert.equal((await staff.agent.get(`/customers/${id}/vehicles`)).status, 200);
    response = await api(staff, 'post', `/customers/${id}/edit`).type('form').send({
      fullName: 'Smoke Customer Updated', phone: '0900000088', email: 'smoke.customer@example.test', address: 'Test'
    });
    assert.equal(response.status, 302);
    response = await api(staff, 'post', '/api/vehicles').send({
      licensePlate: '99A88888', vehicleName: 'Smoke Car', brand: 'Honda', vehicleType: 'CAR', customerId: Number(id)
    });
    assert.equal(response.status, 201, response.text);
    smokeVehicleId = response.body.data.id;
    response = await api(staff, 'delete', `/customers/${id}`);
    assert.equal(response.status, 409, response.text);
  });

  await step('vehicle search and CUSTOMER ownership/profile', async () => {
    const search = await staff.agent.get('/api/vehicles/search?keyword=99A-888.88');
    assert.equal(search.status, 200, search.text);
    assert.ok(search.body.data.items.some((item) => item.licensePlate === '99A88888'));
    const mine = await customer.agent.get('/api/my-vehicles');
    assert.equal(mine.status, 200, mine.text);
    assert.ok(mine.body.data.items.every((item) => item.isVisitor === false));
    assert.equal((await customer.agent.get('/profile')).status, 200);
    const profile = await api(customer, 'post', '/profile').type('form').send({
      fullName: 'Customer One Updated', phone: '0900000011', email: 'customer.one@example.test', address: 'Test'
    });
    assert.equal(profile.status, 302, profile.text.slice(0, 200));
  });

  await step('slot map, registration and vehicle detail RBAC', async () => {
    assert.equal((await customer.agent.get('/parking/map')).status, 200);
    const grid = await customer.agent.get('/api/slots');
    assert.equal(grid.status, 200, grid.text);
    assert.ok(grid.body.data.every((slot) => Object.keys(slot).sort().join(',') === 'id,slotCode,status,zone'));
    const detail = await staff.agent.get('/api/slots/3/vehicle');
    assert.equal(detail.status, 200, detail.text);
    const registration = await api(customer, 'post', '/api/slots/1/register').send({ vehicleId: 1 });
    assert.equal(registration.status, 409, registration.text); // seeded vehicle already holds A-02
    const reserved = await api(staff, 'post', '/api/slots/1/register').send({ vehicleId: smokeVehicleId });
    assert.equal(reserved.status, 201, reserved.text);
    assert.ok(reserved.body.data.ticketCode);
    registeredTicketId = reserved.body.data.ticketId;
    registeredDate = reserved.body.data.startDate;
  });

  await step('ticket edit, reserved check-in and guarded delete', async () => {
    let response = await api(manager, 'post', `/tickets/${registeredTicketId}/edit`).type('form').send({
      startDate: registeredDate, endDate: registeredDate
    });
    assert.equal(response.status, 302, response.text.slice(0, 200));
    response = await api(staff, 'post', '/api/parking/check-in').send({ vehicleId: smokeVehicleId, slotId: 1 });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.data.ticketId, registeredTicketId);
    response = await api(staff, 'post', '/api/parking/check-out').send({ sessionId: response.body.data.sessionId });
    assert.equal(response.status, 200, response.text);
    response = await api(manager, 'delete', `/tickets/${registeredTicketId}`);
    assert.equal(response.status, 409, response.text);
    response = await api(manager, 'post', `/tickets/${registeredTicketId}/edit`).type('form').send({
      startDate: registeredDate, endDate: registeredDate
    });
    assert.equal(response.status, 409, response.text.slice(0, 200));
  });

  await step('parking scan/upload and check-in/check-out', async () => {
    const image = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const scanned = await api(staff, 'post', '/api/parking/scan-plate').attach('plateImage', image, '29C44444.png');
    assert.equal(scanned.status, 200, scanned.text);
    assert.equal(scanned.body.data.exists, false);
    let response = await api(staff, 'post', '/api/vehicles').send({
      licensePlate: '29C44444', vehicleName: 'Visitor', brand: 'Honda', vehicleType: 'MOTORBIKE'
    });
    assert.equal(response.status, 201, response.text);
    const vehicleId = response.body.data.id;
    response = await api(staff, 'post', '/api/parking/check-in').send({ vehicleId, slotId: 5, scanToken: scanned.body.data.scanToken });
    assert.equal(response.status, 201, response.text);
    const sessionId = response.body.data.sessionId;
    response = await api(staff, 'post', '/api/parking/check-out').send({ sessionId });
    assert.equal(response.status, 200, response.text);
    assert.ok(Number(response.body.data.fee) >= 10000);
    const invalidImage = await api(staff, 'post', '/api/parking/scan-plate').attach('plateImage', Buffer.from('not-a-png'), '29C44444.png');
    assert.equal(invalidImage.status, 400, invalidImage.text);
  });

  await step('CUSTOMER creates own vehicle and registers available slot', async () => {
    let response = await api(customer, 'post', '/api/vehicles').send({
      licensePlate: '77A55555', vehicleName: 'Customer Car', brand: 'Honda', vehicleType: 'CAR', customerId: 2
    });
    assert.equal(response.status, 201, response.text);
    const vehicleId = response.body.data.id;
    assert.equal(response.body.data.customerId, 1);
    response = await api(customer, 'post', '/api/slots/1/register').send({ vehicleId });
    assert.equal(response.status, 201, response.text);
    assert.ok(response.body.data.ticketCode && response.body.data.slotCode && response.body.data.price);
    response = await api(customer, 'post', '/api/slots/5/register').send({ vehicleId: smokeVehicleId });
    assert.equal(response.status, 403, response.text);
  });

  await step('concurrent registration allows exactly one vehicle per slot', async () => {
    const first = await api(staff, 'post', '/api/vehicles').send({
      licensePlate: '88A11111', vehicleName: 'Race One', brand: 'Honda', vehicleType: 'CAR'
    });
    const second = await api(staff, 'post', '/api/vehicles').send({
      licensePlate: '88A22222', vehicleName: 'Race Two', brand: 'Honda', vehicleType: 'CAR'
    });
    assert.equal(first.status, 201, first.text);
    assert.equal(second.status, 201, second.text);
    const responses = await Promise.all([
      api(staff, 'post', '/api/slots/5/register').send({ vehicleId: first.body.data.id }),
      api(staff, 'post', '/api/slots/5/register').send({ vehicleId: second.body.data.id })
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    const winner = responses.find((response) => response.status === 201).body.data.vehicleId;
    const [[slot]] = await pool.execute('SELECT status, current_vehicle_id FROM parking_slots WHERE id = 5');
    assert.equal(slot.status, 'RESERVED');
    assert.equal(slot.current_vehicle_id, winner);
  });

  await step('tickets and statistics', async () => {
    assert.equal((await manager.agent.get('/tickets')).status, 200);
    assert.equal((await manager.agent.get('/tickets/1/edit')).status, 200);
    assert.equal((await staff.agent.get('/tickets/1/edit')).status, 403);
    const report = await manager.agent.get('/stats/report?mode=day&from=2026-10-16&to=2026-10-18');
    assert.equal(report.status, 200, report.text);
    assert.equal(report.body.data.series.length, 3);
    for (const mode of ['month', 'year']) {
      const grouped = await manager.agent.get(`/stats/report?mode=${mode}&from=2026-10-16&to=2026-10-18`);
      assert.equal(grouped.status, 200, grouped.text);
      assert.equal(grouped.body.data.series.length, 1);
    }
    const deleted = await api(manager, 'delete', '/tickets/6');
    assert.equal(deleted.status, 200, deleted.text);
  });

  await step('password reset token is consumed once', async () => {
    const mailBody = receivedMail[0].replace(/=\n/g, '');
    const token = mailBody.match(/\/reset-password\/([0-9a-f]{64})/)?.[1];
    assert.ok(token, 'reset link missing from email');
    const agent = request.agent(base);
    const page = await agent.get(`/reset-password/${token}`);
    assert.equal(page.status, 200);
    const response = await agent.post(`/reset-password/${token}`).type('form').send({
      _csrf: csrf(page.text), password: 'NewPassword123!', passwordConfirmation: 'NewPassword123!'
    });
    assert.equal(response.status, 302, response.text.slice(0, 200));
    const replay = await agent.post(`/reset-password/${token}`).type('form').send({
      _csrf: csrf(page.text), password: 'AnotherPassword123!', passwordConfirmation: 'AnotherPassword123!'
    });
    assert.equal(replay.status, 200, replay.text.slice(0, 200));
    assert.match(replay.text, /không hợp lệ|hết hạn/);
  });

  await step('slot CRUD', async () => {
    assert.equal((await staff.agent.get('/slots')).status, 200);
    let response = await api(manager, 'post', '/slots/create').type('form').send({ slotCode: 'Z-99', zone: 'TEST', status: 'AVAILABLE', note: 'Smoke test' });
    assert.equal(response.status, 302, response.text.slice(0, 200));
    const list = (await manager.agent.get('/slots?zone=TEST')).text;
    const id = list.match(/href="\/slots\/(\d+)"[^>]*>Z-99/)[1];
    assert.equal((await manager.agent.get(`/slots/${id}`)).status, 200);
    assert.equal((await manager.agent.get(`/slots/${id}/edit`)).status, 200);
    response = await api(manager, 'post', `/slots/${id}/edit`).type('form').send({ zone: 'TEST2', status: 'MAINTENANCE', note: 'Updated' });
    assert.equal(response.status, 302, response.text.slice(0, 200));
    response = await api(manager, 'delete', `/slots/${id}`);
    assert.equal(response.status, 200, response.text);
  });

  await step('logout', async () => {
    const response = await api(manager, 'post', '/logout').type('form').send({});
    assert.equal(response.status, 302);
    assert.equal((await manager.agent.get('/employees')).status, 302);
  });

  const passed = results.filter((item) => item.status === 'PASS').length;
  process.stdout.write(`SUMMARY ${passed}/${results.length} groups passed\n`);
  await pool.end();
  await new Promise((resolve) => smtpServer.close(resolve));
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
