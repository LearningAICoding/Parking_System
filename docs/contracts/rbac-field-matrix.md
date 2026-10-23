# RBAC và Field Whitelist - Sprint 1

Artifact kiểm chứng quyền và dữ liệu đầu vào theo `AGENTS.md`. Controller chỉ nhận các field trong bảng; mọi field khác phải bị loại bỏ hoặc trả lỗi validation.

## Quyền route/API

| Nhóm | MANAGER | STAFF | CUSTOMER | Chưa đăng nhập |
|---|---:|---:|---:|---:|
| `/api/vehicles` POST | ✓ | ✓ | ✓ (session customer) | 401 |
| `/api/vehicles/search` GET | ✓ | ✓ | 403 | 401 |
| `/api/parking/scan-plate` POST | ✓ | ✓ | 403 | 401 |
| `/api/parking/check-in` POST | ✓ | ✓ | 403 | 401 |
| `/api/parking/check-out` POST | ✓ | ✓ | 403 | 401 |
| `/api/slots` GET | ✓ | ✓ | ✓ | 401 |
| `/api/slots/:id/vehicle` GET | ✓ | ✓ | 403 | 401 |
| `/api/slots/:id/register` POST | ✓ | ✓ | ✓ (own vehicle only) | 401 |
| `/api/my-vehicles` GET | 403 | 403 | ✓ | 401 |
| `/stats/report` GET | ✓ | 403 | 403 | 401 |
| `POST /employees/create` | ✓ | 403 | 403 | redirect/401 |
| `POST /customers/create` | ✓ | ✓ | 403 | redirect/401 |
| `POST /tickets/:id/edit` | ✓ | 403 | 403 | redirect/401 |
| `POST /slots/create` | ✓ | 403 | 403 | redirect/401 |

## Field whitelist

| Endpoint | Allowed fields | Forbidden/internal fields |
|---|---|---|
| `POST /api/vehicles` | `licensePlate`, `vehicleName`, `brand`, `vehicleType`, `customerId` | `id`, `status`, `deletedAt`, `customer_id`, password/session fields |
| `POST /api/parking/check-in` | `vehicleId`, `slotId`, `ticketId`, `scanToken` | `plateImageUrl`, `checkInTime`, `checkOutTime`, `fee`, `status`, `customerId` |
| `POST /api/parking/check-out` | `sessionId` | `vehicleId`, `slotId`, `checkOutTime`, `fee` |
| `POST /api/slots/:id/register` | `vehicleId` | `customerId`, `ticketId`, `price`, `ticketCode`, dates/status |
| `POST /employees/create` | `fullName`, `username`, `email`, `password`, `phone`, `address`, `position`, `role` | `id`, `userId`, `passwordHash`, `isActive`, `deletedAt` |
| `POST /employees/:id/edit` | `fullName`, `email`, `phone`, `address`, `position` | `username`, `role`, `password`, status/deletion fields |
| `POST /customers/create` | `fullName`, `phone`, `email`, `address`, `username`, `password` | `userId`, `role`, `isActive`, `deletedAt`, `customerId` |
| `POST /customers/:id/edit` | `fullName`, `phone`, `email`, `address` | `username`, `password`, `role`, `userId`, status/deletion fields |
| `POST /profile` | `fullName`, `phone`, `email`, `address` | `id`, `userId`, `customerId`, `username`, `password`, `role`, status/deletion fields |
| `POST /tickets/:id/edit` | `startDate`, `endDate` | ticket/vehicle/slot/type/price/status/deletion/system-time fields |
| `POST /slots/create` | `slotCode`, `zone`, `status`, `note` | `currentVehicleId` |
| `POST /slots/:id/edit` | `zone`, `status`, `note` | `slotCode`, `currentVehicleId` |

## Required negative tests

- CUSTOMER gửi `customerId` khác session: bỏ qua field và tạo theo session, hoặc trả validation; tuyệt đối không tạo theo giá trị client.
- CUSTOMER truy cập vehicle/slot/ticket/customer khác: `403`.
- STAFF sửa/xóa ticket hoặc slot: `403`.
- Bất kỳ request mutation thiếu hoặc sai CSRF: `403`.
- Unknown field nội bộ không được bind vào model.
