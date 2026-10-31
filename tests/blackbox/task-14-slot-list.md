# Task 14 – Danh sách vị trí trong bãi xe

Tham chiếu: `AGENTS.md` mục 4, 6.13; SRS mục 4.8.1. "Tầng" trên SRS ánh xạ vào trường `zone` (Khu vực / Tầng).

| ID | Điều kiện | Bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Pass/Fail |
|---|---|---|---|---|---|
| T14-01 | Đăng nhập MANAGER, DB có seed | Mở `/slots` | Bảng hiện Vị trí, Khu vực/Tầng, Trạng thái; mỗi dòng có Sửa / Xóa / Chi tiết; có nút Thêm | Pass (integration: 7 dòng, đủ Sửa/Xóa/Chi tiết, nút Thêm) | Pass |
| T14-02 | Đăng nhập MANAGER | Chọn "B1-B" ở dropdown Khu vực / Tầng | Tự lọc, chỉ còn A-04, B-01 | Pass (integration: lọc B1-B còn A-04, B-01) | Pass |
| T14-03 | Đăng nhập STAFF | Mở `/slots` | Chỉ có link Chi tiết, không có Thêm/Sửa/Xóa | Pass (e2e) | Pass |
| T14-04 | Đăng nhập CUSTOMER | Mở `/slots` | Trang 403 | Pass (e2e: 403) | Pass |
| T14-05 | Chưa đăng nhập | Mở `/slots` | Chuyển đến `/login?next=%2Fslots` | Pass (e2e: redirect) | Pass |
| T14-06 | MANAGER, tắt MySQL | Mở `/slots` | Thông báo "Không kết nối được cơ sở dữ liệu…", không lộ lỗi SQL | Pass (unit+e2e: 503, message tiếng Việt) | Pass |
| T14-07 | MANAGER | Bấm Thêm | Chuyển sang `/slots/create` | Pass (e2e: href /slots/create) | Pass |
| T14-08 | STAFF/MANAGER | Gõ "a-0" vào ô Tìm mã vị trí; bấm chip trạng thái | Chỉ còn vị trí khớp; có số lượng theo trạng thái; không khớp thì báo "Không có vị trí phù hợp" | Pass (JSDOM) | Pass |
| T14-09 | MANAGER | Thêm/sửa xong quay về danh sách | Về đúng khu vực của vị trí, dòng vừa thao tác được tô sáng | Pass (e2e + integration) | Pass |
