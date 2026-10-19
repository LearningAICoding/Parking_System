# Thiết kế Frontend - Quản lý Bãi đỗ xe

Toàn bộ tài sản thiết kế UI/UX cho Sprint 1. Thiết kế được sinh bằng **Stitch AI** theo bộ prompt trong `prompts/`, dùng chung một Design System "ParkCore Precision".

## Cấu trúc thư mục

```text
docs/design/
├── README.md            # File này - điểm vào
├── design-system.md     # Design System ParkCore Precision (màu, chữ, spacing, component)
├── design-notes.md      # Ghi chú thiết kế nội bộ + quyết định lệch thiết kế
├── figma-link.md        # Link Figma gốc + checklist trạng thái từng màn hình
├── prompts/
│   └── stitch-ai-prompts.md   # Prompt cho Stitch AI theo từng Task
├── screens/             # Mỗi màn hình 1 thư mục: code.html + screen.png
│   ├── task-01-login-forgot-password/
│   ├── task-02-home-dashboard/
│   ├── task-03-04-employees/
│   ├── task-05-06-07-customers/
│   ├── task-08-checkin-checkout/
│   ├── task-09-search-vehicle-modal/
│   ├── task-10-parking-map/
│   ├── task-11-12-tickets-sidebar/
│   ├── task-13-statistics/
│   └── task-14-15-16-slots/
└── components/          # Component dùng chung (header, footer, modal, sidebar...)
```

## Quy ước

**Mỗi màn hình là một thư mục** trong `screens/`, chứa:
- `screen.png` - ảnh thiết kế (bản gốc từ Stitch AI).
- `code.html` - HTML/CSS Stitch AI sinh ra (tham khảo, **không** dùng trực tiếp vì dự án render bằng EJS + Bootstrap 5).

**Đặt tên thư mục**: `task-<số>-<tên-kebab>` (ví dụ `task-08-checkin-checkout`). Nhiều Task chung một màn hình thì gộp: `task-03-04-employees`, `task-14-15-16-slots`.

**Trạng thái màn hình**: cập nhật checklist trong `figma-link.md`.

## Ranh giới prototype

`code.html` và `screen.png` chỉ là tài liệu tham khảo UI/UX. `code.html` dùng Tailwind và JavaScript mô phỏng, không phải ứng dụng chạy thật, không phải API contract và không được copy trực tiếp sang EJS. Quyết định nghiệp vụ, RBAC, state machine và API bắt buộc đọc từ `AGENTS.md`.

Prototype có thể chứa chi tiết minh họa ngoài Sprint 1 như RFID/ePass/VETC, barie, camera realtime, EV, IoT, thanh toán, xuất file, căn hộ hoặc vé tháng. Những chi tiết này phải được loại bỏ hoặc ghi rõ `OUT OF SCOPE` khi chuyển sang code thật. Không dùng dữ liệu hard-code trong prototype làm dữ liệu production.

## Quy ước chuyển sang code thật

Frontend thật dùng EJS + Bootstrap 5 + Vanilla JavaScript. Bản đồ chỉ hiển thị mã ô và trạng thái từ API, không hiển thị biển số/tên khách hàng trong lưới; CUSTOMER không được thấy menu xem thông tin xe. Task 8 chỉ scan/upload, thêm xe vãng lai qua modal, check-in và check-out. Thống kê chỉ có Theo ngày/Tháng/Năm và lấy KPI từ API.


Toàn bộ thiết kế dùng **ParkCore Precision** (xem `design-system.md`):
- **Màu chính**: Primary `#0066CC`, surface `#F8F9FA`, border `#E5E7EB`.
- **Trạng thái ô đỗ**: TRỐNG xanh `#28A745`, ĐÃ ĐỖ đỏ `#DC3545`, ĐẶT TRƯỚC vàng `#FFC107`, BẢO TRÌ xám `#6C757D`.
- **Font**: Inter (hỗ trợ dấu tiếng Việt); biển số dùng `code-mono` (JetBrains Mono).
- **Radius**: card 8px, input/badge 4px.
- **Layout**: sidebar 240px desktop, off-canvas drawer trên tablet/mobile.

## Dành cho thành viên

**Frontend dev**: đọc `AGENTS.md` trước, sau đó lấy `screen.png` của màn hình phụ trách, đối chiếu Design System, chuyển sang EJS + Bootstrap 5 theo `.claude/rules/ejs.md`. **Không** copy `code.html` nguyên bản (dùng Tailwind và chỉ là prototype).

**Backend dev**: xem `screen.png` để biết UI cần field/validate gì.

**QA**: dùng `screen.png` làm baseline test UI/UX.

**Sinh thêm màn hình mới**: dùng prompt tương ứng trong `prompts/stitch-ai-prompts.md`, export về `screens/task-XX-.../`.

## Lưu ý

- Không đặt ảnh biển số thật hoặc dữ liệu người dùng vào thư mục này.
- Thiết kế AI là bản *gần đúng* - team review và tinh chỉnh cho khớp brand và UX thực tế; ghi lý do lệch vào `design-notes.md`.
- Quy tắc giao diện chi tiết tại `.claude/rules/ejs.md`, còn nghiệp vụ và RBAC tại `AGENTS.md`.
