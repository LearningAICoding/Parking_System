# Báo cáo rà soát và kế hoạch xử lý CUSTOMER

**Ngày:** 23/10/2026  
**Phạm vi:** Rà soát logic và mức sẵn sàng để AI build giao diện/chức năng CUSTOMER trong Sprint 1.  
**Nguồn đối chiếu:** `AGENTS.md`, `docs/contracts/api.md`, `.agents/rules/testing.md`, `docs/design/`, `customer_ui/`.

## 1. Kết luận điều hành

Giao diện CUSTOMER đã được đưa vào khu vực prototype chính thức tại `docs/design/screens/`. Sáu vấn đề P1 đã được chốt trong `AGENTS.md` và `docs/contracts/api.md`; runtime và test vẫn là hạng mục implementation tiếp theo, chưa được đánh dấu hoàn thành khi chưa có mã nguồn thực thi.

Không có code runtime CUSTOMER được triển khai trong `src/` hoặc `public/`. Các thay đổi hiện tại chỉ nằm ở nguồn sự thật, API contract, rule kiểm thử, task mapping và prototype thiết kế.

## 2. Phạm vi CUSTOMER đã xác định

| Màn hình | Prototype | Luồng thật dự kiến | Task |
|---|---|---|---:|
| Trang chủ CUSTOMER | `customer-home` | Trang chủ, tin tức, điều hướng, liên kết xe/bản đồ | 2 |
| Xe của tôi | `customer-my-vehicles` | Xem xe thuộc tài khoản, thêm xe | 6–7 |
| Bản đồ bãi đỗ | `customer-parking-map` | Xem trạng thái ô, đăng ký ô `AVAILABLE` | 10 |
| Hồ sơ cá nhân | `customer-profile` | `GET/POST /profile` | 7 |

CUSTOMER không được thực hiện các thao tác scan biển số, check-in, check-out, sửa/xóa vé, xem thông tin xe tại ô hoặc quản trị customer khác.

## 3. Các quyết định đã xử lý theo phương án A + D

| Mã | Quyết định | Đã đồng bộ tại |
|---|---|---|
| C-01 | Thêm `GET /api/my-vehicles`; ownership luôn lấy từ `req.session.customerId` | `AGENTS.md` 6.16, `docs/contracts/api.md` |
| C-02 | CUSTOMER sửa hồ sơ bằng `GET/POST /profile`, chỉ nhận `fullName, phone, email, address` | `AGENTS.md` 6.16, `docs/contracts/api.md` |
| C-03 | Zone chỉ là thuộc tính lọc/hiển thị; không tự áp quy tắc Zone–`vehicleType` | `AGENTS.md` 6.16, design notes |
| C-04 | DTO xe CUSTOMER có `derivedStatus`, `slotCode`, `checkInTime`, `lastExitTime` | `AGENTS.md` 6.16, `docs/contracts/api.md` |
| C-05 | Sau đăng ký thành công hiển thị ticket summary/giá và refresh map + danh sách xe; không hủy RESERVED | `AGENTS.md` 6.16, design notes |
| C-06 | Form xe dùng đúng enum `MOTORBIKE|CAR` | Prototype CUSTOMER, testing rule |

## 4. Vấn đề còn cần giải quyết

### P1 — Chặn trước khi coding

| ID | Vấn đề | Rủi ro | Việc cần chốt |
|---|---|---|---|
| P1-01 | Route `/` chưa nói rõ CUSTOMER dùng `customer/home.ejs`, MANAGER/STAFF dùng dashboard quản trị | AI có thể render nhầm một view cho mọi role | **Đã chốt** trong `AGENTS.md` 6.13 và `docs/contracts/api.md` |
| P1-02 | Profile sửa email nhưng chưa quy định đồng bộ `users.email` và `customers.email` | Login/reset password và hồ sơ có thể lệch dữ liệu | **Đã chốt** transaction hai bảng, trùng email `409` |
| P1-03 | `derivedStatus` có `VISITOR` nhưng state machine nói VISITOR là thuộc tính độc lập, có thể đồng thời với trạng thái khác | DTO một giá trị không biểu diễn được state thực tế | **Đã chốt**: bỏ `VISITOR` khỏi `derivedStatus`; giữ `isVisitor` là field tương thích và luôn `false` trong `/api/my-vehicles` |
| P1-04 | CUSTOMER nhận ticket summary sau đăng ký nhưng RBAC không cho xem ticket | AI có thể mở nhầm màn hình/API ticket cho CUSTOMER | **Đã chốt**: chỉ biên nhận tức thời, không có API ticket CUSTOMER |
| P1-05 | Prototype dùng `zone-a/zone-b/zone-c`, dữ liệu API mẫu dùng `B1-A/B1-B/B2-C` | Bộ lọc bản đồ có thể không khớp dữ liệu | **Đã chốt**: prototype có `renderZoneFilters(slots)`, production lấy zone từ API |
| P1-06 | `GET /api/my-vehicles` có `data.items` nhưng chưa rõ có pagination không | Response frontend/test không thống nhất | **Đã chốt**: Sprint 1 không phân trang, không có `data.pagination` |

### P2 — Cần bổ sung trước khi đóng Task CUSTOMER

