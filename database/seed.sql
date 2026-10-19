-- Deterministic local/test fixtures for database/schema.sql.
-- Intended password for all seeded users: Password123!
-- Never use these credentials in production.
-- Select the target database before sourcing this file (parking_db or parking_test_db).

SET time_zone = '+07:00';
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE parking_sessions;
TRUNCATE TABLE tickets;
TRUNCATE TABLE parking_slots;
TRUNCATE TABLE vehicles;
TRUNCATE TABLE customers;
TRUNCATE TABLE employees;
TRUNCATE TABLE news;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users
  (id, username, email, password_hash, role, is_active)
VALUES
  (1, 'manager.seed', 'manager.seed@example.test', '$2b$10$yw4Y3UutKw1d0EHuz9l5iuLfrTSguP61Px7zVJlM8noSTI1KAVYFa', 'MANAGER', 1),
  (2, 'staff.seed', 'staff.seed@example.test', '$2b$10$yw4Y3UutKw1d0EHuz9l5iuLfrTSguP61Px7zVJlM8noSTI1KAVYFa', 'STAFF', 1),
  (3, 'customer.one', 'customer.one@example.test', '$2b$10$yw4Y3UutKw1d0EHuz9l5iuLfrTSguP61Px7zVJlM8noSTI1KAVYFa', 'CUSTOMER', 1),
  (4, 'customer.two', 'customer.two@example.test', '$2b$10$yw4Y3UutKw1d0EHuz9l5iuLfrTSguP61Px7zVJlM8noSTI1KAVYFa', 'CUSTOMER', 1);

INSERT INTO employees
  (id, user_id, full_name, phone, address, position)
VALUES
  (1, 1, 'Quản lý mẫu', '0900000001', 'Hà Nội', 'Quản lý bãi đỗ'),
  (2, 2, 'Nhân viên mẫu', '0900000002', 'Hà Nội', 'Nhân viên vận hành');

INSERT INTO customers
  (id, user_id, full_name, phone, email, address)
VALUES
  (1, 3, 'Khách hàng mẫu một', '0900000011', 'customer.one@example.test', 'Hà Nội'),
  (2, 4, 'Khách hàng mẫu hai', '0900000012', 'customer.two@example.test', 'Hà Nội');

INSERT INTO vehicles
  (id, customer_id, license_plate, vehicle_name, brand, vehicle_type)
VALUES
  (1, 1, '30A12345', 'Civic', 'Honda', 'CAR'),
  (2, 2, '51F67890', 'Mazda 3', 'Mazda', 'CAR'),
  (3, NULL, '29B11111', 'SH 150i', 'Honda', 'MOTORBIKE'),
  (4, NULL, '30H22222', 'VF 8', 'VinFast', 'CAR'),
  (5, NULL, '43C33333', 'Yamaha NVX', 'Yamaha', 'MOTORBIKE');

INSERT INTO parking_slots
  (id, slot_code, zone, status, current_vehicle_id, note)
VALUES
  (1, 'A-01', 'B1-A', 'AVAILABLE', NULL, 'Ô sạch, sẵn sàng'),
  (2, 'A-02', 'B1-A', 'RESERVED', 1, 'Đã đăng ký'),
  (3, 'A-03', 'B1-A', 'OCCUPIED', 2, 'Đang có xe'),
  (4, 'A-04', 'B1-B', 'MAINTENANCE', NULL, 'Bảo trì cảm biến'),
  (5, 'B-01', 'B1-B', 'AVAILABLE', NULL, 'Ô sạch, sẵn sàng'),
  (6, 'B-02', 'B2-C', 'RESERVED', 3, 'Xe vãng lai đã đăng ký'),
  (7, 'B-03', 'B2-D', 'OCCUPIED', 4, 'Xe vãng lai đang đỗ');

INSERT INTO tickets
  (id, ticket_code, vehicle_id, slot_id, ticket_type, price, start_date, end_date, status, deleted_at)
VALUES
  (1, 'T-20261018-00001', 1, 2, 'DAILY', 50000.00, '2026-10-18', '2026-10-18', 'ACTIVE', NULL),
  (2, 'T-20261018-00002', 2, 3, 'DAILY', 50000.00, '2026-10-18', '2026-10-18', 'ACTIVE', NULL),
  (3, 'T-20261018-00003', 3, 6, 'DAILY', 20000.00, '2026-10-18', '2026-10-18', 'ACTIVE', NULL),
  (4, 'T-20261018-00004', 4, 7, 'DAILY', 50000.00, '2026-10-18', '2026-10-18', 'ACTIVE', NULL),
  (5, 'T-20261016-00005', 5, 1, 'DAILY', 20000.00, '2026-10-16', '2026-10-16', 'EXPIRED', NULL),
  (6, 'T-20261015-00006', 5, 5, 'DAILY', 20000.00, '2026-10-15', '2026-10-15', 'CANCELLED', NULL);

INSERT INTO parking_sessions
  (id, vehicle_id, ticket_id, scanned_plate, plate_image_url, slot_id,
   check_in_time, check_out_time, fee)
VALUES
  (1, 5, 5, '43C33333', NULL, 1,
   '2026-10-16 08:00:00', '2026-10-16 10:10:00', 30000.00),
  (2, 2, 2, '51F67890', NULL, 3,
   '2026-10-18 08:00:00', NULL, NULL),
  (3, 4, 4, '30H22222', NULL, 7,
   '2026-10-18 09:15:00', NULL, NULL);

INSERT INTO news (id, title, summary, content, published_at)
VALUES
  (1, 'Bãi đỗ hoạt động bình thường', 'Thông báo vận hành mẫu cho môi trường local.',
   'Đây là dữ liệu mẫu dùng để kiểm tra màn hình tin tức.', '2026-10-18 07:00:00'),
  (2, 'Hướng dẫn đăng ký chỗ', 'Khách hàng có thể đăng ký một xe vào một ô trống.',
   'Chọn ô AVAILABLE trên bản đồ và chọn xe thuộc tài khoản của mình.', '2026-10-17 07:00:00');

ALTER TABLE users AUTO_INCREMENT = 5;
ALTER TABLE employees AUTO_INCREMENT = 3;
ALTER TABLE customers AUTO_INCREMENT = 3;
ALTER TABLE vehicles AUTO_INCREMENT = 6;
ALTER TABLE parking_slots AUTO_INCREMENT = 8;
ALTER TABLE tickets AUTO_INCREMENT = 7;
ALTER TABLE parking_sessions AUTO_INCREMENT = 4;
ALTER TABLE news AUTO_INCREMENT = 3;
