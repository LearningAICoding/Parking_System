# API Contract — Sprint 1

**Canonical source:** `AGENTS.md` mục 6. File này diễn giải request/response để frontend, backend và test dùng chung; nếu có khác biệt, `AGENTS.md` thắng.

## 1. Quy ước chung

Base URL: `/api`. JSON response luôn có dạng:

```json
{
  "success": true,
  "message": "",
  "data": {},
  "errors": []
}
```

`errors` là mảng object `{ "field": "", "message": "", "code": "" }`. Response lỗi giữ `data: null` và `success: false`.

Mọi request `POST`, `PUT`, `PATCH`, `DELETE` yêu cầu session đăng nhập và header:

```http
X-CSRF-Token: <token trong meta[name="csrf-token"]>
```

API không đăng nhập trả `401`; sai quyền hoặc IDOR trả `403`; validation trả `400`; không tìm thấy trả `404`; xung đột/invariant trả `409`; file quá 5 MB trả `413`. Không trả stack trace, SQL, `password_hash`, `reset_token_hash` hoặc token reset.

Pagination dùng:

```json
{
  "items": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

## 2. Vehicle APIs

### POST `/api/vehicles`

Quyền: MANAGER, STAFF, CUSTOMER. CSRF: bắt buộc. Content-Type: `application/json`.

Request cho phép:

```json
{
  "licensePlate": "51F-123.45",
  "vehicleName": "Honda City",
  "brand": "Honda",
  "vehicleType": "CAR",
  "customerId": 12
}
```

`licensePlate`: normalize rồi kiểm tra `^[0-9A-Z]{6,10}$`. `vehicleName` dài 1–100; `brand` tối đa 50 hoặc null; `vehicleType`: `MOTORBIKE|CAR`.

CUSTOMER luôn lấy customer từ session và bỏ qua `customerId`. MANAGER/STAFF được tạo xe có customer đang hoạt động hoặc xe vãng lai (`customerId: null`). Không nhận các field khác.

Response `201`:

```json
{
  "success": true,
  "message": "Thêm xe thành công",
  "data": {
    "id": 10,
    "licensePlate": "51F12345",
    "vehicleName": "Honda City",
    "brand": "Honda",
    "vehicleType": "CAR",
    "customerId": 12
  },
  "errors": []
}
```

Biển số trùng trả `409`.

### GET `/api/my-vehicles`

Quyền: CUSTOMER. Không nhận `customerId` từ client; Service luôn dùng `req.session.customerId`. Endpoint không phân trang trong Sprint 1, không có `data.pagination`; response `200` dùng `data.items` là toàn bộ danh sách xe thuộc customer hiện tại, mỗi item gồm:

```json
{
  "id": 10,
  "licensePlate": "51F12345",
  "vehicleName": "Honda City",
  "brand": "Honda",
  "vehicleType": "CAR",
  "derivedStatus": "REGISTERED",
  "isVisitor": false,
  "slotCode": null,
  "checkInTime": null,
  "lastExitTime": "2026-10-18T16:05:18+07:00"
}
```

`derivedStatus` chỉ nhận `REGISTERED|RESERVED|PARKED|EXITED`. `isVisitor` là field tương thích và **luôn bằng `false`** vì endpoint chỉ trả xe thuộc customer hiện tại; không dùng `VISITOR` làm giá trị trạng thái ở DTO CUSTOMER. Các mốc/ô không áp dụng trả `null`. Không trả xe của customer khác hoặc dữ liệu nội bộ.

### GET `/api/vehicles/search?keyword=<text>`

Quyền: MANAGER, STAFF. Keyword bắt buộc, 1–50 ký tự. Escape `\\`, `%`, `_`; nếu keyword giống biển số thì normalize để tìm thêm theo biển số. Tối đa 20 dòng.

Item:

```json
{
  "id": 10,
  "licensePlate": "51F12345",
  "vehicleName": "Honda City",
  "brand": "Honda",
  "customerName": "Nguyễn Văn A",
  "phone": "0901234567",
  "customerId": 12
}
```

Customer null với xe vãng lai. Keyword rỗng/quá dài trả `400`.

## 3. Parking APIs

### POST `/api/parking/scan-plate`

Quyền: MANAGER, STAFF. CSRF: bắt buộc. Content-Type: `multipart/form-data`. Tên field duy nhất: `plateImage`. Nhận JPEG/PNG/WebP, tối đa 5 MB, kiểm tra magic bytes, lưu UUID ngoài `public/`.

Response `200` khi xe tồn tại. `scanToken` là token opaque, gắn với session đăng nhập, có hạn 10 phút và chỉ dùng một lần cho check-in; client không được giải mã hoặc tự tạo token:

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

Khi chưa có xe: `exists: false`, `licensePlate` đã chuẩn hóa, `vehicleId: null`, năm field còn lại null và vẫn có `scanToken` nếu ảnh/OCR hợp lệ. Scan không tự ghi vehicle; UI mở modal tạo xe vãng lai rồi dùng lại token khi check-in nếu token còn hạn.

OCR trong Sprint 1 chạy qua adapter mock nội bộ `src/utils/ocr-plate-reader.js`; không gọi dịch vụ OCR bên ngoài. Sai file hoặc mock không đọc được biển số trả `400`; file vượt giới hạn trả `413` và message `Ảnh vượt quá 5 MB`.

### POST `/api/parking/check-in`

Quyền: MANAGER, STAFF. CSRF: bắt buộc. Body:

```json
{ "vehicleId": 10, "slotId": 3, "ticketId": 25 }
```

`ticketId` và `scanToken` tùy chọn. `vehicleId`, `slotId` bắt buộc. Transaction khóa slot trước, sau đó vehicle/ticket. Chỉ cho `AVAILABLE → OCCUPIED` hoặc `RESERVED → OCCUPIED` khi đúng vehicle. Vehicle không được có slot hoặc session OPEN khác. Nếu có `scanToken`, token phải thuộc session hiện tại, chưa hết hạn/chưa dùng, khớp vehicle và biển số; server lấy đường dẫn ảnh từ token để ghi `plate_image_url`. Client không được gửi đường dẫn ảnh. Token sai quyền trả `403`, token hết hạn/đã dùng hoặc không khớp invariant trả `409`.

Khi ticketId có mặt, ticket phải thuộc vehicle, ACTIVE, gắn slot và đang trong hạn. Khi không có ticketId, Service tự dùng ticket ACTIVE hợp lệ của vehicle/slot nếu có.

Response `201`:

```json
{
  "success": true,
  "message": "Cho xe vào thành công",
  "data": {
    "sessionId": 100,
    "vehicleId": 10,
    "slotId": 3,
    "slotCode": "A-01",
    "checkInTime": "2026-10-18T14:35:18+07:00",
    "ticketId": 25
  },
  "errors": []
}
```

Slot không hợp lệ, vehicle đang đỗ, ticket sai hoặc xung đột trả `409`; rollback toàn bộ.

### POST `/api/parking/check-out`

Quyền: MANAGER, STAFF. CSRF: bắt buộc. Body chỉ nhận:

```json
{ "sessionId": 100 }
```

Transaction khóa slot rồi session. Session phải OPEN, slot OCCUPIED và đúng vehicle. Ghi checkout time, tính fee từ `pricing.js`, cập nhật slot AVAILABLE/current_vehicle_id null. Client không được truyền fee.

Response `200`:

```json
{
  "success": true,
  "message": "Cho xe ra thành công",
  "data": {
    "sessionId": 100,
    "vehicleId": 10,
    "slotId": 3,
    "slotCode": "A-01",
    "checkInTime": "2026-10-18T14:35:18+07:00",
    "checkOutTime": "2026-10-18T16:05:18+07:00",
    "fee": "20000.00",
    "ticketId": null
  },
  "errors": []
}
```

Session đã đóng hoặc trạng thái slot không khớp trả `409`.

## 4. Slot map APIs

### GET `/api/slots`

Quyền: mọi user đã đăng nhập. Query tùy chọn `zone`, `status`. Không CSRF vì GET.

Response chỉ được chứa:

```json
{
  "id": 3,
  "slotCode": "A-01",
  "zone": "B1-A",
  "status": "AVAILABLE"
}
```

Cấm trả biển số, vehicle, customer, session hoặc thời lượng.

### GET `/api/slots/:id/vehicle`

Quyền: MANAGER, STAFF. CUSTOMER nhận `403`. `id` số nguyên dương. Ô không có xe trả `data: null`; ô có xe:

```json
{
  "vehicleId": 10,
  "licensePlate": "51F12345",
  "vehicleName": "Honda City",
  "brand": "Honda",
  "vehicleType": "CAR",
  "customerName": "Nguyễn Văn A",
  "phone": "0901234567",
  "slotCode": "A-01",
  "sessionId": 100,
  "checkInTime": "2026-10-18T14:35:18+07:00"
}
```

### POST `/api/slots/:id/register`

Quyền: MANAGER, STAFF, CUSTOMER. CSRF: bắt buộc. Body:

```json
{ "vehicleId": 10 }
```

CUSTOMER phải sở hữu vehicle theo session; không nhận customerId. Slot phải AVAILABLE; vehicle không được giữ slot hoặc session OPEN. Transaction khóa slot trước, vehicle sau. Cập nhật RESERVED/current vehicle và tạo ticket DAILY ACTIVE.

Response `201`:

```json
{
  "success": true,
  "message": "Đăng ký đỗ xe thành công",
  "data": {
    "slotId": 3,
    "slotCode": "A-01",
    "status": "RESERVED",
    "vehicleId": 10,
    "ticketId": 25,
    "ticketCode": "T-20261018-00025",
    "startDate": "2026-10-18",
    "endDate": "2026-10-18",
    "price": "50000.00"
  },
  "errors": []
}
```

Slot RESERVED/OCCUPIED/MAINTENANCE hoặc vehicle đã có ràng buộc trả `409`; CUSTOMER dùng xe người khác trả `403`; race condition trả một `201`, một `409`.

Sau `201`, giao diện CUSTOMER hiển thị biên nhận tức thời gồm `slotCode`, `ticketCode`, `startDate`, `endDate`, `price` và tải lại bản đồ/danh sách xe. Response này không cấp quyền đọc ticket; CUSTOMER không có endpoint danh sách/chi tiết/sửa ticket. Sprint 1 không có API hủy RESERVED.

## 5. Statistics API

### GET `/stats/report?mode=day|month|year&from=YYYY-MM-DD&to=YYYY-MM-DD`

Quyền: MANAGER. Trang web có thể render HTML; với `Accept: application/json` trả JSON. `from <= to`, khoảng tối đa 366 ngày. Tất cả mốc theo +07:00.

- entries: đếm theo `check_in_time`.
- exits: đếm theo `check_out_time`.
- ticketRevenue: `SUM(tickets.price)` theo `created_at`, bỏ CANCELLED và deleted.
- casualParkingRevenue: `SUM(parking_sessions.fee)` theo `check_out_time`, chỉ fee > 0.
- available/occupied: snapshot hiện tại tại thời điểm truy vấn.

`series` trả một item cho từng kỳ trong khoảng yêu cầu. `period` có dạng `YYYY-MM-DD` với `mode=day`, `YYYY-MM` với `mode=month`, `YYYY` với `mode=year`. Mỗi item có đúng các field:

```json
{
  "period": "2026-10-18",
  "entries": 0,
  "exits": 0,
  "ticketRevenue": "0.00",
  "casualParkingRevenue": "0.00"
}
```

Response:

```json
{
  "success": true,
  "message": "",
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

Ngày bắt đầu sau ngày kết thúc trả `400`.

## 6. File plate và route trang

### GET `/files/plates/:filename`

Quyền: MANAGER, STAFF. Filename phải khớp `^[0-9a-f-]{36}\.(jpg|png|webp)$`; server resolve path bên trong `storage/plates/` và không phục vụ file qua static middleware. CUSTOMER/chưa đăng nhập bị từ chối; file không tồn tại trả `404`.

Các route HTML dùng session/RBAC và CSRF cho mutation: `/`, `/news`, `/employees`, `/customers`, `/my-vehicles`, `/profile`, `/parking/checkin-checkout`, `/parking/map`, `/tickets`, `/stats`, `/slots`, `/slots/:id`; các form POST auth/CRUD theo danh sách tại `AGENTS.md` mục 6.13–6.16. `GET /` render `customer/home.ejs` cho CUSTOMER và dashboard quản trị cho MANAGER/STAFF. STAFF chỉ xem vé; route sửa vé chỉ MANAGER. Form sửa vé chỉ nhận `startDate` và `endDate`; `ticketCode`, `vehicleId`, `slotId`, `ticketType`, `price`, `status`, `deletedAt` và thời điểm hệ thống là read-only. Vé Sprint 1 giữ `ticketType = DAILY`, không có tạo vé thủ công, đổi loại vé hoặc hủy vé. Vé đã được dùng bởi parking session không được sửa ngày; giá phải do server đọc từ `pricing.js`.

`GET /profile` và `POST /profile` dành cho CUSTOMER hiện tại. POST có CSRF và chỉ nhận `{ fullName, phone, email, address }`; server lấy customer từ session, không nhận ID ownership. CUSTOMER không được sửa username, password, role, trạng thái tài khoản hoặc `deletedAt`. Khi email thay đổi, server cập nhật `customers.email` và `users.email` trong cùng transaction; email trùng trả `409` và rollback. Hồ sơ không tồn tại hoặc tài khoản đã vô hiệu trả lỗi chuẩn theo mục 6.1.

Request contract CRUD dùng các field camelCase sau: tạo nhân viên `{ fullName, username, email, password, phone, address, position, role }`; sửa nhân viên `{ fullName, email, phone, address, position }`; tạo customer `{ fullName, phone, email, address, username, password }`; sửa customer `{ fullName, phone, email, address }`; tạo vị trí `{ slotCode, zone, status?, note }`; sửa vị trí `{ zone, status, note }`. Không nhận ID nội bộ, role tùy ý, password hash, trạng thái tài khoản, `deletedAt` hoặc `currentVehicleId` từ client. Chi tiết quyền và điều kiện transition theo `AGENTS.md` mục 6.14.

Các route sau cùng envelope, CSRF và confirmation modal:

| Method | URL | Quyền |
|---|---|---|
| DELETE | `/employees/:id` | MANAGER |
| DELETE | `/customers/:id` | MANAGER, STAFF |
| DELETE | `/tickets/:id` | MANAGER |
| DELETE | `/slots/:id` | MANAGER |

Xóa customer/employee/ticket/slot phải kiểm tra điều kiện chặn trong cùng transaction. `409` giữ modal mở và hiển thị đúng message server.
