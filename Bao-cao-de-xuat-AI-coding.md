# BÁO CÁO ĐỀ XUẤT SƯỜN AI CODING — HỆ THỐNG QUẢN LÝ BÃI ĐỖ XE (Sprint 1)

> Mục đích: trình trưởng nhóm thống nhất sườn AI coding trước khi bắt đầu coding.
> Căn cứ phân tích: `AGENTS.md` (v1.1, 18/10/2026), `rule_common.md`, `.claude/rules/*.md`, `docs/contracts/api.md`, `docs/design/*`, `database/*`, `Task.md`.
> Ngày lập: 19/10/2026 — Người lập: [điền tên] — Trạng thái: CHỜ DUYỆT

---

## 1. Tóm tắt đề xuất (1 trang cho trưởng nhóm)

1. Giữ nguyên `AGENTS.md` ở thư mục gốc làm nguồn sự thật duy nhất về nghiệp vụ, API, state machine, RBAC và quyết định A3–A7. Mọi thay đổi nghiệp vụ phải sửa `AGENTS.md` trước, rồi mới đồng bộ schema, contract, prototype và test.
2. AI coding làm việc theo phân tầng bắt buộc Controller → Service → Model, tuân 5 rule lớp trong `.claude/rules/`, không tự sáng tạo nghiệp vụ ngoài Sprint 1.
3. Mỗi Task chạy trên nhánh `feature/task-<số>-<tên-ngắn>`, đọc rule liên quan trước khi code, đóng Task bằng checklist lint + test + blackbox.
4. Cần trưởng nhóm chốt 6 mục tại Mục 8 trước khi cho AI sinh code hàng loạt (đặc biệt: pricing A4, vòng đời RESERVED A6, coverage gate, chiến lược OCR).

---

## 2. Hiện trạng dự án (kết quả khảo sát)

| Hạng mục | Hiện có | Nhận xét |
|---|---|---|
| Nguồn sự thật | `AGENTS.md` đầy đủ mục 0–10: stack, 16 Task, RBAC, A3–A7, 13 API, state machine, quality gate | Đã đủ để AI bám theo, không cần viết lại |
| Quy ước nhóm | `rule_common.md`: AGENTS là duy nhất, checklist Controller mỏng / CSRF / prepared statements / escape EJS | Trùng lặp một phần với AGENTS, nên giữ `rule_common.md` làm bản tóm tắt điều phối |
| Rule triển khai | `.claude/rules/nodejs.md, mysql.md, ejs.md, security.md, testing.md` | Chia đúng theo lớp, có trigger `always_on` và `glob`, AI dễ nạp theo Task |
| Contract API | `docs/contracts/api.md` diễn giải request/response, ghi rõ AGENTS thắng khi khác biệt | Tốt, frontend/backend/test dùng chung được |
| Prototype UI | `docs/design/screens/*` (10 thư mục, phủ 16 Task) + `design-system.md` ParkCore Precision + `design-notes.md` + `figma-link.md` | Chỉ tham khảo, dùng Tailwind mô phỏng; code thật phải chuyển sang Bootstrap 5 + EJS |
| Database | `schema.sql, seed.sql, reset-local.sql, init_schema.sql, bootstrap-*.sql, migrations/001-*.sql` | Schema canonical rõ, có migration delta ticket/session, có seed MANAGER/STAFF/CUSTOMER |
| Task list | `Task.md` liệt kê 16 màn hình; `AGENTS.md` mục 2 liệt kê Task + file chính + phụ thuộc | Task 1, 2, 12 là nền tảng phải làm trước |
| Còn thiếu (src chưa sinh) | Chưa có `package.json, src/, tests/, public/, storage/plates/, .env.example, eslint/jest config` | Đây chính là phần AI sẽ sinh theo sườn này |

Kết luận: dự án đã có khung quản trị rất chặt, thiếu duy nhất sườn sinh code + luồng AI. Báo cáo này lấp đúng chỗ thiếu đó.

---

## 3. Lý do lựa chọn (vì sao sườn này)

### 3.1. Ngăn xếp: Node.js LTS + Express + EJS + Bootstrap 5 + MySQL 8 (mysql2/promise, không ORM)

