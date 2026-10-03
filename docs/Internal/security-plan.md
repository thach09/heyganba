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
| Hàng đợi duyệt "cần kiểm" (`needs_human_check`) | **Mới (27/09)** | `GET /admin/review-queue` (chỉ ADMIN): item AI soạn mà CHƯA đối chiếu được nguồn được xếp LÊN ĐẦU kèm lý do; `/content/review-status` trả thêm `totalNeedsHumanCheck`; test `AdminReviewQueueApiTest` (5 case) |
| Audio TTS qua server (`/audio/tts`) | **Mới (27/09)** | Yêu cầu đăng nhập (không nằm trong danh sách permitAll), rate limit 120 req/phút/user, chỉ nhận chuỗi kana/kanji ≤ 64 ký tự, **cache bắt buộc** (`tts_audio`) để không lạm dụng endpoint Google không chính thức; test `TtsAudioServiceTest` |
| Thu thập dữ liệu tối thiểu | Đã có | chỉ email, họ tên, mã lớp, tiến độ học |
| Chống XSS | Đã có + siết thêm | Không dùng `dangerouslySetInnerHTML`/`eval`; React escape mặc định; thêm `Content-Security-Policy` + `Permissions-Policy` ở `frontend/vercel.json` |
| HTTPS toàn bộ + HSTS | Đã có | HSTS ở cả backend (`SecurityConfig`) và frontend (`vercel.json`); cert Let's Encrypt qua Render (`api.heyganba.site`) và Vercel (`heyganba.site`) |
| Admin tách route + test "user thường gọi API admin" | Đã có | `/admin/**` chặn ở cả filter chain lẫn method security |
| Không hard delete dữ liệu người dùng | Đã có | Admin API chỉ có GET (không expose endpoint xoá); khoá tài khoản = `is_active=false` |
| Dependabot cho Maven + npm | **Mới thêm (27/09)** | `.github/dependabot.yml` (maven, npm, github-actions, docker), gom nhóm theo tuần |
| Refresh token trong cookie `httpOnly` | **Chưa làm — có lý do, xem bên dưới** | Xem "Quyết định hoãn: refresh token httpOnly" |
| 2FA cho admin | Chưa làm | Admin hiện chỉ có 1 tài khoản seed; nên làm cùng trang quản trị thật (Phase 5+) |
| Nội dung chờ duyệt không rò rỉ ra ngoài | **Đã siết & verify (02/10)** | `ContentAccess`: user không phải ADMIN chỉ nhận nội dung `APPROVED` (kana/kanji/grammar/flashcard/đề thi); `/content/review-status` chỉ ADMIN; test `ContentReviewVisibilityTest` (7 case); đã verify thực tế trên cả Prod (403) và Staging (403 sau khi deploy commit `5c720b8`) |
| OWASP ZAP trước khi public | **Đã chạy baseline (02/10/2026)** | Đã chạy baseline scan trên staging qua Docker `ghcr.io/zaproxy/zaproxy:stable`, kết quả: **62 PASS, 0 FAIL**, 5 warnings nhỏ trên trang 404; báo cáo chi tiết lưu tại `docs/Internal/security-scan-staging.html`. Sẽ chạy scan lại lần cuối trước public launch |
| Diễn tập xoay `JWT_SECRET` | Chưa diễn tập | Cách làm: đổi env `JWT_SECRET` trên Render → mọi access/refresh token cũ vô hiệu (user phải đăng nhập lại), không cần đụng DB |
| Health endpoint trung thực (không báo động giả) | **Đã sửa + deploy (27/09)** | Trước đó `/actuator/health` luôn trả 503 vì `RedisHealthIndicator` (không có Redis ở prod) dù app khoẻ; đã tắt chỉ số này (`management.health.redis.enabled=false`), đã deploy production 10:54:05Z → 200 UP; test `SecurityHardeningTest#actuatorHealth_IsUpWithoutRedis` |
| Theo dõi log định kỳ | Một phần | Log Render + `GET /v1/logs` API; chưa có Sentry/alerting |
| Khắc phục rò rỉ key terminal buffer | **Đã xử lý (02/10/2026)** | Thach đã revoke API key Render cũ và tạo key mới trên Render Dashboard |
| Cơ chế thu hồi token (logout / đổi mật khẩu) | **Đã triển khai (02/10/2026)** | Bảng `revoked_tokens` + `POST /auth/logout` + `JwtAuthenticationFilter` chặn 401; test `SecurityHardeningTest` (2 case); FE xoá localStorage sau khi BE thành công |


