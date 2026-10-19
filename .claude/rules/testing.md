---
trigger: glob
globs: "tests/**/*.js, tests/**/*.md, jest.config.js"
description: "Quy tắc kiểm thử: ưu tiên theo mốc Sprint 1 của plan, 4 tầng test, kịch bản bắt buộc (scan biển số, tìm xe, RBAC Bản đồ bãi đỗ, auth, upload, xóa, thống kê) và Quality Gate."
---

# Quy Tắc Kiểm Thử & Chất Lượng (`testing.md`)

Đặt file này tại `.agents/rules/testing.md`. Tự kích hoạt khi viết hoặc chạy test trong `tests/`. Hợp đồng dữ liệu, vòng đời ô đỗ và RBAC xem `agents.md` mục 5, 6, 7.

## 1. Ưu Tiên Theo Mốc Plan Sprint 1

Sprint chỉ có khoảng 1 ngày cho bước tạo unit test, nên kiểm thử chia hai mức ưu tiên:

| Mức | Phạm vi | Khi nào |
| :-: | :--- | :--- |
| **P1 - bắt buộc trong Sprint 1** | Unit test cho service trọng yếu; Blackbox TC cho cả 16 Task; Integration test cho 3 luồng: scan biển số, RBAC + đăng ký đỗ trên Bản đồ bãi đỗ, ràng buộc xóa | Trước khi đóng Task |
| **P2 - khi còn thời gian / sprint sau** | Integration cho các CRUD còn lại; E2E Cheerio cho toàn bộ màn hình | Sau P1 |

Liên hệ với các mốc trong plan:

| Mốc plan | Việc kiểm thử |
| :--- | :--- |
| Write Blackbox TC | Viết kịch bản trong `tests/blackbox/` **trước khi code** |
| Create unit test (mốc ghi "Study/Create JUnit 5" trong plan cũ; với dự án này là **Jest**) | Viết unit test (P1) |
| Update Blackbox TC | Cập nhật kịch bản theo code thực tế |
| Perform Blackbox TC | Chạy kịch bản, ghi kết quả Pass/Fail vào cùng file |
| Fix Bug | Sửa lỗi và thêm test hồi quy |
| Check Quality (self / all team) | Lint + coverage (+ SonarQube nếu nhóm giữ bước "Review code") |

## 2. Cấu Trúc 4 Tầng Kiểm Thử

1. **`tests/unit/` (Jest + Mock)**: kiểm thử `src/services/` và `src/utils/`; bắt buộc mock pool `mysql2/promise` và dịch vụ OCR. Kèm unit test cho `normalizePlate()` (`51F-123.45`, `51f 12345`, `51F12345` cho cùng kết quả).
2. **`tests/integration/` (Jest + Supertest)**: gọi HTTP Endpoint thật tới cơ sở dữ liệu `parking_test_db`.
   - Chạy bằng `jest --runInBand` (các test dùng chung một DB, chạy song song sẽ làm bẩn dữ liệu nhau).
   - Trước mỗi bài test: tắt `FOREIGN_KEY_CHECKS`, `TRUNCATE` các bảng, bật lại, rồi nạp `seed.sql`.
   - Đăng nhập bằng agent của Supertest cho từng vai trò (MANAGER/STAFF/CUSTOMER); dịch vụ OCR vẫn được mock.
3. **`tests/e2e/` (Supertest + Cheerio/JSDOM)**: kiểm tra HTML render từ `.ejs`, partials và phân quyền hiển thị.
4. **`tests/blackbox/`**: mỗi Task một file `task-<số>-<tên>.md`, bảng gồm `ID | Điều kiện | Bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Pass/Fail`.

## 3. Kịch Bản Bắt Buộc

**Quản lý xe vào/ra - Scan biển số (Task 8)**
- TC1: ảnh hợp lệ, xe **đã tồn tại**, có khách và có vị trí -> đủ 5 trường `vehicleName`, `brand`, `customerName`, `phone`, `slotCode` và `exists: true`.
- TC2: ảnh hợp lệ, xe **chưa tồn tại** -> `exists: false`.
- TC3: xe tồn tại nhưng **chưa có vị trí** hoặc **chưa gắn khách hàng** -> `exists: true`, trường tương ứng là `null`.
- TC4: file không phải ảnh, hoặc ảnh mờ không đọc được biển số -> `400` kèm thông báo tiếng Việt.
- Cho xe vào / ra: đổi đúng trạng thái ô (`agents.md` mục 6), tính `fee`, không cho xe vào ô của xe khác (`409`).

