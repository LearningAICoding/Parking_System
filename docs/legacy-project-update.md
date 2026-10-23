# Quy trình cập nhật dự án cũ

Áp dụng khi đưa chuẩn Sprint 1 vào một checkout hoặc database đã có code/tùy biến/dữ liệu. `AGENTS.md` vẫn là nguồn sự thật duy nhất về nghiệp vụ; tài liệu này quy định cách nâng cấp và bảo toàn hiện trạng.

## 1. Ghi nhận hiện trạng

1. Ghi lại remote, branch, commit, Node.js, trạng thái working tree và schema/database version (`git remote -v`, `git status --short`, `git log -1`).
2. Liệt kê route, file tùy biến, biến môi trường, dịch vụ tích hợp, dữ liệu upload, migration đã áp dụng và test hiện có.
3. Không xóa thay đổi chưa commit, không reset/rewrite lịch sử Git, không ghi đè `.env` hoặc file tùy biến để làm checkout giống template.
4. Tạo branch cập nhật từ đúng branch đang chạy. Phân loại và giữ riêng thay đổi sẵn có trước khi stage/commit.
5. Backup code, database và storage/uploads; thử restore vào môi trường cách ly trước khi thay đổi dữ liệu cần giữ.

## 2. Chọn đường nâng cấp

- Cài mới: tạo database rỗng, chạy `database/schema.sql`; chỉ chạy `database/seed.sql` trên local/test.
- Database cũ chưa áp dụng migration 001: chạy preflight, thử trên clone, backup, sau đó chạy migration 001 rồi migration 002.
- Database đã áp dụng migration 001: không chạy lại migration 001; chạy migration 002 nếu chưa có `parking_scan_tokens`.
- Schema tùy biến hoặc không rõ lịch sử: dừng thao tác ghi, so sánh `information_schema` với schema canonical và tạo migration riêng sau khi xác minh delta.

`schema.sql` dành cho cài đặt mới; `CREATE TABLE IF NOT EXISTS` không chuyển đổi cấu trúc bảng cũ. Migration 001 không idempotent. Migration 002 tạo bảng token với `IF NOT EXISTS`. `reset-local.sql` và `seed.sql` có thao tác phá dữ liệu; tuyệt đối không chạy trên production hoặc database cần giữ.

## 3. Preflight database

Trên bản clone/backup đã restore:

1. Đối chiếu bảng, cột, index, foreign key và engine thật với `database/schema.sql` và từng migration chưa áp dụng.
2. Trước migration 001, kiểm tra `parking_sessions.vehicle_id`/`slot_id` không NULL, tham chiếu còn hợp lệ, trạng thái slot khớp `current_vehicle_id`, không có nhiều session mở cho cùng vehicle, và checkout/fee nhất quán.
3. Kiểm tra trùng username, email, biển số, `slot_code`, `ticket_code`, `current_vehicle_id`; kiểm tra các dữ liệu sẽ vi phạm CHECK/UNIQUE/FK mới.
4. Xác nhận MySQL 8.x, InnoDB, charset/collation và timezone phù hợp.
5. Lưu kết quả preflight, số dòng và lỗi cần xử lý. Không tự xóa dữ liệu legacy để migration chạy qua; data-fix cần migration riêng, backup và review.

## 4. Cập nhật code/config

1. Giao từng Task theo `AGENTS.md`; yêu cầu người/AI nhận việc đọc rule lớp liên quan trong `.agents/rules/` và nêu tác động tới route, schema, config, UI, test trước khi sửa.
2. Bảo toàn `.env` và secrets hiện hữu. Chỉ thêm biến mới có chủ đích từ `.env.example`; không đưa secrets, database dump hoặc ảnh biển số vào Git.
3. Nâng dependencies có lockfile, kiểm tra audit và test. Ưu tiên thay đổi nhỏ theo Task để dễ review và rollback.
4. Chuyển UI từng màn hình sang EJS/Bootstrap theo contract; không copy prototype Tailwind vào code thật hoặc mở rộng tính năng ngoài Sprint 1.
5. Sửa contract/schema/migration/test cùng một thay đổi khi behavior được duyệt thay đổi. Controller → Service → Model vẫn là phân tầng bắt buộc.

## 5. Kiểm tra, commit và phát hành

1. Chạy `npm ci`, `npm run lint`, `npm run contract:lint`, `npm run contract:test`, `npm test -- --runInBand`.
2. Chạy integration test chỉ trên `parking_test_db`; không dùng `parking_db` đang giữ dữ liệu.
3. Review `git diff`, danh sách staged và secret scan; xác nhận chỉ có file dự án được phép đưa lên remote.
4. Commit nhỏ theo Task, push branch và mở PR kèm schema version, preflight, backup/restore, migration order, test và rollback.
5. Chỉ chạy migration production theo lịch triển khai có người chịu trách nhiệm, backup đã thử restore và kế hoạch rollback.

## Checklist

- [ ] Branch/commit gốc và thay đổi chưa commit đã được ghi nhận, bảo toàn.
- [ ] Backup code, database và uploads đã được tạo và thử restore.
- [ ] Database được phân loại mới / trước migration 001 / sau migration 001 / tùy biến.
- [ ] Preflight đạt; migration đã chạy thử trên clone và đúng thứ tự.
- [ ] `.env`, secrets, dump và ảnh biển số không nằm trong staged files.
- [ ] CI và integration test dùng đúng test database.
- [ ] PR có kế hoạch triển khai, xác minh sau migration và rollback.
