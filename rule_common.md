# Quy ước điều phối nhóm

`AGENTS.md` ở thư mục gốc là nguồn sự thật duy nhất về phạm vi Sprint 1, nghiệp vụ, API, state machine và RBAC. Không sao chép các nội dung đó sang file này. Khi thay đổi nghiệp vụ, sửa `AGENTS.md` trước rồi đồng bộ schema, contract, prototype và test liên quan.

## Tài liệu triển khai

Các rule triển khai nằm tại `.agents/rules/`:

- `nodejs.md`: phân tầng Express, xử lý lỗi và quy ước backend.
- `mysql.md`: pool, prepared statements, SQL an toàn và transaction.
- `ejs.md`: EJS, partials, frontend, CSRF/XSS.
- `security.md`: auth, session, RBAC, upload và validation.
- `testing.md`: tầng test và quality gate.

`docs/contracts/api.md` diễn giải request/response theo `AGENTS.md`, không phải nguồn sự thật thứ hai. `docs/design/` chỉ là prototype UI. Schema canonical nằm ở `database/schema.sql`; `database/reset-local.sql` mới được phép phá dữ liệu local/test; `database/seed.sql` tạo fixture.

## Quy trình trước khi code

Đọc `AGENTS.md`, xác nhận Task và dependency, sau đó đọc rule lớp liên quan. Nếu yêu cầu chưa được quy định hoặc muốn đổi A3–A8, sửa `AGENTS.md` trước và cập nhật contract/schema/seed/test tương ứng. Không tự thêm tính năng ngoài Sprint 1.

## Checklist code

- Controller mỏng; Service giữ nghiệp vụ, quyền sở hữu và transaction; Model chỉ SQL.
- Route có `requireAuth` và `authorizeRoles` đúng ma trận trong `AGENTS.md`.
- Mọi POST/PUT/PATCH/DELETE có CSRF.
- SQL dùng prepared statements; truy vấn bảng xóa mềm có `deleted_at IS NULL`.
- Dữ liệu EJS escape; không nhúng dữ liệu người dùng vào script.
- Ảnh biển số nằm ngoài `public/`; không trả secret, password hash hoặc stack trace.

## Checklist trước khi merge

```bash
npx eslint src/ tests/
npm test -- --runInBand
```

Cập nhật test hồi quy và blackbox tương ứng; không để `test.only` hoặc `test.skip`. Xem `AGENTS.md` và `.agents/rules/testing.md` để biết quality gate.