### Master test 20 điểm bảo mật (chạy thật trên production 27/09/2026)

Cách chạy: script PowerShell dùng `curl.exe` bắn trực tiếp vào `https://api.heyganba.site/api/v1` + truy vấn SQL qua
Neon HTTP endpoint, rồi tự tạo/xoá 2 tài khoản `@heyganba.test` để thử IDOR/leo quyền (dọn sạch sau khi test, 0 dòng mồ côi).
Vòng 1: **58 PASS / 7 FAIL**. Soi kỹ 7 FAIL: **1 bug thật** (đã sửa + có test hồi quy) và **6 case do kỳ vọng của test sai**
(không phải lỗ hổng). Vòng 2 bắn lại các case đó với **token + body hợp lệ**: **14/14 PASS**; bộ test backend
`mvn -B verify` cũng xanh với **121 test** (thêm 6 test hồi quy cho đúng các mục trong bảng dưới).

| # | Mục kiểm tra | Kết quả đo được trên production | Kết luận |
|---|---|---|---|
| 1 | Hash password (Argon2/bcrypt) | `password_hash` = `$2a$10$` (BCrypt, 60 ký tự); đăng ký trùng email → 400; response login và `/users/me` không có `passwordHash` | Đạt |
| 2 | Rate limit login | 5 lần sai → lần 6 trả **429**; thông báo lỗi giống nhau cho email tồn tại và không tồn tại → không liệt kê tài khoản | Đạt |
| 3 | Session phải hết hạn | Access token TTL 30 phút, refresh 7 ngày; token hết hạn/bị sửa chữ ký → 401; refresh token không dùng được như access token (401); access token không dùng được ở `/auth/refresh` (400) | Đạt |
| 4 | Xoá debug log thừa | Không có `console.log`/`System.out.println`/`printStackTrace` trong mã chạy thật; chỉ log `debug` cho JWT | Đạt |
| 5 | Secret không ở frontend | Bundle JS production không chứa `npg_`/`rnd_`/`napi_`/`postgresql://`/`JWT_SECRET`/mật khẩu admin; repo không commit `.env`/secret (chỉ có file mẫu) | Đạt |
| 6 | Không show lỗi chi tiết | JSON hỏng → 400, endpoint lạ → 404 (401 khi ẩn danh), body lỗi không có tên class/stack trace; `/actuator/env` không public (401 ẩn danh, 404 khi đã đăng nhập) | Đạt |
| 7 | Giới hạn loại file upload | **Không tồn tại endpoint upload file nào** (mọi path upload → 404) → không có bề mặt tấn công upload | N/A (đã kiểm chứng) |
| 8 | Giới hạn dung lượng file | Body 100KB (trần 64KB) → **413** `PAYLOAD_TOO_LARGE`; chặn cả body chunked | Đạt |
| 9 | Validate lại ở server | Email sai + password ngắn → 400 kèm chi tiết từng field; thiếu field quiz check → 400; ẩn danh gọi `/kana` → 401 | Đạt |
| 10 | Đổi `/user/123` → `/user/124` (IDOR) | Không có endpoint `/users/{id}` (chỉ `/users/me`); đề thi/kết quả của user khác → **404** (`findByIdAndUserId`) | Đạt |
| 11 | Vào admin bằng user thường | `/admin/status`, `/admin/users`, `/admin/audit-logs`, `/content/review-status` → **403** với token user thường; ẩn danh → 401 | Đạt |
| 12 | Query DB parameterized | Toàn bộ repository dùng JPA derived query/named parameter; SQLi ở query param (`classCode`) không gây 500/lộ dữ liệu, ở param enum → 400 | Đạt |
| 13 | Bắt buộc HTTPS | `http://api.heyganba.site` → **301**, `http://heyganba.site` → **308** | Đạt |
| 14 | Security headers | API: HSTS `max-age=31536000`, `nosniff`, `X-Frame-Options: DENY`. Web: CSP (`frame-ancestors 'none'`, `object-src 'none'`, không inline script), `Referrer-Policy`, `Permissions-Policy`, HSTS | Đạt |
| 15 | Cookie HttpOnly+Secure+SameSite | App **không set cookie nào** (token nằm `localStorage`) → không có cookie thiếu cờ; đánh đổi đã ghi nhận ở mục "Quyết định hoãn: refresh token trong cookie httpOnly" | Đạt một phần (nợ đã ghi) |
| 16 | CORS chỉ domain cần thiết | Origin lạ (`evil-attacker.example`) **không** được cấp `Access-Control-Allow-Origin`; origin chính thức được cấp; không dùng wildcard | Đạt |
| 17 | DB không mở public nếu không cần | Neon bắt buộc TLS (`sslmode=require&channel_binding=require`) nhưng endpoint **có** truy cập từ Internet (đặc thù Neon serverless, không có IP allowlist) | Rủi ro chấp nhận (xem dưới) |
| 18 | DB user chỉ cấp đúng quyền cần dùng | App dùng `heyganba_owner` (không phải superuser) nhưng role này **có** `BYPASSRLS` + `CREATEDB` (Neon cấp cho owner) — cần cho Flyway DDL | Rủi ro chấp nhận (xem dưới) |
| 19 | Đưa web qua Cloudflare | `api.heyganba.site` **đã** đi qua Cloudflare (Render edge: `origin.onrender.com.cdn.cloudflare.net`); `heyganba.site` (Vercel) chưa | Một phần |
| 20 | Backup + theo dõi lỗi | Neon PITR ~6 giờ (project `cinevora`, region aws-ap-southeast-1) + `pg_dump` định kỳ; log Render + `audit_logs`; chưa có Sentry/alerting | Đạt một phần |

