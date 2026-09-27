# AI Agent Working Guidelines — Japanese Learning Platform

Tài liệu này dùng để brief cho agent code (Claude Code hoặc tương đương) trước khi bắt tay vào bất kỳ phase nào trong `roadmap.md`.

## Vai trò tổng hợp

Agent phải tự đóng đồng thời các vai trò sau trong mọi tác vụ, không chỉ viết code theo yêu cầu:

**Senior Developer** — viết code đúng chuẩn đã chốt trong `decisions-and-learnings` (versioning `/api/v1/`, JWT qua Spring Security, Flyway migration, `ApiResponse` wrapper, BCrypt), không tự ý đổi convention giữa chừng.

**Tech Lead** — trước khi implement, kiểm tra tính nhất quán với kiến trúc đã có (schema, luồng auth, cấu trúc thư mục); nếu yêu cầu mới xung đột với quyết định cũ, phải nêu rõ và hỏi lại thay vì tự quyết.

**Business Analyst** — đối chiếu yêu cầu với roadmap, phát hiện phần mô tả chưa rõ hoặc thiếu (vd: rule chấm điểm ngữ pháp chưa nói case đặc biệt nào), chủ động hỏi trước khi code thay vì tự đoán.

**QA / Tester** — với mỗi tính năng, viết test cho luồng chính và ít nhất 1 edge case; test riêng cho phân quyền (user thường không gọi được API admin).

**Giáo viên tiếng Nhật** — với nội dung học thuật (kana / kanji / từ vựng / ngữ pháp / ví dụ / mnemonic), agent tự soạn nội dung
thay vì chờ người duyệt từng câu, nhưng phải: bám đúng ngữ pháp tiếng Nhật, viết lại bằng lời của mình (không copy nguyên văn
nguồn có bản quyền), gắn cảnh báo `DRAFT — chờ duyệt` ở đầu mỗi file seed, và **tự tra cứu nguồn ngoài khi không chắc chắn**
(cách đọc hiếm, số nét, license dữ liệu bên thứ ba...) rồi ghi lại kết quả kiểm chứng trong báo cáo tiến độ.

## Quyền hạn

**Được phép:**
- Tạo/sửa file trong phạm vi phase đang làm.
- Viết và chạy Flyway migration mới.
- Seed dữ liệu đã được duyệt (không tự bịa nội dung tiếng Nhật).
- Viết test, cập nhật `docs/` và `CHANGELOG`.

**Không được phép:**
- Đổi kiến trúc lõi đã chốt (stack, schema bảng lõi, cơ chế auth) mà không xin xác nhận trước.
- Xoá hoặc sửa dữ liệu production ngoài phạm vi migration đã duyệt.
- Tự seed nội dung tiếng Nhật (kana/kanji/từ vựng/ngữ pháp) vào bảng chính thức khi chưa có xác nhận đã qua người biết tiếng Nhật duyệt — chỉ được đưa vào bảng nháp/staging.
- Thêm dependency mới ngoài phạm vi phase mà không nêu lý do.
- Tự chuyển sang phase tiếp theo khi phase hiện tại chưa được xác nhận hoàn thành.

## Nguyên tắc làm việc

- Báo cáo/giải thích súc tích, đi thẳng vào vấn đề chính, không lặp lại cùng một ý.
- Không dán code hoặc snippet minh hoạ trong báo cáo tiến độ — mô tả bằng lời, code xem trực tiếp trong file.
- Mọi tính năng mới ở frontend phải nhất quán thao tác với các trạm đã có (phím tắt, cách submit, cách hiển thị đúng/sai) — không tạo pattern UX riêng cho từng trạm.
- Mọi endpoint mới phải qua kiểm tra phân quyền trước khi coi là hoàn thành.

## Báo cáo tiến độ theo phase

Sau mỗi phase, agent báo cáo ngắn gọn gồm 3 phần:
1. Đã hoàn thành gì (đối chiếu với mục "Hoàn thành khi" trong roadmap).
2. Còn thiếu/chưa làm gì.
3. Rủi ro hoặc quyết định cần Thach xác nhận trước khi qua phase tiếp theo.

## Kinh nghiệm bắt buộc nhớ khi viết seed SQL (Flyway)

Đã từng làm vỡ migration 2 lần, các điểm sau phải tự kiểm trước khi commit:

- **Không được để dấu `;` bên trong chuỗi** (kể cả tiếng Việt/Nhật): Flyway tách statement theo `;` nên file sẽ vỡ với lỗi
  `syntax error at or near ")"`. Dùng dấu phẩy hoặc chữ "và".
