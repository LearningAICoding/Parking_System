# Sprint 1 Acceptance Traceability

Mỗi dòng là một tiêu chí bắt buộc phải có test trước khi triển khai task tương ứng.

| Task | Contract surface | Acceptance evidence |
|---:|---|---|
| 1 | Login, forgot/reset | auth service unit; rate-limit; token one-time/expiry; CSRF |
| 2 | `/`, `/news`, shared partials | role-specific home render; escaped dynamic content |
| 3-4 | employee list/create/edit/delete | MANAGER-only mutation; duplicate conflict; deletion blockers |
| 5-7 | customer/vehicle/profile | transaction create; ownership/IDOR; email sync; soft-delete |
| 8 | scan/check-in/check-out | upload MIME+magic bytes; OCR mock; token consume-once; state/fee/concurrency |
| 9 | vehicle search | keyword 1-50; LIKE escaping; max 20; visitor support |
| 10 | slots grid + vehicle detail | grid DTO excludes vehicle data; CUSTOMER detail gets 403 |
| 11-12 | ticket list/edit/delete | MANAGER edit/delete; STAFF read-only; used-ticket date guard |
| 13 | stats report | day/month/year boundaries in +07:00; zero-filled series; separate revenue |
| 14-16 | slot CRUD/detail | status transitions; RESERVED/OCCUPIED blockers; unique slotCode |

## Evidence format

Every endpoint test should assert:

1. HTTP status.
2. Envelope keys `success`, `message`, `data`, `errors`.
3. RBAC and CSRF behavior.
4. Allowed response fields (no sensitive/internal leakage).
5. Transaction rollback on the first failing invariant.

## Executable contract evidence

`tests/contracts/openapi.contract.test.js` thực thi các kiểm tra nền tảng trước khi có implementation:

- toàn bộ path/method trong Sprint 1 đều có operationId và summary;
- mutation có session + CSRF metadata;
- response JSON lõi trỏ tới schema riêng và schema compile được;
- DTO response không chứa field lưu trữ nhạy cảm;
- quyết định scan token, isolation/retry, timezone, unique và điều kiện chặn xóa khớp `AGENTS.md`.

Acceptance test nghiệp vụ HTTP/DB (RBAC, IDOR, concurrency, rollback, fee và upload magic bytes) sẽ chạy trên app implementation sau Task 1–16; contract test này cố ý không giả lập service chưa tồn tại.

## Definition of ready for AI coding

- Contract artifact reviewed against `AGENTS.md`.
- Each route has one positive and one negative RBAC test case.
- Each mutation has field-whitelist tests.
- Each state transition has valid, invalid and concurrent cases.
