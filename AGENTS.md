---
trigger: always_on
description: "Nguồn sự thật duy nhất của dự án Quản lý Bãi đỗ xe: phạm vi Sprint 1, hợp đồng API, state machine, RBAC và các quyết định nghiệp vụ đã chốt."
---

# Quy tắc gốc dự án: Hệ thống Quản lý Bãi đỗ xe

**Phiên bản khung: 1.1 — cập nhật 22/10/2026**

**Phê duyệt điều phối:** ngày 22/10/2026, ntbin xác nhận Q1, Q2, Q3, Q5 và Q6 theo đề xuất trong `Bao-cao-de-xuat-AI-coding.md`; Q4 (OCR mock Sprint 1) đã chốt trước đó. Các quyết định nghiệp vụ A3–A8 tại tài liệu này là hợp đồng đang có hiệu lực cho Sprint 1.

## 0. Nguồn sự thật và phạm vi

File `AGENTS.md` ở thư mục gốc là **nguồn sự thật duy nhất** cho Task, nghiệp vụ, hợp đồng API, state machine và RBAC. Các file `.agents/rules/*.md` chỉ quy định cách triển khai theo từng lớp; chúng không được định nghĩa lại nghiệp vụ. `docs/design/` chỉ là tài liệu tham khảo UI, không phải hợp đồng chức năng.

Không tự thêm nghiệp vụ ngoài file này. Nếu cần thay đổi một quyết định, sửa file này trước rồi cập nhật schema, contract, prototype và test liên quan trong cùng thay đổi.

Sprint 1 chỉ có các chức năng được liệt kê trong mục 2. Các chức năng camera LPR thời gian thực, RFID/ePass/VETC, cổng thanh toán ngân hàng, điều khiển barie, sạc EV, cảm biến IoT, xuất CAD/PDF/Excel và tạo vé thủ công **ngoài phạm vi**. Prototype có thể minh họa bối cảnh nhưng code thật không được triển khai các chức năng đó.

## 1. Ngăn xếp và cấu trúc chuẩn

- Runtime: Node.js LTS + Express.js.
- View: EJS + Bootstrap 5 + Vanilla JavaScript; dùng `fetch` cho modal và bản đồ.
- Cơ sở dữ liệu: MySQL 8.x qua `mysql2/promise`, một pool duy nhất, prepared statements, không ORM.
- Bảo mật: `express-session`, `bcrypt`, `express-validator`, `multer`, `helmet`, `express-rate-limit`, CSRF token, `nodemailer`.
- Kiểm thử: Jest, Supertest, Cheerio/JSDOM, ESLint.
- Múi giờ nghiệp vụ: `Asia/Ho_Chi_Minh` / MySQL `+07:00`.

```text
parking-system/
├── AGENTS.md                         # nguồn sự thật duy nhất
├── .agents/rules/                    # quy tắc triển khai, không định nghĩa nghiệp vụ
├── .env.example
├── package.json, package-lock.json
├── jest.config.js, eslint.config.js
├── src/
│   ├── app.js, server.js
│   ├── config/                       # env, db, session, upload, mailer, pricing
│   ├── constants/                    # roles, slot-status, ticket
│   ├── controllers/ services/ models/
│   ├── middlewares/ routes/ utils/
│   └── views/                        # EJS và partials
├── public/                           # css, js; không chứa ảnh biển số
├── storage/plates/                   # ảnh upload, ngoài public
├── database/
│   ├── schema.sql                    # schema an toàn, không DROP dữ liệu
│   ├── seed.sql                      # dữ liệu mẫu có thể lặp lại
│   ├── reset-local.sql               # lệnh phá dữ liệu local/test, chạy có chủ ý
│   └── migrations/
└── tests/                            # unit, integration, e2e, blackbox
```

Phân tầng bắt buộc: Controller chỉ trích tham số và gọi Service; Service giữ nghiệp vụ, quyền sở hữu và transaction; Model chỉ chạy SQL và trả rows thô.

## 2. Phạm vi Sprint 1 và thứ tự Task

| Task | Phạm vi | File chính | Phụ thuộc |
|---:|---|---|---|
| 1 | Đăng nhập, quên/đặt lại mật khẩu | `auth/*.ejs`, auth service | — |
| 2 | Trang chủ, tin tức, header/footer, sidebar dùng chung và trang chủ CUSTOMER | `home/*.ejs`, `customer/home.ejs`, `partials/*` | 1 |
| 3 | Danh sách/xóa nhân viên | `employees/list.ejs` | 1, 2 |
| 4 | Thêm/sửa nhân viên | `employees/form.ejs` | 3 |
| 5 | Danh sách/xóa khách hàng | `customers/list.ejs` | 1, 2 |
| 6 | Thông tin xe, thêm khách hàng và danh sách xe CUSTOMER | `customers/*.ejs`, `customer/my-vehicles.ejs` | 5 |
| 7 | Sửa khách hàng, modal thêm xe và hồ sơ CUSTOMER | `customers/edit.ejs`, `customer/profile.ejs`, modal | 6 |
| 8 | Scan biển số, xe vào/ra | `parking/checkin-checkout.ejs` | 7 |
| 9 | Modal tìm xe | modal, `vehicle-search.js` | 2 |
| 10 | Bản đồ vị trí đỗ cho vận hành và CUSTOMER | `parking/map.ejs`, `customer/parking-map.ejs` | 4 |
| 11 | Danh sách/xóa vé | `tickets/list.ejs` | 8 |
| 12 | Sửa vé | `tickets/edit.ejs` | 2, 11 |
| 13 | Tổng hợp, thống kê ngày/tháng/năm | `stats/*.ejs` | 8, 11 |
| 14 | Danh sách vị trí đỗ | `slots/list.ejs` | 10 |
| 15 | Thêm/sửa vị trí đỗ | `slots/form.ejs` | 14 |
| 16 | Chi tiết/xóa vị trí đỗ | `slots/detail.ejs` | 15 |