- **Dòng cuối trong danh sách `VALUES` không có dấu phẩy thừa** trước `)`.
- **Thứ tự cột phải khớp giữa danh sách giá trị và alias** `AS x(col1, col2, ...)` — hay sai khi vừa thêm cột `slug` vừa thêm
  `order_index`.
- Luôn tạo unique index + `ON CONFLICT ... DO NOTHING` để seed chạy lại không sinh dữ liệu trùng.
- **Nối thêm row vào file `VALUES` đã có (viết theo từng chunk) rất dễ sai dấu phẩy**: dòng cuối của chunk đã ghi phải có `,`
  thì chunk mới mới nối được, và dòng cuối cùng của cả danh sách thì KHÔNG được có `,`. Lỗi này chỉ lộ khi chạy migration
  (`syntax error at or near "("` hoặc `")"`) — không thấy khi chỉ đọc code.
- Verify bằng cách chạy migration thật trên PostgreSQL local + **đếm số bản ghi** sau khi apply (không chỉ tin "migration chạy không lỗi").
  Cách nhanh, không cần restart app:
  ```powershell
  docker cp backend/src/main/resources/db/migration/V12__*.sql heyganba-postgres:/tmp/v12.sql
  docker exec heyganba-postgres psql -U postgres -d heyganba -v ON_ERROR_STOP=1 -c 'BEGIN' -f /tmp/v12.sql `
    -c 'SELECT count(*) FROM grammar_exercises' -c 'ROLLBACK'
  ```
  (BEGIN + ROLLBACK để thử cú pháp/dữ liệu trước rồi mới để Flyway apply thật khi restart backend.)

## Kinh nghiệm khi smoke test trên PostgreSQL thật (H2 trong test KHÔNG bắt được)

- **`@Transactional(readOnly = true)` + ghi dữ liệu = 500 trên PostgreSQL**: `GrammarService.checkAnswer` từng được chấm điểm
  trong transaction readOnly nên INSERT `study_activities` bị PostgreSQL chặn (`cannot execute INSERT in a read-only transaction`).
  Test H2 không phát hiện. Vì vậy: sau khi **thêm ghi dữ liệu vào một method đang readOnly**, phải đổi annotation thành `@Transactional`
  (mặc định) và **gọi thử endpoint thật**. Hiện có guard test `checkAnswerMustStayWritableTransaction` cho case này.
- **Biến môi trường `SPRING_*` rò rỉ giữa các lệnh trong cùng terminal**: nếu trước đó đã chạy `SPRING_DATASOURCE_URL=...migrationcheck mvn test`
  thì mọi lệnh sau (kể cả `mvn spring-boot:run`) sẽ dùng DB đó → app fail với `FATAL: database "..." does not exist`, hoặc
  **toàn bộ test đỏ 68 case** vì mất context. Luôn `Remove-Item Env:SPRING_DATASOURCE_URL,...` ở **cùng lệnh** trước khi chạy lại.
- **Trên Windows, `mvn clean` fail khi app đang chạy** (`Failed to delete ...\target\classes\...`) vì file bị khoá.
  Dừng tiến trình đang giữ cổng 8080 trước khi build/clean, rồi mới `spring-boot:run`.

## Quy tắc nội dung chờ duyệt & múi giờ (quyết định của Thach — bắt buộc tuân thủ)

- **Nội dung CHƯA được duyệt tiếng Nhật phải nằm ở `backend/src/main/resources/db/migration-staging`**, không được
  đặt vào `db/migration` (thư mục đó chạy ở CẢ production). `application-prod.yml` chỉ trỏ `classpath:db/migration`;
  local/staging trỏ cả 2 thư mục. Guard test: `FlywayLocationsConfigTest` (kiểm tra cả version trùng giữa 2 thư mục).
  Promote = chuyển file sang `db/migration` + `UPDATE review_status='APPROVED'` sau khi có người duyệt.
- **Mọi bản ghi nội dung mới phải để `review_status = 'PENDING_REVIEW'`** (mặc định từ V13). Khi thêm bảng/bảng mới có
  nội dung học thuật, thêm cột `review_status` + index và khai báo trong `ContentReviewStatusService` để
  `GET /content/review-status` phản ánh đúng (đừng để nội dung nháp bị coi là đã sẵn sàng).
- **Múi giờ "ngày học" là `Asia/Ho_Chi_Minh` ở mọi môi trường** (`app.streak.zone`, mặc định trong `StreakService.DEFAULT_ZONE`).
  Mọi logic "một ngày" (streak, heatmap, TTL cache SRS, cron job) phải lấy theo zone này, KHÔNG hardcode UTC
  (trước đây heatmap/cache dùng UTC nên user học 0h–7h sáng giờ VN bị tính sang ngày hôm trước).
- **Redis chưa bật** (chưa có managed instance): giữ `APP_SRS_CACHE=memory`. Code `RedisSrsDueCache` đã viết sẵn,
  không xoá; khi có Redis managed chỉ đổi biến môi trường.

## Kinh nghiệm vận hành Render (đã gặp thật khi deploy lần đầu)

- **`PUT /v1/services/{id}/env-vars` của Render API THAY THẾ toàn bộ env vars** (không phải upsert): gọi API với 2 biến
  đã làm mất `SPRING_DATASOURCE_URL`, `CORS_ALLOWED_ORIGINS`, `APP_*`. Luôn gửi **đủ bộ** trong 1 lần gọi.
- **`SPRING_DATASOURCE_URL` phải là JDBC URL** (`jdbc:postgresql://host:5432/db`). Map `fromDatabase.property: connectionString`
  sẽ ra `postgresql://...` → app chết với `Driver org.postgresql.Driver claims to not accept jdbcUrl`. Đúng cách: map
  `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` để `application.yml` tự ghép JDBC URL.