- Lý do 1 — Khớp năng lực nhóm và prototype: Stitch AI đã ra đủ màn hình, chỉ cần chuyển Tailwind → Bootstrap 5 + EJS, không phải học SPA framework mới.
- Lý do 2 — Kiểm soát SQL và transaction: bãi đỗ xe có nhiều invariant đồng thời (slot duy nhất, một xe một session mở, khóa slot trước vehicle sau). Dùng `mysql2/promise` + prepared statements + `SELECT ... FOR UPDATE` cho kiểm soát tường minh hơn ORM.
- Lý do 3 — Bảo mật session truyền thống: `express-session + bcrypt + helmet + rate-limit + CSRF` đã được quy định chi tiết trong `security.md`, phù hợp ứng dụng nội bộ vận hành.
- Lý do 4 — Chi phí test thấp: Jest + Supertest + Cheerio chạy được trên `parking_test_db` mà không cần hạ tầng trình duyệt.

Ngoài phạm vi Sprint 1 (đã chốt trong AGENTS): camera LPR realtime, RFID/ePass/VETC, cổng thanh toán, barie, sạc EV, IoT, xuất CAD/PDF/Excel, tạo vé thủ công. AI không được sinh các module này dù prototype có minh họa.

### 3.2. Kiến trúc: Controller mỏng → Service giữ nghiệp vụ → Model chỉ SQL

- Controller chỉ trích `params/query/body/file`, gọi Service, render EJS hoặc trả envelope JSON `{ success, message, data, errors }`.
- Service giữ toàn bộ kiểm tra: slot trống không, biển số trùng không, vé còn hiệu lực không, CUSTOMER có sở hữu xe không; quản lý transaction; ném `AppError(message, status)`.
- Model chỉ `pool.execute(sql, params)`, trả rows thô, không chứa if nghiệp vụ.
- Lợi ích khi AI coding: ranh giới file rõ nên chia Task không xung đột (Task 8 `parking.service.js`, Task 9 `vehicle-search.service.js`, Task 10 `parking-map.service.js`, Task 14–16 `slot.service.js`); review dễ vì lỗi nghiệp vụ luôn nằm ở Service.

### 3.3. Hệ rule: 1 nguồn sự thật + 5 rule lớp

- `AGENTS.md` quyết định cái gì được làm; `.claude/rules/*` quyết định làm như thế nào. Tách như vậy tránh AI tự bịa nghiệp vụ khi đọc rule kỹ thuật.
- `trigger: always_on` cho nodejs/mysql/ejs; `trigger: glob` cho security/testing để AI tự nạp khi chạm route, middleware, upload, tests. Không cần nhắc tay từng lần.
- Quy ước dữ liệu chung đã chốt giúp AI sinh nhất quán: ngày `dd/MM/yyyy`, API ISO +07:00, tiền `DECIMAL(12,2)`, SĐT `0xxxxxxxxx`, biển số `normalizePlate()` + regex `^[0-9A-Z]{6,10}$`, ảnh `/files/plates/<UUID>`.

### 3.4. Luồng Task-first + Blackbox trước code

- Mỗi Task có file chính, phụ thuộc và blackbox riêng (`tests/blackbox/task-<số>-<tên>.md`). Viết blackbox trước giúp AI có tiêu chí nghiệm thu trước khi sinh code, đúng tinh thần testing.md P1/P2.

---

## 4. Cấu trúc sườn đề xuất (AI sẽ sinh từ đây)

```text
parking-system/
├── AGENTS.md
├── rule_common.md
├── Task.md
├── .claude/rules/                  # giữ nguyên 5 file hiện có
├── docs/contracts/api.md           # giữ, AGENTS thắng khi lệch
├── docs/design/                    # giữ, chỉ tham khảo
├── .env.example                    # AI sinh (SESSION_SECRET, DB, SMTP)
├── package.json / package-lock.json
├── eslint.config.js / jest.config.js
├── src/
│   ├── app.js                      # export app (không listen)
│   ├── server.js                   # listen
│   ├── config/env.js, db.js, session.js, upload.js, mailer.js, pricing.js
│   ├── constants/roles.js, slot-status.js, ticket.js
│   ├── utils/app-error.js, async-handler.js, normalize-plate.js,
│   │        date-helper.js, ocr-plate-reader.js
│   ├── middlewares/auth, rbac, csrf, validate, error-handler, rate-limit
│   ├── controllers/ services/ models/   # theo module Task
│   ├── routes/*.routes.js
│   └── views/ + partials (header, footer, sidebar, modal tìm xe, modal xe)
├── public/css, js                  # không chứa ảnh biển số
├── storage/plates/                 # ngoài public, phục vụ qua /files/plates
├── database/                       # giữ nguyên, AI chỉ bổ sung seed nếu thiếu
└── tests/unit, integration, e2e, blackbox
```

