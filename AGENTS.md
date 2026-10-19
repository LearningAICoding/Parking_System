---
trigger: always_on
description: "Nguồn sự thật duy nhất của dự án Quản lý Bãi đỗ xe: phạm vi Sprint 1, hợp đồng API, state machine, RBAC và các quyết định nghiệp vụ đã chốt."
---

# Quy tắc gốc dự án: Hệ thống Quản lý Bãi đỗ xe

**Phiên bản khung: 1.1 — cập nhật 18/10/2026**

## 0. Nguồn sự thật và phạm vi

File `AGENTS.md` ở thư mục gốc là **nguồn sự thật duy nhất** cho Task, nghiệp vụ, hợp đồng API, state machine và RBAC. Các file `.claude/rules/*.md` chỉ quy định cách triển khai theo từng lớp; chúng không được định nghĩa lại nghiệp vụ. `docs/design/` chỉ là tài liệu tham khảo UI, không phải hợp đồng chức năng.

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
├── .claude/rules/                    # quy tắc triển khai, không định nghĩa nghiệp vụ
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
| 2 | Trang chủ, tin tức, header/footer | `home/*.ejs`, partials | 1 |
| 3 | Danh sách/xóa nhân viên | `employees/list.ejs` | 1, 2, 12 |
| 4 | Thêm/sửa nhân viên | `employees/form.ejs` | 3 |
| 5 | Danh sách/xóa khách hàng | `customers/list.ejs` | 1, 2, 12 |
| 6 | Thông tin xe, thêm khách hàng | `customers/*.ejs` | 5 |
| 7 | Sửa khách hàng, modal thêm xe | `customers/edit.ejs`, modal | 6 |
| 8 | Scan biển số, xe vào/ra | `parking/checkin-checkout.ejs` | 7 |
| 9 | Modal tìm xe | modal, `vehicle-search.js` | 2, 12 |
| 10 | Bản đồ vị trí đỗ | `parking/map.ejs` | 4 |
| 11 | Danh sách/xóa vé | `tickets/list.ejs` | 8 |
| 12 | Sửa vé, sidebar dùng chung | `tickets/edit.ejs`, sidebar | 2 |
| 13 | Tổng hợp, thống kê ngày/tháng/năm | `stats/*.ejs` | 8, 11 |
| 14 | Danh sách vị trí đỗ | `slots/list.ejs` | 10 |
| 15 | Thêm/sửa vị trí đỗ | `slots/form.ejs` | 14 |
| 16 | Chi tiết/xóa vị trí đỗ | `slots/detail.ejs` | 15 |

Task 1, 2 và 12 là nền tảng, phải hoàn thiện trước khi gắn các route còn lại. Không tạo màn hình tạo vé riêng; vé được sinh khi đăng ký đỗ.

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

## 5. Quyết định nghiệp vụ đã chốt (A3–A7 và A4 mở rộng)

Các quyết định dưới đây là **tạm thời nhưng có hiệu lực để build Sprint 1**. Khi thay đổi phải sửa mục này trước.

### A3 — Quyền STAFF

STAFF được xem danh sách/chi tiết vé và vị trí, nhưng không được sửa/xóa vé, không được tạo/sửa/xóa vị trí hoặc chuyển bảo trì. STAFF được dùng modal tìm xe, quản lý khách hàng, thêm xe, scan, check-in và check-out theo RBAC mục 4.

### A4 — Công thức phí tạm thời

Để có hành vi xác định và dễ thay thế, Sprint 1 dùng cấu hình sau trong `src/config/pricing.js`:

| Hạng mục | Xe máy | Ô tô |
|---|---:|---:|
| Vé DAILY tự sinh khi đăng ký | 20.000 VND | 50.000 VND |
| Phí lượt đỗ lẻ mỗi giờ | 10.000 VND | 20.000 VND |

Phí lượt đỗ lẻ tính `ceil(số phút / 60) × đơn giá`, tối thiểu 1 giờ; thời lượng bằng 0 vẫn tính 1 giờ. Nếu session gắn `ticket_id` hợp lệ với `status = ACTIVE`, thời điểm checkout nằm trong `start_date..end_date`, thì `fee = 0`. Vé DAILY được tạo cùng đăng ký, có `start_date = ngày đăng ký`, `end_date = cùng ngày`; `price` là giá trong bảng trên. Không có phụ phí đêm, ngày lễ, cuối tuần hay giảm giá trong Sprint 1. Mọi giá trị phải đọc từ `pricing.js`, không hard-code trong Service.

### A5 — Tài khoản CUSTOMER

MANAGER hoặc STAFF tạo customer cùng tài khoản CUSTOMER trong một transaction. Không có tự đăng ký trong Sprint 1. Mật khẩu khởi tạo chỉ nhận ở form tạo, băm bcrypt ngay lập tức và không bao giờ render lại. Xóa mềm customer đặt `deleted_at`; tài khoản liên kết bị `is_active = 0` trong cùng transaction.

### A6 — Vòng đời RESERVED

`RESERVED` **không tự hết hạn và không có hủy trong Sprint 1**. Chỉ có luồng `RESERVED → OCCUPIED` khi đúng xe vào, rồi `OCCUPIED → AVAILABLE` khi xe ra. Một ô RESERVED không thể được đăng ký lại; một xe RESERVED không thể giữ ô khác. Đây là giới hạn tạm thời đã chấp nhận; không tự thêm cron hay nút hủy.

### A7 — Xe vãng lai