- **Free tier 512MB RAM**: JVM mặc định chỉ lấy ~25% heap → app khởi động treo/lâu, health check fail. Đặt
  `ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"`.
- **Không hardcode `ENV PORT` trong Dockerfile**: Render set `PORT` (mặc định 10000) và route vào port đó; app đọc
  `server.port: ${PORT:8080}`. Cũng không cần `HEALTHCHECK` trong Dockerfile — Render dùng `healthCheckPath`.
- **`application-prod.yml` để `root: WARN` từng làm deploy treo mà không có log nào** → giữ `INFO` cho
  `org.springframework.boot` (thấy `Tomcat started on port(s)`), `org.flywaydb` (tiến trình migration), `com.zaxxer.hikari`.
- Đọc log qua API: `GET /v1/logs?ownerId=<ownerId>&resource=<srv-id>&direction=backward` (ownerId lấy từ `/v1/owners`);
  **nhật ký API này không đọc được khi ẩn danh** (403) nên cần API key.
- Deploy đang chạy mà trigger deploy mới sẽ bị chặn → `POST /v1/services/{id}/deploys/{deployId}/cancel` trước.
- `commitId` sai trong body deploy trả **404** (không tạo deploy rác) — nhưng tốt nhất bỏ trống để dùng commit mới nhất của branch.

## Kinh nghiệm viết integration test

- Test class nào chạm bảng nội dung (kana / vocabulary / kanji / grammar) phải `extends ContentApiTestBase`
  (`src/test/java/com/heyganba/support/`) để xoá dữ liệu theo đúng thứ tự khoá ngoại — nếu không, test sẽ đỏ tuỳ theo
  thứ tự chạy của Surefire chứ không phải do code sai.
- **Mọi class test đụng bảng người dùng (users / roles / streaks / exam / study_activity) cũng phải extend base class**,
  kể cả test auth / RBAC / security hardening: đừng tự gọi `userRepository.deleteAll()` vì `mock_exams`, `exam_results`,
  `study_activities`, `srs_reviews` đều tham chiếu `users` → PostgreSQL/H2 báo
  `Referential integrity constraint violation ... mock_exams FOREIGN KEY(user_id)`. Lỗi này **chỉ lộ tuỳ thứ tự chạy**
  (thứ tự trên CI Linux khác Windows) nên local có thể xanh mà CI đỏ.
  Cách phát hiện sớm ở local (đã dùng để tìm ra lỗi CI thật):
  ```powershell
  mvn -B test '-Dsurefire.runOrder=random' '-Dsurefire.runOrder.random.seed=1'   # thử vài seed khác nhau
  ```
- Khi chạy test với biến môi trường trỏ DB khác (migration check), nhớ `Remove-Item Env:SPRING_...` sau khi chạy, nếu không
  các lần chạy test sau sẽ dùng nhầm DB và fail với lỗi driver H2.

## Kinh nghiệm vận hành Neon (đã gặp thật)

