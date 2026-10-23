# Ghi chú thiết kế nội bộ

File này ghi lại **quyết định** và **chỗ lệch** giữa thiết kế và code thực tế. Design System gốc nằm ở `design-system.md` (ParkCore Precision).

## Trạng thái triển khai

| Ngày | Hạng mục | Ghi chú |
| :--- | :--- | :--- |
| 2026-10-18 | Nhập toàn bộ thiết kế từ Stitch AI | 10 thư mục màn hình, phủ 16 Task; dùng Design System ParkCore Precision |

## Design System đang dùng

Tóm tắt các giá trị **bắt buộc tuân theo** khi chuyển sang EJS/Bootstrap (chi tiết đầy đủ ở `design-system.md`):

- **Màu**: primary `#0066CC`; surface `#F8F9FA`; card `#FFFFFF`; border `#E5E7EB`; text chính `#191C1D`, phụ `#414753`.
- **Trạng thái ô đỗ** (badge dạng chữ, không chỉ dùng màu):
  - TRỐNG: text `#1E7E34`, nền `#EAF5EA`, viền `#B8E2BE`
  - ĐÃ ĐỖ: text `#BD2130`, nền `#FDECEE`, viền `#F5B5BB`
  - ĐẶT TRƯỚC: text `#856404`, nền `#FFF9E6`, viền `#FFE699`
  - BẢO TRÌ: text `#545B62`, nền `#F0F2F4`, viền `#CED4DA`
- **Font**: Inter cho toàn bộ; biển số và con số trong bảng dùng `font-variant-numeric: tabular-nums`; biển số OCR dùng JetBrains Mono.
- **Radius**: card/modal 8px, input/badge 4px, không dùng pill cho phần tử nghiệp vụ (chỉ avatar).
- **Button**: cao 36px (hành động chính có thể 44px cho màn hình cảm ứng).
- **Input**: cao 38px, focus viền `#0066CC` + shadow `0 0 0 3px rgba(0,102,204,.15)`.
- **Bảng**: header 12px chữ in hoa màu `#6C757D`, hàng cao 36px, hover `#F8F9FA`.
- **Responsive**: desktop ≥1280px sidebar 240px; tablet 768-1279px drawer; mobile <768px một cột.

## Chỗ lệch cần ghi lại

> Ghi mỗi lần frontend chủ động khác thiết kế. Mẫu: ngày - màn hình - lệch gì - vì sao - ai duyệt.

| Ngày | Màn hình | Lệch so với thiết kế | Lý do | Người duyệt |
| :--- | :--- | :--- | :--- | :--- |
| _chưa có_ | | | | |

## Prototype CUSTOMER

| Ngày | Màn hình | Ghi chú | Phạm vi |
| :--- | :--- | :--- | :--- |
| 2026-10-22 | `customer-home` | Trang chủ riêng cho CUSTOMER: xe của tôi, bản đồ và tin tức | Sprint 1 |
| 2026-10-22 | `customer-my-vehicles` | Danh sách xe và modal thêm xe qua `POST /api/vehicles`; ownership lấy từ session | Sprint 1 |
| 2026-10-22 | `customer-parking-map` | Lưới ô chỉ hiển thị mã/zone/trạng thái; đăng ký qua `POST /api/slots/:id/register` | Sprint 1 |
| 2026-10-23 | `customer-profile` | Hồ sơ CUSTOMER chỉ sửa `fullName`, `phone`, `email`, `address`; không sửa username/mật khẩu/quyền | Sprint 1 |

Các prototype CUSTOMER được lưu trong `docs/design/screens/` để làm baseline UI. Không đưa trực tiếp vào `src/` và không coi JavaScript mô phỏng trong `code.html` là implementation.

## Decision log CUSTOMER (A + D)