#### Bug thật đã tìm ra & đã sửa: `/actuator/health` luôn trả 503 (báo động giả)

- **Hiện tượng**: `GET /api/v1/actuator/health` trả **503** `{"status":"DOWN"}` trong khi API hoạt động bình thường và
  `GET /api/v1/health` (endpoint tự viết, cũng là `healthCheckPath` của Render) trả `UP`.
- **Nguyên nhân**: `spring-boot-starter-data-redis` nằm trong classpath nên Spring Boot tự bật `RedisHealthIndicator`;
  chỉ số này thử kết nối `localhost:6379` (production không có Redis vì `app.srs.cache=memory`) → DOWN → cả health DOWN.
- **Bằng chứng (tái hiện được)**: chạy `SecurityHardeningTest#actuatorHealth_IsUpWithoutRedis` với
  `MANAGEMENT_HEALTH_REDIS_ENABLED=true` + `SPRING_DATA_REDIS_PORT=6399` → `Status expected:<200> but was:<503>`,
  đúng y hệt production. Bỏ 2 biến đó (đúng cấu hình production) → 200 `UP`.
  *Lưu ý khi tái hiện ở máy dev*: máy dev đang có service listen `127.0.0.1:6379`, phải trỏ sang cổng khác mới tái hiện được.
- **Ảnh hưởng thực tế**: thấp — Render không dùng endpoint này để kiểm tra sức khoẻ, nhưng gây báo động giả cho mọi
  uptime monitor đọc `/actuator/health`.
