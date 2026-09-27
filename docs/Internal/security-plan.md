# Security Plan — Japanese Learning Platform

## Xác thực & phân quyền

- JWT qua Spring Security, thời gian sống ngắn cho access token, dùng refresh token riêng để giảm rủi ro khi token bị lộ.
- Mật khẩu hash bằng BCrypt, không lưu plaintext dưới bất kỳ hình thức nào kể cả log.
- RBAC (ADMIN/USER) enforce ở tầng backend (service layer), không chỉ ẩn UI ở frontend — mọi endpoint admin phải tự kiểm tra role, không tin frontend đã ẩn nút.
- Đăng nhập sai nhiều lần liên tiếp: giới hạn số lần thử (rate limit theo tài khoản/IP) để chặn brute-force.

## Bảo vệ API

- Strict CORS: chỉ domain frontend chính thức được gọi API, không mở wildcard.
- Rate limiting cho các endpoint dễ bị spam: chấm điểm flashcard/quiz, cập nhật streak, nộp bài thi thử — tránh user (hoặc script) gian lận bằng cách gọi API liên tục.
- Validate toàn bộ input phía server, không tin bất kỳ giá trị nào tính sẵn từ client (đặc biệt điểm số, kết quả đúng/sai, streak) — mọi kết quả phải được backend tính lại hoặc đối chiếu, tránh user sửa request để gian lận leaderboard.
- Giới hạn kích thước payload (đặc biệt ảnh/canvas viết tay nếu có upload) để tránh DoS qua request nặng.

## Dữ liệu & lưu trữ

- Postgres: user ứng dụng chỉ có quyền tối thiểu cần thiết (không dùng superuser cho kết nối app).
- Backup tự động hàng ngày, mã hoá at-rest (mặc định của nhà cung cấp managed DB).
- Audit log riêng cho hành động của Admin (sửa/xoá nội dung, đổi role user khác) — ghi ai, khi nào, sửa gì, không chỉ log chung chung.
- Dữ liệu cá nhân thu thập tối thiểu: chỉ cần thiết cho việc học (tên/email, tiến độ học) — tránh thu thập thông tin không cần thiết về sinh viên.

## Frontend & bảo vệ người dùng

- Chống XSS: mọi nội dung do user nhập (nếu có phần bình luận/tên hiển thị leaderboard) phải được escape/sanitize trước khi render, không render HTML thô từ input user.
- HTTPS bắt buộc toàn bộ, HSTS bật để chặn downgrade về HTTP.
- Cookie/token phía frontend: ưu tiên `httpOnly` cho refresh token để giảm rủi ro bị đánh cắp qua XSS.

## Admin panel — rủi ro cao nhất cần siết chặt riêng

- Route admin tách biệt hoàn toàn về path và middleware kiểm tra quyền, test riêng case "user thường cố gọi API admin".
- Cân nhắc thêm xác thực 2 lớp (2FA) cho tài khoản admin vì đây là nơi có quyền sửa nội dung/tài khoản người khác.
- Không cho phép admin xoá cứng (hard delete) dữ liệu người dùng trực tiếp — ưu tiên soft delete để có thể khôi phục nếu thao tác nhầm hoặc bị lạm dụng.

## Quản lý dependency & lỗ hổng

- Bật cảnh báo tự động cho dependency có lỗ hổng (GitHub Dependabot hoặc tương đương) cho cả backend (Maven) và frontend (npm).
- Review và cập nhật dependency định kỳ, không để version cũ tồn đọng quá lâu, đặc biệt các thư viện liên quan auth/security.

## Trước khi public rộng

- Chạy quét bảo mật cơ bản (vd OWASP ZAP) nhắm vào các endpoint public trước khi launch chính thức, đặc biệt luồng đăng ký/đăng nhập và các API chấm điểm.
- Kiểm tra lại toàn bộ endpoint admin một lượt cuối để chắc chắn không có endpoint nào lọt ra ngoài kiểm soát RBAC.
- Diễn tập kịch bản lộ secret (vd JWT key) một lần: xác nhận có thể xoay key khẩn cấp không gây gián đoạn quá lâu cho user.

## Trách nhiệm liên tục sau launch

- Theo dõi log lỗi/đăng nhập bất thường định kỳ, không chỉ setup một lần rồi bỏ.
- Mỗi tính năng mới trước khi merge: tự hỏi "endpoint này có bị lạm dụng để gian lận điểm/streak không, có bị gọi bởi user không đúng role không" — đưa câu hỏi này vào checklist review của agent trong `agent-guidelines.md`.

## Trạng thái triển khai (cập nhật 27/09/2026)