Task 1 và 2 là nền tảng, phải hoàn thiện trước khi gắn các route còn lại. Sidebar dùng chung thuộc Task 2. Phần sửa vé của Task 12 chỉ triển khai sau khi Task 11 đã có dữ liệu/list vé. Không tạo màn hình tạo vé riêng; vé được sinh khi đăng ký đỗ.

## 3. Quy ước dữ liệu chung

- Ngày hiển thị: `dd/MM/yyyy`; thời điểm API dùng ISO 8601 kèm offset `+07:00`.
- Tiền: VND, lưu `DECIMAL(12,2)`, không dùng FLOAT.
- Số điện thoại: chuẩn hóa về `0xxxxxxxxx`.
- Biển số: `normalizePlate()` viết hoa và bỏ mọi ký tự không phải chữ/số; kiểm tra `^[0-9A-Z]{6,10}$`.
- ID là số nguyên dương. Chuỗi tìm kiếm tối đa 50 ký tự.
- Ảnh biển số: lưu `/files/plates/<UUID>.<jpg|png|webp>`, ngoài `public/`.
- API JSON dùng envelope:

```json
{
  "success": true,
  "message": "",
  "data": {},
  "errors": []
}
```

`errors` là mảng `{ "field": "", "message": "", "code": "" }`; khi không có lỗi dùng `[]`. Danh sách phân trang dùng `data.items` và `data.pagination = { page, limit, total, totalPages }`.

## 4. Phân quyền chính thức

`M` = MANAGER, `S` = STAFF, `C` = CUSTOMER.

| Chức năng | M | S | C |
|---|:---:|:---:|:---:|
| Đăng nhập/quên/đặt lại mật khẩu | công khai | công khai | công khai |
| Trang chủ và tin tức | ✓ | ✓ | ✓ |
| Nhân viên: xem/thêm/sửa/xóa | ✓ | — | — |
| Khách hàng: xem/thêm/xóa | ✓ | ✓ | — |
| Hồ sơ khách hàng và xe | ✓ | ✓ | chỉ bản thân |
| Xe vào/ra và scan biển số | ✓ | ✓ | — |
| Modal tìm xe | ✓ | ✓ | — |
| Bản đồ: xem lưới/trạng thái | ✓ | ✓ | ✓ |
| Bản đồ: xem thông tin xe | ✓ | ✓ | 403 |
| Bản đồ: đăng ký đỗ | ✓ | ✓ | ✓, chỉ xe của mình |
| Vé: xem danh sách/chi tiết | ✓ | ✓ | — |
| Vé: sửa/xóa | ✓ | — | — |
| Vị trí: xem danh sách/chi tiết | ✓ | ✓ | — |
| Vị trí: thêm/sửa/xóa, đổi bảo trì | ✓ | — | — |
| Thống kê | ✓ | — | — |

STAFF **chỉ xem vé và vị trí**, không sửa/xóa vé, không thêm/sửa/xóa vị trí. STAFF vẫn được dùng modal tìm xe và các thao tác khách hàng/xe/xe vào-ra theo bảng trên vì đó là chức năng vận hành riêng, không phải quyền sửa vé/vị trí.

Ẩn menu không thay thế kiểm tra backend. API chưa đăng nhập trả `401`; web chưa đăng nhập redirect `/login`; sai quyền trả `403`.

## 5. Quyết định nghiệp vụ đã chốt (A3–A8 và A4 mở rộng)

Các quyết định dưới đây là **tạm thời nhưng có hiệu lực để build Sprint 1**. Khi thay đổi phải sửa mục này trước.

### A3 — Quyền STAFF

STAFF được xem danh sách/chi tiết vé và vị trí, nhưng không được sửa/xóa vé, không được tạo/sửa/xóa vị trí hoặc chuyển bảo trì. STAFF được dùng modal tìm xe, quản lý khách hàng, thêm xe, scan, check-in và check-out theo RBAC mục 4.

### A4 — Công thức phí tạm thời

Để có hành vi xác định và dễ thay thế, Sprint 1 dùng cấu hình sau trong `src/config/pricing.js`:

| Hạng mục | Xe máy | Ô tô |
|---|---:|---:|
| Vé DAILY tự sinh khi đăng ký | 20.000 VND | 50.000 VND |
| Phí lượt đỗ lẻ mỗi giờ | 10.000 VND | 20.000 VND |