- **Đã sửa**: `application.yml` → `management.health.redis.enabled: ${MANAGEMENT_HEALTH_REDIS_ENABLED:false}`
  (khi có Redis thật thì set `MANAGEMENT_HEALTH_REDIS_ENABLED=true`), kèm test hồi quy trong `SecurityHardeningTest`
  (health UP; header `nosniff`/`X-Frame-Options`; CORS allow/deny; `/actuator/env|beans` không mở; SQLi ở query param; BCrypt).
  **Đã deploy production 27/09/2026 (`7302241`, deploy `dep-dasf7o942hec73b650r0` → live 10:54:05Z): `/actuator/health`
  giờ trả 200 `{"status":"UP"}` và không còn stack trace Redis trong log.**

#### Rủi ro đã chấp nhận (có lý do, không fix ngay)

- **Role DB `heyganba_owner` có `BYPASSRLS` + `CREATEDB`**: cần quyền owner để Flyway chạy DDL. Nếu lộ conn string thì mất
  toàn quyền database `heyganba`. Giảm nhẹ: secret chỉ nằm trong `.local-secrets.env` (gitignored) + env Render, DB bắt buộc
  TLS. Muốn siết tiếp: tạo role `heyganba_app` chỉ có `SELECT/INSERT/UPDATE/DELETE` rồi tách runtime khỏi migration
  (`SPRING_FLYWAY_USER/PASSWORD`) — làm trong một cửa sổ bảo trì.
- **Token trong `localStorage`** (thay vì cookie `HttpOnly`): xem quyết định hoãn bên dưới.
- **Neon PITR chỉ ~6 giờ** (gói free), chưa có Sentry/alerting: nên chạy `pg_dump` định kỳ (đã có trong runbook) và thêm
  uptime monitor cho `https://api.heyganba.site/api/v1/health`.
- **`heyganba.site` (Vercel) chưa qua Cloudflare**: WAF/rate-limit tầng CDN chỉ có ở phía API (Render edge). Chưa gấp vì web
  chỉ phục vụ static + gọi API.

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

### Quy tắc "nội dung chờ duyệt KHÔNG ra ngoài" (siết ngày 27/09/2026)

Bug đã gặp thật: database production có 100% nội dung ở `PENDING_REVIEW` (chưa được giáo viên tiếng Nhật duyệt) nhưng API
vẫn trả đầy đủ cho user thường (kana 247, kanji 63, rules 32, exercises 64) — UI chỉ thêm banner cảnh báo, còn dữ liệu
vẫn ra tới client. Đã sửa ở **tầng service** (`com.heyganba.common.security.ContentAccess`):

- Danh sách: user không phải ADMIN chỉ nhận bản ghi `APPROVED`; truy cập theo id bản nháp → **404** (không trả 403 để
  không xác nhận sự tồn tại của nội dung nháp).
- Áp dụng cho: kana (list/detail/chấm quiz), kanji (list/detail/bộ thủ/luyện viết), grammar (rules/exercises/check +
  `exerciseCount` chỉ đếm câu đã duyệt), flashcard (due-today/review/stats), thi thử (cả 3 pool sinh câu hỏi).
- `/content/review-status` là công cụ NỘI BỘ → chỉ ADMIN (user thường nhận 403).
- Guard test: `ContentReviewVisibilityTest` (user thường không thấy/không chấm được nội dung nháp; admin vẫn thấy đủ).
- **Hệ quả vận hành cần biết**: production hiện **không trả nội dung nào cho user thường** (mọi nội dung còn
  `PENDING_REVIEW`). Muốn mở nội dung cho học viên phải hoàn tất duyệt tiếng Nhật rồi promote
  (`review_status='APPROVED'` + chuyển migration, lưu ý đánh số lại version — xem `deployment-plan.md`).



### Đánh đổi đã biết của rate limit theo tài khoản (NỢ KỸ THUẬT — chuyển sang Redis khi bật Redis)

Kẻ tấn công biết email admin (`admin@heyganba.vn`) có thể cố tình đăng nhập sai 5 lần để tạm khoá đường đăng nhập của
admin trong 15 phút (self-DoS). Đổi lại, đây cũng chính là cơ chế chặn brute-force cho tài khoản quyền cao nhất.

**Đây là nợ kỹ thuật đã được ghi nhận, KHÔNG cần fix ngay.** Gốc rễ là bộ đếm rate limit nằm trong memory của instance
(`RateLimiterService`) nên không chia sẻ giữa các instance và mất khi restart/ngủ.

