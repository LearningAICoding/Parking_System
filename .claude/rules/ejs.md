---
trigger: always_on
description: "Quy tắc frontend/EJS: prototype chỉ tham khảo; partials, RBAC hiển thị, CSRF/XSS và contract UI phải theo AGENTS.md."
---

# Quy Tắc Giao Diện EJS & Frontend

Đặt file này tại `.claude/rules/ejs.md`. Phạm vi, API, state machine và RBAC chỉ đọc từ `AGENTS.md`; endpoint chi tiết đọc `docs/contracts/api.md`.

## Partials và bảo mật

Mọi trang include header/footer nội bộ. Sidebar render theo role nhưng không thay thế backend authorization. Modal tìm xe include một lần qua footer cho MANAGER/STAFF. Modal thêm xe nhận `data-customer-id` tùy chọn, gọi `POST /api/vehicles` và phát event `vehicle:created` theo contract.

Dữ liệu động dùng `<%= %>` hoặc `textContent`; `<%- %>` chỉ cho include nội bộ. Không nhúng JSON người dùng vào script. Header có CSRF meta; form có `_csrf`; fetch ghi dữ liệu dùng helper chung gửi `X-CSRF-Token`.

## Màn hình đặc thù

Task 8 chỉ có upload/preview, scan, kết quả năm field, tạo xe vãng lai qua modal, check-in và check-out. Không thêm tìm kiếm thủ công, RFID, barie, in vé hoặc telemetry ngoài contract.

Task 10 map chỉ hiển thị mã ô + zone + trạng thái từ `/api/slots`. Không render plate/customer trong grid. Menu xem xe chỉ render MANAGER/STAFF và gọi endpoint riêng; CUSTOMER chỉ đăng ký bằng vehicle thuộc session.

Task 13 chỉ có ba mode day/month/year, ngày bắt đầu không sau ngày kết thúc, KPI lấy từ API và tách ticket revenue/casual parking revenue.

Các nút xóa phải có confirmation modal. Server trả 409 thì modal giữ mở và hiển thị nguyên message, không chỉ toast thành công giả.

## Prototype

`docs/design/screens/*/code.html` dùng Tailwind/JS mô phỏng và không được copy trực tiếp sang EJS. Những chi tiết ngoài Sprint 1 như RFID/ePass/VETC, camera realtime, barie, EV, IoT, thanh toán, xuất file, dữ liệu căn hộ và vé tháng phải loại bỏ hoặc ghi rõ OUT OF SCOPE khi triển khai.