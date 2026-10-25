const bcrypt = require('bcrypt');
const db = require('../config/database');
const model = require('../models/customer.model');
const AppError = require('../utils/app-error');
const runTransaction = require('../utils/run-transaction');

function normalizePhone(value) {
  const phone = typeof value === 'string' ? value.trim() : '';
  if (/^\+84\d{9}$/.test(phone)) return `0${phone.slice(3)}`;
  return phone;
}

function clean(data, creating) {
  const result = {
    fullName: typeof data.fullName === 'string' ? data.fullName.trim() : '',
    phone: normalizePhone(data.phone),
    email: typeof data.email === 'string' ? data.email.trim().toLowerCase() : '',
    address: typeof data.address === 'string' ? data.address.trim() : ''
  };
  if (creating) {
    result.username = typeof data.username === 'string' ? data.username.trim() : '';
    result.password = typeof data.password === 'string' ? data.password : '';
  }
  return result;
}

function validate(data, creating) {
  if (!data.fullName || data.fullName.length > 100) throw new AppError('Họ tên là bắt buộc và tối đa 100 ký tự.', 400);
  if (!/^(0|\+84)[0-9]{9}$/.test(typeof data.phone === 'string' ? data.phone : '')) throw new AppError('Số điện thoại phải gồm mã 0 hoặc +84 và 9 chữ số theo sau.', 400);
  if (data.email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new AppError('Email không hợp lệ.', 400);
  if (data.address.length > 255) throw new AppError('Địa chỉ tối đa 255 ký tự.', 400);
  if (creating) {
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(data.username)) throw new AppError('Tên đăng nhập phải có 3–50 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.', 400);
    if (data.password.length < 12 || !/[A-Z]/.test(data.password) || !/[a-z]/.test(data.password) || !/[0-9]/.test(data.password)) throw new AppError('Mật khẩu cần ít nhất 12 ký tự, gồm chữ hoa, chữ thường và chữ số.', 400);
  }
}

async function transaction(work) {
  return runTransaction(db, work, { conflictMessage: 'Xung đột khi xử lý khách hàng. Vui lòng thử lại.' });
}

async function list(query = '') {
  const keyword = String(query).trim();
  if (keyword.length > 50) throw new AppError('Từ khóa tìm kiếm tối đa 50 ký tự.', 400);
  return model.list({ q: keyword });
}

async function get(id) {
  if (!Number.isInteger(Number(id)) || Number(id) < 1) throw new AppError('Mã khách hàng không hợp lệ.', 400);
  const customer = await model.findById(Number(id));
  if (!customer) throw new AppError('Không tìm thấy khách hàng.', 404);
  return customer;
}

async function create(input) {
  const data = clean(input, true);
  validate(data, true);
  const { password, ...customer } = data;
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    return await transaction(async (connection) => {
      const [user] = await model.insertUser(connection, { ...customer, passwordHash });
      const [created] = await model.insertCustomer(connection, user.insertId, customer);
      return created.insertId;
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Tên đăng nhập hoặc email đã được sử dụng.', 409);
    throw error;
  }
}

async function update(id, input) {
  const data = clean(input, false);
  validate(data, false);
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId < 1) throw new AppError('Mã khách hàng không hợp lệ.', 400);
  try {
    await transaction(async (connection) => {
      const customer = await model.lockCustomer(connection, customerId);
      if (!customer) throw new AppError('Không tìm thấy khách hàng.', 404);
      await model.updateCustomer(connection, customerId, data);
      if (customer.userId) await model.updateUserEmail(connection, customer.userId, data.email);
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Email đã được sử dụng.', 409);
    throw error;
  }
}

async function updateOwnProfile(userId, input) {
  const customer = await model.findByUserId(Number(userId));
  if (!customer) throw new AppError('Không tìm thấy hồ sơ khách hàng.', 404);
  await update(customer.id, input);
  return model.findByUserId(Number(userId));
}

async function getOwnProfile(userId) {
  const customer = await model.findByUserId(Number(userId));
  if (!customer) throw new AppError('Không tìm thấy hồ sơ khách hàng.', 404);
  return customer;
}

async function remove(id) {
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId < 1) throw new AppError('Mã khách hàng không hợp lệ.', 400);
  await transaction(async (connection) => {
    const slots = await model.lockSlotsForCustomer(connection, customerId);
    const vehicles = await model.lockVehiclesForCustomer(connection, customerId);
    const customer = await model.lockCustomer(connection, customerId);
    if (!customer) throw new AppError('Không tìm thấy khách hàng.', 404);
    const tickets = await model.lockCustomerTickets(connection, customerId);
    const hasOpenSession = await model.hasOpenSession(connection, customerId);
    if (vehicles.length || tickets.length || slots.length || hasOpenSession) {
      throw new AppError('Không thể xóa khách hàng đang có xe, vé còn hiệu lực, ô đã đăng ký/đang đỗ hoặc phiên gửi xe mở.', 409);
    }
    await model.softDelete(connection, customerId);
    if (customer.userId) await model.deactivateUser(connection, customer.userId);
  });
}

async function getVehiclesForUser(userId) {
  const customer = await model.findByUserId(Number(userId));
  if (!customer) throw new AppError('Không tìm thấy hồ sơ khách hàng.', 404);
  return model.listVehicles(customer.id);
}

async function getVehiclesForCustomer(customerId) {
  const customer = await get(customerId);
  return model.listVehicles(customer.id);
}

module.exports = {
  list,
  get,
  create,
  update,
  updateOwnProfile,
  getOwnProfile,
  remove,
  getVehiclesForUser,
  getVehiclesForCustomer
};