- API v2: `/projects`, `/roles`, `/databases` **phải kèm `org_id`** (lấy từ `GET /api/v2/users/me/organizations`) — thiếu thì trả
  `400 {"message":"org_id is required..."}`. Lưu ý `Invoke-RestMethod` **nuốt body lỗi** → khi debug phải đọc stream hoặc dùng `curl.exe -s` mới thấy message thật.
- `roles`/`databases` là **branch-scoped**: `/projects/{id}/branches/{branchId}/roles|databases` (gọi ở cấp project trả **404**);
  `GET /projects/{id}` cũng chỉ trả `project`, không kèm roles/databases.
- Tạo database có thể trả **`423 Locked`** khi project đang bận → retry sau ~20s là thành công.
- Free plan: **1 project/org** → nếu hết slot, cách đúng là tạo **database + role riêng trong project sẵn có**
  (không đụng dữ liệu app khác) thay vì cố tạo project mới.
- Connection string: `GET /projects/{id}/connection_uri?...&pooled=false` (dùng direct, không pooler, để Flyway migrate an toàn).
  Neon **bắt buộc SSL** → JDBC URL phải có `?sslmode=require`.
- `pg_dump`/`psql` chạy bằng container `postgres:16-alpine` (`-v "$env:TEMP:/dump"`) → không cần cài client Postgres trên Windows.
  Sau khi dump/restore phải **verify bằng SQL** (max version Flyway + số bản ghi) **và tạo 1 user thật qua API rồi tìm trong DB mới**
  trước khi xoá DB cũ. Giữ dump ở `backups/` (đã gitignore).

## Kinh nghiệm vận hành Vercel (đã gặp thật)

- Token dạng `vcp_...` có thể là **team-scoped** → phải kèm `?teamId=<team>` cho mọi API; riêng `/v9/projects` vẫn chạy không cần teamId.
  Token sai/hết hạn: REST trả 403 (hoặc 404 với `/v2/user`), CLI báo `The token provided via --token argument is not valid`.
- Project trong monorepo **phải** set `rootDirectory` (VD `frontend`); nếu không Vercel build từ repo root → fail. Khi chạy CLI phải
  chạy từ **repo root** (khớp `rootDirectory`), không chạy trong thư mục con (`...\frontend\frontend does not exist`).
- Project mới có thể bật Deployment Protection (`ssoProtection.deploymentType = all_except_custom_domains`) → URL `*.vercel.app`
  trả trang “Login – Vercel”; tắt bằng `PATCH /v9/projects/{id}` body `{"ssoProtection": null}`.
- `VITE_*` là biến **build-time**: set env trước khi build, và verify bằng cách tải bundle JS kiểm tra chuỗi API base có mặt.

## Kinh nghiệm domain & TLS (đã gặp thật khi nối `heyganba.site`)

- **Custom domain trên Render phải được VERIFY**, không chỉ trỏ DNS. Kiểm tra `GET /v1/services/{id}/custom-domains`
  → `verificationStatus`; kích hoạt bằng `POST /v1/services/{id}/custom-domains/{cdm-id}/verify`.
  Trước khi verify, TLS handshake tới domain đó **bị đóng ngay** (`curl: (35) schannel: SEC_E_ILLEGAL_MESSAGE` trên
  Windows) dù CNAME đã đúng — đừng chẩn đoán nhầm thành lỗi DNS/mạng.
- **Vercel `verified: true` ≠ đã có cert**: xem `certs` trong `GET /v4/domains/{domain}?teamId=...`; `certs: []` nghĩa là
  Let's Encrypt đang phát hành (vài phút). A record apex phải dùng **đúng IP Vercel báo** trong Project → Domains
  (project này đang dùng `216.198.79.1`, không phải `76.76.21.21` như tài liệu Vercel cũ).
- **Máy local có thể "không vào được" domain vừa trỏ**: resolver Windows/ISP còn cache NXDOMAIN → đối chiếu bằng
  `Resolve-DnsName <host> -Server 8.8.8.8` và test trực tiếp bằng `curl.exe --resolve <host>:443:<ip> https://<host>/`.
  Muốn đọc cert server đang phục vụ mà không phụ thuộc DNS local: dùng .NET `SslStream` trong PowerShell với callback
  `{ param($a,$b,$c,$d) $true }` rồi in `Subject` của `RemoteCertificate`.
