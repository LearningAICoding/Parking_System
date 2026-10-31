# Task 10 – Bản đồ vị trí bãi đỗ xe

Tham chiếu: SRS 4.5.2; `AGENTS.md` mục 4, 6.7–6.9, 6.16, 7.2, 9. Khi click vào vị trí hiển thị menu: (1) Xem thông tin xe – MANAGER, STAFF; (2) Đăng ký đỗ xe – MANAGER, STAFF, CUSTOMER.

| ID | Điều kiện | Bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|
| T10-01 | STAFF, DB seed | Mở `/parking/map` | Lưới 7 ô nhóm theo khu vực; chỉ hiện mã ô + trạng thái; đếm số ô theo trạng thái | Pass (JSDOM + integration) | Pass |
| T10-02 | STAFF | Chọn khu vực "B1-A", bấm chip "Có xe" | Chỉ còn A-03 | Pass (JSDOM) | Pass |
| T10-03 | MANAGER/STAFF | Bấm ô A-03 | Menu có "Xem thông tin xe" và "Đăng ký đỗ xe" (bị khóa, ghi lý do "đang có xe") | Pass (JSDOM) | Pass |
| T10-04 | MANAGER/STAFF | Menu → Xem thông tin xe ở A-03 | Biển số 51F67890, Mazda 3, khách hàng, SĐT, giờ vào 18/10/2026 08:00 | Pass (integration + JSDOM) | Pass |
| T10-05 | MANAGER | Xem thông tin xe ở B-03 (xe vãng lai) | Khách hàng hiển thị "Xe vãng lai" | Pass (integration + JSDOM) | Pass |
| T10-06 | MANAGER | Xem thông tin xe ở A-01 / A-02 | "Vị trí chưa có xe đang đỗ" / "đã được đăng ký nhưng xe chưa vào bãi" | Pass (integration: data null) | Pass |
| T10-07 | CUSTOMER | Mở `/parking/map`, bấm ô bất kỳ | Menu **không có** "Xem thông tin xe"; có danh sách "Xe của tôi" | Pass (e2e + JSDOM) | Pass |
| T10-08 | CUSTOMER | Gọi trực tiếp `GET /api/slots/3/vehicle` | 403 | Pass (e2e) | Pass |
| T10-09 | Chưa đăng nhập | Gọi `/api/slots` / mở `/parking/map` | 401 / chuyển đến `/login` | Pass (e2e) | Pass |
| T10-10 | STAFF | Ô A-01 → Đăng ký → tìm "43C" → chọn 43C33333 → Xác nhận | 201; biên nhận mã vé T-YYYYMMDD-xxxxx, giá 20.000 đ; A-01 chuyển "Đã đăng ký" | Pass (integration + JSDOM) | Pass |
| T10-11 | CUSTOMER có xe ô tô rảnh | Đăng ký ô trống | 201; biên nhận vị trí, mã vé, từ/đến ngày, giá 50.000 đ; bản đồ và "Xe của tôi" tự tải lại | Pass (integration + JSDOM) | Pass |
| T10-12 | CUSTOMER | Mở đăng ký khi xe đang giữ chỗ A-02 | Xe đó bị khóa, ghi "Đang giữ chỗ tại A-02" | Pass (JSDOM) | Pass |
| T10-13 | CUSTOMER | Gửi `vehicleId` của khách khác | 403, không ghi DB | Pass (integration) | Pass |
| T10-14 | MANAGER | Đăng ký ô RESERVED / OCCUPIED / MAINTENANCE | 409, không sinh vé | Pass (integration) | Pass |
| T10-15 | MANAGER | Đăng ký xe đang giữ ô khác | 409 nêu mã ô đang giữ | Pass (integration) | Pass |
| T10-16 | 2 người dùng | Cùng lúc đăng ký một ô | Đúng một 201, một 409; người 409 thấy nguyên message, modal vẫn mở | Pass (integration + JSDOM) | Pass |
| T10-17 | 2 người dùng | Cùng lúc đăng ký một xe vào hai ô | Đúng một 201, một 409 | Pass (integration) | Pass |
| T10-18 | Bất kỳ | POST đăng ký thiếu `X-CSRF-Token` | 403 | Pass (e2e) | Pass |
| T10-19 | MANAGER | Tắt MySQL rồi bấm Làm mới | Báo "Không tải được bản đồ…", không lộ lỗi SQL | Pass (unit 503 + JSDOM) | Pass |
| T10-20 | Bất kỳ | Bấm ngoài menu / nhấn Esc; để trang mở 30 giây | Menu đóng; bản đồ tự làm mới khi không có modal mở | | Chưa chạy |
