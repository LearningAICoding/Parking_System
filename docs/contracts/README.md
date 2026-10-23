# Contract package - Sprint 1

Đây là lớp artifact kiểm chứng được trước khi triển khai code. `AGENTS.md` vẫn là nguồn sự thật duy nhất; các file ở đây không được phép thay đổi nghiệp vụ độc lập.

## Thành phần

- `openapi.yaml`: hợp đồng machine-readable cho toàn bộ API JSON, route HTML, auth, CRUD, file plate và statistics.
- `schemas/*.response.json`: JSON Schema riêng cho từng response JSON thành công/lỗi; schema dùng `additionalProperties: false` ở các DTO nhạy cảm.
- `security-baseline.md`: quyết định session, CSRF, rate-limit, reset token, upload và timezone.
- `rbac-field-matrix.md`: ma trận quyền, field whitelist và các negative test bắt buộc.
- `acceptance-traceability.md`: ánh xạ 16 Task tới contract surface và evidence cần có.
- `../../tests/contracts/openapi.contract.test.js`: acceptance/contract test chạy được, kiểm tra coverage route, CSRF metadata, external schema và quyết định concurrency/security.

## Quy trình kiểm tra trước coding

1. Review diff của các artifact này đối chiếu trực tiếp với `AGENTS.md`.
2. Validate YAML/OpenAPI bằng `npm run contract:lint`.
3. Mỗi route implementation phải trỏ tới operation trong OpenAPI và có positive/negative test trong acceptance traceability.
4. Khi contract thay đổi, cập nhật `AGENTS.md` trước rồi cập nhật toàn bộ artifact và test liên quan.

## Lệnh CI

```bash
npm run lint
npm run contract:lint
npm run contract:test
npm test -- --runInBand
npm run ci
```

`npm run contract:lint` có thể in warning style của Redocly cho route form redirect; đó không phải lỗi schema. Kết quả hợp lệ phải kết thúc bằng `Woohoo! Your API description is valid.`.
