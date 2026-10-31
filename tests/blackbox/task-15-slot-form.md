# Task 15 – Thêm mới / Sửa thông tin vị trí đỗ

Tham chiếu: `AGENTS.md` mục 6.14, 7.2, 11.2; SRS mục 4.8.2 – 4.8.3.

| ID | Điều kiện | Bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|
| T15-01 | MANAGER | Thêm `c-01`, zone `B2`, Trống | Lưu mã `C-01`, quay về danh sách, hiện thông báo thành công | Pass (integration: lưu C-01) | Pass |
| T15-02 | MANAGER | Thêm với mã rỗng / `A_01` / > 20 ký tự | 400, lỗi hiển thị dưới trường Mã vị trí, giữ dữ liệu đã nhập | Pass (unit: 400 theo trường; e2e: giữ dữ liệu) | Pass |
| T15-03 | MANAGER | Thêm với zone rỗng | 400, lỗi tại Khu vực / Tầng | Pass (unit) | Pass |
| T15-04 | MANAGER | Thêm mã `A-01` (đã có) | 409 "Mã vị trí đã tồn tại" | Pass (integration: 409, không thêm bản ghi) | Pass |
| T15-05 | MANAGER, tắt MySQL | Bấm Thêm | 503, form giữ dữ liệu, báo lỗi kết nối | Pass (unit: 503) | Pass |
| T15-06 | MANAGER | Mở Sửa A-01 | Mã vị trí chỉ đọc; có nút Lưu và Hủy | Pass (e2e) | Pass |
| T15-07 | MANAGER | Sửa A-01 sang Bảo trì, bấm Lưu | Quay về danh sách đã cập nhật | Pass (integration) | Pass |
| T15-08 | MANAGER | Sửa A-03 (OCCUPIED) | 409 "Vị trí đang được sử dụng, không thể cập nhật" | Pass (integration: 409, dữ liệu giữ nguyên) | Pass |
| T15-09 | MANAGER, 2 tab | Cùng lúc sửa/xóa một ô | Một thao tác thành công, thao tác còn lại 404/409 kèm thông báo | Pass (integration: sửa + xóa đồng thời nhất quán) | Pass |
| T15-10 | MANAGER | Bấm Hủy trên form sửa | Quay về danh sách, không lưu thay đổi | | Chưa chạy |
| T15-11 | STAFF | Mở `/slots/create` hoặc POST trực tiếp | 403 | Pass (e2e: 403) | Pass |
| T15-12 | MANAGER | POST thiếu `_csrf` | 403 | Pass (e2e: 403) | Pass |
| T15-13 | MANAGER | Nhập mã "a 01", bỏ trống khu vực, bấm Thêm | Mã tự thành "A01"; form không gửi, báo lỗi ngay dưới Khu vực / Tầng | Pass (JSDOM) | Pass |
| T15-14 | MANAGER | Mở form sửa ô OCCUPIED | Có cảnh báo, các trường và nút Lưu bị khóa | Pass (e2e) | Pass |
| T15-15 | MANAGER | Sửa vài trường rồi bấm Hủy | Hỏi xác nhận trước khi bỏ thay đổi | | Chưa chạy |