- **Render service đang để `autoDeploy: no`**: push `main` KHÔNG tự deploy backend → phải gọi
  `POST /v1/services/{id}/deploys`, hoặc bật lại auto-deploy bằng `PATCH /v1/services/{id}` body `{"autoDeploy":"yes"}`.
  Frontend Vercel thì tự deploy khi push `main` (project đã liên kết GitHub, production branch `main`).
- `psql` không có trên Windows này → dùng container: `docker run --rm postgres:16-alpine psql "<uri>" -c "..."`.

## Kinh nghiệm bảo vệ request (rate limit + payload) & test đi kèm

- **State in-memory dùng chung giữa các test class**: `RateLimiterService` là bean singleton của Spring context, mà
  context được chia sẻ giữa các class test → phải `reset()` trong `ContentApiTestBase.@BeforeEach`. Nếu reset rải rác
  ở từng class (cách cũ), class thứ 2 sẽ nhận 429 của class thứ 1 tuỳ theo thứ tự chạy Surefire. Đừng khai báo lại
  field `RateLimiterService` ở từng test class nữa — base class đã lo.
- Rate limit đăng nhập đếm theo **lần SAI** (`isBlocked()` chỉ "nhìn", `tryConsume()` mới tăng bộ đếm): nếu đếm cả lần
  đăng nhập đúng thì user tự khoá tài khoản của mình sau vài lần đăng nhập.
- Khoá theo IP lấy **phần tử cuối** của `X-Forwarded-For` (`ClientIpResolver`): Render ghi IP thật vào cuối chuỗi, còn
  client có thể tự gửi phần tử đầu. Ngưỡng theo IP phải rộng (NAT trường học/quán net) — lớp chống brute-force chính là
  theo tài khoản.
- Test rate limit dùng `@TestPropertySource` để hạ ngưỡng (nhanh, không phụ thuộc con số default) và gắn header
  `X-Forwarded-For: <spoofed>, <ip thật>` để kiểm chứng luôn hành vi của `ClientIpResolver`.
- Giới hạn payload: `MaxPayloadSizeFilter` chặn theo `Content-Length` và bọc stream cho trường hợp chunked
  (`CappedServletInputStream` — unit test riêng vì MockMvc luôn set `Content-Length`, không test được luồng stream).
- CSP ở `frontend/vercel.json` **phải whitelist Google Fonts** (`fonts.googleapis.com` cho `style-src`,
  `fonts.gstatic.com` cho `font-src`) vì `index.css` import font qua CDN; `style-src` cũng cần `'unsafe-inline'`
  do app dùng inline style của React. **Bắt buộc có `worker-src 'self' blob:`** (kèm `child-src` cho Safari cũ) vì
  `canvas-confetti` tạo worker từ `URL.createObjectURL(new Blob(...))` — thiếu `worker-src blob:` thì 5 màn hình
  có hiệu ứng chúc mừng (Kana quiz, Flashcard, Grammar, Exam, Station placeholder) sẽ lỗi khi hoàn thành bài.
  Nếu thêm dịch vụ ngoài (Sentry, R2 audio…) thì phải cập nhật CSP tương ứng (`connect-src` / `media-src`).

## Kinh nghiệm tạo môi trường staging (đã làm thật 27/09/2026)

- **Tạo service Render bằng API** (`POST /v1/services`): `ownerId` lấy từ `GET /v1/owners`; body cần `type`, `name`, `repo`,
  `branch`, `autoDeploy`, `serviceDetails.env=docker`, `serviceDetails.envSpecificDetails.dockerfilePath/dockerContext`,
  `serviceDetails.plan/region/healthCheckPath` và `envVars` (truyền ngay lúc tạo → deploy đầu tiên đã đúng cấu hình).
  Cách nhanh để lấy đúng giá trị: `GET /v1/services/<prod-id>` rồi mirror (`dockerContext=./backend`,
  `dockerfilePath=./backend/Dockerfile`, `healthCheckPath=/api/v1/health`, region `singapore`).
  Staging để `autoDeploy=yes`; production giữ `autoDeploy=no` (duyệt thủ công).
- **Neon branch là bản copy của parent**: database + role được copy **kèm mật khẩu của role**. API `GET .../branches/{id}/roles`
  **không trả `password`** cho role đã tồn tại → dùng lại mật khẩu role của parent (đã kiểm chứng bằng psql thật), đừng mất
  thời gian đi tìm cách "lấy lại mật khẩu".
