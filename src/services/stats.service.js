const model = require('../models/stats.model');
const AppError = require('../utils/app-error');

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDate(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function periodForDate(date, mode) {
  if (mode === 'day') return date;
  if (mode === 'month') return date.slice(0, 7);
  return date.slice(0, 4);
}

function normalizeMoney(value) {
  const text = value === null || value === undefined ? '0' : String(value);
  const [integer, decimal = ''] = text.split('.');
  return `${integer}.${decimal.padEnd(2, '0').slice(0, 2)}`;
}

function sumCount(rows, field) {
  return rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
}

function sumMoney(rows, field) {
  const cents = rows.reduce((sum, row) => {
    const [whole, fraction = ''] = String(row[field] || '0').split('.');
    return sum + BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
  }, 0n);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

async function getReport({ mode, from, to }) {
  if (!['day', 'month', 'year'].includes(mode)) throw new AppError('Chế độ thống kê phải là day, month hoặc year.', 400);
  if (!validDate(from) || !validDate(to) || from > to) throw new AppError('Ngày bắt đầu và ngày kết thúc không hợp lệ.', 400);
  const dayCount = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
  if (dayCount > 366) throw new AppError('Khoảng thời gian thống kê tối đa 366 ngày.', 400);
  const startDateTime = `${from} 00:00:00`;
  const endDateTime = `${addDate(to, 1)} 00:00:00`;
  const grouped = await model.querySeries(mode, startDateTime, endDateTime);
  const periods = new Map();
  for (let date = from; date <= to; date = addDate(date, 1)) {
    const period = periodForDate(date, mode);
    if (!periods.has(period)) periods.set(period, {
      period,
      entries: 0,
      exits: 0,
      ticketRevenue: '0.00',
      casualParkingRevenue: '0.00'
    });
  }
  const merge = (rows, key) => rows.forEach((row) => {
    const period = periods.get(row.period);
    if (period) period[key] = key.endsWith('Revenue') ? normalizeMoney(row[key]) : Number(row[key] || 0);
  });
  merge(grouped.entries, 'entries');
  merge(grouped.exits, 'exits');
  merge(grouped.ticketRevenue, 'ticketRevenue');
  merge(grouped.casualParkingRevenue, 'casualParkingRevenue');

  return {
    summary: {
      entries: sumCount(grouped.entries, 'entries'),
      exits: sumCount(grouped.exits, 'exits'),
      ticketRevenue: sumMoney(grouped.ticketRevenue, 'ticketRevenue'),
      casualParkingRevenue: sumMoney(grouped.casualParkingRevenue, 'casualParkingRevenue'),
      availableSlots: Number(grouped.slots.availableSlots || 0),
      occupiedSlots: Number(grouped.slots.occupiedSlots || 0)
    },
    series: [...periods.values()]
  };
}

module.exports = { getReport };