Nguyên tắc đặt tên AI phải tuân: biến `camelCase`, lớp `PascalCase`, hằng `UPPER_SNAKE_CASE`, mọi file backend `kebab-case` + hậu tố `.controller/.service/.model/.routes/.middleware.js`.

Thứ tự sinh code đề xuất:

1. Nền tảng: `config, utils, middlewares, auth` (Task 1) → `home + partials` (Task 2) → `sidebar + tickets edit` (Task 12).
2. Vận hành: Task 3→4 (nhân viên), 5→6→7 (khách hàng/xe), 8 (scan/check-in/out), 9 (tìm xe), 10 (bản đồ).
3. Còn lại: 11 (vé), 13 (thống kê), 14→15→16 (vị trí đỗ).

---

## 5. Rule AI coding (bản rút gọn để dán vào prompt hệ thống)

AI phải đọc theo thứ tự: `AGENTS.md` → `Task` được giao + dependency → rule lớp liên quan → `api.md` + `screen.png` của Task đó.

| # | Rule | Nội dung bắt buộc |
|---|---|---|
| R1 | Không bịa nghiệp vụ | Chỉ làm đúng Sprint 1 và contract mục 6 AGENTS. Muốn đổi A3–A7 phải sửa AGENTS trước. Prototype ngoài phạm vi phải bỏ hoặc ghi OUT OF SCOPE |
| R2 | Phân tầng | Controller không SQL, không tính phí; Service giữ quyền sở hữu + transaction; Model chỉ SQL thô |
| R3 | Auth/RBAC 2 lớp | Mọi route gắn `requireAuth + authorizeRoles` đúng ma trận mục 4; ẩn menu không thay RBAC; CUSTOMER kiểm ownership trong Service; lỗi chuẩn 401/403/404/409/413 |
| R4 | CSRF + XSS + upload | Mọi POST/PUT/PATCH/DELETE có CSRF (`_csrf` hoặc `X-CSRF-Token`); EJS dùng `<%= %>` hoặc `textContent`; ảnh kiểm tra magic bytes, 5 MB, UUID, lưu ngoài public, phục vụ qua route có quyền |
| R5 | SQL an toàn | Một pool duy nhất, `pool.execute` + `?`, escape LIKE, `deleted_at IS NULL`, liệt kê cột, fee đọc từ `pricing.js`, thứ tự khóa slots→vehicles→customers/tickets, rollback + release |
| R6 | EJS/Bootstrap | Không copy Tailwind; map chỉ mã ô + trạng thái; CUSTOMER không thấy menu xem xe; Task 8 giữ đúng 6 id field; thống kê 3 mode day/month/year, tách 2 nguồn doanh thu |
| R7 | Test + lint | `npx eslint src/ tests/` sạch; integration `--runInBand`; coverage service ≥60%, 3 service trọng yếu ≥80%; không `test.only/skip`; mỗi bug có test hồi quy; blackbox 16 Task Pass/Fail |

Prompt mẫu giao cho AI mỗi Task:

```text
Đọc AGENTS.md, rule_common.md và rule lớp liên quan.
Nhận Task N, kiểm tra dependency và nhánh feature/task-N-<ten>.
Viết blackbox tests/blackbox/task-N-*.md trước.
Sinh code đúng file chính của Task, tuân R1–R7.
Chạy lint + test của Task, cập nhật blackbox Pass/Fail, mở PR.
```

---

## 6. Luồng hoạt động AI coding (từ giao Task đến merge)

```text
Trưởng nhóm chốt báo cáo này
  → Giao Task + dependency + screen.png
    → AI đọc AGENTS + rule lớp + api.md
      → Viết blackbox trước code
        → Sinh code trên nhánh feature/task-N-*
          → Tự chạy eslint + jest + coverage Task
            → Cập nhật blackbox + test hồi quy nếu fix bug
              → Mở PR → Review người (nghiệp vụ + RBAC + SQL)
                → Merge → Chuyển Task tiếp theo theo thứ tự mục 4
```

Checklist AI tự chạy trước khi xin review:

- [ ] Đúng file/hàm của Task, không lấn Task khác; Task nền 1/2/12 đã xanh.
- [ ] Route có `requireAuth/authorizeRoles`; CUSTOMER IDOR kiểm trong Service.
- [ ] CSRF đầy đủ; EJS escape; upload đúng magic bytes + UUID.
- [ ] SQL prepared, có `deleted_at IS NULL`, đúng thứ tự khóa + rollback.
- [ ] `npx eslint src/ tests/` sạch; `npm test -- --runInBand` xanh; coverage đạt gate.
- [ ] Blackbox Task cập nhật Pass/Fail; không còn `test.only/skip`.

