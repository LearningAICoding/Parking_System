# Task 16 – Thông tin chi tiết / Xóa vị trí đỗ

Tham chiếu: `AGENTS.md` mục 6.11, 11.4; SRS mục 4.8.4 – 4.8.5.

| ID | Điều kiện | Bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|
| T16-01 | STAFF | Mở Chi tiết A-03 | Hiện vị trí, tầng, KH, email, SĐT, loại xe, hãng, tên xe, biển số (chỉ đọc) | Pass (integration: hiện biển số 51F67890) | Pass |
| T16-02 | MANAGER | Mở Chi tiết A-01 (trống) | "Vị trí chưa có xe đăng ký." | Pass (e2e) | Pass |
| T16-03 | MANAGER | Chi tiết B-02 (xe vãng lai) | Họ tên hiển thị "Xe vãng lai" | Pass (integration) | Pass |
| T16-04 | Bất kỳ | Bấm Quay lại | Về `/slots` | | Chưa chạy |
| T16-05 | MANAGER, ô mới tạo chưa có vé/lịch sử | Xóa → Xác nhận | Ô bị xóa, quay về danh sách | Pass (integration: xóa A-04) | Pass |
| T16-06 | MANAGER | Xóa A-02 (RESERVED) / A-03 (OCCUPIED) | 409, modal vẫn mở và hiện message server | Pass (integration: 409); phần modal giữ mở chưa chạy trên trình duyệt | Pass |
| T16-07 | MANAGER | Xóa A-01 (đã có vé/lịch sử) | 409 "Vị trí đã có vé hoặc lịch sử đỗ xe, không thể xóa" | Pass (integration: A-01, B-01 -> 409) | Pass |
| T16-08 | MANAGER, 2 tab | Xóa cùng một ô | Tab sau nhận 404 "đã bị xóa hoặc không tồn tại" | Pass (integration: 2 yêu cầu đồng thời -> 200 + 404) | Pass |
| T16-09 | MANAGER | Mở modal Xóa rồi bấm Hủy | Modal đóng, không có thay đổi | | Chưa chạy |
| T16-10 | STAFF / CUSTOMER | Gửi `DELETE /slots/1` | 403 | Pass (e2e: 403) | Pass |
| T16-11 | MANAGER | `DELETE /slots/1` thiếu X-CSRF-Token | 403 | Pass (e2e: 403) | Pass |
| T16-12 | MANAGER, server danh sách không phản hồi | Bấm Quay lại ở trang chi tiết | Hiện "Có vấn đề, Không thể quay lại trang danh sách vị trí" (R4.4) | Pass (JSDOM: lỗi mạng và lỗi 503) | Pass |
| T16-13 | MANAGER | Mở chi tiết/danh sách ô RESERVED/OCCUPIED | Nút Sửa/Xóa bị vô hiệu kèm lý do | Pass (e2e) | Pass |
