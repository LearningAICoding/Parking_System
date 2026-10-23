---
trigger: glob
globs: "src/routes/**/*.js, src/middlewares/**/*.js, src/controllers/**/*.js, src/config/session.js, src/config/upload.js, src/config/mailer.js, src/services/auth.service.js, src/utils/normalize-plate.js, src/views/auth/**/*.ejs"
description: "Quy tắc bảo mật: xác thực/session, quên mật khẩu, RBAC 2 lớp + chống IDOR, CSRF, rate limit, upload ảnh biển số an toàn, validate đầu vào. Tự động nạp khi sửa route, middleware, controller, cấu hình session/upload."
---

# Quy Tắc Bảo Mật & Phân Quyền (`security.md`)

Đặt file này tại `.agents/rules/security.md`. Rule này dùng `trigger: glob` (không dùng `model_decision`) để **luôn được nạp** khi Agent sửa route, middleware, controller, cấu hình session/upload và màn hình đăng nhập. Ma trận quyền nằm ở `AGENTS.md` mục 4.

## 1. Xác Thực (Đăng nhập & Quên mật khẩu)

- **Mật khẩu**: băm bằng `bcrypt` với `saltRounds >= 10`; tối thiểu 8 ký tự. Không lưu plaintext. Truy vấn người dùng phải liệt kê cột tường minh, không `SELECT *` trên `users`, không trả `password_hash`/`reset_token_hash` ra view hay JSON.
- **Đăng nhập**: thông báo lỗi chung "Sai tên đăng nhập hoặc mật khẩu" (không tiết lộ tài khoản có tồn tại). Tài khoản `is_active = 0` không đăng nhập được.
- **Session** (`express-session`): `httpOnly: true`, `sameSite: 'lax'`, `secure: true` khi `NODE_ENV === 'production'`, có `maxAge`. Gọi `req.session.regenerate` ngay sau đăng nhập thành công (chống Session Fixation); đăng xuất thì `destroy` và xóa cookie. `SESSION_SECRET` lấy từ `.env`. Production dùng session store bền (MySQL); `MemoryStore` chỉ dùng khi dev. Session lưu `{ id, role, customerId, fullName }` và được đưa vào view dưới tên `currentUser`.
- **Giới hạn đăng nhập sai**: `express-rate-limit` cho `POST /login` và `POST /forgot-password` (ví dụ tối đa 10 lần / 15 phút / IP).
- **Quên mật khẩu**:
  - Sinh token `crypto.randomBytes(32).toString('hex')`; lưu **bản băm SHA-256** vào `users.reset_token_hash` kèm `reset_expires` tối đa **15 phút**.
  - Gửi link `/reset-password/<token>` qua email bằng `nodemailer` (cấu hình SMTP trong `.env`). Chỉ khi `NODE_ENV === 'development'` mới được in link ra console.
  - Phản hồi giống nhau dù email có tồn tại hay không (chống dò tài khoản).
  - Token dùng **một lần**: vô hiệu ngay sau khi đổi mật khẩu thành công; token hết hạn hoặc sai -> thông báo "Liên kết không hợp lệ hoặc đã hết hạn".

## 2. RBAC 2 Lớp & Chống IDOR

1. **Không bao giờ chỉ ẩn nút trên EJS.** Mọi route trong `src/routes/` phải gắn `requireAuth` và `authorizeRoles(...)` đúng theo ma trận ở `AGENTS.md` mục 4. Chỉ các route công khai được bỏ trống: `/login`, `/forgot-password`, `/reset-password/:token`, tài nguyên tĩnh.
2. **Mã phản hồi**: chưa đăng nhập -> `401` (API) / chuyển hướng `/login` (web, lưu lại trang đích); sai quyền -> `403` (JSON hoặc `errors/403.ejs`).
3. **Màn hình Bản đồ bãi đỗ (bắt buộc)**:
   - `GET /api/slots/:id/vehicle` (Xem thông tin xe): `authorizeRoles('MANAGER', 'STAFF')`; `CUSTOMER` gọi trực tiếp -> `403`.
   - `POST /api/slots/:id/register` (Đăng ký đỗ xe): `authorizeRoles('MANAGER', 'STAFF', 'CUSTOMER')`.
   - `GET /api/slots` (dữ liệu bản đồ): mọi vai trò đã đăng nhập, **chỉ trả** `id`, `slotCode`, `zone`, `status`; không kèm thông tin xe/khách.