Phí lượt đỗ lẻ tính `ceil(số phút / 60) × đơn giá`, tối thiểu 1 giờ; thời lượng bằng 0 vẫn tính 1 giờ. Mọi mốc thời gian nghiệp vụ dùng `Asia/Ho_Chi_Minh`. Nếu session gắn `ticket_id` hợp lệ với `status = ACTIVE`, và `check_out_time >= start_date 00:00:00` và `< ngày kế tiếp sau end_date 00:00:00`, thì `fee = 0`; vì vậy vé DAILY có hiệu lực trọn ngày kết thúc, không chỉ đến đầu ngày. Vé DAILY được tạo cùng đăng ký, có `start_date = ngày đăng ký`, `end_date = cùng ngày`; `price` là giá trong bảng trên. Không có phụ phí đêm, ngày lễ, cuối tuần hay giảm giá trong Sprint 1. Mọi giá trị phải đọc từ `pricing.js`, không hard-code trong Service.

### A5 — Tài khoản CUSTOMER

MANAGER hoặc STAFF tạo customer cùng tài khoản CUSTOMER trong một transaction. Không có tự đăng ký trong Sprint 1. Mật khẩu khởi tạo chỉ nhận ở form tạo, băm bcrypt ngay lập tức và không bao giờ render lại. Xóa mềm customer đặt `deleted_at`; tài khoản liên kết bị `is_active = 0` trong cùng transaction.

### A6 — Vòng đời RESERVED

`RESERVED` **không tự hết hạn và không có hủy trong Sprint 1**. Chỉ có luồng `RESERVED → OCCUPIED` khi đúng xe vào, rồi `OCCUPIED → AVAILABLE` khi xe ra. Một ô RESERVED không thể được đăng ký lại; một xe RESERVED không thể giữ ô khác. Đây là giới hạn tạm thời đã chấp nhận; không tự thêm cron hay nút hủy.

### A7 — Xe vãng lai

Khi OCR nhận biển số chưa có trong `vehicles`, scan chỉ trả `exists: false`; không tự ghi DB vì còn thiếu tên xe/loại xe. Nhân viên mở modal thêm xe, tạo một vehicle với `customer_id = NULL`, rồi quét/tra cứu lại. Xe vãng lai sau khi tạo được tìm bằng biển số và được check-in/check-out như xe thường. Mọi `parking_session` hợp lệ đều phải có `vehicle_id`; `NULL` chỉ còn là dữ liệu legacy không được tạo bởi API mới.

### A8 — OCR trong Sprint 1

Sprint 1 dùng adapter OCR mock nội bộ tại `src/utils/ocr-plate-reader.js`; không tích hợp dịch vụ OCR/camera bên ngoài. Adapter phải có interface ổn định để Service không phụ thuộc nhà cung cấp cụ thể và phải trả về biển số thô hoặc lỗi “không đọc được biển số”. Service luôn chạy `normalizePlate()` sau khi nhận kết quả OCR. Mock chỉ phục vụ phát triển và kiểm thử xác định; việc tích hợp OCR thật là phạm vi Sprint sau và phải cập nhật `AGENTS.md` trước.

## 6. Hợp đồng API chính thức

### 6.1 Quy tắc chung

Tất cả API ghi dữ liệu yêu cầu session đăng nhập và CSRF qua header `X-CSRF-Token`; form HTML dùng hidden input `_csrf`. Controller không nhận `role`, `password_hash`, `reset_token_hash`, `deleted_at`, `status` nội bộ hoặc `customer_id` của CUSTOMER từ dữ liệu không đáng tin. Tất cả quyền sở hữu CUSTOMER phải kiểm tra trong Service.

Các lỗi chuẩn: `400` validation/ảnh không đọc được, `401` chưa đăng nhập, `403` sai quyền/CSRF/IDOR, `404` không tìm thấy, `409` xung đột/invariant, `413` ảnh vượt 5 MB, `500` lỗi không lộ chi tiết.

### 6.2 `POST /api/vehicles`

Quyền: MANAGER, STAFF, CUSTOMER. CSRF: có. Body JSON cho phép:

```json
{
  "licensePlate": "51F-123.45",
  "vehicleName": "Honda City",
  "brand": "Honda",
  "vehicleType": "CAR",
  "customerId": 12
}
```

`vehicleType` là `MOTORBIKE` hoặc `CAR`. CUSTOMER luôn dùng `req.session.customerId`, bỏ qua `customerId`; MANAGER/STAFF có thể truyền customerId đang hoạt động hoặc bỏ trống để tạo xe vãng lai. Biển số được normalize trước khi kiểm tra/truy vấn/lưu. Trùng biển số trả `409`.

Thành công trả `201` với `data = { id, licensePlate, vehicleName, brand, vehicleType, customerId }`. Không trả password hoặc thông tin session.

### 6.3 `GET /api/vehicles/search?keyword=`

Quyền: MANAGER, STAFF. Keyword bắt buộc, dài 1–50. Tìm theo tên customer, số điện thoại hoặc biển số; escape `\\`, `%`, `_`; biển số được normalize. Tối đa 20 dòng. Trả `200` với mỗi item `{ id, licensePlate, vehicleName, brand, customerName, phone, customerId }`; trường customer có thể null với xe vãng lai.

### 6.4 `POST /api/parking/scan-plate`

