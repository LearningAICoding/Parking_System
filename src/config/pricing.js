// Bảng giá tạm thời Sprint 1 (AGENTS.md A4). Service chỉ đọc giá từ file này.
const PRICING = Object.freeze({
  DAILY_TICKET: Object.freeze({ MOTORBIKE: 20000, CAR: 50000 }),
  HOURLY_PARKING: Object.freeze({ MOTORBIKE: 10000, CAR: 20000 })
});

module.exports = { PRICING };
