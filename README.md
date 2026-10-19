# Hướng dẫn làm việc nhóm

`AGENTS.md` ở thư mục gốc là nguồn sự thật duy nhất về nghiệp vụ của dự án. Hãy đọc file đó trước khi nhận Task. Các rule triển khai nằm trong `.claude/rules/`; `docs/design/` chỉ là tài liệu tham khảo UI.

## Cài đặt môi trường sau khi source được tạo

```bash
npm install
cp .env.example .env
npm run lint
npm test
```

Không dùng tài khoản seed trong production. Fixture mặc định dùng username `manager.seed`, `staff.seed`, `customer.one`, `customer.two`; mật khẩu local/test là `Password123!`. Sau khi tạo database, chạy `database/schema.sql` rồi `database/seed.sql` trên database đã chọn.

## Cách làm việc

Mỗi Task dùng nhánh `feature/task-<số>-<tên-ngắn>`. Đọc `AGENTS.md` và rule liên quan trước khi code. Khi muốn đổi quyết định A3–A7 hoặc thêm nghiệp vụ, sửa `AGENTS.md` trước rồi cập nhật contract, schema, seed, prototype và test liên quan.

Phân tầng bắt buộc là Controller → Service → Model. Route phải kiểm tra xác thực/phân quyền ở backend; ẩn menu trên EJS không thay thế RBAC. Mọi thao tác ghi dữ liệu phải có CSRF. Dữ liệu động phải escape; ảnh biển số nằm ngoài `public/`.

## Thiết kế UI

Các file `docs/design/screens/*/code.html` là prototype Stitch AI dùng Tailwind, không dùng trực tiếp. Code thật dùng Bootstrap 5 và tuân theo `.claude/rules/ejs.md`. Prototype không phải API contract và không được dùng để mở rộng Sprint 1 sang các tính năng ngoài `AGENTS.md`.

## Kiểm tra trước khi merge

```bash
npx eslint src/ tests/
npm test -- --runInBand
```

Cập nhật test hồi quy và blackbox tương ứng; không để `test.only` hoặc `test.skip`. Xem `.claude/rules/testing.md` để biết coverage và scenario bắt buộc.