Quyền: MANAGER, STAFF. CSRF: có. Multipart field duy nhất `plateImage`; tối đa 5 MB; MIME chỉ JPEG/PNG/WebP; kiểm tra magic bytes; tên file UUID. Khi đọc được biển số, server tạo `scanToken` opaque, gắn với user session hiện tại, vehicle/biển số chuẩn hóa, đường dẫn ảnh và thời hạn 10 phút; token chỉ dùng một lần cho check-in và không được chứa dữ liệu nhạy cảm.

Thành công `200`:

```json
{
  "success": true,
  "message": "Đã nhận diện biển số",
  "data": {
    "exists": true,
    "licensePlate": "51F12345",
    "vehicleId": 10,
    "vehicleName": "Honda City",
    "brand": "Honda",
    "customerName": "Nguyễn Văn A",
    "phone": "0901234567",
    "slotCode": "A-01",
    "scanToken": "opaque-one-time-token"
  },
  "errors": []
}
```

Nếu không có vehicle, `exists = false`, `vehicleId = null`, các trường còn lại null nhưng `licensePlate` vẫn có giá trị chuẩn hóa; vẫn trả `scanToken` để sau khi tạo vehicle, UI có thể dùng lại kết quả scan nếu token còn hạn. Không tự tạo vehicle. Ảnh sai/magic bytes sai/OCR không đọc được trả `400`; vượt giới hạn trả `413` với message `Ảnh vượt quá 5 MB`.

### 6.5 `POST /api/parking/check-in`

Quyền: MANAGER, STAFF. CSRF: có. Body JSON:

```json
{ "vehicleId": 10, "slotId": 3, "ticketId": 25, "scanToken": "opaque-one-time-token" }
```

`vehicleId` và `slotId` bắt buộc; `ticketId` và `scanToken` tùy chọn. Service khóa slot trước, sau đó vehicle/ticket. Cho phép `AVAILABLE → OCCUPIED` hoặc `RESERVED → OCCUPIED` khi `current_vehicle_id` đúng vehicle. Xe không được có slot khác hoặc session mở. Nếu `ticketId` truyền vào phải thuộc vehicle, active, đúng slot và còn hạn. Nếu không truyền, service tự gắn ticket active hợp lệ của chính vehicle/slot nếu có; không có thì session lẻ. Nếu có `scanToken`, token phải thuộc session đăng nhập hiện tại, chưa hết hạn/chưa dùng, khớp vehicle và biển số; Service lấy đường dẫn ảnh từ token để ghi `plate_image_url`, không nhận đường dẫn ảnh từ client. Token không hợp lệ trả `403` hoặc `409` theo nguyên nhân; lỗi phải rollback.

Thành công `201`, tạo session OPEN với `checkOutTime = null`, `fee = null`, cập nhật slot/current vehicle. Trả `{ sessionId, vehicleId, slotId, slotCode, checkInTime, ticketId }`. Xung đột ô, xe đang đỗ hoặc ticket sai trả `409`; mọi lỗi rollback.

### 6.6 `POST /api/parking/check-out`

Quyền: MANAGER, STAFF. CSRF: có. Body:

```json
{ "sessionId": 100 }
```

Chỉ nhận sessionId. Service khóa slot rồi session, yêu cầu session OPEN và slot OCCUPIED đúng vehicle. Ghi `checkOutTime`, tính fee theo A4, đặt slot `AVAILABLE` và `current_vehicle_id = NULL` trong cùng transaction. Thành công `200` trả `{ sessionId, vehicleId, slotId, slotCode, checkInTime, checkOutTime, fee, ticketId }`. Session đã đóng, sai slot hoặc trạng thái bất hợp lệ trả `409`.

### 6.7 `GET /api/slots`

Quyền: mọi vai trò đã đăng nhập. Query tùy chọn `zone`, `status`. Chỉ trả `{ id, slotCode, zone, status }`; **không trả biển số, xe, customer hay thời lượng**. Đây là dữ liệu dùng để dựng lưới.

### 6.8 `GET /api/slots/:id/vehicle`

Quyền: MANAGER, STAFF. CUSTOMER gọi trực tiếp nhận `403`. `id` phải là số nguyên dương. Ô không có xe trả `200` với `data = null`; ô có xe trả các trường tối thiểu `{ vehicleId, licensePlate, vehicleName, brand, vehicleType, customerName, phone, slotCode, sessionId, checkInTime }`.

### 6.9 `POST /api/slots/:id/register`

Quyền: MANAGER, STAFF, CUSTOMER. CSRF: có. Body `{ "vehicleId": 10 }`. CUSTOMER bắt buộc vehicle thuộc `req.session.customerId`; không tin customerId từ body. Service khóa slot trước rồi vehicle/customer, yêu cầu slot AVAILABLE, vehicle không giữ slot và không có session mở. Cập nhật slot `RESERVED`, gán vehicle, tạo một ticket DAILY ACTIVE với giá A4 trong cùng transaction. Thành công `201` trả `{ slotId, slotCode, status, vehicleId, ticketId, ticketCode, startDate, endDate, price }`. Ô không AVAILABLE, vehicle đã dùng, IDOR hoặc xung đột đồng thời trả `409`/`403`; một yêu cầu đồng thời thành công, yêu cầu kia `409`.

### 6.10 `GET /stats/report?mode=day|month|year&from=YYYY-MM-DD&to=YYYY-MM-DD`