Khi OCR nhận biển số chưa có trong `vehicles`, scan chỉ trả `exists: false`; không tự ghi DB vì còn thiếu tên xe/loại xe. Nhân viên mở modal thêm xe, tạo một vehicle với `customer_id = NULL`, rồi quét/tra cứu lại. Xe vãng lai sau khi tạo được tìm bằng biển số và được check-in/check-out như xe thường. Mọi `parking_session` hợp lệ đều phải có `vehicle_id`; `NULL` chỉ còn là dữ liệu legacy không được tạo bởi API mới.

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

Quyền: MANAGER, STAFF. CSRF: có. Multipart field duy nhất `plateImage`; tối đa 5 MB; MIME chỉ JPEG/PNG/WebP; kiểm tra magic bytes; tên file UUID.

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
    "slotCode": "A-01"
  },
  "errors": []
}
```

Nếu không có vehicle, `exists = false`, `vehicleId = null`, các trường còn lại null nhưng `licensePlate` vẫn có giá trị chuẩn hóa. Không tự tạo vehicle. Ảnh sai/magic bytes sai/OCR không đọc được trả `400`; vượt giới hạn trả `413` với message `Ảnh vượt quá 5 MB`.

### 6.5 `POST /api/parking/check-in`

Quyền: MANAGER, STAFF. CSRF: có. Body JSON:

```json
{ "vehicleId": 10, "slotId": 3, "ticketId": 25 }
```

`vehicleId` và `slotId` bắt buộc; `ticketId` tùy chọn. Service khóa slot trước, sau đó vehicle/ticket. Cho phép `AVAILABLE → OCCUPIED` hoặc `RESERVED → OCCUPIED` khi `current_vehicle_id` đúng vehicle. Xe không được có slot khác hoặc session mở. Nếu `ticketId` truyền vào phải thuộc vehicle, active, đúng slot và còn hạn. Nếu không truyền, service tự gắn ticket active hợp lệ của chính vehicle/slot nếu có; không có thì session lẻ.

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

Quyền: MANAGER. Đây là endpoint trả JSON khi `Accept: application/json`; trang web vẫn có thể render `/stats`. `from <= to`, khoảng tối đa 366 ngày, giờ biên theo +07:00. Lượt vào lọc theo `parking_sessions.check_in_time`; lượt ra theo `check_out_time`; doanh thu vé theo `tickets.created_at` và bỏ CANCELLED/deleted; doanh thu lẻ theo `parking_sessions.check_out_time` và fee > 0. Không gộp hai nguồn doanh thu. Trả:

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
    "series": []
  },
  "errors": []
}
```

### 6.11 Endpoint CRUD dùng JSON

Các route `DELETE /employees/:id`, `DELETE /customers/:id`, `DELETE /tickets/:id`, `DELETE /slots/:id` dùng cùng envelope và CSRF. Quyền lần lượt: MANAGER; MANAGER/STAFF cho customer; MANAGER cho ticket; MANAGER cho slot. Xóa customer/employee/ticket/slot phải kiểm tra điều kiện chặn trong cùng transaction. `409` giữ nguyên modal xác nhận và message tiếng Việt.

### 6.12 `GET /files/plates/:filename`

Quyền: MANAGER, STAFF. CUSTOMER và user chưa đăng nhập không được truy cập. `filename` phải khớp `^[0-9a-f-]{36}\.(jpg|png|webp)$`; file phải được resolve an toàn bên trong `storage/plates/`, không dùng `originalname`, không phục vụ qua `express.static`. Không tồn tại hoặc tên sai trả `404`.

### 6.13 Route trang và mutation form

Các trang HTML dùng session/RBAC và include header/footer: `GET /`, `GET /news`, `GET /employees`, `GET /customers`, `GET /customers/:id/vehicles`, `GET /my-vehicles`, `GET /parking/checkin-checkout`, `GET /parking/map`, `GET /tickets`, `GET /stats`, `GET /slots`, `GET /slots/:id`. Form ghi dữ liệu dùng CSRF hidden input và các route `POST /login`, `POST /forgot-password`, `POST /reset-password/:token`, `POST /employees/create`, `POST /employees/:id/edit`, `POST /customers/create`, `POST /customers/:id/edit`, `POST /tickets/:id/edit`, `POST /slots/create`, `POST /slots/:id/edit`; quyền theo mục 4. Route `GET/POST /tickets/:id/edit` chỉ MANAGER vì STAFF chỉ xem vé. Nếu frontend dùng fetch thay form thì dùng endpoint JSON trong mục 6.


### 7.1 Vehicle

Vehicle không có cột status; trạng thái là **trạng thái dẫn xuất** từ slot và session:

| Trạng thái dẫn xuất | Điều kiện |
|---|---|
| `REGISTERED` | vehicle tồn tại, không có slot hiện tại, không có session mở |
| `RESERVED` | có slot `RESERVED` với `current_vehicle_id = vehicle.id` |
| `PARKED` | có slot `OCCUPIED` với current vehicle và đúng một session mở |
| `VISITOR` | `customer_id IS NULL`; là thuộc tính độc lập, có thể đồng thời REGISTERED/RESERVED/PARKED |
| `EXITED` | session gần nhất đã đóng; sau đó quay về REGISTERED hoặc VISITOR |

Chuyển trạng thái: scan mới chỉ là trạng thái tạm ngoài DB; tạo vehicle → REGISTERED/VISITOR; register → RESERVED; check-in → PARKED; check-out → EXITED rồi REGISTERED/VISITOR. Không xóa vehicle trong Sprint 1. Một vehicle chỉ giữ tối đa một slot và một session mở.

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
