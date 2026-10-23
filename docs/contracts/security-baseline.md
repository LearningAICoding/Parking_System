# Sprint 1 security baseline

Đây là bản triển khai của mục 11 trong `AGENTS.md`; nếu có khác biệt, `AGENTS.md` thắng.

| Area | Decision |
|---|---|
| Session | MySQL store ở production; MemoryStore chỉ test; cookie `httpOnly`, `sameSite=lax`, `secure=true`, TTL 8 giờ; regenerate sau login/đổi quyền, destroy khi logout |
| CSRF | Token random theo session, rotate sau login/logout; header `X-CSRF-Token` hoặc hidden `_csrf` bắt buộc cho mutation |
| Login limit | 5 lần/15 phút theo IP + username |
| Forgot-password limit | 3 lần/giờ theo IP + email; response không tiết lộ email tồn tại |
| Reset token | Random 32 byte, chỉ lưu SHA-256, TTL 30 phút, consume một lần |
| Password | Tối thiểu 12 ký tự, có hoa/thường/số; bcrypt cost 12 |
| Upload | 5 MiB, một field `plateImage`; JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF` + `WEBP`; UUID ngoài `public/` |
| Audit | Structured JSON cho auth, reset, CRUD và state transition; không ghi password/token bản rõ/ảnh biển số |
| Timezone | Node `Asia/Ho_Chi_Minh`, MySQL `+07:00`, thống kê dùng khoảng nửa mở theo ngày địa phương |

`tests/contracts/openapi.contract.test.js` kiểm tra các quyết định này không bị lệch khỏi contract.
