---
trigger: always_on
description: "Quy tắc kiến trúc Backend Node.js + Express: phân tầng Controller-Service-Model, đặt tên file, mã trạng thái HTTP, xử lý lỗi tập trung và phân tách module theo Task."
---

# Quy Tắc Backend Node.js & Express (`nodejs.md`)

Đặt file này tại `.agents/rules/nodejs.md`. Danh sách Task, hợp đồng dữ liệu và RBAC nằm ở `AGENTS.md` (mục 2, 4, 6, 7); file này chỉ nêu cách viết code backend.

## 1. Phân Tầng (Controller -> Service -> Model)

1. **Controller (`src/controllers/<module>.controller.js`)**:
   - Chỉ nhận `req`, `res`, `next`, trích tham số (`req.params`, `req.query`, `req.body`, `req.file`) rồi gọi `Service`.
   - Không viết SQL, không tính tiền vé/phí/thống kê trong Controller.
   - Hai nhóm phản hồi:
     - **Page Render**: `res.render('ten-module/ten-view', { title, data, currentUser, flash })`.
     - **AJAX / Fetch API**: JSON theo `AGENTS.md` mục 6, dùng cho: `POST /api/parking/scan-plate` (Quản lý xe vào/ra), `POST /api/vehicles` (Task 7), `GET /api/vehicles/search` (Task 9), `GET /api/slots`, `GET /api/slots/:id/vehicle`, `POST /api/slots/:id/register` (Bản đồ bãi đỗ).
2. **Service (`src/services/<module>.service.js`)**:
   - Chứa toàn bộ quy tắc nghiệp vụ và kiểm tra điều kiện (ô còn trống không, biển số đã tồn tại chưa, vé còn hiệu lực không, quyền sở hữu của CUSTOMER).
   - Quản lý Transaction khi tác động từ 2 bảng trở lên (mẫu ở `mysql.md` mục 5).
   - Ném lỗi nghiệp vụ bằng `new AppError(message, statusCode)`.
3. **Model (`src/models/<module>.model.js`)**:
   - Chỉ chạy truy vấn `mysql2/promise` và trả về rows thô. Không chứa logic nghiệp vụ.

## 2. Quy Tắc Đặt Tên

- Biến/hàm: `camelCase` (`scanLicensePlate`, `registerParkingSlot`). Lớp: `PascalCase` (`AppError`). Hằng số: `UPPER_SNAKE_CASE` (`SLOT_STATUS.AVAILABLE`, `ROLES.MANAGER`).
- **Mọi file backend dùng `kebab-case`**, lớp đặt hậu tố rõ ràng. Tên cố định cho phần nền tảng:

| File | Nội dung xuất ra |
| :--- | :--- |
| `src/middlewares/auth.middleware.js` | `requireAuth` |
| `src/middlewares/rbac.middleware.js` | `authorizeRoles(...roles)` |
| `src/middlewares/csrf.middleware.js` | bảo vệ CSRF |
| `src/middlewares/validate.middleware.js` | gom lỗi `express-validator` |
| `src/middlewares/error-handler.middleware.js` | `errorHandler` |
| `src/utils/app-error.js` | lớp `AppError` |
| `src/utils/async-handler.js` | `asyncHandler(fn)` |
| `src/utils/ocr-plate-reader.js` | Adapter nhận diện biển số |
| `src/utils/normalize-plate.js` | `normalizePlate(str)` |
| `src/utils/date-helper.js` | định dạng/tính ngày |
| `src/constants/roles.js`, `slot-status.js`, `ticket.js` | `ROLES`, `SLOT_STATUS`, `TICKET_TYPE`, `TICKET_STATUS` |

- Tên service theo Task để tránh xung đột: Task 8 `parking.service.js` (`lookupByScannedPlate`, `checkIn`, `checkOut`); Task 9 `vehicle-search.service.js` (`searchVehicles`); Task 10 `parking-map.service.js` (`getMapSlots`, `getVehicleAtSlot`, `registerParkingSlot`); Task 14-16 `slot.service.js`. Route tương ứng: `parking.routes.js`, `parking-map.routes.js`, `vehicle.routes.js`, `slot.routes.js`.

## 3. Mã Trạng Thái HTTP

| Mã | Khi nào |
| :-: | :--- |
| `200` / `201` | Thành công / tạo mới thành công |
| `400` | Dữ liệu không hợp lệ, file không phải ảnh, ảnh không đọc được biển số |
| `401` | Chưa đăng nhập (API) |
| `403` | Sai quyền, thiếu/sai CSRF token |
| `404` | Không tìm thấy bản ghi |
| `409` | Trùng dữ liệu (`UNIQUE`), ô đỗ không ở `AVAILABLE`, chặn xóa do ràng buộc |
| `413` | File upload vượt 5 MB |
| `500` | Lỗi không lường trước (không lộ chi tiết) |

## 4. Xử Lý Bất Đồng Bộ & Lỗi Tập Trung

- Mọi hàm Controller/Service/Model dùng `async/await`, không callback lồng nhau.
- Bọc Controller bằng `asyncHandler(fn)` để lỗi chảy về `errorHandler`.
- `errorHandler` chọn kiểu phản hồi theo yêu cầu: đường dẫn bắt đầu bằng `/api` hoặc header `Accept: application/json` -> trả JSON `{ success: false, message, errors }`; ngược lại -> render `errors/403|404|500.ejs`.
- Chuyển lỗi MySQL thành `AppError` tiếng Việt trước khi trả ra: `ER_DUP_ENTRY` -> `409` (nêu đúng trường trùng: biển số, mã vị trí...), `ER_ROW_IS_REFERENCED_2` / `ER_NO_REFERENCED_ROW_2` -> `409`.
- Không bao giờ trả stack trace hoặc lỗi SQL thô ra người dùng; ghi log đầy đủ ở server (không log mật khẩu, token, session).

## 5. Cấu Hình & Môi Trường

- Mọi bí mật (`SESSION_SECRET`, mật khẩu DB, SMTP) đọc từ `.env` qua `src/config/env.js`, kiểm tra đủ biến khi khởi động; commit `.env.example`, không commit `.env`.
- `app.js` chỉ export `app`; `server.js` mới gọi `listen` để Supertest import được.

## 6. Làm Việc Nhóm & Git

- Nhánh: `feature/task-<số>-<tên-ngắn>` (ví dụ `feature/task-08-checkin-checkout`). Merge Task 1 và 2 trước vì đây là nền tảng dùng chung. Các Task còn lại, đặc biệt Task 12, chỉ bắt đầu/merge theo dependency trong `AGENTS.md`; Task 12 phụ thuộc Task 11.
- Mỗi Task chỉ sửa file/hàm của mình; ranh giới Task 8 / Task 9 / Task 7 xem `AGENTS.md` mục 2 và mục 6.
- Trước khi mở PR: `npx eslint src/ tests/` không lỗi và test của Task xanh.