- **Flyway với bản copy đã có version cao hơn**: staging copy production (đã áp V13) trong khi V12 nằm ở `db/migration-staging`
  → Flyway báo `Detected resolved migration not applied to database: 12` và **app không khởi động**. Cách xử lý đã chọn: bật
  `spring.flyway.out-of-order: true` **chỉ trong `application-staging.yml`** (production không bật). Kéo theo: khi promote nội
  dung chờ duyệt lên production phải **đánh số lại version** (V12→V15, V14→V16) — đã ghi trong `deployment-plan.md`.
- **Vercel env tách theo target**: cùng một key có thể tồn tại 2 entry (`target=production`, `target=preview`). Staging cần
  `VITE_API_BASE_URL` của **Preview** trỏ về API staging — nếu để chung với production thì mọi preview sẽ gọi API production
  (thao tác thử nghiệm đụng dữ liệu thật). Cách sửa: `PATCH /v9/projects/{id}/env/{envId}` (đổi `target`) + `POST /v10/projects/{id}/env`.
- **URL staging frontend = alias branch của Vercel**: `https://<project>-git-<branch>-<team>.vercel.app` (đã kiểm tra 200) và
  ổn định qua các lần deploy → dùng làm origin cho `CORS_ALLOWED_ORIGINS` của staging. Các alias dạng
  `heyganba-<hash>-…vercel.app` đổi sau MỖI deploy nên tuyệt đối không đưa vào cấu hình CORS.
- **CSP phải whitelist host API staging** trong `connect-src` (`frontend/vercel.json`); nếu không, frontend staging bị trình
  duyệt chặn dù CORS đã đúng (lỗi nhìn giống hệt "backend không chạy").
- **CI không deploy staging nữa**: `autoDeploy=yes` (Render) + Vercel Git Integration đã tự lo → để thêm job CI là deploy trùng
  2 lần. Job deploy duy nhất còn lại: `deploy-backend-production` (Deploy Hook + Environment `production`).
- **Render free plan là ngân sách dùng chung**: nhiều service free (kể cả của project khác) chia nhau instance-hours → staging
  để chế độ ngủ bình thường, không ping giữ ấm, tránh ăn hết ngân sách của production.

## Kinh nghiệm GitHub Actions: environment duyệt thủ công (đã làm thật 27/09/2026)

- **Không đọc lại được secret của GitHub Actions**: secret là write-only, `GET /actions/secrets` chỉ trả **tên** (+ thời điểm),
  không trả giá trị — kể cả khi có PAT quyền admin. Vì vậy "dùng secret PAT_TOKEN để cấu hình" là bất khả thi về mặt API:
  agent cần giá trị token ở dạng đọc được → đặt vào `.local-secrets.env` (key `GITHUB_TOKEN`, scope `repo` + `workflow`).
  Trên máy này có sẵn credential Git Credential Manager cho `github.com` (scope `repo, workflow`, `admin=true`) →
  lấy bằng `"url=https://github.com`n`n" | git credential fill` **rồi dùng luôn trong cùng câu lệnh**, không in ra.
- **Cấu hình environment bằng API**: `PUT /repos/{o}/{r}/environments/{name}` với
  `{ wait_timer, can_admins_bypass, reviewers: [{type:'User', id}], deployment_branch_policy: { custom_branch_policies: true } }`
  (`userId` lấy từ `GET /user`; `prevent_self_review` để `false` nếu chỉ có 1 người vừa deploy vừa duyệt).
  Giới hạn nhánh phải thêm ở endpoint riêng `POST …/environments/{name}/deployment-branch-policies` body `{"name":"main"}`,
  và **chỉ thêm được SAU khi đã bật `custom_branch_policies`** (gọi trước trả 404).
  ⚠️ Body JSON phải gửi qua file (`--data-binary "@file"`): PowerShell 5.1 làm hỏng JSON khi truyền bằng `-d`
  (lỗi `Problems parsing JSON`).
- **Test gate duyệt production**: `workflow_dispatch` KHÔNG dùng được nếu job có điều kiện `if: github.event_name == 'push' …`
  (job bị skip, không chạm environment) → phải push thật 1 commit (đã dùng commit docs). Dấu hiệu gate đang chặn:
  `GET /repos/{o}/{r}/actions/runs/{id}` → `status = waiting`; `.../jobs` → job deploy `waiting`;
  `.../pending_deployments` → liệt kê environment + `current_user_can_approve`.
  Duyệt/từ chối bằng `POST .../pending_deployments` body `{"environment_ids":[<id>],"state":"approved"|"rejected"}`.
  **Trước khi bấm duyệt phải kiểm tra secret deploy có tồn tại không** (`GET /actions/secrets`) — nếu chưa có thì duyệt là
  an toàn (job in `::warning::` rồi exit 0, không deploy gì) và đây là cách test không chạm production.
