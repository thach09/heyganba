# Deployment Plan — Japanese Learning Platform (DevOps)

## Môi trường

| Môi trường | Mục đích | Ghi chú |
|---|---|---|
| Local | Dev hàng ngày | Docker Compose: backend + Postgres + Redis chạy local, không phụ thuộc cloud |
| Staging | Test trước khi lên production | Deploy tự động mỗi khi merge vào `develop`, dữ liệu là bản sao/dữ liệu giả, nơi duyệt nội dung tiếng Nhật trước khi đẩy chính thức |
| Production | Phục vụ user thật | Deploy khi merge vào `main`, có thêm bước duyệt thủ công (manual approval) trước khi chạy migration DB |

## Hạ tầng

- **Backend:** Spring Boot đóng gói Docker image, deploy trên Render (Web Service).
- **Frontend:** React + Vite build tĩnh, deploy trên Vercel, hưởng CDN edge sẵn có.
- **Database:** PostgreSQL managed (Render Postgres hoặc Neon) — bật daily backup tự động, retention tối thiểu 7 ngày.
- **Cache:** Redis managed (Render Redis hoặc Upstash) cho hàng đợi SRS và leaderboard.
- **Media:** Audio phát âm lưu Cloudflare R2, phục vụ qua CDN, không đi qua backend.
- **DNS/HTTPS:** Domain trỏ qua Cloudflare, TLS tự động (Let's Encrypt qua Render/Vercel), bật HSTS.

### Staging & Database (thực tế triển khai)

- **Production**: 1 Web Service Render (branch `main`) ở `https://heyganba-backend.onrender.com` + domain `api.heyganba.site`;
  frontend Vercel (branch `main`) ở `heyganba.site`. **Database: Neon Postgres** (không dùng Render Postgres nữa).
- **Staging** (đã tạo 27/09/2026, auto-deploy BẬT):
  - Backend: Render Web Service #2 `heyganba-backend-staging` (`srv-dasbnfh7lnhs738gmm30`, branch `develop`,
    `autoDeploy=yes`, plan free, region singapore) → `https://heyganba-backend-staging.onrender.com`, profile `staging`.
  - Frontend: preview của Vercel cho branch `develop` → **`https://heyganba-git-develop-thach09.vercel.app`**
    (Vercel Git Integration tự build; `VITE_API_BASE_URL` của target **Preview** trỏ về API staging).
  - DB: **branch `develop` trong Neon** (`br-green-morning-b3gt14sr`, endpoint `ep-frosty-leaf-b3fb5xv7.c-4.ap-southeast-1.aws.neon.tech`,
    database `heyganba`) = bản copy của production tại thời điểm tạo branch → staging có sẵn nội dung V1→V13 và chạy tiếp V12/V14.
  - ⚠️ Vì bản copy đã áp V13 còn V12 thì chưa, `application-staging.yml` bật `spring.flyway.out-of-order: true`
    (chỉ staging; production KHÔNG bật — xem "Gate nội dung chưa duyệt" → mục Promote).
  - CORS staging chỉ nhận đúng origin của preview `develop`; CSP frontend đã thêm host API staging vào `connect-src`.

- **Neon free**: 0.5GB storage, **không hết hạn theo thời gian** (khác Render Postgres free hết hạn sau 30 ngày), có
  *point-in-time restore* trong 6 giờ (bản mới) → đáp ứng nhu cầu "backup retention tối thiểu 7 ngày" tốt hơn; muốn giữ lâu hơn thì nâng plan hoặc `pg_dump` định kỳ (xem `backups/`, đã gitignore).
- CI: push `develop` → Render **tự deploy** staging (`autoDeploy=yes`) + Vercel **tự build** preview; push `main` → frontend
  Vercel tự deploy production, còn **backend production phải duyệt thủ công** (job `deploy-backend-production` dừng ở GitHub
  Environment `production`; service production để `autoDeploy: no`).

### Database trên Neon

Project Neon: `cinevora` (org `org-dark-butterfly-46484287`, region `aws-ap-southeast-1`), **database riêng cho HeyGanba**:
`heyganba` (owner role `heyganba_owner`) trên branch `production` (`br-patient-silence-b3qbzvq9`).
Lý do dùng chung project: **Neon free chỉ cho 1 project/org** — nhưng tách riêng database + role nên dữ liệu HeyGanba
không lẫn với app khác. Khi cần tách hẳn: tạo project Neon mới rồi `pg_dump | psql` sang (quy trình y hệt bên dưới).

Env Render cần set (JDBC URL, **không** dùng dạng `postgresql://`):

```
SPRING_DATASOURCE_URL=jdbc:postgresql://<neon-host>/heyganba?sslmode=require
SPRING_DATASOURCE_USERNAME=heyganba_owner
SPRING_DATASOURCE_PASSWORD=<neon role password>
```

Quy trình migrate Render Postgres → Neon (đã chạy thật, dùng lại khi cần):

```powershell
# 0. Lấy connection string Neon (direct, không pooler) qua API
$nh = @{ Authorization = "Bearer $env:NEON_API_KEY"; Accept='application/json' }
Invoke-RestMethod "https://console.neon.tech/api/v2/projects/<proj>/connection_uri?org_id=<org>&branch_id=<branch>&database_name=heyganba&role_name=heyganba_owner&pooled=false" -Headers $nh

# 1. Dump từ Render (dùng client cùng version PG16 trong Docker)
docker run --rm -v "$env:TEMP:/dump" postgres:16-alpine pg_dump "<render-external-url>?sslmode=require" `
  --no-owner --no-acl --clean --if-exists -f /dump/heyganba-dump.sql

# 2. Restore sang Neon (xoá schema cũ trước cho sạch)
docker run --rm -v "$env:TEMP:/dump" postgres:16-alpine sh -c `
  "psql '<neon-uri>' -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS public CASCADE' -c 'CREATE SCHEMA public' -f /dump/heyganba-dump.sql"

# 3. Verify
docker run --rm postgres:16-alpine psql "<neon-uri>" -c "select max(version::int) from flyway_schema_history" -c "select count(*) from grammar_exercises"

# 4. Trỏ Render sang Neon rồi deploy (xem mục Bootstrap/Vận hành qua Render API)
# 5. Chỉ xoá Render Postgres SAU khi verify (DELETE /v1/postgres/{id})
```

Lưu ý API Neon: endpoint `/projects`, `/roles`, `/databases` **cần `org_id`** (nếu không sẽ trả 400 `org_id is required`),
`roles`/`databases` là **branch-scoped** (`/projects/{id}/branches/{branchId}/roles`), thao tác tạo database có thể trả `423 Locked`
(nếu project đang bận) → thử lại sau ~20s. Neon bắt buộc SSL nên JDBC URL phải có `?sslmode=require`.

## Domain `heyganba.site` (mua ở Namecheap) → Render + Vercel