4. **Chống IDOR cho `CUSTOMER`**: kiểm tra quyền sở hữu **trong Service**, dựa trên `customerId` của session, không tin `customer_id`/`vehicle_id` do client gửi.
   - Đăng ký đỗ: xe phải thuộc `customerId` của người gọi, nếu không -> `403`.
   - `POST /api/vehicles` do CUSTOMER gọi: `customer_id` luôn lấy từ session, bỏ qua giá trị trong body.
   - Thông tin xe và Sửa khách hàng: CUSTOMER chỉ truy cập bản ghi của chính mình.
5. **Chống Mass Assignment**: chỉ nhận các trường nằm trong danh sách cho phép của từng form; trường `role` chỉ MANAGER được đặt (khi tạo nhân viên), không bao giờ nhận từ form khách hàng.

## 3. CSRF, Header & Bí Mật

- Mọi yêu cầu `POST/PUT/PATCH/DELETE` (form lẫn `fetch`) phải kèm CSRF token: form dùng input ẩn `_csrf`, `fetch` gửi header `X-CSRF-Token` đọc từ thẻ `<meta name="csrf-token">`. Thiếu/sai token -> `403`. (`sameSite: 'lax'` một mình là chưa đủ cho các thao tác xóa/sửa.)
- Dùng `helmet`; nếu tải Bootstrap từ CDN thì khai báo nguồn trong CSP.
- Không commit `.env`; không log mật khẩu, token, session.

## 4. Upload Ảnh Biển Số (màn hình Quản lý xe vào/ra)

- `multer` với `fileFilter` chỉ nhận `image/jpeg`, `image/png`, `image/webp`; `limits: { fileSize: 5 * 1024 * 1024, files: 1 }`. Vượt giới hạn (`LIMIT_FILE_SIZE`) -> `413` "Ảnh vượt quá 5 MB".
- **Kiểm tra magic bytes** sau khi nhận file (không tin `mimetype`): JPEG bắt đầu `FF D8 FF`; PNG `89 50 4E 47 0D 0A 1A 0A`; WebP có `RIFF` ở byte 0-3 và `WEBP` ở byte 8-11. Sai -> xóa file vừa lưu và trả `400`.
- Đổi tên file bằng `crypto.randomUUID()` + đuôi suy ra từ MIME đã xác thực; **không** dùng `originalname` (chống Path Traversal).
- Lưu tại `storage/plates/` (ngoài `public/`, không dùng `express.static`). Phục vụ qua `GET /files/plates/:filename` với `requireAuth` + `authorizeRoles('MANAGER', 'STAFF')`, và `:filename` phải khớp `^[0-9a-f-]{36}\.(jpg|png|webp)$`.

## 5. Kiểm Tra Dữ Liệu Đầu Vào (`express-validator`)

Áp dụng cho: đăng nhập, quên/đặt lại mật khẩu, mọi màn hình Thêm/Sửa (Nhân viên, Khách hàng, Vé, Vị trí đỗ), Modal thêm xe, Modal tìm xe, bộ lọc Thống kê, và mọi tham số `:id` (`isInt({ min: 1 })`).

- **Số điện thoại**: khớp `^(0|\+84)[0-9]{9}$`, sau đó chuẩn hóa `+84...` về `0...` trước khi lưu và tìm kiếm.
- **Biển số xe**: dùng `normalizePlate()` - viết hoa, **bỏ mọi ký tự không phải chữ/số** (`51F-123.45` và `51f 12345` cùng thành `51F12345`), kiểm tra `^[0-9A-Z]{6,10}$`. Dùng cùng hàm này khi lưu, khi tra cứu, và với kết quả OCR.
- **Số tiền** (`price`): số dương. **Vị trí đỗ**: field JSON `slotCode` ánh xạ vào cột DB `slot_code`, khớp `^[A-Z0-9-]{1,20}$`; `status` thuộc danh sách enum (không có trường sức chứa). **Ngày**: `start_date <= end_date`; bộ lọc Thống kê cũng kiểm tra `từ <= đến` ở backend.
- Giới hạn độ dài chuỗi (từ khóa tìm kiếm tối đa 50 ký tự). Dữ liệu hiển thị luôn escape (`<%= %>`, xem `ejs.md`).

## 6. Lỗi & Log

- Không trả stack trace hay lỗi SQL thô cho người dùng (xem `nodejs.md` mục 4).
- Thông báo lỗi bảo mật dùng câu chung chung (đăng nhập, token), không nêu chi tiết nội bộ.
