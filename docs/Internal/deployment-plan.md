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
- **Staging**: tạo Web Service thứ 2 trỏ branch `develop`, dùng **branch riêng trong Neon** (`develop` branch của project Neon
  → Neon free cho ~10 branch, tách dữ liệu staging khỏi production, chạy được cả V12/V14 là nội dung chờ duyệt).
- **Neon free**: 0.5GB storage, **không hết hạn theo thời gian** (khác Render Postgres free hết hạn sau 30 ngày), có
  *point-in-time restore* trong 6 giờ (bản mới) → đáp ứng nhu cầu "backup retention tối thiểu 7 ngày" tốt hơn; muốn giữ lâu hơn thì nâng plan hoặc `pg_dump` định kỳ (xem `backups/`, đã gitignore).
- CI: push `develop` → deploy staging (tự động); push `main` → deploy production (job dừng ở GitHub Environment
  `production` để chờ duyệt thủ công).

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

| Bản ghi | Host (Namecheap) | Type | Value | Ghi chú |
|---|---|---|---|---|
| Frontend — apex | `@` | A | `76.76.21.21` | IP anycast của Vercel (Vercel → Project → Domains hiển thị giá trị chính xác; nếu khác thì dùng giá trị Vercel báo) |
| Frontend — www | `www` | CNAME | `cname.vercel-dns.com` | Vercel tự redirect `www` ⇄ apex |
| Backend API | `api` | CNAME | `<service>.onrender.com` | Render → service → Settings → Custom Domains hiển thị target thật khi thêm domain `api.heyganba.site` |
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
| GitHub → Settings → Secrets and variables → Actions | `RENDER_STAGING_DEPLOY_HOOK_URL` | Job `deploy-backend-staging` (Render Deploy Hook của service staging) |
| GitHub Actions secrets | `RENDER_PROD_DEPLOY_HOOK_URL` | Job `deploy-backend-production` |
| GitHub Actions secrets | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Job `deploy-frontend-staging` / `deploy-frontend-production` |
| Render (Environment) | `SPRING_PROFILES_ACTIVE`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `DB_HOST/PORT/NAME/USER/PASSWORD` | Backend runtime — mẫu ở `backend/.env.example` |
| Vercel (Production + Preview) | `VITE_API_BASE_URL` | Frontend gọi API Render — mẫu ở `frontend/.env.example` |

- `JWT_SECRET` **không có giá trị mặc định** ở staging/production: thiếu là backend fail-fast lúc khởi động
  (dev vẫn có default riêng trong `application-dev.yml`). Tạo key mới bằng `openssl rand -base64 48`.
- Job deploy tự bỏ qua kèm `::warning::` khi secret chưa tồn tại → CI xanh trước khi hạ tầng được cấu hình xong.
- Nếu project Vercel đang bật Git Integration (auto deploy khi push), có thể xoá 2 job `deploy-frontend-*` để tránh
  deploy trùng; khi đó Vercel tự lo phần frontend, GitHub Actions chỉ còn test + migration check + deploy backend.


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
| `RENDER_STAGING_DEPLOY_HOOK_URL` | Render → service staging → Settings → Deploy Hook | Chạy `workflow_dispatch` nhánh `develop`, xem log job `deploy-backend-staging` không còn dòng `::warning::` |
| `RENDER_PROD_DEPLOY_HOOK_URL` | Render → service production → Settings → Deploy Hook | Push vào `main`, job `deploy-backend-production` phải in `Đã trigger deploy backend production trên Render.` |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens (scope = project) | Job `deploy-frontend-*` không còn `::warning::` thiếu token |
| `VERCEL_ORG_ID` | `frontend/.vercel/project.json` sau khi chạy `vercel link` | Ở job deploy, `vercel pull` chạy thành công |
| `VERCEL_PROJECT_ID` | Cùng file `project.json` | Như trên |

**2. GitHub Environment `production` có Required reviewers**

- Settings → Environments → New environment: `production` → bật **Required reviewers** (chọn chính bạn) → lưu.
- (Tuỳ chọn) Thêm environment `staging` không cần reviewer để deploy staging tự động.
- Kiểm tra: push thử vào `main` → 2 job `deploy-*-production` phải dừng ở trạng thái *Waiting for review*.

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
| Đang chờ duyệt | `V12__expand_grammar_exercises.sql` (96 câu), `V14__expand_trap_exercises.sql` (146 câu nhóm bẫy) |
| Trạng thái trong DB | `review_status` (V13) mặc định `PENDING_REVIEW` cho kana/từ vựng/kanji/ngữ pháp/bài tập |
| Kiểm tra tự động | `FlywayLocationsConfigTest` (chặn sửa prod yml include staging, chặn đặt file chờ duyệt vào `db/migration`, chặn trùng version) |
| Kiểm tra thủ công | `GET /content/review-status` → `allApproved=false`, `stagingOnlyMigrations=[V12…, V14…]`; UI Trạm Trợ từ hiện badge "chờ duyệt" |
| **Promote** | Sau khi người biết tiếng Nhật duyệt: (1) `UPDATE … SET review_status='APPROVED'`, (2) **chuyển file** từ `db/migration-staging/` sang `db/migration/`, (3) chạy lại CI (test sẽ đỏ nếu file còn ở sai thư mục), (4) deploy production |

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
