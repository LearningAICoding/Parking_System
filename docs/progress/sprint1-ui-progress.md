# Sprint 1 UI Progress Log

## Kiểm thử localhost bản Bình — 02/11/2026

- Server thật chạy trên `http://127.0.0.1:3107` với `DB_NAME=parking_test_db`; SMTP giả lập chỉ lắng nghe loopback trong smoke test. Đã dừng server sau kiểm thử.
- `scripts/smoke-localhost.js`: 15/15 nhóm đạt. Bao phủ đăng nhập/đăng xuất/quên và đặt lại mật khẩu qua email giả lập; RBAC/CSRF; nhân viên và khách hàng CRUD; xe/customer ownership; tìm xe; bản đồ và đăng ký ô; scan ảnh/xe vào-ra; vé sửa/xóa có ràng buộc; thống kê ngày/tháng/năm; vị trí CRUD.
- Jest: 14 suites, 50/50 tests đạt. ESLint sạch, OpenAPI lint hợp lệ.
- Phát hiện và sửa trong lúc test: khóa ngoại schema không tạo được trên MySQL hiện tại; reset URL sai vẫn trả 200; `isVisitor` trả số thay vì boolean; xóa vé đã dùng chưa bị chặn; thời hạn reset/bcrypt/giới hạn forgot và log token chưa đúng contract.
- `parking_test_db` đã được nạp lại seed sau test; 6 file PNG mẫu do smoke test tạo đã được xóa. Database trong `.env` không bị reset. Test này kiểm chứng HTTP và MySQL thật; chưa kiểm chứng trực quan responsive trong trình duyệt hoặc các trường hợp concurrency nhiều request.

## Tích hợp các bản ngày 02/11/2026

- Nền: `Project_System-Binh`; giữ code nền Tasks 1, 2, 8, 10, 11, 12 và CUSTOMER.
- Task 3: danh sách/xóa nhân viên từ Thanh, chỉnh shell và CSRF; 3 unit tests đạt trước Task 4.
- Task 4: thêm/sửa nhân viên; 5 unit tests nhân viên đạt trước Task 5.
- Task 5: danh sách/xóa khách hàng từ Thanh, tách module admin khỏi CUSTOMER self-service; 3 unit tests đạt trước Task 6.
- Tasks 6–7: tạo/sửa khách hàng, trang xe và modal thêm xe; 5 unit tests khách hàng đạt trước Task 9.
- Task 9: tìm xe theo tên, số điện thoại hoặc biển số; unit test input đạt trước Task 13.
- Task 13: báo cáo ngày/tháng/năm và series kỳ rỗng; unit test đạt trước Task 14.
- Task 14: danh sách vị trí từ Hai; unit test lọc khu vực đạt trước Task 15.
- Task 15: thêm/sửa vị trí; unit test validation đạt trước Task 16.
- Task 16: chi tiết/xóa vị trí; unit test trạng thái bảo vệ đạt.
- Gate chung: Jest 50/50 tests, gồm E2E render/RBAC trang tích hợp; ESLint 0 errors, 1 warning có từ `src/config/mailer.js`; OpenAPI lint hợp lệ.
- MySQL hiện kết nối được nhưng `.env` trỏ đến database không phải `parking_test_db`; không chạy test ghi/xóa dữ liệu trên database này. Cần chuẩn bị test DB riêng để xác minh transaction, concurrency và rollback trước khi phát hành.
- Code nền và code tích hợp đang là thay đổi chưa commit trong working tree; không tự commit hoặc đổi tên thư mục.

## Trạng thái hiện tại

- Cập nhật lần cuối: 2026-10-24
- Workflow: `parking-sprint1-ui-workflow`
- Task đang làm: Hoàn thành phạm vi workflow cá nhân; chờ quyết định phạm vi tiếp theo
- Quy ước: hoàn thành task mới chuyển trạng thái và ghi lệnh kiểm tra; Task 9 không thuộc phạm vi nhánh này vì đã có thành viên khác đảm nhiệm.

## Nhật ký

### 2026-10-24 — Khởi tạo workflow

- [x] Đọc `AGENTS.md`, contract API, rule triển khai và prototype Task 1–2.
- [x] Xác nhận repo là skeleton, chưa có `src/` implementation.
- [x] Task 1 — Hoàn thành phần nền auth: login, logout, forgot/reset password, session, CSRF, rate limit, bcrypt/SHA-256 reset token.
- [x] Task 2 — Hoàn thành trang chủ quản trị/CUSTOMER, tin tức, header/footer/sidebar và role-based navigation.
- [x] Task 8 — Hoàn thành scan biển số hình ảnh, scan token một lần, upload magic bytes, thêm xe vãng lai, check-in/check-out transaction và màn hình vận hành.
- [ ] Task 9 — Handoff, không triển khai trong workflow này.
- [x] Task 11 — Hoàn thành danh sách vé, lazy expiry, phân trang, xóa mềm MANAGER và chặn xóa vé đang gắn ô RESERVED/OCCUPIED.
- [x] Task 12 — Hoàn thành form sửa vé MANAGER, chỉ nhận start/end date, khóa field read-only, kiểm tra vé đã dùng và tính lại giá từ pricing.
- [x] UI CUSTOMER — Hoàn thành xe của tôi, hồ sơ, bản đồ riêng và đăng ký ô; receipt tức thời + refresh.

## Quyết định cần xác nhận