Quyền: MANAGER. Đây là endpoint trả JSON khi `Accept: application/json`; trang web vẫn có thể render `/stats`. `from <= to`, khoảng tối đa 366 ngày, giờ biên theo +07:00. Lượt vào lọc theo `parking_sessions.check_in_time`; lượt ra theo `check_out_time`; doanh thu vé theo `tickets.created_at` và bỏ CANCELLED/deleted; doanh thu lẻ theo `parking_sessions.check_out_time` và fee > 0. Không gộp hai nguồn doanh thu. `series` gồm một item cho từng kỳ trong khoảng yêu cầu; `period` có dạng `YYYY-MM-DD` với `mode=day`, `YYYY-MM` với `mode=month`, và `YYYY` với `mode=year`. Mỗi item chỉ gồm `period`, `entries`, `exits`, `ticketRevenue`, `casualParkingRevenue`; tiền là chuỗi DECIMAL hai chữ số. Trả:

```json
{
  "success": true,
  "data": {
    "summary": {
      "entries": 0,
      "exits": 0,
      "ticketRevenue": "0.00",
      "casualParkingRevenue": "0.00",
      "availableSlots": 0,
      "occupiedSlots": 0
    },
    "series": [
      {
        "period": "2026-10-18",
        "entries": 0,
        "exits": 0,
        "ticketRevenue": "0.00",
        "casualParkingRevenue": "0.00"
      }
    ]
  },
  "errors": []
}
```

### 6.11 Endpoint CRUD dùng JSON

Các route `DELETE /employees/:id`, `DELETE /customers/:id`, `DELETE /tickets/:id`, `DELETE /slots/:id` dùng cùng envelope và CSRF. Quyền lần lượt: MANAGER; MANAGER/STAFF cho customer; MANAGER cho ticket; MANAGER cho slot. Xóa customer/employee/ticket/slot phải kiểm tra điều kiện chặn trong cùng transaction. `409` giữ nguyên modal xác nhận và message tiếng Việt.

### 6.12 `GET /files/plates/:filename`

Quyền: MANAGER, STAFF. CUSTOMER và user chưa đăng nhập không được truy cập. `filename` phải khớp `^[0-9a-f-]{36}\.(jpg|png|webp)$`; file phải được resolve an toàn bên trong `storage/plates/`, không dùng `originalname`, không phục vụ qua `express.static`. Không tồn tại hoặc tên sai trả `404`.

### 6.13 Route trang và mutation form

Các trang HTML dùng session/RBAC và include header/footer: `GET /`, `GET /news`, `GET /employees`, `GET /customers`, `GET /customers/:id/vehicles`, `GET /my-vehicles`, `GET /profile`, `GET /parking/checkin-checkout`, `GET /parking/map`, `GET /tickets`, `GET /stats`, `GET /slots`, `GET /slots/:id`. Route `GET /` chọn view theo role: CUSTOMER render `customer/home.ejs`; MANAGER và STAFF render dashboard quản trị chung. Không dùng một view CUSTOMER cho các role quản trị hoặc ngược lại. Form ghi dữ liệu dùng CSRF hidden input và các route `POST /login`, `POST /forgot-password`, `POST /reset-password/:token`, `POST /employees/create`, `POST /employees/:id/edit`, `POST /customers/create`, `POST /customers/:id/edit`, `POST /profile`, `POST /tickets/:id/edit`, `POST /slots/create`, `POST /slots/:id/edit`; quyền theo mục 4. Route `GET/POST /tickets/:id/edit` chỉ MANAGER vì STAFF chỉ xem vé. Nếu frontend dùng fetch thay form thì dùng endpoint JSON trong mục 6.

### 6.14 Request contract CRUD nhân viên, khách hàng và vị trí

Các field JSON dưới đây cũng là tên logic dùng cho form HTML; controller phải whitelist field, không nhận field nội bộ.

- `POST /employees/create` — MANAGER: `{ fullName, username, email, password, phone, address, position, role }`. `role` chỉ nhận `MANAGER|STAFF` và chỉ MANAGER được gửi; mật khẩu chỉ dùng để băm, không render lại. Không nhận `id`, `userId`, `passwordHash`, `isActive`, `deletedAt`.
- `POST /employees/:id/edit` — MANAGER: `{ fullName, email, phone, address, position }`. Không sửa username, role, mật khẩu, trạng thái tài khoản hoặc `deletedAt` tại route này.
- `POST /customers/create` — MANAGER, STAFF: `{ fullName, phone, email, address, username, password }`. Tạo `users` role CUSTOMER và `customers` trong cùng transaction; username, email và mật khẩu là bắt buộc trong Sprint 1. Không nhận `userId`, `role`, `isActive`, `deletedAt` hoặc `customerId`.
- `POST /customers/:id/edit` — MANAGER, STAFF; CUSTOMER chỉ sửa hồ sơ của chính mình qua route hồ sơ nếu có: `{ fullName, phone, email, address }`. Không sửa username, password, role, `userId`, `isActive` hoặc `deletedAt`.
- `POST /slots/create` — MANAGER: `{ slotCode, zone, status, note }`. `status` tùy chọn, mặc định `AVAILABLE`, chỉ nhận `AVAILABLE|MAINTENANCE`; không nhận `currentVehicleId`.
- `POST /slots/:id/edit` — MANAGER: `{ zone, status, note }`. `slotCode` bất biến; chỉ cho `AVAILABLE ↔ MAINTENANCE`. Slot `RESERVED|OCCUPIED` không được đổi trạng thái, sửa hoặc xóa; không nhận `currentVehicleId`.

