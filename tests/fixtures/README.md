# Test database fixture strategy

Integration tests chỉ được chạy trên `parking_test_db`, không dùng `parking_db`.

1. Tạo schema một lần: chạy `database/bootstrap-test.sql` trong MySQL client.
2. Trước mỗi suite integration, chạy `database/seed.sql` trên connection test trong transaction/setup hook. Seed có ID và thời gian cố định, nên suite có thể chạy lặp lại.
3. Test cần dữ liệu khác dùng fixture factory trong `tests/fixtures` và rollback transaction sau test; không sửa `database/seed.sql` cho một case riêng.
4. `database/reset-local.sql` là thao tác phá dữ liệu có chủ ý, chỉ dùng khi cần dựng lại local/test; sau đó chạy lại `database/schema.sql` và `database/seed.sql`.

Các test concurrency phải mở hai connection từ cùng test pool, chạy isolation `READ COMMITTED`, và chờ cả hai promise trước khi assert đúng một request đăng ký thành công.

## Chạy integration test

`npm test` không chạy `tests/integration/`. Khi đã có `parking_test_db` (schema + seed), chạy với biến môi trường DB trỏ tới DB test:

```bash
DB_HOST=127.0.0.1 DB_PORT=3307 DB_USER=root DB_PASSWORD=<mật khẩu DB test> DB_NAME=parking_test_db npm run test:integration
```

Suite tự từ chối chạy nếu `DB_NAME` khác `parking_test_db` và nạp lại `database/seed.sql` trước mỗi test.