Chưa có quyết định bổ sung ngoài `AGENTS.md`. Task 9 vẫn là handoff cho thành viên khác.

## Kết quả kiểm tra

### Task 1 — 2026-10-24

- `npm run lint`: pass, còn 2 warning `no-console` ở logger development/server.
- `npm test -- --runInBand`: pass, 3 suites / 13 tests.
- Test hồi quy: session user an toàn, thông báo login chung, reset token một lần, CSRF bắt buộc, forgot-password không dò tài khoản.

### Task 2 — 2026-10-24

- Dashboard quản trị đọc KPI/news từ model, home CUSTOMER dùng view riêng, `/news` dùng shell chung.
- Sidebar ẩn menu quản trị với CUSTOMER; backend vẫn dùng `requireAuth`.
- Sửa lỗi redirect web/API: chỉ `/api` hoặc `Accept: application/json` mới trả JSON/401; web chưa đăng nhập redirect `/login`.
- `npm run lint`: pass, còn 2 warning `no-console` ở logger development/server.
- `npm test -- --runInBand`: pass, 4 suites / 17 tests.

### Task 8 — 2026-10-24

- Thêm adapter OCR mock, normalize biển số, multer giới hạn 5 MB/MIME và kiểm tra magic bytes.
- Scan trả thông tin xe tồn tại: tên xe, hãng xe, khách hàng, số điện thoại, vị trí; xe chưa có trả `exists: false` và token để tiếp tục.
- Scan token lưu hash trong `parking_scan_tokens`, gắn session/user, TTL 10 phút, khóa và dùng một lần khi check-in.
- Check-in/check-out dùng transaction, khóa slot trước vehicle/ticket, xử lý `AVAILABLE/RESERVED/OCCUPIED`, tính phí theo `pricing.js` và lazy expiry đúng trọn ngày `end_date`.
- Thêm trang `GET /parking/checkin-checkout`, upload/preview, result fields, modal thêm xe vãng lai và form check-in/check-out.
- `npm run lint`: pass, còn 2 warning `no-console` ở logger development/server.
- `npm test -- --runInBand`: pass, 5 suites / 21 tests.

### Task 11 — 2026-10-24

- Thêm list vé theo envelope phân trang, lọc vé xóa mềm và cập nhật `ACTIVE → EXPIRED` lazy sau ngày kết thúc.
- STAFF chỉ xem; chỉ MANAGER thấy nút xóa và backend `DELETE /tickets/:id` kiểm tra quyền/CSRF.
- Xóa mềm dùng transaction, khóa `parking_slots` trước rồi mới khóa ticket; vé đang gắn ô `RESERVED/OCCUPIED` trả `409` và modal giữ ngữ cảnh.
- Thêm bảng EJS responsive, confirmation modal và fetch DELETE với message server.
- `npm run lint`: pass, còn 2 warning `no-console` ở logger development/server.
- `npm test -- --runInBand`: pass, 6 suites / 24 tests.

### Task 12 — 2026-10-24

- Thêm `GET/POST /tickets/:id/edit`, chỉ MANAGER; STAFF không có route sửa.
- Controller whitelist đúng `startDate`, `endDate`; các field mã vé, xe, ô, loại, giá, trạng thái và thời điểm hệ thống là read-only.
- Service khóa slot trước ticket, chặn ngày đảo, chặn vé đã dùng, giữ nhất quán slot và tính lại giá DAILY từ `pricing.js`.
- Thêm form EJS sửa vé và liên kết từ danh sách.
- `npm run lint`: pass, còn 2 warning `no-console` ở logger development/server.
- `npm test -- --runInBand`: pass, 6 suites / 27 tests.

### UI CUSTOMER / Task 10 — 2026-10-24

- Thêm `GET /api/my-vehicles` lọc ownership bằng `req.session.user.customerId`, DTO có `derivedStatus` và `isVisitor: false`.
- Thêm `GET/POST /profile`, chỉ nhận fullName/phone/email/address; đổi email cập nhật `customers` và `users` cùng transaction, conflict rollback.
- Thêm bản đồ riêng CUSTOMER và bản đồ vận hành; grid chỉ dùng `id`, `slotCode`, `zone`, `status`, endpoint xem xe chỉ MANAGER/STAFF.
- CUSTOMER đăng ký xe thuộc mình qua `POST /api/slots/:id/register`; transaction tạo DAILY ticket, chuyển ô `AVAILABLE → RESERVED`, trả receipt và UI refresh map/my-vehicles.
- `npm run lint`: pass, còn 2 warning `no-console` ở logger development/server.
- `npm test -- --runInBand`: pass, 8 suites / 32 tests.

### Gate — 2026-10-24

- `npm run lint`: pass, còn 2 warning `no-console` ở logger development/server.
- `npm test -- --runInBand`: pass, 8 suites / 32 tests.
- `npm run contract:lint`: pass.
- `npm run contract:test`: pass, 1 suite / 5 tests.
- `npm run ci`: pass; tổng 8 suites / 33 tests, contract lint pass, lint chỉ còn 2 warning `no-console`.

### Rà soát contract cuối — 2026-10-24

- Vé DAILY chỉ được gắn khi còn hiệu lực đến hết `end_date`; lazy expiry không làm mất hiệu lực đầu ngày.
- Check-in hiển thị ô `RESERVED` đúng xe sau scan; STAFF không thấy link sửa vé.