Lỗi trùng username/email/slotCode trả `409`; lỗi validation trả `400`. Các thao tác tạo customer, xóa customer/employee/ticket/slot và thay đổi trạng thái slot phải tuân transaction, điều kiện chặn và thứ tự khóa tại mục 7.5.

### 6.15 Quyền và field được phép khi sửa vé

`GET/POST /tickets/:id/edit` chỉ dành cho MANAGER. Form/API sửa vé chỉ nhận `startDate` và `endDate`; `ticketCode`, `vehicleId`, `slotId`, `ticketType`, `price`, `status`, `deletedAt` và các thời điểm hệ thống là read-only, không được nhận từ client. Vé phát sinh trong Sprint 1 luôn giữ `ticketType = DAILY`; không có tạo vé thủ công, đổi sang `MONTHLY`/`VIP` hoặc hủy vé qua API. Service phải kiểm tra `startDate <= endDate`, không cho sửa ngày của vé đã được dùng bởi bất kỳ parking session nào, và không cho thay đổi làm mất tính nhất quán với slot đang RESERVED/OCCUPIED. Giá luôn được tính/ghi từ `src/config/pricing.js`, không lấy giá tùy ý từ client. Nếu vé không tồn tại, đã xóa mềm hoặc vi phạm điều kiện trên thì trả lỗi chuẩn theo mục 6.1.

### 6.16 Hợp đồng CUSTOMER

Trong endpoint `/api/my-vehicles`, ownership lọc theo `req.session.customerId`, nên mọi item trả về đều có customer và `isVisitor` luôn là `false`. `isVisitor` được giữ như field tương thích để dùng chung DTO; thuộc tính visitor thực tế chỉ áp dụng cho các DTO vận hành có thể trả xe vãng lai.

`GET /api/my-vehicles` chỉ dành cho CUSTOMER đã đăng nhập. Service bắt buộc lấy `customerId` từ session, không nhận `customerId` từ query/body. Sprint 1 không phân trang endpoint này: response dùng envelope chuẩn và `data.items` là toàn bộ danh sách xe của customer. Mỗi item gồm `{ id, licensePlate, vehicleName, brand, vehicleType, derivedStatus, isVisitor, slotCode, checkInTime, lastExitTime }`. `derivedStatus` chỉ nhận `REGISTERED|RESERVED|PARKED|EXITED`; `isVisitor` là field tương thích và **luôn bằng `false`** trong endpoint này. Không trả vehicle của customer khác, password, session token hoặc dữ liệu nhân viên.

`GET /profile` và `POST /profile` chỉ dành cho CUSTOMER. POST bắt buộc CSRF và chỉ nhận `{ fullName, phone, email, address }`; không nhận `id`, `userId`, `customerId`, `username`, `password`, `role`, `isActive` hoặc `deletedAt`. Service lấy customer từ session; CUSTOMER truy cập hồ sơ khác trả `403`. Khi đổi email, Service phải cập nhật đồng thời `customers.email` và `users.email` trong cùng transaction; email trùng ở một trong hai bảng trả `409` và rollback toàn bộ.

Trong bản đồ CUSTOMER, `zone` chỉ là thuộc tính lọc/hiển thị từ `GET /api/slots`; Sprint 1 **không** tự suy ra hoặc áp quy tắc tương thích `zone` với `vehicleType` vì schema và contract không định nghĩa quy tắc đó. Việc đăng ký chỉ kiểm tra các điều kiện tại mục 6.9.

Sau `POST /api/slots/:id/register` thành công, UI CUSTOMER phải hiển thị biên nhận tức thời tối thiểu `slotCode`, `ticketCode`, `startDate`, `endDate`, `price`, sau đó tải lại dữ liệu bản đồ và danh sách xe. Biên nhận này không cấp quyền đọc ticket và không tạo route/API ticket cho CUSTOMER. Không có nút hủy RESERVED hoặc sửa ticket ở giao diện CUSTOMER. Khi nhận `409`, giữ ngữ cảnh modal và hiển thị nguyên message server.


### 7.1 Vehicle

Vehicle không có cột status; trạng thái là **trạng thái dẫn xuất** từ slot và session:

| Trạng thái dẫn xuất | Điều kiện |
|---|---|
| `REGISTERED` | vehicle tồn tại, không có slot hiện tại, không có session mở |
| `RESERVED` | có slot `RESERVED` với `current_vehicle_id = vehicle.id` |
| `PARKED` | có slot `OCCUPIED` với current vehicle và đúng một session mở |
| `EXITED` | session gần nhất vừa đóng; khi không còn slot/session hiện tại, trạng thái vận hành là `REGISTERED` |

`isVisitor` là thuộc tính độc lập, bằng `true` khi `customer_id IS NULL`, và có thể đồng thời với `REGISTERED`, `RESERVED` hoặc `PARKED`. Chuyển trạng thái: scan mới chỉ là trạng thái tạm ngoài DB; tạo vehicle → `REGISTERED`; register → `RESERVED`; check-in → `PARKED`; check-out → `EXITED` rồi `REGISTERED`. Không xóa vehicle trong Sprint 1. Một vehicle chỉ giữ tối đa một slot và một session mở.