| Hạng mục trong plan | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|
| Tách access/refresh token, TTL ngắn | Đã có | `JwtTokenProvider` (claim `token_type`), access 30 phút, refresh 7 ngày |
| BCrypt, không log mật khẩu | Đã có | `BCryptPasswordEncoder`; log không chứa mật khẩu/token |
| RBAC enforce ở backend (không tin UI) | Đã có | `SecurityConfig` (`/admin/**` = `ROLE_ADMIN`) + `@PreAuthorize` ở `AdminController`; test `SecurityRbacTest` (user thường → 403) |
| Rate limit chống brute-force đăng nhập | **Mới siết (27/09)** | `AuthController` + `RateLimiterService.isBlocked`: 5 lần SAI/15 phút theo tài khoản (đăng nhập đúng không bị tính), 100 lần/15 phút theo IP (rộng để không chặn oan cả lớp sau NAT); test `AuthRateLimitTest` |
| Rate limit chống spam chấm điểm/thi | Đã có | 60 req/phút cho quiz kana, 30 req/phút cho nộp bài thi (`ExamController`) |
| Strict CORS, không wildcard | Đã có | `CORS_ALLOWED_ORIGINS=https://heyganba.site,https://www.heyganba.site` |
| Validate input phía server, không tin điểm từ client | Đã có | Điểm/streak do backend tính lại (Kanji/Flashcard/Exam service); `@Valid` trên mọi request body |
| Giới hạn kích thước payload | **Mới siết (27/09)** | `MaxPayloadSizeFilter` (64KB, cấu hình `APP_MAX_REQUEST_BYTES`) → 413 `PAYLOAD_TOO_LARGE`, chặn cả body chunked không có `Content-Length`; test `PayloadSizeLimitTest` + `CappedServletInputStreamTest` |
| Postgres: không dùng superuser | Đã có | Role `heyganba_owner` trên Neon (không phải superuser). Role này là owner của database `heyganba` vì Flyway cần quyền DDL; app chỉ dùng đúng database này |
| Backup + mã hoá at-rest | Đã có (managed) | Neon PITR 6 giờ + `pg_dump` định kỳ lưu `backups/` (gitignore) |
| Audit log thao tác admin | Đã có | bảng `audit_logs` + `GET /admin/audit-logs` |
| Thu thập dữ liệu tối thiểu | Đã có | chỉ email, họ tên, mã lớp, tiến độ học |
| Chống XSS | Đã có + siết thêm | Không dùng `dangerouslySetInnerHTML`/`eval`; React escape mặc định; thêm `Content-Security-Policy` + `Permissions-Policy` ở `frontend/vercel.json` |
| HTTPS toàn bộ + HSTS | Đã có | HSTS ở cả backend (`SecurityConfig`) và frontend (`vercel.json`); cert Let's Encrypt qua Render (`api.heyganba.site`) và Vercel (`heyganba.site`) |
| Admin tách route + test "user thường gọi API admin" | Đã có | `/admin/**` chặn ở cả filter chain lẫn method security |
| Không hard delete dữ liệu người dùng | Đã có | Admin API chỉ có GET (không expose endpoint xoá); khoá tài khoản = `is_active=false` |
| Dependabot cho Maven + npm | **Mới thêm (27/09)** | `.github/dependabot.yml` (maven, npm, github-actions, docker), gom nhóm theo tuần |
| Refresh token trong cookie `httpOnly` | **Chưa làm — có lý do, xem bên dưới** | Xem "Quyết định hoãn: refresh token httpOnly" |
| 2FA cho admin | Chưa làm | Admin hiện chỉ có 1 tài khoản seed; nên làm cùng trang quản trị thật (Phase 5+) |
| OWASP ZAP trước khi public | Chưa chạy | Cần chạy trên staging; các case thủ công tương đương đã kiểm: RBAC 403, CORS chặn domain lạ, 429 brute-force, 413 payload |
| Diễn tập xoay `JWT_SECRET` | Chưa diễn tập | Cách làm: đổi env `JWT_SECRET` trên Render → mọi access/refresh token cũ vô hiệu (user phải đăng nhập lại), không cần đụng DB |
| Theo dõi log định kỳ | Một phần | Log Render + `GET /v1/logs` API; chưa có Sentry/alerting |

### Quyết định hoãn: refresh token trong cookie `httpOnly`

Plan ưu tiên cookie `httpOnly` cho refresh token. Hiện cả access + refresh token nằm trong `localStorage`
(`frontend/src/services/api.ts`). Lý do chưa đổi ngay:

1. **Rủi ro XSS hiện thấp và vừa được siết thêm**: mọi nội dung do user nhập (họ tên, mã lớp) đều render qua React
   (escape mặc định), không có `dangerouslySetInnerHTML`, và frontend vừa có CSP chặn script ngoài + chặn inline script.
2. **Cookie `SameSite` sẽ làm hỏng refresh ở preview**: cookie chỉ gửi khi request *same-site*. Production
   (`heyganba.site` → `api.heyganba.site`) là same-site, nhưng preview `*.vercel.app` → `api.heyganba.site` là
   **cross-site** → cookie `SameSite=Lax/Strict` không được gửi, user preview bị đăng xuất sau 30 phút.

**Khi nào làm:** khi có domain preview cùng site (`*.preview.heyganba.site` hoặc `develop.heyganba.site`),
chuyển `/auth/login|refresh` sang set cookie `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`, bỏ `refreshToken`
khỏi response body, và frontend đổi sang `credentials: 'include'`.

