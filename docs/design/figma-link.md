# Link Figma - Quản lý Bãi đỗ xe

> Cập nhật file này khi link thay đổi. Chỉ thành viên trong nhóm mới có quyền truy cập.

| Thông tin | Giá trị |
| :--- | :--- |
| Link project Figma | _(chưa có - cập nhật khi nhận được)_ |
| Nguồn thiết kế hiện tại | Stitch AI - Design System **ParkCore Precision** |
| Ngày tải thiết kế gần nhất | 2026-10-18 |
| Người phụ trách thiết kế | _(chưa có)_ |
| Phạm vi | Sprint 1 - 16 Task (`rule_common.md` mục 3.1) |

## Trạng thái thiết kế theo Task

| Task | Màn hình | Thư mục | Trạng thái |
| :-: | :--- | :--- | :--- |
| 1 | Đăng nhập; Quên mật khẩu | `screens/task-01-login-forgot-password/` | Đã có |
| 2 | Trang chủ; Danh sách tin tức; Header/Footer | `screens/task-02-home-dashboard/` | Đã có |
| 3, 4 | Danh sách / Thêm / Sửa nhân viên | `screens/task-03-04-employees/` | Đã có |
| 5, 6, 7 | Danh sách / Thêm / Sửa khách hàng; Thông tin xe; Modal thêm xe | `screens/task-05-06-07-customers/` | Đã có |
| 8 | Quản lý xe vào/ra (Scan biển số) | `screens/task-08-checkin-checkout/` | Đã có |
| 9 | Modal tìm xe | `screens/task-09-search-vehicle-modal/` | Đã có |
| 10 | Bản đồ vị trí bãi đỗ | `screens/task-10-parking-map/` | Đã có |
| 11, 12 | Danh sách / Sửa vé; Sidebar | `screens/task-11-12-tickets-sidebar/` | Đã có |
| 13 | Tổng hợp; Thống kê ngày/tháng/năm | `screens/task-13-statistics/` | Đã có |
| 14, 15, 16 | Danh sách / Thêm / Sửa / Chi tiết vị trí đỗ | `screens/task-14-15-16-slots/` | Đã có |

**Trạng thái**: `Đã có` = có `screen.png` + `code.html`; `Cần vẽ lại` = thiếu màn hình/trạng thái; `Chưa có` = chưa có file.

## Thiết kế bổ sung cần làm

| Hạng mục | Lý do | Trạng thái |
| :--- | :--- | :--- |
| Component riêng lẻ (Header, Footer, Confirmation Modal, Sidebar) | Tái sử dụng thay vì cắt từ màn hình | Chưa có - xem `components/` |
| Trạng thái lỗi Task 8 (`400`, `413`) | Test UI lỗi upload | Chưa có |
| Trạng thái rỗng (empty state) các danh sách | Test UX khi chưa có dữ liệu | Chưa có |
| Mobile/Responsive cho màn hình Task 8, 10 | Kiểm thử responsive | Chưa có |
