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

Response `200` khi xe tồn tại:

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

Khi chưa có xe: `exists: false`, `licensePlate` đã chuẩn hóa, `vehicleId: null`, năm field còn lại null. Scan không tự ghi vehicle; UI mở modal tạo xe vãng lai rồi quét lại.

Sai file/OCR không đọc được trả `400`; file vượt giới hạn trả `413` và message `Ảnh vượt quá 5 MB`.

### POST `/api/parking/check-in`

Quyền: MANAGER, STAFF. CSRF: bắt buộc. Body:

```json
{ "vehicleId": 10, "slotId": 3, "ticketId": 25 }
```

`ticketId` tùy chọn. `vehicleId`, `slotId` bắt buộc. Transaction khóa slot trước, sau đó vehicle/ticket. Chỉ cho `AVAILABLE → OCCUPIED` hoặc `RESERVED → OCCUPIED` khi đúng vehicle. Vehicle không được có slot hoặc session OPEN khác.

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

## 5. Statistics API

### GET `/stats/report?mode=day|month|year&from=YYYY-MM-DD&to=YYYY-MM-DD`

Quyền: MANAGER. Trang web có thể render HTML; với `Accept: application/json` trả JSON. `from <= to`, khoảng tối đa 366 ngày. Tất cả mốc theo +07:00.

- entries: đếm theo `check_in_time`.
- exits: đếm theo `check_out_time`.
- ticketRevenue: `SUM(tickets.price)` theo `created_at`, bỏ CANCELLED và deleted.
- casualParkingRevenue: `SUM(parking_sessions.fee)` theo `check_out_time`, chỉ fee > 0.
- available/occupied: snapshot hiện tại tại thời điểm truy vấn.

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
    "series": []
  },
  "errors": []
}
```

Ngày bắt đầu sau ngày kết thúc trả `400`.

## 6. File plate và route trang

### GET `/files/plates/:filename`

Quyền: MANAGER, STAFF. Filename phải khớp `^[0-9a-f-]{36}\.(jpg|png|webp)$`; server resolve path bên trong `storage/plates/` và không phục vụ file qua static middleware. CUSTOMER/chưa đăng nhập bị từ chối; file không tồn tại trả `404`.

Các route HTML dùng session/RBAC và CSRF cho mutation: `/`, `/news`, `/employees`, `/customers`, `/my-vehicles`, `/parking/checkin-checkout`, `/parking/map`, `/tickets`, `/stats`, `/slots`, `/slots/:id`; các form POST auth/CRUD theo danh sách tại `AGENTS.md` mục 6.13. STAFF chỉ xem vé; route sửa vé chỉ MANAGER.

Các route sau cùng envelope, CSRF và confirmation modal:

| Method | URL | Quyền |
|---|---|---|
| DELETE | `/employees/:id` | MANAGER |
| DELETE | `/customers/:id` | MANAGER, STAFF |
| DELETE | `/tickets/:id` | MANAGER |
| DELETE | `/slots/:id` | MANAGER |

Xóa customer/employee/ticket/slot phải kiểm tra điều kiện chặn trong cùng transaction. `409` giữ modal mở và hiển thị đúng message server.