- **`autoDeploy: yes` trên Render là chưa đủ**: Render chỉ nhận webhook khi repo kết nối qua **Render GitHub App**. Service
  tạo bằng API với repo public vẫn build được nhưng push KHÔNG tạo deploy mới → phải kiểm tra
  `GET /v1/services/{id}/deploys` sau khi push (đừng tin mỗi giá trị `autoDeploy`). Chưa cài app thì dùng
  `POST /v1/services/{id}/deploys` để trigger.

## Quy tắc nội dung chờ duyệt + bài học khi sửa hàng loạt (27/09/2026)

- **Mọi endpoint trả nội dung học phải lọc qua `ContentAccess`**: thêm/sửa endpoint đọc kana/kanji/grammar/vocabulary/đề thi
  thì phải dùng `ContentAccess.visibleOnly(list, Entity::getReviewStatus)` (danh sách) hoặc
  `ContentAccess.requireVisible(status, "Entity", id)` (theo id → 404 khi là bản nháp và không phải admin).
  Guard test: `ContentReviewVisibilityTest`. Quên bước này = rò rỉ nội dung chưa duyệt ra ngoài (đã xảy ra thật).
- **Seed nội dung trong test phải dùng `persistApproved*`** của `ContentApiTestBase` (set APPROVED). Nếu tự gọi
  `repository.save(...)`, entity mặc định `PENDING_REVIEW` → mọi test API cho user thường sẽ thấy danh sách rỗng.
  Test cần bản nháp thì set `PENDING_REVIEW` tường minh. Test cần quyền admin thì dùng `adminAccessToken(email)`.
- ⚠️ **Sửa file Java hàng loạt bằng script phải ghi UTF-8 KHÔNG BOM**: `[IO.File]::WriteAllText` với
  `New-Object System.Text.UTF8Encoding($true)` (có BOM) làm **javac báo `illegal character: '\ufeff'`** ở dòng 1 và
  test-compile đỏ. Luôn dùng `UTF8Encoding($false)` cho file `.java` (file .md/docs thì không quan trọng).
- **Set GitHub Actions secret qua API phải mã hoá bằng public key của repo** (libsodium sealed box):
  `GET /repos/{o}/{r}/actions/secrets/public-key` → mã hoá value → `PUT /repos/{o}/{r}/actions/secrets/{name}` với
  `{encrypted_value, key_id}`. Trên Windows nhanh nhất là `npm i tweetsodium` rồi
  `seal(Buffer.from(value), Buffer.from(pubKey,'base64'))`. Secret **không đọc lại được** → chỉ kiểm tra bằng **tên +
  `updated_at`**, và phải **xoá file tạm chứa plaintext** sau khi set. Không dán giá trị secret vào docs/report/log.
- **Luôn `git status --porcelain` TRƯỚC khi `git add -A`**: một số lệnh verify (curl/PowerShell) có thể ghi nhầm file vào
  repo root — đã gặp thật: file tên `in` = **bản sao bundle JS 342KB** lọt vào commit trên repo public. Cách xử lý khi thấy
  file lạ: (1) quét nội dung xem có secret không (`eyJ|npg_|rnd_|vcp_|napi_|ghp_|github_pat_`), (2) nếu sạch thì xoá và
  commit lại, (3) nếu có secret thì phải xoay secret ngay (không chỉ xoá file — history của repo public vẫn giữ blob).
  Ghi chú: chuỗi `accessToken`/`refreshToken`/`password` xuất hiện trong bundle là **tên field trong code frontend công khai**,
  không phải secret.

## Bài học CSS frontend: một dấu `}` thiếu làm mất style gần nửa app (27/09/2026)

- `frontend/src/index.css` là **1 file ~2300 dòng, không có CSS linter**: `vite build` và `tsc` **không** báo lỗi cấu trúc
  dấu ngoặc. Vì CSS nesting là hợp lệ, khi một rule/`@media` quên đóng thì **toàn bộ đoạn CSS phía sau bị nhốt vào bên
  trong** → style chỉ còn áp dụng khi khớp điều kiện của rule/`@media` đó.
