const bcrypt = require('bcrypt');
const db = require('../config/db');
const model = require('../models/employee.model');
const AppError = require('../utils/app-error');

function clean(data) {
  const out = {};
  for (const key of ['fullName', 'username', 'email', 'phone', 'address', 'position', 'role']) {
    out[key] = typeof data[key] === 'string' ? data[key].trim() : '';
  }
  out.password = typeof data.password === 'string' ? data.password : '';
  out.email = out.email.toLowerCase();
  return out;
}

function validateCommon(data, creating) {
  if (!data.fullName || data.fullName.length > 100) throw new AppError('Họ tên là bắt buộc và tối đa 100 ký tự.', 400);
  if (data.email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new AppError('Email không hợp lệ.', 400);
  if (data.phone && (!/^0\d{9,10}$/.test(data.phone) || data.phone.length > 15)) throw new AppError('Số điện thoại phải bắt đầu bằng 0 và có 10–11 chữ số.', 400);
  if (data.address.length > 255 || data.position.length > 100) throw new AppError('Địa chỉ tối đa 255 ký tự và chức vụ tối đa 100 ký tự.', 400);
  if (creating) {
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(data.username)) throw new AppError('Tên đăng nhập phải có 3–50 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.', 400);
    if (data.password.length < 12 || !/[A-Z]/.test(data.password) || !/[a-z]/.test(data.password) || !/[0-9]/.test(data.password)) throw new AppError('Mật khẩu cần ít nhất 12 ký tự, gồm chữ hoa, chữ thường và chữ số.', 400);
    if (!['MANAGER', 'STAFF'].includes(data.role)) throw new AppError('Vai trò không hợp lệ.', 400);
  }
}

async function inTransaction(work) {
  const backoff = [25, 50, 100];
  for (let attempt = 0; attempt <= backoff.length; attempt += 1) {
    const connection = await db.getConnection();
    let transactionStarted = false;
    let retryDelay = 0;
    try {
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await connection.beginTransaction();
      transactionStarted = true;
      const result = await work(connection);
      await connection.commit();
      transactionStarted = false;
      return result;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      const retryable = ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code);
      if (!retryable) throw error;
      if (attempt === backoff.length) throw new AppError('Xung đột khi xử lý nhân viên. Vui lòng thử lại.', 409);
      retryDelay = backoff[attempt];
    } finally {
      connection.release();
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }
}

async function list(query) {
  const term = String(query || '').trim();
  if (term.length > 50) throw new AppError('Từ khóa tìm kiếm tối đa 50 ký tự.', 400);
  return model.list({ q: term });
}

async function get(id) {
  if (!Number.isInteger(Number(id)) || Number(id) < 1) throw new AppError('Mã nhân viên không hợp lệ.', 400);
  const item = await model.findById(Number(id));
  if (!item) throw new AppError('Không tìm thấy nhân viên.', 404);
  return item;
}

async function create(input) {
  const data = clean(input);
  validateCommon(data, true);
  const { password, ...employee } = data;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    return await inTransaction(async (connection) => {
      const [userResult] = await model.insertUser(connection, { ...employee, passwordHash });
      await model.insertEmployee(connection, userResult.insertId, employee);
      return userResult.insertId;
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Tên đăng nhập hoặc email đã được sử dụng.', 409);
    throw error;
  }
}

async function update(id, input) {
  const data = clean(input);
  validateCommon(data, false);
  if (!Number.isInteger(Number(id)) || Number(id) < 1) throw new AppError('Mã nhân viên không hợp lệ.', 400);
  try {
    await inTransaction(async (connection) => {
      const employee = await model.findForUpdate(connection, Number(id));
      if (!employee) throw new AppError('Không tìm thấy nhân viên.', 404);
      await model.updateEmployee(connection, Number(id), data);
      await model.updateUserEmail(connection, employee.userId, data.email);
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Email đã được sử dụng.', 409);
    throw error;
  }
}

async function remove(id, currentUserId) {
  if (!Number.isInteger(Number(id)) || Number(id) < 1) throw new AppError('Mã nhân viên không hợp lệ.', 400);
  if (!Number.isInteger(Number(currentUserId)) || Number(currentUserId) < 1) throw new AppError('Không xác định được tài khoản hiện tại.', 401);
  await inTransaction(async (connection) => {
    const managers = await model.lockActiveManagers(connection);
    const employee = await model.findForUpdate(connection, Number(id));
    if (!employee) throw new AppError('Không tìm thấy nhân viên.', 404);
    if (Number(employee.userId) === Number(currentUserId)) throw new AppError('Không thể xóa tài khoản đang đăng nhập.', 409);
    if (employee.role === 'MANAGER' && managers.length <= 1) throw new AppError('Không thể xóa quản lý cuối cùng đang hoạt động.', 409);
    await model.softDeleteEmployee(connection, Number(id));
    await model.deactivateUser(connection, Number(employee.userId));
  });
}

module.exports = { list, get, create, update, remove };