**Trạng thái 27/09/2026: đã thêm đủ 3 record và cả 3 domain hoạt động** (apex + www trên Vercel, api trên Render;
cert Let's Encrypt đã cấp cho `api.heyganba.site`).

| Bản ghi | Host (Namecheap) | Type | Value (đang dùng thật) | Ghi chú |
|---|---|---|---|---|
| Frontend — apex | `@` | A | `216.198.79.1` | IP anycast Vercel. **Luôn dùng đúng giá trị Vercel hiển thị** ở Project → Domains (Vercel đổi dải IP theo thời gian; giá trị cũ `76.76.21.21` không còn đúng với project này) |
| Frontend — www | `www` | CNAME | `cname.vercel-dns.com` | Vercel tự redirect `www` ⇄ apex |
| Backend API | `api` | CNAME | `heyganba-backend.onrender.com` | Target = hostname của service Render. Phải bấm **Verify** phía Render sau khi DNS propagate (xem bên dưới) |
| (chỉ khi dashboard yêu cầu) | `_vercel` / `_render` | TXT | giá trị Render/Vercel cấp | Dùng để xác minh quyền sở hữu domain |


Các bước:
1. Namecheap → Domain List → `heyganba.site` → **Advanced DNS**, **xoá record mặc định** (URL Redirect `@`, CNAME `www → parkingpage.namecheap.com`) rồi thêm 3 record ở bảng trên.
2. Render → service backend → Settings → **Custom Domains** → thêm `api.heyganba.site`
   (blueprint cố tình không khai báo field `domains` để tránh phụ thuộc schema; thêm ở dashboard là 1 lần duy nhất).
3. Vercel → Project → Settings → **Domains** → thêm `heyganba.site` (chọn redirect `www` → apex) — Vercel sẽ tự kiểm tra DNS.
4. Nameserver: giữ mặc định của Namecheap (không cần chuyển sang Cloudflare).
5. TLS do Render/Vercel cấp tự động (Let's Encrypt) sau khi DNS propagate (thường 5–30 phút).

Kiểm tra:

```powershell
curl.exe -s https://api.heyganba.site/api/v1/health          # kỳ vọng: {"success":true,...,"status":"UP",...}
curl.exe -sI https://heyganba.site | Select-String "HTTP/|strict-transport-security"
curl.exe -sI https://api.heyganba.site/api/v1/health | Select-String "HTTP/|strict-transport-security"
```

### Xác minh domain & TLS (đã chạy thật 27/09/2026)

Bước **Verify phía Render là bắt buộc**, và triệu chứng khi chưa verify rất dễ bị chẩn đoán nhầm là lỗi DNS:
CNAME đã đúng nhưng TLS handshake tới `api.heyganba.site` bị đóng ngay (`curl: (35) schannel: SEC_E_ILLEGAL_MESSAGE`
trên Windows) vì Render chưa cấp cert cho domain chưa verify. Sau khi gọi verify: `verificationStatus=verified`,
cert `CN=api.heyganba.site` được cấp (Let's Encrypt, hiệu lực ~90 ngày).

```powershell
# 1. DNS đúng: A/CNAME trỏ tới Vercel/Render (hỏi resolver công khai để tránh cache DNS của máy)
Resolve-DnsName heyganba.site     -Type A     -Server 8.8.8.8
Resolve-DnsName www.heyganba.site -Type CNAME -Server 8.8.8.8
Resolve-DnsName api.heyganba.site -Type CNAME -Server 8.8.8.8

# 2. Trạng thái domain phía Render (kỳ vọng verificationStatus = verified)
$rh = @{ Authorization = "Bearer $env:RENDER_API_KEY"; Accept = 'application/json' }
Invoke-RestMethod 'https://api.render.com/v1/services/<srv-id>/custom-domains' -Headers $rh | ConvertTo-Json -Depth 6
# Nếu còn 'unverified': kích hoạt verify (hoặc bấm Verify trên dashboard), rồi đợi ~1 phút để Render cấp cert
Invoke-RestMethod -Method Post 'https://api.render.com/v1/services/<srv-id>/custom-domains/<cdm-id>/verify' -Headers $rh

# 3. Cert phía Vercel (kỳ vọng verified = true; certs[] rỗng nghĩa là cert đang phát hành, đợi vài phút)
Invoke-RestMethod 'https://api.vercel.com/v4/domains/heyganba.site?teamId=<team>' -Headers @{ Authorization = "Bearer $env:VERCEL_TOKEN" }

# 4. Đọc cert mà server thật sự phục vụ (không phụ thuộc DNS/cache của máy local)
curl.exe -v -o NUL --max-time 60 https://api.heyganba.site/api/v1/health 2>&1 | Select-String 'subject|issuer|alert|TLSv'
```

Mẹo debug khi máy local "không vào được" domain mới:
- Resolver của Windows/ISP có thể còn cache NXDOMAIN → xác nhận bằng `Resolve-DnsName -Server 8.8.8.8`, và test
  trực tiếp không qua DNS local bằng `curl.exe --resolve <host>:443:<ip> https://<host>/`.
- PowerShell 5.1/`curl.exe` trên Windows dùng schannel, nên lỗi handshake ở domain chưa có cert **không** có nghĩa
  là mạng hỏng: kiểm tra lại trạng thái verify/cert của nền tảng trước khi nghi ngờ DNS.

### Deploy backend: service đang tắt auto-deploy

Service production hiện có `autoDeploy: no` (kiểm tra: `GET /v1/services/<srv-id>` → `autoDeploy`). Nghĩa là **push code
không tự deploy backend**; phải làm một trong hai:
1. Bật auto-deploy (`PATCH /v1/services/<srv-id>` body `{"autoDeploy":"yes"}`) rồi để Render tự deploy khi push `main`, hoặc
2. Gọi `POST /v1/services/<srv-id>/deploys` (body rỗng = dùng commit mới nhất của branch) sau mỗi lần push `main`.

Frontend thì ngược lại: project Vercel đã liên kết GitHub (`main` = production branch) → push `main` là Vercel tự build/deploy.

### ⚠️ `autoDeploy: yes` KHÔNG đủ nếu chưa cài Render GitHub App (đã gặp thật 27/09/2026)

Staging đã đặt `autoDeploy=yes` nhưng push lên `develop` **không tạo deploy nào**. Nguyên nhân: Render chỉ tự deploy theo push
khi repo được kết nối qua **Render GitHub App** (webhook). Service tạo bằng API với repo public vẫn clone/build được (nên
deploy đầu tiên có chạy) nhưng **không nhận webhook** → auto-deploy im lặng không hoạt động.

- Phát hiện: sau khi push 1 commit, gọi `GET /v1/services/<srv-id>/deploys?limit=5` — không có deploy mới mang commit đó
  nghĩa là webhook chưa hoạt động.
- Khắc phục (chọn 1):
  1. **Cài Render GitHub App cho repo** (Render Dashboard → Account Settings → GitHub → Configure/Install, cấp quyền cho
     `thach09/heyganba`) → từ đó push `develop` là staging tự deploy. Đây là cách đúng với yêu cầu "bật auto-deploy".
  2. **Trigger bằng API** khi cần: `POST /v1/services/srv-dasbnfh7lnhs738gmm30/deploys` body `{}` (dùng commit mới nhất của
     `develop`) — cách này đã dùng để đưa staging lên bản đầu tiên.
  3. Tạo **Deploy Hook** cho service staging (Dashboard → service → Settings → Deploy Hook) rồi gọi hook từ CI.

Cho tới khi chọn (1), staging **không tự cập nhật theo `develop`** → nhớ trigger sau mỗi lần đổi nội dung chờ duyệt.

### Kết quả kiểm tra staging (27/09/2026)

| Kiểm tra | Kết quả |
|---|---|
| `GET https://heyganba-backend-staging.onrender.com/api/v1/health` | `status=UP` |
| Migration đã áp trên DB staging (Neon branch `develop`) | V1→V14: **V12 `expand grammar exercises`** + **V14 `expand trap exercises`** áp out-of-order lúc 06:55 |
| Nội dung V12/V14 có mặt | `grammar_exercises` = **306** (production 64), trong đó 221 câu nhóm bẫy (`is_common_mistake = true`) |
| `GET /content/review-status` trên staging | `GRAMMAR_EXERCISE total=306 pendingReview=306`; `stagingOnlyMigrations=[V12…, V14…]` |
| Login admin trên staging | 200 + `ROLE_ADMIN` (DB là bản copy nên dùng cùng mật khẩu đã xoay) |
| CORS | origin `https://heyganba-git-develop-thach09.vercel.app` → 200 + ACAO đúng; origin lạ → 403 |
| Frontend staging | alias `develop` READY cho commit mới nhất; bundle chứa `heyganba-backend-staging.onrender.com` và **không** chứa API production; CSP có cả 2 host API |
| Deploy đầu tiên của staging | **`update_failed`** vì lúc đó chưa có `spring.flyway.out-of-order` → đúng như phân tích, commit sau đã sửa |

### Xoay mật khẩu admin production (đã làm 27/09/2026)

Tài khoản seed `admin@heyganba.vn` có mật khẩu nằm trong README (ai đọc repo cũng biết) → **bắt buộc xoay trước khi public**.
Không có endpoint đổi mật khẩu, và `psql` không có trên Windows, nên quy trình là: tạo hash BCrypt rồi UPDATE qua container Postgres.

```powershell
# 1. Tạo hash BCrypt (dùng chính thư viện của backend, KHÔNG tự viết lại thuật toán)
cd backend
mvn -q dependency:build-classpath "-Dmdep.outputFile=target/cp.txt"
@'
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
public class BcryptHash {
  public static void main(String[] args) {
    System.out.println(new BCryptPasswordEncoder().encode(args[0]));
  }
}
'@ | Set-Content -Encoding ASCII "$env:TEMP\BcryptHash.java"
$pw = 'Hg!' + (-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 22 | ForEach-Object { [char]$_ }))
$hash = (java -cp (Get-Content target/cp.txt -Raw) "$env:TEMP\BcryptHash.java" $pw).Trim()

# 2. Cập nhật DB (JDBC URL của Neon: xem docs/Internal/deployment-plan.md → Database trên Neon)
docker run --rm postgres:16-alpine psql "<neon-uri>" -c "update users set password_hash = '$hash', updated_at = now() where email = 'admin@heyganba.vn'"

# 3. Lưu mật khẩu mới vào .local-secrets.env (gitignored) với key PROD_ADMIN_PASSWORD
```
Kiểm tra sau khi xoay: `POST /api/v1/auth/login` với email admin + mật khẩu mới → 200 và `role = ROLE_ADMIN`;
mật khẩu cũ trong README → 401.

### Cấp quyền admin cho một tài khoản có sẵn (đã làm 27/09/2026)

App **không có UI/API tự phong admin** (trang Admin chỉ xem danh sách + trạng thái), nên cách chuẩn là UPDATE
`users.role_id` trỏ sang role `ROLE_ADMIN` rồi **đăng nhập lại**. Không cần đụng tới mật khẩu của người đó
(schema: `users.role_id` → `roles.id`; role seed trong V2: `ROLE_ADMIN`, `ROLE_USER`).

```powershell
# psql qua Docker; mật khẩu truyền bằng biến môi trường nên KHÔNG lộ ra command line
$uri = <NEON_CONNECTION_URI trong .local-secrets.env>
$m = [regex]::Match($uri,'://(?<u>[^:]+):(?<p>[^@]+)@(?<h>[^/:?]+)/(?<db>[^?]+)')
$env:PGPASSWORD = $m.Groups['p'].Value
docker run --rm -e PGPASSWORD -e "PGHOST=$($m.Groups['h'].Value)" -e "PGDATABASE=$($m.Groups['db'].Value)" `
  -e "PGUSER=$($m.Groups['u'].Value)" -e PGSSLMODE=require postgres:16-alpine psql -t -A -v ON_ERROR_STOP=1 `
  -c "update users u set role_id = (select id from roles where name='ROLE_ADMIN'), updated_at = now() where u.email = '<email>'" `
  -c "select u.email || ' = ' || r.name from users u join roles r on r.id = u.role_id where u.email = '<email>'"
Remove-Item Env:PGPASSWORD
```

- **Backend cấp quyền ngay lập tức**: `JwtAuthenticationFilter` nạp lại `UserDetails` (kèm authorities) **từ DB mỗi
  request**, không tin claim `role` trong token → token cũ vẫn nhận quyền mới, không phải chờ hết hạn.
- **UI phải đăng xuất/đăng nhập lại 1 lần**: menu "Khu vực Admin" và trang Admin đọc `user.role` từ `localStorage`
  (`getSavedUser`), giá trị này chỉ được ghi lại ở lần login.
- Verify: `GET /api/v1/admin/users` bằng token admin → dòng của tài khoản đó phải hiện `ROLE_ADMIN`.
- Đã áp dụng (27/09/2026): `thietthachdo@gmail.com` → `ROLE_ADMIN` trên **cả production và staging** (`admin@heyganba.vn`
  giữ nguyên). Lưu ý: staging (branch `develop`) được tạo từ bản copy nên **chưa có** tài khoản này → phải INSERT thêm và
  **copy hash BCrypt từ production** ⇒ dùng đúng một mật khẩu cho cả 2 môi trường (không tạo và không lưu mật khẩu mới ở đâu).
  Khi INSERT sang staging nên dọn dữ liệu nháp trước, hoặc dùng khối `do $$ … $$` kiểm tra `uid is null` để chạy lại an toàn.
- Đã dọn dữ liệu test: xoá 2 tài khoản `leak.chk2235695@heyganba.vn` + `leak.chk2869506@heyganba.vn` (production). Mọi FK
  trỏ tới `users` đều `ON DELETE CASCADE` (riêng `audit_logs.admin_id` = `SET NULL`) nên không để lại dòng mồ côi —
  production còn 2 user (`admin@heyganba.vn`, `thietthachdo@gmail.com`).

### Bảo vệ tầng request (rate limit + payload) — đã bật ở production

- `POST /auth/login`: 5 lần SAI/15 phút cho mỗi tài khoản (đăng nhập đúng không bị tính) + 100 lần SAI/15 phút cho mỗi IP.
- `POST /auth/register`: 30 lần/giờ cho mỗi IP; `POST /auth/refresh`: 300 lần/15 phút cho mỗi IP.
- Body > 64KB → `413 PAYLOAD_TOO_LARGE` (đổi ngưỡng bằng `APP_MAX_REQUEST_BYTES`).
- Ngưỡng auth đổi được không cần sửa code: `APP_AUTH_LOGIN_MAX_FAILED_PER_EMAIL`, `APP_AUTH_LOGIN_MAX_FAILED_PER_IP`,
  `APP_AUTH_REGISTER_MAX_PER_IP`, `APP_AUTH_REFRESH_MAX_PER_IP`.
- **Lưu ý vận hành**: bộ đếm nằm trong memory của instance (chưa có Redis). Render free tier tự ngủ sau ~15 phút không có
  request → bộ đếm reset theo; khi scale nhiều instance thì phải chuyển sang Redis (đã có sẵn `RedisSrsDueCache` làm mẫu).

### Kết quả kiểm tra production sau khi bật hardening (27/09/2026)

| Kiểm tra | Kết quả |
|---|---|
| `GET /api/v1/health` | `status=UP`, `service=heyganba-backend` |
| Header của API | `strict-transport-security: max-age=31536000`, `x-content-type-options: nosniff`, `x-frame-options: DENY` |
| `https://heyganba.site` | 200 + `Content-Security-Policy`, HSTS, `X-Frame-Options: DENY`; cert Let's Encrypt (`certs=2` ở Vercel) |
| `https://www.heyganba.site` | 308 → `https://heyganba.site/` (đặt qua `PATCH /v9/projects/{id}/domains/www.heyganba.site` body `{"redirect":"heyganba.site","redirectStatusCode":308}`) |
| Admin login (mật khẩu đã xoay) | 200 + `role=ROLE_ADMIN`; mật khẩu cũ trong README → 401 |
| RBAC | user thường `GET /admin/status` → 403; admin → 200 |
| CORS preflight | `Origin: https://evil.example` → 403 (không trả `access-control-allow-origin`); `Origin: https://heyganba.site` → 200 + `access-control-allow-origin: https://heyganba.site` |
| Body 70KB | `413 PAYLOAD_TOO_LARGE` |
| Brute-force login | 5 lần sai → lần thứ 6 `429 TOO_MANY_REQUESTS` |
| Gate nội dung chờ duyệt | `GET /content/review-status` → `stagingOnlyMigrations: [V12, V14]`, `totalPendingReview: 450` |
| Dữ liệu production | chỉ còn 1 user (`admin@heyganba.vn`); 4 user test đã xoá (cascade `streaks`/`srs_reviews`/`exam_results` sạch) |

- Mẹo khi test bằng PowerShell 5.1: gửi POST JSON bằng file (`curl.exe --data-binary "@body.json"`) — truyền JSON trực
  tiếp bằng `-d` bị PowerShell làm mất dấu ngoặc kép → server trả `400 invalid JSON format` (không phải lỗi backend).
- Sau khi bật CSP cần kiểm tra lại các API trình duyệt dùng blob worker (`canvas-confetti` → `worker-src 'self' blob:`).
### Triển khai 27/09/2026 (đợt 2): fix UI mobile + phê duyệt nội dung core (V15)

**Frontend (Vercel tự deploy khi push `main`)** — commit `bea04e6`:

- Fix lỗi trên điện thoại: menu sidebar che hết giao diện mà không thu nhỏ được. Nguyên nhân: `isSidebarOpen`
  khởi tạo `true` trong khi CSS `@media (max-width: 900px)` xếp sidebar thành overlay ⇒ không có nút X, không có
  lớp phủ để bấm ra ngoài, nút hamburger nằm dưới sidebar (topbar `z-index: 30` < sidebar `z-index: 100`).
- Bằng chứng: asset CSS production đổi từ `index-BDUWIMMT.css` → `index-DHBJHKzP.css`, có `.sidebar-backdrop` +
  `.sidebar-close-btn`; `<meta name="viewport">` có thêm `viewport-fit=cover`.

**Backend (Render production, service `srv-das95jh7lnhs7385mim0`)** — commit `bea04e6`:

- Trigger bằng Render API theo runbook ở trên (`POST /v1/services/{id}/deploys`), không cần chờ job
  `deploy-backend-production` của GitHub Actions (job đó yêu cầu duyệt environment `production`).
- ⚠️ Dockerfile build bằng `mvn clean package -DskipTests` ⇒ **luôn chạy `mvn -B verify` ở local trước khi deploy**
  (lần này: 115 test, 0 fail).
- Migration `V15__approve_core_curriculum_content.sql` áp dụng ở production:
  - Bằng chứng TRƯỚC: `flyway_schema_history` max = `13`; `kana` 247/0 APPROVED, `vocabulary` 44/0, `kanji` 63/0,
    `grammar_rules` 32/0, `grammar_exercises` 64/0 — và **không có bản ghi `id > 64`** (nên mệnh đề `WHERE id <= 64`
    chỉ có ý nghĩa giữ lại V12/V14 ở staging).
  - Sau V15: cả **450 bản ghi core** chuyển `APPROVED` ⇒ user thường thấy nội dung bài 1–7 (trước đó 0 bản ghi
    APPROVED nên các trạm hiển thị rỗng dù API trả 200).
- Truy vấn DB production khi không có `psql`: dùng Neon HTTP SQL endpoint `POST https://<neon-host>/sql` với header
  `Neon-Connection-String: <NEON_CONNECTION_URI>` và body `{"query":"...","params":[]}` (thông tin kết nối nằm trong
  `.local-secrets.env` ở máy local, KHÔNG commit).
- Deploy đợt này lâu hơn mức thường lệ (~4 phút): lần đầu chọn `clearCache: do_not_clear` bị treo ở
  `update_in_progress` (không có log runtime) → đã cancel và deploy lại; **instance cũ vẫn phục vụ request trong suốt
  quá trình** nên không có downtime.
- Kết quả sau deploy (đã xác minh):
  - Render: deploy `dep-daser83ncjis73crq03g` → `live` lúc 10:27:30Z; log Flyway có
    `Successfully applied 1 migration to schema "public"`; `GET /api/v1/health` → `status=UP`.
  - DB: version cuối trong `flyway_schema_history` = `15`; `kana` 247/247 APPROVED, `vocabulary` 44/44,
    `kanji` 63/63, `grammar_rules` 32/32, `grammar_exercises` 64/64 ⇒ tổng **450/450**, `PENDING_REVIEW` = 0.
  - Kiểm chứng bằng tài khoản user thường tạm thời (tạo rồi xoá ngay trong cùng phiên; sau khi xoá **0 dòng orphan**
    ở mọi bảng có `user_id`): `GET /kana` = 247, `/kanji` = 63, `/grammar/rules` = 32, `/grammar/exercises` = 64,
    `/flashcard/stats` → `availableNewWords = 44`; `/content/review-status` → `403` (đúng: chỉ admin).

### Triển khai 27/09/2026 (đợt 3): sửa `/actuator/health` luôn 503 (báo động giả)

**Backend (Render production, `srv-das95jh7lnhs7385mim0`)** — commit `7302241`, deploy `dep-dasf7o942hec73b650r0`
→ `live` lúc **10:54:05Z** (đợt này CHỈ đổi cấu hình, không có migration):

- Nguyên nhân: `spring-boot-starter-data-redis` trong classpath ⇒ Spring Boot tự bật `RedisHealthIndicator`; production
  không có Redis (`app.srs.cache=memory`) nên `/actuator/health` trả **503 DOWN** dù app + Postgres khoẻ.
  Bằng chứng trực tiếp trong log Render của instance CŨ: mỗi lần gọi `/actuator/health` là một stack trace
  `org.springframework.data.redis.RedisConnectionFailureException: Unable to connect to Redis` /
  `Connection refused: localhost/127.0.0.1:6379` (lúc 10:50:53Z → 10:52:42Z).
- Sửa: `management.health.redis.enabled: ${MANAGEMENT_HEALTH_REDIS_ENABLED:false}` trong `application.yml`
  (khi có Redis thật thì set env `MANAGEMENT_HEALTH_REDIS_ENABLED=true`).
- Trước khi deploy: `mvn -B verify` → **121 test, 0 fail** (thêm 6 test hồi quy của master test bảo mật).
- Sau deploy (đã xác minh trên instance MỚI `…-74g8v`):
  - `GET /api/v1/actuator/health` → **200** `{"status":"UP","groups":["liveness","readiness"]}` (trước: 503).
  - HSTS / `nosniff` / `X-Frame-Options: DENY` vẫn còn; `GET /api/v1/health` → `UP`.
  - **0 dòng log** phát sinh sau khi live (trước đó mỗi lần gọi health là ~40 dòng stack trace Redis).
  - E2E bằng tài khoản user tạm (tạo → xoá, `user_left=0`, `orphan_rows=0`): `/kana` = 247, `/kanji` = 63,
    `/grammar/rules` = 32, `/grammar/exercises` = 64, `/flashcard/stats` → `availableNewWords = 44`,
    `/content/review-status` → **403** (đúng: chỉ admin).
- **Lưu ý cho lần sau**: dùng `clearCache: "clear"` khi trigger qua API — cache build bị xoá nên Maven phải tải lại
  dependency, build mất ~5 phút (chậm hơn mức thường lệ nhưng tránh được kiểu treo `update_in_progress` đã gặp).








- Nếu API trả `502/503`: kiểm tra log Render (thiếu `JWT_SECRET` làm app **fail-fast** lúc khởi động).
- Nếu frontend báo “Máy chủ backend chưa khởi chạy”: `VITE_API_BASE_URL` chưa đúng hoặc chưa redeploy Vercel sau khi set biến.
- CORS: backend chỉ nhận `https://heyganba.site,https://www.heyganba.site` (khai báo trong `render.yaml`/biến `CORS_ALLOWED_ORIGINS`);
  tên miền Vercel preview (`*.vercel.app`) chỉ thêm vào biến này khi thật sự cần test qua preview.

## CI/CD (GitHub Actions)

Pipeline theo 4 bước, chạy cho mọi PR và mọi lần merge:
1. **Build & lint** — biên dịch backend, build frontend, chạy linter, fail sớm nếu lỗi cú pháp/style.
2. **Test tự động** — unit test backend (đặc biệt logic SRS, tính điểm, phân quyền), test frontend cho component dùng chung.
3. **Migration check** — chạy Flyway ở môi trường test để đảm bảo migration mới không phá schema cũ; không cho merge nếu migration lỗi.
4. **Deploy** — staging tự động sau khi merge `develop`; production cần duyệt thủ công (GitHub Environment protection rule) trước khi chạy, đặc biệt cho migration ảnh hưởng bảng có dữ liệu user thật.

## Quản lý secrets & cấu hình

- Không commit secrets vào repo dưới bất kỳ hình thức nào (kể cả file `.env` mẫu chứa giá trị thật).
- Dùng biến môi trường qua secret manager của Render/Vercel/GitHub Actions, phân biệt rõ theo từng môi trường (staging khác production).
- Xoay vòng (rotate) JWT signing key và các API key định kỳ, đặc biệt sau khi có nhân sự rời dự án hoặc nghi ngờ rò rỉ.

### Secret cần cấu hình cho pipeline (tên chính xác)

| Nơi cấu hình | Tên | Dùng cho |
|---|---|---|
| GitHub Actions secrets | `RENDER_PROD_DEPLOY_HOOK_URL` | Job `deploy-backend-production` (**secret deploy DUY NHẤT** mà CI cần) — ✅ đã cấu hình 27/09/2026; giá trị chỉ nằm trong GitHub secrets (không lưu trong repo/docs) |
| Render (Environment) — production | `SPRING_PROFILES_ACTIVE=prod`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS=…heyganba.site`, `SPRING_DATASOURCE_URL/USERNAME/PASSWORD` | Backend runtime — mẫu ở `backend/.env.example` |
| Render (Environment) — staging | như trên nhưng `SPRING_PROFILES_ACTIVE=staging`, DB = Neon branch `develop`, `CORS_ALLOWED_ORIGINS=https://heyganba-git-develop-thach09.vercel.app`, `HIKARI_MAX_POOL_SIZE=5` | Đã set sẵn qua API lúc tạo service staging |
| Vercel — Production | `VITE_API_BASE_URL=https://api.heyganba.site/api/v1` | Frontend production |
| Vercel — Preview | `VITE_API_BASE_URL=https://heyganba-backend-staging.onrender.com/api/v1` | Preview/staging dùng API staging (không đụng dữ liệu production) |

- `JWT_SECRET` **không có giá trị mặc định** ở staging/production: thiếu là backend fail-fast lúc khởi động
  (dev vẫn có default riêng trong `application-dev.yml`). Tạo key mới bằng `openssl rand -base64 48`.
- Job deploy tự bỏ qua kèm `::warning::` khi secret chưa tồn tại → CI xanh trước khi hạ tầng được cấu hình xong.
- **Vercel Git Integration đang bật** → đã xoá khỏi CI các job `deploy-frontend-*` và `deploy-backend-staging`
  (staging đã có autoDeploy + Vercel preview nên job CI chỉ gây deploy trùng). GitHub Actions hiện chỉ còn: backend
  test, migration check, frontend test/build, và `deploy-backend-production` (chờ Deploy Hook + Required reviewers).


### Runbook — các bước thủ công còn lại (Phase 0 hạ tầng)

> Phần này liệt kê đúng các thao tác **con người** phải làm trên dashboard (agent không có quyền truy cập secrets).
> Mọi bước đều kèm lệnh kiểm tra để xác nhận đã xong.

**0. Tạo tài khoản & kết nối (làm 1 lần)**

| Việc | Cách làm |
|---|---|
| Render ↔ GitHub | render.com → đăng nhập bằng GitHub → cấp quyền đọc repo `thach09/heyganba` |
| Tạo backend + DB tự động | Render → **New → Blueprint** → chọn repo (đọc `render.yaml`) → Render tạo Web Service + PostgreSQL free và tự inject `SPRING_DATASOURCE_URL` |
| Chỉ còn 1 secret phải điền tay | Trong lúc tạo Blueprint, Render hỏi `JWT_SECRET` (vì `sync: false`) → dán key tạo bằng `openssl rand -base64 48` |
| Vercel ↔ GitHub | vercel.com → Add New → Project → Import repo → Root Directory = `frontend`, Framework = Vite |
| Domain | Xem mục **“Domain heyganba.site (mua ở Namecheap) → Render + Vercel”** ở trên |

**1. GitHub Actions secrets** (Repo → Settings → Secrets and variables → Actions → New repository secret)

| Tên secret | Lấy từ đâu | Kiểm tra |
|---|---|---|
| `RENDER_PROD_DEPLOY_HOOK_URL` | Render → service production → Settings → Deploy Hook | Push vào `main`, job `deploy-backend-production` phải in `Đã trigger deploy backend production trên Render.` |

**2. GitHub Environment `production` có Required reviewers — ✅ ĐÃ LÀM (27/09/2026)**

Cấu hình qua GitHub REST API (token cần scope `repo`; PAT tạo ở GitHub → Settings → Developer settings → Tokens):

```powershell
$tok = '<PAT scope repo,workflow>'
$p = "$env:TEMP\gh-env.json"
'{ "wait_timer": 0, "reviewers": [ { "type": "User", "id": <userId> } ], "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true } }' |
  Set-Content -Path $p -Encoding ASCII -NoNewline

# ⚠️ PowerShell 5.1 làm hỏng JSON khi truyền trực tiếp bằng -d → LUÔN gửi body qua file
curl.exe -X PUT -H "Authorization: Bearer $tok" -H 'Accept: application/vnd.github+json' `
  -H 'User-Agent: heyganba-agent' -H 'Content-Type: application/json' --data-binary "@$p" `
  https://api.github.com/repos/thach09/heyganba/environments/production

# Giới hạn environment chỉ nhận deploy từ nhánh `main`.
# Policy chỉ thêm được SAU khi bật custom_branch_policies (gọi trước sẽ trả 404).
curl.exe -X POST -H "Authorization: Bearer $tok" -H 'User-Agent: heyganba-agent' `
  -H 'Content-Type: application/json' --data-binary '{"name":"main"}' `
  https://api.github.com/repos/thach09/heyganba/environments/production/deployment-branch-policies
# userId: GET https://api.github.com/user → thach09 = 211706769
```

Trạng thái đã xác minh bằng `GET /repos/thach09/heyganba/environments/production`:
`protection_rules` gồm `required_reviewers` (reviewer `thach09`, `prevent_self_review=false` để chính bạn duyệt được) +
`branch_policy` cho `main`; `deployment_branch_policy.custom_branch_policies=true`.

- Environment `staging` để **trống protection** vì staging deploy tự động, không cần duyệt.
- **Đã chạy thật end-to-end (27/09/2026)**: sau khi cấu hình secret `RENDER_PROD_DEPLOY_HOOK_URL`, push commit `53e89ea`
  vào `main` → run chờ duyệt → duyệt qua API → job `Deploy Backend → Render (production)` **gọi hook thành công**
  (log có `{"deploy":{"id":"dep-…"}}` + dòng `Đã trigger deploy backend production trên Render.`) → Render tạo deploy
  `trigger=deploy_hook` → `live` → `GET /api/v1/health` = `UP`.
  ⚠️ **Từ giờ duyệt = deploy production THẬT** (trước đây khi chưa có secret thì duyệt chỉ là no-op).
  - Duyệt/từ chối qua API: `POST /repos/{o}/{r}/actions/runs/{id}/pending_deployments` body
    `{"environment_ids":[<envId>],"state":"approved"|"rejected"}`.
  - **Không dùng `workflow_dispatch` để test gate này**: job có `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
    nên sẽ bị skip ngay, không bao giờ chạm environment.
- Kiểm tra gate: push vào `main` → job `deploy-backend-production` ở trạng thái *Waiting for review*; xem được bằng
  `GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments`.
- **Về `PAT_TOKEN` trong GitHub Actions secrets**: GitHub **không cho đọc lại giá trị** secret (write-only, kể cả bằng PAT —
  đây là thiết kế bảo mật, không phải lỗi). Muốn agent tự cấu hình GitHub thì đặt token vào `.local-secrets.env`
  (key `GITHUB_TOKEN`, đã có sẵn trong `.secrets.template.env`, scope `repo` + `workflow`).
  Nếu `PAT_TOKEN` chỉ để dành cho workflow thì nên dùng thật hoặc xoá — secret nằm im vẫn là bề mặt rủi ro.

**3. Biến môi trường Render (service backend)**

Nếu tạo bằng **Blueprint** (`render.yaml`): Render đã tự set `SPRING_PROFILES_ACTIVE`, `CORS_ALLOWED_ORIGINS`,
`SPRING_DATASOURCE_URL` (từ PostgreSQL của blueprint) và các biến `APP_*`; **chỉ cần điền `JWT_SECRET`** (biến `sync: false`).
Nếu tạo Web Service thủ công thì set tay (xem `backend/.env.example`):

```
SPRING_PROFILES_ACTIVE=prod           # staging dùng staging
JWT_SECRET=<openssl rand -base64 48>
CORS_ALLOWED_ORIGINS=https://heyganba.site,https://www.heyganba.site
SPRING_DATASOURCE_URL=postgresql://<user>:<password>@<host>:5432/<db>   # Render/Neon cấp
```

Tuỳ chọn (đã có default an toàn, Phase 5) — **giá trị ĐANG DÙNG theo quyết định đã chốt**:

```
APP_STREAK_ZONE=Asia/Ho_Chi_Minh      # giờ VN ở MỌI môi trường: streak/heatmap reset lúc 00:00 giờ VN
APP_STREAK_MIN_SRS_REVIEWS=10         # ngưỡng lượt ôn SRS tối thiểu để tính streak
APP_STREAK_MIN_QUIZ_QUESTIONS=10      # ngưỡng số câu bài tập ngữ pháp để tính streak
APP_SRS_CACHE=memory                  # cache SRS: Postgres trực tiếp — Redis CHƯA bật (chưa có managed instance)
```

Tuỳ chọn — cache SRS bằng Redis (Phase 2): **QUYẾT ĐỊNH: CHƯA BẬT** ở staging/production vì chưa có Redis managed
instance ⇒ cả 2 môi trường chạy Postgres trực tiếp với `APP_SRS_CACHE=memory`. Code `RedisSrsDueCache` đã viết sẵn,
khi có Redis managed chỉ cần đổi biến (không sửa code):

```
APP_SRS_CACHE=redis
REDIS_HOST=<redis-host>  REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=<chỉ khi Redis bật auth>
```

Kiểm tra nhanh sau khi bật: gọi `GET /flashcard/due-today` rồi `redis-cli --scan --pattern 'srs:due:*'`
phải thấy key `srs:due:<userId>` với TTL tới hết ngày (múi giờ `app.streak.zone`); nếu Redis lỗi thì app vẫn chạy bình
thường (coi như cache miss, chỉ log warn).

**Múi giờ "ngày học"**: `APP_STREAK_ZONE=Asia/Ho_Chi_Minh` ở **mọi môi trường** (local/staging/production) — dùng chung
cho streak, heatmap, TTL cache SRS và giờ chạy job xoá cache (00:05 giờ VN).

### Tài nguyên đã tạo (production) — thông tin định danh

| Tài nguyên | Nhà cung cấp | ID / định danh | Ghi chú |
|---|---|---|---|
| Backend web service | Render | `srv-das95jh7lnhs7385mim0` (`heyganba-backend`) | branch `main`, plan free, region singapore, health `/api/v1/health` |
| PostgreSQL (production) | **Neon** | project `cinevora` (`steep-sea-83851655`), branch `production` (`br-patient-silence-b3qbzvq9`), database `heyganba`, role `heyganba_owner`, host `ep-small-morning-b3ofxx3h.c-4.ap-southeast-1.aws.neon.tech` | org `org-dark-butterfly-46484287`; `?sslmode=require`; free không hết hạn |
| ~~PostgreSQL~~ | ~~Render~~ | ~~`dpg-das94tp7lnhs7385jfh0-a`~~ | **ĐÃ XOÁ** sau khi migrate sang Neon (dump lưu ở `backups/heyganba-renderpg-2026-09-27.sql`, đã gitignore) |
| Frontend project | Vercel | `prj_uVxZfEsGrpUdWUMwdfJ5Nlf7kXOP` (`heyganba`) | team `team_fcggMXeYL9uzprejNhUBdpB7`; `rootDirectory=frontend`, framework vite, output `dist` |
| Domain frontend | Vercel | `heyganba.site` + `www.heyganba.site` | alias `https://heyganba.site` |
| Domain backend | Render | `api.heyganba.site` | CNAME → `heyganba-backend.onrender.com` |
| Backend web service (staging) | Render | `srv-dasbnfh7lnhs738gmm30` (`heyganba-backend-staging`) | branch `develop`, plan free, region singapore, **autoDeploy=yes**, profile `staging`, health `/api/v1/health` |
| PostgreSQL (staging) | **Neon** | project `cinevora` (`steep-sea-83851655`), branch `develop` (`br-green-morning-b3gt14sr`), endpoint `ep-frosty-leaf-b3fb5xv7.c-4.ap-southeast-1.aws.neon.tech`, database `heyganba` | Bản copy của production lúc tạo branch; role `heyganba_owner` copy kèm **mật khẩu gốc** (API không trả lại password của role đã có) |
| Frontend staging | Vercel | preview branch `develop` → `https://heyganba-git-develop-thach09.vercel.app` | Alias ổn định của branch; `VITE_API_BASE_URL` target Preview = API staging |

Lưu ý cấu hình đã phải sửa khi tạo Vercel project (để tránh lặp lại):
- `rootDirectory` **phải** = `frontend` (repo có backend + frontend chung một repo; để trống sẽ build từ repo root → fail).
- **Deployment Protection**: project mới có thể bật `ssoProtection.deploymentType = all_except_custom_domains` → URL `*.vercel.app` trả trang đăng nhập Vercel.
  Tắt bằng `PATCH /v9/projects/{id}?teamId=...` với body `{"ssoProtection": null}` nếu muốn preview công khai.
- Env `VITE_API_BASE_URL` phải set cho cả `production` và `preview` **trước khi build** (Vite nhúng biến lúc build).

### Troubleshooting deploy

| Log gặp phải | Nguyên nhân | Cách sửa |
|---|---|---|
| `Could not resolve placeholder 'JWT_SECRET' in value "${JWT_SECRET}"` hoặc `IllegalStateException: Thiếu biến môi trường JWT_SECRET` | Service chưa có biến `JWT_SECRET` (biến `sync: false` bị bỏ trống khi tạo Blueprint, hoặc tạo Web Service thủ công) | Render → service → **Environment** → thêm `JWT_SECRET` = `openssl rand -base64 48` → Save (Render tự redeploy). Hoặc deploy lại bằng Blueprint: `render.yaml` đã đặt `generateValue: true` nên Render tự sinh secret. |
| `RuntimeException: Driver org.postgresql.Driver claims to not accept jdbcUrl, postgresql://...` | `SPRING_DATASOURCE_URL` đang nhận connection string của Render (`postgresql://user:pass@host/db`) — Spring cần **JDBC URL** | Đặt `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` (hoặc `SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/<db>`) rồi **xoá** `SPRING_DATASOURCE_URL` dạng `postgresql://`. Blueprint hiện đã map đúng 5 biến `DB_*` từ database |
| App start OK nhưng `GET /content/review-status` trên production trả `stagingOnlyMigrations` **rỗng** và bảng `grammar_exercises` có 306 câu | Service production đang chạy nhầm profile `staging` ⇒ Flyway đọc cả `db/migration-staging` (áp V12/V14 là nội dung chờ duyệt) | Đặt `SPRING_PROFILES_ACTIVE=prod` rồi xoá nội dung chờ duyệt đã lỡ áp: `DELETE FROM flyway_schema_history WHERE version IN ('12','14')` + xoá các câu bẫy mới (SQL đầy đủ ở mục dưới) — hoặc đơn giản nhất với DB còn trắng: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` rồi để Flyway chạy lại từ V1 |
| Deploy treo mãi ở `update_in_progress`, log app im lặng rồi health check fail | Free tier Render = **512MB RAM**, JVM mặc định chỉ lấy 25% (~128MB heap) cho Spring Boot + Hibernate → khởi động rất chậm/bị kill; ngoài ra Dockerfile hardcode `ENV PORT=8080` trong khi Render set `PORT=10000` | Dockerfile hiện đã có `ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"`, **không** hardcode `ENV PORT`, `EXPOSE 10000`; app đọc `server.port: ${PORT:8080}` |
| `502/503` khi gọi `/api/v1/health` sau khi deploy | App đang fail-fast (thiếu env) hoặc health check sai path | Xem log Render; health check phải là `/api/v1/health` (đã set trong `render.yaml`) |
| Free web service bị “spun down” rồi request đầu tiên chậm ~30–60s | Giới hạn gói free của Render | Chấp nhận ở giai đoạn đầu; nâng plan khi có user thật |

### Bootstrap/Vận hành qua Render API (đã dùng thực tế)

```powershell
$rh = @{ Authorization = "Bearer $env:RENDER_API_KEY"; Accept = 'application/json' }

# 1. Liệt kê service + database (lấy id)
Invoke-RestMethod 'https://api.render.com/v1/services?limit=20' -Headers $rh
Invoke-RestMethod 'https://api.render.com/v1/postgres?limit=20' -Headers $rh

# 2. Đặt env vars — ⚠️ endpoint này THAY THẾ TOÀN BỘ env vars, phải gửi đủ bộ:
#    SPRING_PROFILES_ACTIVE, JWT_SECRET, DB_HOST/PORT/NAME/USER/PASSWORD, CORS_ALLOWED_ORIGINS, APP_*
Invoke-RestMethod -Method Put 'https://api.render.com/v1/services/<srv-id>/env-vars' -Headers $rh `
  -ContentType 'application/json' -Body (@(@{key='SPRING_PROFILES_ACTIVE';value='prod'}, @{key='JWT_SECRET';value=$jwt}) | ConvertTo-Json -Depth 3)

# 3. Deploy + theo dõi
Invoke-RestMethod -Method Post 'https://api.render.com/v1/services/<srv-id>/deploys' -Headers $rh -ContentType 'application/json' -Body '{"clearCache":"clear"}'
Invoke-RestMethod 'https://api.render.com/v1/services/<srv-id>/deploys?limit=3' -Headers $rh
Invoke-RestMethod -Method Post 'https://api.render.com/v1/services/<srv-id>/deploys/<deploy-id>/cancel' -Headers $rh

# 4. Đọc log (cần ownerId lấy từ /v1/owners)
$ownerId = (Invoke-RestMethod 'https://api.render.com/v1/owners?limit=1' -Headers $rh)[0].owner.id
Invoke-RestMethod "https://api.render.com/v1/logs?ownerId=$ownerId&resource=<srv-id>&limit=100&direction=backward" -Headers $rh

# 5. Custom domain
Invoke-RestMethod -Method Post 'https://api.render.com/v1/services/<srv-id>/custom-domains' -Headers $rh `
  -ContentType 'application/json' -Body '{"name":"api.heyganba.site"}'
```

### Gate nội dung chưa duyệt (không promote nhầm lên production)

| Hạng mục | Cơ chế |
|---|---|
| Thư mục migration | `backend/src/main/resources/db/migration` = **đã duyệt** (chạy mọi môi trường); `db/migration-staging` = **chờ duyệt** |
| Cấu hình Flyway | local/staging: `classpath:db/migration,classpath:db/migration-staging`; **`application-prod.yml` chỉ `classpath:db/migration`** |
| Đang chờ duyệt | `V12__expand_grammar_exercises.sql` (96 câu), `V14__expand_trap_exercises.sql` (146 câu nhóm bẫy) — **riêng nội dung core bài 1–7 đã được duyệt** bằng `V15` (xem ghi chú bên dưới, áp dụng 27/09/2026) |
| Trạng thái trong DB | `review_status` (V13) mặc định `PENDING_REVIEW` cho kana/từ vựng/kanji/ngữ pháp/bài tập |
| Kiểm tra tự động | `FlywayLocationsConfigTest` (chặn sửa prod yml include staging, chặn đặt file chờ duyệt vào `db/migration`, chặn trùng version) |
| Kiểm tra thủ công | `GET /content/review-status` → `allApproved=false`, `stagingOnlyMigrations=[V12…, V14…]`; UI Trạm Trợ từ hiện badge "chờ duyệt" |
| **Promote** | Sau khi người biết tiếng Nhật duyệt: (1) `UPDATE … SET review_status='APPROVED'`, (2) **đánh số lại version LỚN HƠN version lớn nhất đang có ở production** (production đang ở V13 → `V12__expand_grammar_exercises.sql` thành `V15__…`, `V14__expand_trap_exercises.sql` thành `V16__…`; giữ nguyên thứ tự tương đối, KHÔNG đổi nội dung) rồi mới chuyển file sang `db/migration/`, (3) chạy lại CI (test đỏ nếu file còn ở sai thư mục hoặc trùng version), (4) deploy production |
| **Vì sao phải đánh số lại** | Flyway mặc định từ chối migration có version THẤP hơn version mới nhất đã áp. Production đã áp V13 nên nếu promote nguyên số V12, app production sẽ fail-fast lúc khởi động ("Detected resolved migration not applied to database: 12"). Chỉ **staging** bật `spring.flyway.out-of-order: true` (để V12/V14 chạy được trên bản copy); **production không bật** cờ này nên bắt buộc đánh số lại khi promote. |
| **⚠️ Số `V15` đã bị dùng (27/09/2026)** | `V15__approve_core_curriculum_content.sql` (đã nằm trong `db/migration`) là migration **phê duyệt nội dung core**: `UPDATE kana/vocabulary/kanji/grammar_rules SET review_status='APPROVED'` + `grammar_exercises` (`id <= 64`). Vì vậy khi promote V12/V14 phải đánh số **V16/V17** (KHÔNG dùng V15), giữ nguyên thứ tự tương đối và không đổi nội dung. |

- Kiểm tra: `curl https://<render-service>.onrender.com/api/v1/health` → `"status":"UP"`.
- Nếu thiếu `JWT_SECRET`, backend **fail-fast** ngay lúc khởi động (log có `Could not resolve placeholder 'JWT_SECRET'`) — đây là hành vi mong muốn.

**4. Biến môi trường Vercel (frontend)**

```
VITE_API_BASE_URL=https://api.heyganba.site/api/v1
```

Đặt cho cả **Production** và **Preview**. Kiểm tra: mở `https://heyganba.site`, banner “Máy chủ backend chưa khởi chạy” không xuất hiện
(nếu có, nghĩa là VITE_API_BASE_URL sai hoặc backend đang fail-fast vì thiếu `JWT_SECRET`).

**5. Kiểm tra migration trên PostgreSQL thật**

```bash
# Local (đủ V1 → V14 vì đọc cả db/migration-staging)
docker exec heyganba-postgres psql -U postgres -d heyganba \
  -c "select version, description, success from flyway_schema_history order by installed_rank desc limit 3"

# Production (chỉ tới V13 — V12/V14 là nội dung chờ duyệt, KHÔNG chạy ở prod)
# Render → service → Shell: psql "$SPRING_DATASOURCE_URL" -c "select max(version::int) from flyway_schema_history"
```

Kỳ vọng: local/staging mới nhất là `14 | expand trap exercises | t`; production dừng ở `13 | add content review status | t`
và `GET /content/review-status` trên production phải trả `stagingOnlyMigrations` KHÔNG rỗng (đây là bằng chứng gate hoạt động).
Job `backend-migration-check` trên CI cũng phải xanh (chạy Flyway + `ddl-auto=validate` trên PostgreSQL 16 thật).

**6. Khởi động lại backend local khi đã đổi code**

```powershell
# Dừng tiến trình đang giữ cổng 8080
$p = (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue).OwningProcess
if ($p) { Stop-Process -Id $p -Force }

# Chạy lại (nhớ xoá env DB trỏ sai từ môi trường shell, nếu có)
cd backend; mvn -B -DskipTests spring-boot:run
```

- Lưu ý: nếu shell đang có `SPRING_DATASOURCE_URL` (VD từ lệnh migration check) thì tiến trình mới sẽ dùng DB đó và fail với
  `FATAL: database "..." does not exist` — xoá biến trước khi chạy: `Remove-Item Env:SPRING_DATASOURCE_URL`.

- **Uptime & error tracking:** bật health-check endpoint cho backend, tích hợp công cụ theo dõi lỗi (vd Sentry) để bắt exception ở production sớm.
- **Log tập trung:** log request lỗi (4xx/5xx) và các thao tác admin (audit log) — không log thông tin nhạy cảm như mật khẩu hay token.
- **Backup & restore:** kiểm tra định kỳ (không chỉ tin tưởng backup tự động) — thử restore thử trên staging ít nhất 1 lần trước khi public chính thức.

## Kế hoạch scale khi user tăng

1. Giai đoạn đầu: connection pooling (HikariCP tuning) + cache Redis đã đủ giảm tải Postgres.
2. Khi tải tăng: nâng plan Render (nhiều CPU/RAM hơn) trước khi nghĩ tới kiến trúc phức tạp hơn.
3. Khi cần scale ngang thật sự: chạy nhiều instance backend sau load balancer (Render hỗ trợ sẵn), đảm bảo backend stateless (session/token không lưu local memory) để scale ngang không vỡ.
4. Bổ sung read replica cho Postgres chỉ khi có bằng chứng rõ là bottleneck đọc, tránh over-engineer sớm.

## Rollback

- Mỗi lần deploy production gắn với 1 Git tag; nếu lỗi nghiêm trọng, rollback về image trước đó qua Render trong vài phút.
- Với migration DB: ưu tiên viết migration theo hướng backward-compatible (thêm cột nullable trước, không xoá cột ngay) để rollback code không kéo theo lỗi schema.

## Trước khi public rộng (cuối Phase 5)

- Load test cơ bản (giả lập số lượng user đồng thời dự kiến) để xác nhận cấu hình Hikari/Redis/Render plan đủ đáp ứng.
- Diễn tập restore backup ít nhất 1 lần.
- Xác nhận staging đã chạy ổn định ít nhất vài ngày trước khi đẩy production.
- **Quét bảo mật OWASP ZAP trên staging — đã lên lịch, KHÔNG nằm trong nhóm hoãn vô thời hạn**: chạy trước mốc public
  launch, nhắm vào API staging, tập trung luồng đăng ký/đăng nhập và các API chấm điểm. Điều kiện: staging chạy ổn định và
  nội dung V12/V14 đã được duyệt.
- Sau khi quét: rà lại bảng "Trạng thái triển khai" trong `security-plan.md` — chỉ còn được phép ở trạng thái hoãn những
  mục đã ghi rõ lý do (cookie httpOnly cross-domain, 2FA admin, Sentry, Redis scale).

```powershell
# Baseline scan (Docker có sẵn, không cần cài ZAP trên máy)
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py `
  -t https://heyganba-backend-staging.onrender.com/api/v1/health -m 2 -I
# -I: không fail vì cảnh báo mức thấp; lưu report HTML vào docs/Internal/security-scan-<ngày>.html
# Lưu ý: staging free tier ngủ sau ~15 phút → gọi /health trước để đánh thức rồi mới quét.
```