| ID | Vấn đề | Việc cần làm |
|---|---|---|
| P2-01 | Test mass assignment ghi `400 hoặc bỏ qua` | Chọn một expected result duy nhất; khuyến nghị field cấm trả `400`, riêng `customerId` của CUSTOMER bị bỏ qua theo contract |
| P2-02 | Thiếu test profile email conflict và đồng bộ hai bảng | Thêm integration test transaction, unique email và phone normalization |
| P2-03 | Thiếu test đầy đủ cho `/my-vehicles` | Test ownership, field nullable, derived status và không lộ customer khác |
| P2-04 | Có hai nguồn prototype: `customer_ui/` và `docs/design/screens/customer-*` | Ghi `docs/design/screens/customer-*` là canonical; `customer_ui/` chỉ là nguồn nhập ban đầu |
| P2-05 | Chưa có prototype hồ sơ CUSTOMER | **Đã xử lý**: thêm `docs/design/screens/customer-profile/code.html` |

## 5. Contract CUSTOMER hiện tại

### API

| Endpoint | Quyền | Mục đích |
|---|---|---|
| `GET /api/my-vehicles` | CUSTOMER | Lấy xe của chính tài khoản |
| `POST /api/vehicles` | MANAGER/STAFF/CUSTOMER | Thêm xe; CUSTOMER lấy owner từ session |
| `GET /api/slots` | Mọi user đăng nhập | Lấy lưới `id, slotCode, zone, status` |
| `POST /api/slots/:id/register` | MANAGER/STAFF/CUSTOMER | Đăng ký ô `AVAILABLE` |
| `GET /api/slots/:id/vehicle` | MANAGER/STAFF | CUSTOMER nhận `403` |

### HTML

| Route | Quyền | Ghi chú |
|---|---|---|
| `GET /` | Mọi role đăng nhập | View phải chọn theo role |
| `GET /my-vehicles` | CUSTOMER | Không nhận customer ID từ client |
| `GET /profile` | CUSTOMER | Hồ sơ hiện tại |
| `POST /profile` | CUSTOMER | CSRF, whitelist 4 field |
| `GET /parking/map` | Mọi role theo layout | CUSTOMER không có menu xem xe |

## 6. Checklist AI coding bắt buộc

### Backend

- [ ] Route CUSTOMER có `requireAuth` và `authorizeRoles('CUSTOMER')` đúng nơi.
- [ ] Service không tin `customerId` từ body/query.
- [ ] `GET /api/my-vehicles` chỉ query theo session customer.
- [ ] Profile update whitelist field và đồng bộ email theo quyết định cuối.
- [ ] Register khóa slot trước vehicle, transaction rollback khi lỗi.
- [ ] CUSTOMER gọi `GET /api/slots/:id/vehicle` nhận `403`.
- [ ] Không tạo API hủy RESERVED hoặc sửa ticket cho CUSTOMER.

### Frontend

- [ ] CUSTOMER home không hiển thị menu quản trị.
- [ ] Map chỉ hiển thị `id, slotCode, zone, status`.
- [ ] Chỉ ô `AVAILABLE` có hành động đăng ký.
- [ ] Vehicle form gửi `MOTORBIKE|CAR`, không gửi nhãn tiếng Việt làm enum.
- [ ] Mutation gửi CSRF; lỗi `409` giữ modal và hiển thị message server.
- [ ] Sau `201` hiển thị ticket summary và refresh map/my-vehicles.
- [ ] Không copy nguyên Tailwind prototype sang EJS; chuyển sang Bootstrap 5.

### Test

- [ ] RBAC matrix CUSTOMER/MANAGER/STAFF/chưa đăng nhập.
- [ ] IDOR vehicle/profile.
- [ ] CSRF cho thêm xe, profile và register.
- [ ] Vehicle type enum, normalize plate, duplicate plate.
- [ ] Slot race condition: một `201`, một `409`.
- [ ] Xe đã RESERVED/PARKED không đăng ký lại.
- [ ] Zone filter dùng đúng giá trị API.
- [ ] Ticket summary không mở rộng thành quyền xem ticket.

## 7. Điều kiện sẵn sàng giao AI build

Chỉ chuyển sang coding CUSTOMER sau khi tất cả P1 đã được ghi rõ trong `AGENTS.md` và `docs/contracts/api.md`, đồng thời có test case tương ứng. Thứ tự nên là:

1. Chốt sáu vấn đề P1.
2. Bổ sung prototype/profile nếu cần.
3. Viết blackbox và integration scenarios.
4. Build API/service ownership trước.
5. Build EJS CUSTOMER sau khi API test xanh.
6. Kiểm tra UI theo `docs/design/screens/customer-*`.

## 8. Trạng thái hiện tại

- Prototype CUSTOMER: **đã đưa vào `docs/design/screens/`**.
- Prototype profile CUSTOMER: **đã bổ sung tại `docs/design/screens/customer-profile/`**.
- Contract CUSTOMER: **đã chốt P1-01 đến P1-06**.
- Runtime backend/frontend: **chưa build**.
- Jest/integration: **chưa chạy**, vì chưa có implementation.
- Quyết định tiếp theo cần thực hiện: **build API/service ownership, sau đó viết và chạy test RBAC/IDOR/CSRF/transaction/concurrency**.