Checklist người review (trưởng nhóm/QA):

- [ ] Đối chiếu AGENTS mục 4/6/7, không phát sinh tính năng ngoài Sprint 1.
- [ ] Chạy thử RBAC matrix + concurrency register (2 request cùng ô → 1×201 + 1×409).
- [ ] Kiểm tra thống kê biên ngày và tách doanh thu vé / doanh thu lẻ.
- [ ] Duyệt lệch thiết kế vào `design-notes.md` nếu có.

---

## 7. Ma trận kiểm thử tối thiểu AI phải sinh (trích testing.md)

- Scan biển số Task 8: xe tồn tại đủ 5 field, xe chưa tồn tại `exists:false`, thiếu vị trí/khách → null, file sai/OCR mờ → 400.
- Tìm xe Task 9: LIKE theo tên/SĐT/biển số (chịu `- .` space), escape `%_`, tối đa 20, rỗng/dài → 400.
- Bản đồ Task 10: xem xe MANAGER/STAFF 200, CUSTOMER 403, chưa login 401; register 201 khi AVAILABLE, 409 khi RESERVED/OCCUPIED/MAINTENANCE; CUSTOMER dùng xe người khác 403.
- Auth Task 1: sai pass báo chung, `is_active=0` từ chối, regenerate session, logout destroy, rate-limit 429, token reset 15 phút + một lần.
- Upload: quá 5 MB → 413 `Ảnh vượt quá 5 MB`; sai MIME/magic bytes → 400; UUID không `originalname`; route ảnh sai role → 403/404.
- Xóa có ràng buộc + thống kê biên 23:59/00:00 + khoảng `from<=to` ≤366 ngày.

Quality gate đóng Sprint: lint sạch, coverage như R7, SonarQube không Blocker/Critical (nếu giữ bước review), đủ blackbox 16 Task.

---

## 8. Mục cần trưởng nhóm quyết định (chưa code khi chưa chốt)

| # | Nội dung | Đề xuất của nhóm soạn | Ô duyệt |
|---|---|---|---|
| Q1 | Giữ `AGENTS.md` là nguồn duy nhất, `api.md` chỉ diễn giải | Đồng ý | [ ] Đồng ý / [ ] Sửa: ___ |
| Q2 | Công thức phí A4 tạm thời trong `pricing.js`, tối thiểu 1 giờ | Giữ để build Sprint 1, thay sau bằng cấu hình thật | [ ] Đồng ý / [ ] Sửa: ___ |
| Q3 | RESERVED không hết hạn/không hủy (A6) | Giữ, không thêm cron/nút hủy trong Sprint 1 | [ ] Đồng ý / [ ] Sửa: ___ |
| Q4 | OCR biển số: dùng adapter mock `ocr-plate-reader.js` trong Sprint 1 | Mock để test ổn định, tích hợp OCR thật ở Sprint sau | [ ] Đồng ý / [ ] Chọn OCR thật: ___ |
| Q5 | Coverage gate 60% service / 80% ba service trọng yếu; SonarQube có bắt buộc | Bắt buộc lint + coverage; SonarQube khuyến nghị | [ ] Đồng ý / [ ] Sửa: ___ |
| Q6 | Thứ tự làm Task 1, 2, 12 trước; nhánh `feature/task-N-*` | Đồng ý | [ ] Đồng ý / [ ] Sửa: ___ |

Sau khi duyệt, điền người duyệt + ngày vào đây: Người duyệt: ___ Ngày: ___ Chữ ký: ___

---

## Phụ lục A — Ranh giới Sprint 1 nhắc AI mỗi lần sinh code

Không sinh: LPR realtime, RFID/ePass/VETC, thanh toán ngân hàng, barie, EV, IoT, xuất CAD/PDF/Excel, tạo vé thủ công, tự đăng ký CUSTOMER, tự hủy RESERVED, hard-code giá trong Service, render plate/customer trong lưới map, tìm kiếm thủ công trong Task 8.

## Phụ lục B — Tài liệu AI phải đọc theo vai trò

- Frontend: AGENTS + `screen.png` Task mình + design-system + `ejs.md` + `api.md`.
- Backend: AGENTS + `nodejs.md` + `mysql.md` + `security.md` + `api.md` + `schema.sql`.
- QA: AGENTS + `testing.md` + blackbox Task + `api.md`.

---

*Hết báo cáo. Sau khi trưởng nhóm tích duyệt Q1–Q6, nhóm bắt đầu Sprint 1 từ Task 1 theo luồng Mục 6.*
