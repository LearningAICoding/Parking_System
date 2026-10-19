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

## Ranh giới prototype và Sprint 1

Các file `code.html` là prototype tham khảo, không phải màn hình chạy thật và không phải API contract. Code thật dùng Bootstrap 5 + EJS theo `AGENTS.md` và `.claude/rules/ejs.md`.

Các chi tiết sau trong prototype phải được bỏ khỏi bản EJS Sprint 1 hoặc đánh dấu `OUT OF SCOPE`: RFID/ePass/VETC, camera LPR realtime, điều khiển/mở/khóa barie, thanh toán ngân hàng, in vé QR, cảm biến IoT/LoRaWAN, sạc EV, dữ liệu căn hộ, xuất CAD/PDF/Excel, tạo vé thủ công và các telemetry không có trong schema/API.

Bản đồ chỉ được render mã ô, zone và status từ `GET /api/slots`. Không hard-code hoặc hiển thị biển số, tên khách hàng hay chi tiết xe trong lưới. MANAGER/STAFF click ô đang có xe để gọi `GET /api/slots/:id/vehicle`; CUSTOMER không có menu và không được gọi endpoint này.

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