| Mã | Quyết định | Tài liệu áp dụng |
| :--- | :--- | :--- |
| C-01 | Dùng `GET /api/my-vehicles`; ownership chỉ lấy từ session CUSTOMER | `AGENTS.md` 6.16, `docs/contracts/api.md` |
| C-02 | CUSTOMER sửa hồ sơ qua `GET/POST /profile`, chỉ nhận bốn field hồ sơ | `AGENTS.md` 6.16 |
| C-03 | Zone chỉ là bộ lọc/hiển thị; không có ràng buộc Zone–vehicleType trong Sprint 1 | `AGENTS.md` 6.16, map prototype |
| C-04 | DTO xe CUSTOMER giữ `isVisitor` để tương thích nhưng luôn `false`; `derivedStatus` nhận `REGISTERED|RESERVED|PARKED|EXITED`; field slot/time có thể null | `AGENTS.md` 6.16, `docs/contracts/api.md` |
| C-05 | Đăng ký thành công phải hiển thị ticket/giá và refresh; không có hủy RESERVED | `AGENTS.md` 6.16 |
| C-06 | `/` chọn `customer/home.ejs` cho CUSTOMER, dashboard quản trị cho MANAGER/STAFF | `AGENTS.md` 6.13, `docs/contracts/api.md` |
| C-07 | Profile đổi email đồng bộ `users` và `customers` trong một transaction; trùng email trả `409` | `AGENTS.md` 6.16, `docs/contracts/api.md` |
| C-08 | `/api/my-vehicles` không phân trang trong Sprint 1; `data.items` là toàn bộ danh sách | `AGENTS.md` 6.16, `docs/contracts/api.md` |
| C-09 | Ticket sau register chỉ là biên nhận tức thời, không mở quyền đọc ticket cho CUSTOMER | `AGENTS.md` 6.16, `docs/contracts/api.md` |
| C-10 | Zone trên bản đồ phải render động từ `GET /api/slots`; zone trong prototype chỉ là minh họa | `AGENTS.md` 6.16, prototype CUSTOMER |

## Ranh giới prototype và Sprint 1

Các file `code.html` là prototype tham khảo, không phải màn hình chạy thật và không phải API contract. Code thật dùng Bootstrap 5 + EJS theo `AGENTS.md` và `.agents/rules/ejs.md`.

Các chi tiết sau trong prototype phải được bỏ khỏi bản EJS Sprint 1 hoặc đánh dấu `OUT OF SCOPE`: RFID/ePass/VETC, camera LPR realtime, điều khiển/mở/khóa barie, thanh toán ngân hàng, in vé QR, cảm biến IoT/LoRaWAN, sạc EV, dữ liệu căn hộ, xuất CAD/PDF/Excel, tạo vé thủ công và các telemetry không có trong schema/API.

Bản đồ chỉ được render mã ô, zone và status từ `GET /api/slots`. Bộ lọc zone phải được tạo từ các giá trị zone thực tế trong response; các nút `zone-a/zone-b/zone-c` trong prototype chỉ là minh họa và không phải mã canonical. Không hard-code hoặc hiển thị biển số, tên khách hàng hay chi tiết xe trong lưới. MANAGER/STAFF click ô đang có xe để gọi `GET /api/slots/:id/vehicle`; CUSTOMER không có menu và không được gọi endpoint này.

Màn hình Task 8 chỉ gồm upload/preview ảnh, scan, năm trường kết quả, tạo xe vãng lai qua modal, check-in và check-out. Không thêm ô tìm kiếm thủ công hoặc hành động barie/RFID/in vé.

Màn hình thống kê chỉ có ba chế độ Theo ngày, Theo tháng và Theo năm; KPI phải lấy từ API, không dùng số hard-code. Doanh thu phải tách thành Doanh thu vé và Doanh thu lượt đỗ lẻ theo contract.

## Điểm cần đối chiếu với `AGENTS.md`

Thiết kế Stitch AI có một số chỗ chưa khớp rule dự án, cần điều chỉnh khi code:

1. **Bootstrap, không Tailwind**: `code.html` dùng Tailwind. Code thật dùng Bootstrap 5 - chuyển class tương ứng, không copy nguyên.
2. **Menu bản đồ theo role**: chỉ render "Xem thông tin xe" cho MANAGER/STAFF; CUSTOMER chỉ thấy đăng ký khi ô AVAILABLE.
3. **Dữ liệu bản đồ tối thiểu**: lưới không hiển thị plate/customer, vì API map chỉ trả id, slot_code, zone, status.
4. **Modal tìm xe**: include một lần qua `footer.ejs`, chỉ MANAGER/STAFF.
5. **Task 8**: giữ đúng id `#vehicleName`, `#vehicleBrand`, `#customerName`, `#customerPhone`, `#parkingSlotCode`, `#licensePlate`; không đưa tìm kiếm thủ công vào màn hình.
6. **Thống kê**: dùng đúng ba mode day/month/year và các field `ticketRevenue`, `casualParkingRevenue`, `availableSlots`, `occupiedSlots`.
