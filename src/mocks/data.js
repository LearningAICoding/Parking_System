// Mock data for frontend development (no DB)
// This module holds in‑memory arrays that can be mutated by the mock services.

const news = [
  { id: 1, title: 'Cập nhật hệ thống', content: 'Hệ thống bãi đỗ đã nâng cấp giao diện.', created_at: new Date() },
  { id: 2, title: 'Tin khuyến mãi', content: 'Giảm 20% phí đỗ vào cuối tuần.', created_at: new Date() },
];

const customers = [
  { id: 1, fullName: 'Nguyễn Văn A', phone: '0901234567', email: 'a@example.com', address: 'Hà Nội', deleted: false },
  { id: 2, fullName: 'Trần Thị B', phone: '0912345678', email: 'b@example.com', address: 'TP.HCM', deleted: false },
];

const vehicles = [
  // each vehicle belongs to a customer via customerId (null = vãng lai)
  { id: 1, licensePlate: '51F12345', vehicleName: 'Honda City', brand: 'Honda', vehicleType: 'CAR', customerId: 1 },
  { id: 2, licensePlate: '30A98765', vehicleName: 'Yamaha Xe 1', brand: 'Yamaha', vehicleType: 'MOTORBIKE', customerId: 2 },
];

module.exports = { news, customers, vehicles };
