---
trigger: always_on
description: "Quy tắc MySQL: pool, prepared statements, schema, transaction và truy vấn an toàn. Nghiệp vụ chỉ đọc từ AGENTS.md."
---

# Quy tắc Cơ sở dữ liệu MySQL

Đặt file này tại `.agents/rules/mysql.md`. Nghiệp vụ, state machine, API và RBAC chỉ đọc từ `AGENTS.md`; file này chỉ quy định cách hiện thực SQL.

## Kết nối và truy vấn an toàn

Dùng một pool duy nhất từ `mysql2/promise` với `waitForConnections: true`, `connectionLimit: 10`, `namedPlaceholders: false`, `charset: 'utf8mb4'`, `timezone: '+07:00'`. Dùng `pool.execute(sql, params)` với placeholder `?`; không nối chuỗi người dùng. LIMIT/OFFSET phải được ép số nguyên và giới hạn trước khi đưa vào SQL. LIKE phải escape `\\`, `%`, `_` trước khi bọc `%...%`.

Mọi bảng xóa mềm phải có `deleted_at IS NULL` trong danh sách/tìm kiếm. Liệt kê cột rõ ràng, không `SELECT *` trên users; không trả password hash, reset token hay secret.

## File database

- `database/schema.sql`: schema canonical, không DROP database/table.
- `database/init_schema.sql`: compatibility entry point không phá dữ liệu.
- `database/bootstrap-local.sql` và `database/bootstrap-test.sql`: tạo/chọn database rồi SOURCE schema.
- `database/reset-local.sql`: reset phá dữ liệu local/test, chỉ chạy có chủ ý.
- `database/seed.sql`: fixture local/test; chọn database trước khi SOURCE.
- `database/migrations/001-session-ticket-and-integrity.sql`: delta cho DB cũ.

## Transaction và khóa dòng

Bắt buộc transaction + `FOR UPDATE` cho đăng ký đỗ, check-in, check-out và xóa có ràng buộc. Thứ tự khóa cố định: `parking_slots` trước, `vehicles` tiếp theo, `customers`/`tickets` sau. Luôn rollback khi lỗi và release connection trong `finally`; không dùng pool khác trong transaction.

```js
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  // lock và kiểm tra invariant theo AGENTS.md
  await conn.commit();
} catch (error) {
  await conn.rollback();
  throw error;
} finally {
  conn.release();
}
```

Chi tiết bảng và constraint đọc `database/schema.sql`; chi tiết fee, ticket/session và API đọc `AGENTS.md` và `docs/contracts/api.md`.