- Cách giảm nhẹ hiện tại: **restart service Render là xoá sạch bộ đếm** → mở khoá ngay không cần chờ 15 phút.
- **Trigger để trả nợ: khi bật Redis** (`APP_SRS_CACHE=redis` / `REDIS_HOST` được cấu hình — cùng lúc với việc chuyển
  `SrsDueCache` sang Redis). Khi đó:
  1. Thay `RateLimiterService` bằng bucket trên Redis (giữ nguyên chữ ký `tryConsume`/`isBlocked`/`reset` để không phải sửa
     `AuthController`, `ExamController`, `KanaController`…).
  2. Thêm exponential backoff theo IP và thông báo (log/email) cho admin mỗi khi có chuỗi đăng nhập sai.
- Bài học đi kèm: **mọi state in-memory dùng cho bảo mật (rate limit, cache) phải ghi vào danh sách nợ kỹ thuật này**
  vì nó phụ thuộc số instance — xem thêm mục Redis trong `deployment-plan.md`.

### Nợ kỹ thuật: Mã hoá TOTP secret & Xác thực 2 yếu tố khi Reset 2FA — trigger: **TRƯỚC KHI THÊM ADMIN ACCOUNT THỨ 2**

- **Gộp 2 nợ kỹ thuật liên quan đến 2FA quản trị xử lý cùng một đợt**:
  1. **Mã hoá `two_factor_secret` at-rest trong database**: Hiện `users.two_factor_secret` lưu secret TOTP (Base32) dạng plaintext. Ai đọc được bảng `users` (qua DB dump, log SQL hoặc SQL injection) đều có thể tự sinh mã OTP hợp lệ, làm suy yếu lớp bảo vệ thứ 2.
  2. **Xác thực đa yếu tố khi Reset 2FA (`POST /api/v1/admin/2fa/reset`)**: Hiện tại endpoint reset 2FA chỉ xác thực lại bằng mật khẩu hiện tại (`AdminPasswordConfirmRequest`). Nếu kẻ tấn công chiếm được mật khẩu admin, họ có thể tự reset 2FA bằng mật khẩu đó. Cần bổ sung cơ chế xác thực đa yếu tố khi reset (mã dự phòng Backup/Recovery Codes dùng một lần hoặc xác nhận phê duyệt qua email).
- **Vì sao chưa fix đợt này**: Hiện hệ thống chỉ có **1 tài khoản admin seed duy nhất** (`admin@heyganba.vn`); việc reset bằng mật khẩu là đường thoát duy nhất khi admin mất Authenticator (tránh bị khoá vĩnh viễn ngoài hệ thống); để đọc được secret TOTP plaintext thì kẻ tấn công phải có quyền truy cập DB (quyền cao nhất). Việc sửa đổi đòi hỏi quản lý key riêng, migration DB, tạo cơ chế mã khôi phục và buộc setup lại toàn bộ.
- **Trigger bắt buộc trả nợ: TRƯỚC KHI THÊM ADMIN ACCOUNT THỨ 2**: Khi hệ thống có từ 2 admin trở lên, nguy cơ leo quyền nội bộ và việc một secret bị lộ ảnh hưởng đến toàn bộ ban quản trị. Khi đó bắt buộc xử lý gộp 1 lần toàn bộ:
  1. **Mã hoá secret**: Lưu `two_factor_secret` dạng mã hoá (`AES-256-GCM`, khoá riêng `TWO_FACTOR_ENC_KEY` — tuyệt đối không dùng chung `JWT_SECRET`).
  2. **Backup Recovery Codes**: Sinh bộ mã khôi phục dự phòng (hash BCrypt/Argon2 lưu trong DB) khi admin kích hoạt 2FA.
  3. **Siết endpoint reset**: `POST /admin/2fa/reset` bắt buộc phải có `password` + `recovery_code` (hoặc email OTP xác nhận).
  4. **Migration & Rollout**: Thêm migration schema, xoá các secret cũ và buộc tất cả admin thiết lập lại 2FA cùng bộ mã dự phòng mới. Test hồi quy khẳng định không rò rỉ secret thô trong log/response.