**Task 9 - Modal tìm xe**
- Tìm chính xác và gần đúng (`LIKE`) theo từng tiêu chí: **Tên khách hàng**, **Số điện thoại**, **Biển số xe** (biển số nhập có dấu `-`, `.`, khoảng trắng vẫn tìm thấy).
- Từ khóa chứa `%` hoặc `_` không làm sai kết quả; kết quả tối đa 20 dòng; từ khóa rỗng/quá dài -> `400`.

**Bản đồ vị trí bãi đỗ (Task 10)**
- **Xem thông tin xe**: `MANAGER`, `STAFF` -> `200`; `CUSTOMER` -> `403`; chưa đăng nhập -> `401`.
- **Đăng ký đỗ xe**: cả 3 vai trò -> `201` khi ô `AVAILABLE`; `409` khi ô `RESERVED`, `OCCUPIED` hoặc `MAINTENANCE`.
- `CUSTOMER` đăng ký bằng xe **không thuộc mình** -> `403`.
- **Đồng thời**: hai yêu cầu đăng ký cùng một ô -> đúng một `201`, một `409` (kiểm chứng `SELECT ... FOR UPDATE`).
- E2E: HTML bản đồ của `CUSTOMER` **không chứa** mục "Xem thông tin xe"; của MANAGER/STAFF có.

**Xác thực (Task 1)**
- Đăng nhập đúng/sai; tài khoản `is_active = 0` bị từ chối; session ID **đổi** sau khi đăng nhập (`regenerate`); đăng xuất hủy session.
- Quá giới hạn đăng nhập sai -> `429`.
- Quên mật khẩu: phản hồi giống nhau với email có/không tồn tại; token quá 15 phút bị từ chối; token dùng lần hai bị từ chối.

**Ma trận RBAC (kiểm thử theo bảng)**
- Một test dạng bảng (`test.each`) đi qua từng nhóm route × từng vai trò × "chưa đăng nhập" và so với `agents.md` mục 7: `401` / `403` / thành công. Thêm Task mới phải thêm dòng vào bảng này.
- Thiếu hoặc sai CSRF token trên `POST/DELETE` -> `403`.

**Upload ảnh biển số**
- Vượt 5 MB -> `413`; sai MIME -> `400`; file `.txt` đổi đuôi thành `.jpg` (sai magic bytes) -> `400`; tên file lưu là UUID chứ không phải `originalname`; `GET /files/plates/:filename` cần đăng nhập và đúng vai trò, tên file sai định dạng -> `404`/`400`.

**CRUD & Xóa (Nhân viên, Khách hàng, Vé, Vị trí đỗ)**
- Đủ các nhánh: tạo mới thành công, trùng dữ liệu (`UNIQUE` biển số / mã vị trí -> `409`), sửa thành công, xóa thành công, **chặn xóa** theo bảng ở `mysql.md` mục 3 (khách có xe đang đỗ; nhân viên tự xóa mình / MANAGER cuối cùng; ô `OCCUPIED` hoặc đã có lịch sử).
- Bản ghi xóa mềm không còn xuất hiện trong danh sách và tìm kiếm nhưng không làm hỏng dữ liệu thống kê cũ.

**Thống kê**
- Kết quả đúng ở ranh giới ngày/tháng/năm (xe vào lúc 23:59 và 00:00); `ngày bắt đầu > ngày kết thúc` -> `400`; doanh thu vé và doanh thu lượt đỗ lẻ không bị cộng trùng.

## 4. Tiêu Chuẩn Nghiệm Thu Chất Lượng (Quality Gate)

- **Lint**: `npx eslint src/ tests/` không còn lỗi trước khi đóng Task.
- **Coverage** (cấu hình trong `jest.config.js`, đo trên `src/services/`):
  - Sprint 1: tối thiểu **60%** toàn bộ `src/services/`, và tối thiểu **80%** cho `parking.service.js`, `vehicle-search.service.js`, `auth.service.js`.
  - Từ Sprint 2: nâng ngưỡng toàn bộ `src/services/` lên **80%**.

```js
// jest.config.js (trích)
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/services/**/*.js'],
  coverageThreshold: {
    global: { statements: 60, lines: 60 },
    './src/services/parking.service.js': { statements: 80, lines: 80 },
    './src/services/vehicle-search.service.js': { statements: 80, lines: 80 },
    './src/services/auth.service.js': { statements: 80, lines: 80 },
  },
};
```

- **SonarQube**: nếu nhóm giữ bước "Review code (Sonarqube)" của plan thì chạy quét trước mốc "Check Quality"; không còn issue mức Blocker/Critical.
- Không được để lại `test.only` / `test.skip` khi đóng Task; mỗi lỗi đã sửa ở bước "Fix Bug" có kèm test hồi quy.