### 7.2 Parking slot

| Từ | Thao tác/điều kiện | Sang |
|---|---|---|
| AVAILABLE | đăng ký, slot khóa, vehicle hợp lệ | RESERVED |
| AVAILABLE | check-in trực tiếp với slotId, không có reservation | OCCUPIED |
| RESERVED | đúng vehicle check-in | OCCUPIED |
| RESERVED | vehicle khác đăng ký/check-in, hoặc đăng ký lại | 409 |
| OCCUPIED | check-out đúng session/vehicle | AVAILABLE |
| OCCUPIED | mọi sửa/xóa/chuyển bảo trì | 409 |
| AVAILABLE | MANAGER chuyển bảo trì | MAINTENANCE |
| MAINTENANCE | MANAGER kết thúc bảo trì | AVAILABLE |
| MAINTENANCE | register/check-in | 409 |

Invariant DB/service: AVAILABLE và MAINTENANCE phải có `current_vehicle_id = NULL`; RESERVED/OCCUPIED phải có current vehicle; current vehicle là duy nhất toàn bảng.

### 7.3 Ticket

Ticket được tạo ACTIVE khi register, gắn một vehicle và một slot. `ACTIVE → EXPIRED` khi ngày hiện tại sau `end_date`; Service phải cập nhật lazy trước khi đọc/tính phí. `ACTIVE → CANCELLED` không có API trong Sprint 1. `deleted_at` là xóa mềm độc lập, không đổi status; không được xóa vé ACTIVE đang gắn slot RESERVED/OCCUPIED. Ticket đã dùng cho session không được sửa vehicle/slot/date; Manager chỉ sửa các trường được contract cho phép và không được làm mất tính nhất quán.

### 7.4 Parking session

Session có hai trạng thái dẫn xuất: `OPEN` khi `check_out_time IS NULL` và `fee IS NULL`; `CLOSED` khi có checkout time và fee không null. `OPEN → CLOSED` đúng một lần qua check-out; không reopen, không sửa fee bằng client. Session luôn có vehicleId và slotId đối với API mới; scannedPlate là snapshot audit. `ticket_id` có thể null cho lượt lẻ. Session CLOSED giữ lịch sử để thống kê và chặn xóa slot.

### 7.5 Transaction và thứ tự khóa

Bắt buộc transaction cho register, check-in, check-out, xóa customer/employee/ticket/slot. Thứ tự khóa: `parking_slots` trước, `vehicles` tiếp theo, `customers`/`tickets` sau đó. Không gọi pool khác trong transaction. Lỗi ở bất kỳ bước nào rollback và release connection.

## 8. Schema, migration, seed và dữ liệu

- `database/schema.sql` là schema canonical an toàn, không DROP database.
- `database/reset-local.sql` là file phá dữ liệu local/test, phải chạy có chủ ý rồi chạy lại `schema.sql` và `seed.sql`.
- `database/migrations/001-session-ticket-and-integrity.sql` mô tả delta từ schema cũ: thêm `ticket_id`, siết `parking_sessions.vehicle_id/slot_id`, thêm invariant slot và unique session mở. Migration chỉ chạy trên DB cũ; schema mới đã bao gồm kết quả của migration.
- `database/seed.sql` phải tạo một tài khoản MANAGER, STAFF, ít nhất hai CUSTOMER, vehicle có customer và visitor, slot AVAILABLE/RESERVED/OCCUPIED/MAINTENANCE, ticket ACTIVE/EXPIRED/CANCELLED và session OPEN/CLOSED. Mật khẩu seed chỉ dùng local/test và phải ghi trong README không dùng production.
- Test dùng `parking_test_db`, reset bằng fixture riêng, không chạy trên `parking_db` production.

## 9. UI prototype và quy tắc chuyển sang EJS

`docs/design/screens/*/code.html` chỉ là prototype. Khi chuyển sang EJS:

- dùng Bootstrap 5, không copy Tailwind nguyên bản;
- map chỉ hiển thị mã ô + trạng thái từ `/api/slots`; không hard-code hoặc render biển số/customer trong grid;
- menu “Xem thông tin xe” chỉ tồn tại với MANAGER/STAFF và gọi API riêng;
- Task 8 chỉ có scan/upload, không có ô tìm kiếm thủ công, không có nút điều khiển barie/RFID/in vé ngoài contract;
- statistics chỉ có Theo ngày/Tháng/Năm, dùng dữ liệu API, không hard-code KPI;
- mọi form/fetch ghi dữ liệu có CSRF; mọi dữ liệu động dùng EJS escape hoặc `textContent`, không nhúng JSON người dùng vào `<script>`;
- mọi trang include header/footer; modal tìm xe chỉ include một lần trong footer cho MANAGER/STAFF.

## 10. Quality gate trước khi build/merge

- Có `package.json`, lockfile, `.env.example`, schema, seed và test DB.
- `npx eslint src/ tests/` sạch.
- Jest chạy `--runInBand` cho integration.
- Unit coverage toàn service tối thiểu 60%; `parking.service.js`, `vehicle-search.service.js`, `auth.service.js` tối thiểu 80% trong Sprint 1.
- Có test cho state transition, RBAC matrix, CSRF, IDOR, upload magic bytes, concurrency register, xóa có ràng buộc và thống kê biên ngày.
- Không còn `test.only`/`test.skip`; blackbox 16 Task có kết quả Pass/Fail.