### Khắc phục sự cố rò rỉ Render API key qua terminal buffer (xử lý ngày 02/10/2026)

- **Sự cố (High severity - CVSS 7.5)**: Trong đợt rà soát bảo mật toàn diện ngày 02/10/2026, phát hiện chuỗi key Render API cũ (`rnd_...`) xuất hiện trong stdout dòng lệnh do từng bị dán nhầm vào terminal buffer trên máy phát triển.
- **Biện pháp xử lý**: Thach đã tiến hành xoay (rotate) key: vào Render Dashboard (Account Settings → API Keys), bấm **Revoke** khoá cũ và tạo API key mới an toàn vào ngày 02/10/2026.
- **Trạng thái**: Đã khắc phục hoàn toàn. Không cần kiểm tra lại key cũ; mặc định coi là đã vô hiệu hoá.

### Xác nhận đồng bộ Staging Render & Phân quyền RBAC (02/10/2026)

- **Bối cảnh**: Staging Render (`heyganba-backend-staging`, branch `develop`) trước đó chạy commit cũ khiến endpoint `GET /api/v1/content/review-status` trả 200 OK cho học viên thông thường.
- **Hành động**: Thach đã thực hiện Manual Deploy bản mới nhất từ Dashboard Render (commit `5c720b8`, sau commit `53e89ea`).
- **Kết quả kiểm thử thực tế**: Gửi request `GET /api/v1/content/review-status` với Bearer token của tài khoản học viên thông thường tới `https://heyganba-backend-staging.onrender.com/api/v1/content/review-status` → **HTTP 403 Forbidden** (`{"success":false,"error":"FORBIDDEN","message":"Access denied: You do not have permission to access this resource"}`).
- **Kết luận**: **PASS**. Cả Production và Staging hiện đều đồng nhất chặn rò rỉ thông tin review nội dung với role không phải `ROLE_ADMIN`.

### Cơ chế thu hồi token (Token Revocation / Logout) (02/10/2026)

- **Cơ chế triển khai**: Bảng `revoked_tokens` (`jti` khóa chính, `expires_at`), endpoint `POST /api/v1/auth/logout` thu hồi cả access token và refresh token. `JwtAuthenticationFilter` kiểm tra `jti` bị thu hồi → trả 401 Unauthorized. Cron job `@Scheduled` dọn dẹp token đã qua `expires_at`.
- **Frontend**: `logoutApi()` gọi backend thu hồi token thành công mới xoá token ở `localStorage`.
- **Kiểm thử**: `SecurityHardeningTest` kiểm tra cả access token và refresh token sau logout đều nhận đúng 401 khi tái sử dụng.

### Kết quả Quét Bảo Mật OWASP ZAP Baseline trên Staging (02/10/2026)

- **Công cụ thực hiện**: Container Docker `ghcr.io/zaproxy/zaproxy:stable`, script `zap-baseline.py` quét toàn diện API Staging (`https://heyganba-backend-staging.onrender.com/api/v1/health`).
- **Tổng kết**:
  - **PASS**: **62/62 security rules** (Bao gồm kiểm tra Anti-clickjacking, SQLi/XSS parameters, PII/Information leakage, Session management, Cookie flags, Cross-Domain headers...).
  - **FAIL**: **0**. Không phát hiện lỗ hổng nghiêm trọng nào.
  - **WARN**: 5 cảnh báo mức thấp (hầu hết liên quan tới trang lỗi 404 không set Permissions-Policy / CSP do không phải trang HTML render).
  - Báo cáo HTML chi tiết: [security-scan-staging.html](file:///d:/GitHub/heyganba/docs/Internal/security-scan-staging.html).
- **Kết luận**: API Staging đạt chuẩn an toàn theo checklist baseline OWASP. Sẽ tiến hành quét lại lần cuối trước public launch.




