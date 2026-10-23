# Test database fixture strategy

Integration tests chỉ được chạy trên `parking_test_db`, không dùng `parking_db`.

1. Tạo schema một lần: chạy `database/bootstrap-test.sql` trong MySQL client.
2. Trước mỗi suite integration, chạy `database/seed.sql` trên connection test trong transaction/setup hook. Seed có ID và thời gian cố định, nên suite có thể chạy lặp lại.
3. Test cần dữ liệu khác dùng fixture factory trong `tests/fixtures` và rollback transaction sau test; không sửa `database/seed.sql` cho một case riêng.
4. `database/reset-local.sql` là thao tác phá dữ liệu có chủ ý, chỉ dùng khi cần dựng lại local/test; sau đó chạy lại `database/schema.sql` và `database/seed.sql`.

Các test concurrency phải mở hai connection từ cùng test pool, chạy isolation `READ COMMITTED`, và chờ cả hai promise trước khi assert đúng một request đăng ký thành công.