## 11. Quyết định triển khai đã chốt cho P1/P2

Các quyết định dưới đây là mặc định bắt buộc cho Sprint 1. Nếu thay đổi, phải sửa mục này trước rồi cập nhật schema, contract và test.

### 11.1 Persistence của scanToken

`scanToken` được sinh bằng `crypto.randomBytes(32)` và chỉ trả bản rõ một lần cho client. Database chỉ lưu SHA-256 của token trong bảng `parking_scan_tokens`, cùng `session_id_hash`, `user_id`, `vehicle_id`, biển số chuẩn hóa, `plate_image_url`, `expires_at` và `used_at`. Token có TTL 10 phút; check-in khóa bản ghi bằng `SELECT ... FOR UPDATE`, kiểm tra session/vehicle/biển số/thời hạn, ghi `used_at` trong cùng transaction rồi mới tạo session. Token sai session trả `403`; token hết hạn, đã dùng hoặc lệch invariant trả `409`. Không dùng Redis trong Sprint 1.

### 11.2 Isolation, khóa và retry transaction

Mỗi transaction dùng một connection duy nhất và đặt isolation `READ COMMITTED`. Thứ tự khóa bắt buộc: `parking_slots` → `vehicles` → `customers`/`tickets` → `parking_scan_tokens` hoặc `parking_sessions` theo đúng đối tượng đang xử lý. Các câu đọc đối tượng có thể bị thay đổi phải dùng `SELECT ... FOR UPDATE`. Lỗi `ER_LOCK_DEADLOCK` hoặc `ER_LOCK_WAIT_TIMEOUT` được retry tối đa 3 lần với backoff 25/50/100 ms; mỗi lần retry lấy connection và transaction mới. Sau lần cuối trả `409` với message xung đột, không lộ chi tiết SQL.

### 11.3 Unique và soft delete

Username, email, biển số, `slotCode` và `ticketCode` không được tái sử dụng sau soft delete hoặc vô hiệu hóa. Các unique key hiện hành giữ nguyên trên toàn bảng; không dùng partial-index giả lập bằng cột trạng thái. Vehicle không xóa trong Sprint 1. `deleted_at` của customer/employee/ticket chỉ ẩn bản ghi nghiệp vụ; khóa ngoại dùng `ON DELETE RESTRICT` để giữ lịch sử.

### 11.4 Điều kiện chặn xóa

- Employee: chỉ MANAGER được xóa mềm; chặn nếu bản ghi đã xóa, là tài khoản đang đăng nhập, hoặc là MANAGER cuối cùng đang hoạt động.
- Customer: chỉ xóa mềm khi không còn vehicle, ticket ACTIVE, slot RESERVED/OCCUPIED hoặc parking session OPEN; transaction đồng thời đặt user liên kết `is_active = 0`.
- Ticket: chỉ xóa mềm khi không có parking session tham chiếu và không đang gắn slot RESERVED/OCCUPIED; không đổi `status`.
- Slot: chỉ xóa khi `AVAILABLE` hoặc `MAINTENANCE`, không có vehicle hiện tại và không có ticket/session tham chiếu; `RESERVED`/`OCCUPIED` luôn trả `409`.

### 11.5 Security baseline

Production dùng session store MySQL (MemoryStore chỉ cho test), cookie `httpOnly`, `sameSite=lax`, `secure=true`, TTL 8 giờ; session ID được regenerate sau login và thay đổi quyền, logout destroy session. CSRF token sinh ngẫu nhiên theo session và rotate sau login/logout; mọi mutation kiểm tra header hoặc hidden field trước controller. Login giới hạn 5 lần/15 phút theo IP + username; forgot-password 3 lần/giờ theo IP + email và luôn trả message không tiết lộ email tồn tại. Reset token là random 32-byte, chỉ lưu hash, hết hạn sau 30 phút và consume một lần. Password tối thiểu 12 ký tự, có chữ hoa, chữ thường và chữ số; bcrypt cost 12. Audit log dạng structured JSON cho login, reset, CRUD và state transition, không ghi mật khẩu, token bản rõ hoặc ảnh biển số.

### 11.6 Upload và timezone

Upload chỉ nhận một field `plateImage`, giới hạn 5 MiB. Magic bytes bắt buộc khớp MIME/đuôi: JPEG bắt đầu `FF D8 FF`, PNG là `89 50 4E 47 0D 0A 1A 0A`, WebP có `RIFF` tại byte 0 và `WEBP` tại byte 8. File được đổi tên UUID và lưu ngoài `public`; lỗi MIME/magic/OCR trả `400`, vượt giới hạn trả `413` với message `Ảnh vượt quá 5 MB`.

Node khởi động với `TZ=Asia/Ho_Chi_Minh`; pool MySQL dùng `timezone: '+07:00'` và chạy `SET time_zone = '+07:00'` khi lấy connection. Query thống kê dùng khoảng nửa mở `[from 00:00:00, ngày kế tiếp sau to 00:00:00)`, mọi thời điểm API có offset `+07:00`.