- Đã xảy ra thật: `@media (max-width: 720px) {` + `.kana-cell-char {` để hở → CSS Phase 2–5 (flashcard, kanji, grammar,
  exam) nằm hết trong `@media ≤720px`; một `@media (max-width: 1100px) {` thứ hai nhốt thêm cả Phase 4–5. Triệu chứng
  người dùng thấy: bảng xếp hạng mất kẻ ô và dính cột, chữ dính nhau, các panel xếp sai, **chỉ đúng khi thu nhỏ cửa sổ
  ≤720px**. Sửa bằng cách đóng đúng rule và gom mọi override responsive vào **một `@media` duy nhất ở cuối file**.
- Kiểm tra nhanh trước khi commit (in ra `depth` của các selector Phase 2–5 + tổng depth, **phải kết thúc bằng 0**,
  selector top-level phải in `depth=0`):
  ```powershell
  $d=0; Get-Content frontend\src\index.css | ForEach-Object {
    if ($_ -match '^\s*(\.(exam-table|grammar-shell|grammar-layout|flashcard-shell|kanji-layout|heat-legend|mascot-badge)[^\w-])') { "depth=$d  $($_.Trim())" }
    $d += ([regex]::Matches($_,'\{')).Count - ([regex]::Matches($_,'\}')).Count
  }; "final depth=$d"
  ```
- Quy tắc: section mới luôn viết ở **top level**; `@media` chỉ đặt ở cuối file, chỉ chứa override responsive, và phải
  đóng trước khi bắt đầu section kế tiếp. Thêm CSS xong phải chạy `npm run build` (không chỉ `npm run dev`) để chắc chắn
  asset CSS production sinh ra bình thường.
- Khi polish UI: **kiểm tra class có CSS tương ứng** bằng cách so `className` trong `.tsx` với selector trong `index.css`
  (đã gặp 2 class "mồ côi" thật: `.animate-spin` cho spinner của `SubmitButton` và `.w-full`; ngoài ra biến
  `--text-primary` được dùng nhưng chưa từng định nghĩa → phải là `--text-main`).

## Bài học UI mobile: menu phải luôn có "đường thoát" (27/09/2026)

- Lỗi thật người dùng gặp trên điện thoại: mở `heyganba.site` thấy **menu che hết giao diện mà không thể thu nhỏ**.
  Nguyên nhân: state `isSidebarOpen` khởi tạo `true`, còn CSS `@media (max-width: 900px)` lại xếp sidebar thành overlay
  (`transform: translateX(-100%)` + `.sidebar.open { translateX(0) }`) ⇒ trên mobile sidebar **hiện ra đè lên nội dung**
  nhưng *không* có nút X, *không* có lớp phủ để bấm ra ngoài, và nút hamburger nằm dưới sidebar (topbar `z-index: 30`
  < sidebar `z-index: 100`) nên bấm không tới.
- Quy tắc rút ra:
  1. Breakpoint trong JS phải lấy từ **cùng nguồn** với CSS: dùng `window.matchMedia('(max-width: 900px)')`, không dùng
     `window.innerWidth` (số đo tức thời, còn đổi theo pinch-zoom trên iOS ⇒ JS và CSS lệch pha).
  2. Mọi trạng thái "che toàn màn hình" phải có **ít nhất 2 đường thoát**: nút X trong chính panel + lớp phủ bấm ra
     ngoài (thêm `Esc` cho desktop). CSS của nút X và lớp phủ phải ở **top level**, không đặt trong `@media` — nếu JS
     tưởng desktop mà CSS vẫn vẽ overlay thì vẫn phải còn cách đóng.
  3. Không giữ state bằng `useState` + `useEffect` để đồng bộ theo breakpoint; **suy ra ngay trong render**
     (`const isSidebarOpen = sidebarPreference ?? !isMobileLayout`) để xoay màn hình/kéo cửa sổ tự đúng và không thêm
     warning `react(set-state-in-effect)`.
- Kiểm tra nhanh 2 nguồn breakpoint phải khớp nhau:
  ```powershell
  Select-String -Path frontend\src\App.tsx,frontend\src\index.css -Pattern 'max-width: 900px'
  ```
- Kiểm chứng không cần trình duyệt: tạo entry tạm `renderToStaticMarkup(<App/>)` (stub `window.matchMedia`), build SSR
  bằng `vite build --ssr`, rồi khẳng định **mobile render ở trạng thái đóng + có `.sidebar-close-btn`**, desktop render
  trạng thái mở. Cách này bắt được đúng lỗi "lệch pha JS/CSS" mà `tsc`/`oxlint` không thấy.


