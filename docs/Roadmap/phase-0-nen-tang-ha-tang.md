# Phase 0 — Nền tảng & Hạ tầng

> **Mục tiêu:** Có hệ thống auth chạy được end-to-end, schema lõi migration xong, CI/CD deploy tự động lên staging. Đây là nền móng cho mọi phase sau.

## Điều kiện hoàn thành (Definition of Done)

- [x] Đăng ký / đăng nhập hoạt động (JWT).
- [x] Phân quyền Admin / User hoạt động đúng — user thường không truy cập được `/api/v1/admin/**`.
- [ ] CI/CD deploy tự động lên staging (Render backend + Vercel frontend).
- [x] Test phân quyền pass.

> Ghi chú: job deploy đã sẵn sàng trong `.github/workflows/ci.yml` nhưng chỉ deploy thật sau khi set secret
> `RENDER_STAGING_DEPLOY_HOOK_URL`, `RENDER_PROD_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
> (xem `docs/Internal/deployment-plan.md`). Khi chưa set, job chỉ warning chứ không fail CI.

---

## Nhiệm vụ chi tiết

### 0.1 — Khởi tạo project Backend (Spring Boot)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Tạo project Spring Boot với Maven/Gradle, cấu hình Spring Profiles (`dev`, `staging`, `prod`), cấu hình base path `/api/v1/`. |
| **Output** | Project chạy được trên local, endpoint health check `/api/v1/health` trả `200 OK`. |
| **Ghi chú** | Dùng Java 17+. Chọn Gradle nếu muốn build nhanh hơn. |

### 0.2 — Thiết lập Database & Flyway Migration

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Cấu hình PostgreSQL connection (dev dùng local hoặc Docker, staging dùng managed). Tạo Flyway migration cho schema lõi: `users`, `roles`, `kana`, `kanji`, `vocabulary`, `grammar_rules`, `srs_reviews`, `streaks`, `lessons`. |
| **Output** | `flyway migrate` chạy xong không lỗi, schema tạo đúng trên local. |
| **Ghi chú** | Index `srs_reviews(user_id, due_date)` phải có ngay từ migration đầu tiên. Bảng `lessons` có field `slug` dạng `jpd113-b1`, `jpd123-b4`... theo `content-mapping-fpt-curriculum.md`. |

### 0.3 — JWT Authentication (Spring Security)

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Implement JWT auth flow: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`. Entity `User` có field `role` (ADMIN/USER). Mật khẩu mã hoá BCrypt. |
| **Output** | Register → nhận JWT. Login → nhận JWT. Gọi API protected → pass nếu có token hợp lệ, 401 nếu không. |
| **Ghi chú** | Token expiry nên ngắn (15–30 phút) + refresh token dài hơn. Không hardcode secret trong code — dùng env variable. |

### 0.4 — ApiResponse Wrapper

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Tạo class `ApiResponse<T>` chuẩn hoá response cho toàn bộ API: `{ success, data, error, timestamp }`. |
| **Output** | Mọi endpoint đều trả response qua wrapper này, kể cả error (validation, auth fail, not found). |
| **Ghi chú** | Viết `@ControllerAdvice` để bắt exception tập trung, không để từng controller tự handle. |

### 0.5 — Phân quyền Admin / User

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Cấu hình Spring Security: route `/api/v1/admin/**` chỉ role ADMIN truy cập. Seed 1 tài khoản admin qua Flyway migration (không hardcode trong code). |
| **Output** | User thường gọi `/api/v1/admin/...` → 403 Forbidden. Admin gọi → 200. |
| **Test bắt buộc** | Viết integration test kiểm tra: user gọi admin route → 403, admin gọi → pass. |

### 0.6 — CORS & Security Hardening

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | CORS whitelist chỉ cho domain frontend (dev: `localhost:3000/5173`, staging: domain Vercel). HikariCP tuning cho free/starter tier hosting. |
| **Output** | Request từ domain khác bị block. Connection pool không leak trên hosting nhỏ. |
| **Ghi chú** | HikariCP: `maximumPoolSize` = 5–10 cho free tier, `connectionTimeout` = 30s, `idleTimeout` = 10min. |

### 0.7 — Khởi tạo project Frontend (React + Vite + TS)

> [!IMPORTANT]
> **Đã chốt:** Dùng **React + Vite + TypeScript** theo roadmap. Xoá toàn bộ code Next.js template cũ trong repo.

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Xoá code Next.js cũ (`app/`, `public/`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`). Tạo project mới bằng Vite: `npx -y create-vite@latest ./frontend --template react-ts`. Cấu trúc thư mục theo trạm: `src/features/kana/`, `src/features/flashcard/`, `src/features/kanji/`, `src/features/grammar/`, `src/features/exam/`. Shared components trong `src/components/`. |
| **Output** | `npm run dev` chạy được, routing cơ bản giữa các trạm hoạt động. |

### 0.8 — Layout khung Frontend

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | Dashboard chính + sidebar/navbar điều hướng 5 trạm + khu vực Admin (ẩn với user thường). |
| **Output** | Navigate giữa 5 trạm + trang admin (nếu đăng nhập admin). Responsive trên mobile. |
| **Component dùng chung** | Nút submit thống nhất, hệ thống thông báo đúng/sai (toast/inline), tooltip onboarding. |

### 0.9 — CI/CD Pipeline

| Hạng mục | Chi tiết |
|---|---|
| **Việc cần làm** | GitHub Actions: build + test backend khi push, auto deploy backend lên Render, auto deploy frontend lên Vercel. Docker cho backend. |
| **Output** | Push code → CI chạy test → deploy staging tự động. |
| **Ghi chú** | Render free tier có cold start ~30s — chấp nhận ở giai đoạn này. |

---

## Thứ tự thực hiện đề xuất

```
0.2 (DB + Migration)
  └─→ 0.1 (Spring Boot project)
        └─→ 0.3 (JWT Auth)
              └─→ 0.4 (ApiResponse)
                    └─→ 0.5 (Phân quyền)
                          └─→ 0.6 (CORS + Security)

0.7 (Frontend project)  ← có thể làm song song với backend
  └─→ 0.8 (Layout khung)

0.9 (CI/CD)  ← làm sau khi cả backend + frontend đã chạy local
```

## Rủi ro / Cần xác nhận

1. **Hosting:** Render free tier có cold start ~30s. Có chấp nhận không?
2. **Admin seed data:** Email/password admin ban đầu cần Thach cung cấp, không tự bịa.
3. **Mật khẩu admin mặc định** (`admin@heyganba.vn`) đang nằm trong `V2` seed + README → phải đổi ngay sau lần deploy
   staging đầu tiên (hoặc coi seed admin là tài khoản chỉ dùng ở local/staging).

---

## Trạng thái triển khai (cập nhật gần nhất)

**Backend — bảo mật & ổn định:**
- JWT tách loại token qua claim `token_type` (access/refresh) → refresh token không dùng được như access token và
  ngược lại; mỗi token có thêm `jti`.
- Tài khoản `is_active = false`: không login được, token cũ bị vô hiệu, refresh token cũng bị từ chối.
- `JWT_SECRET` không còn giá trị mặc định ở staging/prod → app **fail-fast** khi thiếu; môi trường dev giữ default riêng
  (`application-dev.yml`).
- Bật `server.forward-headers-strategy` để backend nhận đúng scheme/host (HTTPS) khi chạy sau proxy Render.
- `@ControllerAdvice` xử lý thêm: JSON sai định dạng → 400, thiếu param → 400, sai HTTP method → 405,
  path không tồn tại → 404 (trước đây các case này rơi vào 500).
- `management.endpoint.health.show-details: never` ở prod.
- Test: **21/21 pass** — AuthIntegration 6, SecurityRbac 4, BCrypt 1, SecurityHardening 10 (mới).

**CI/CD (`.github/workflows/ci.yml`):**
- `backend-migration-check`: chạy Flyway + `ddl-auto=validate` trên PostgreSQL 16 thật trong service container
  (đã verify local trên Postgres 16: V1+V2 apply ok, 14 bảng, entity khớp schema).
- Deploy Render: staging tự động khi push `main`/`develop`, production gated bằng GitHub Environment `production`
  (cần bật Required reviewers).
- Deploy Vercel: preview cho staging, `--prod` cho production.
- Frontend CI thêm bước `npm run lint`, upload artifact `frontend/dist`, và `concurrency` để huỷ run cũ.

**Frontend / cấu hình deploy:**
- `VITE_API_BASE_URL` (mặc định `/api/v1` cho dev proxy) để trỏ API staging/prod sang Render.
- `frontend/vercel.json` (framework/build/output + security headers), `render.yaml` (blueprint tuỳ chọn),
  `backend/.env.example`, `frontend/.env.example`.
- Nút "Nạp sẵn tài khoản Admin thử nghiệm" chỉ hiện ở môi trường dev (`import.meta.env.DEV`).

**Cần Thach làm (không nằm trong code):**
1. Set secret GitHub Actions: `RENDER_STAGING_DEPLOY_HOOK_URL`, `RENDER_PROD_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
2. Set env var trên Render: `SPRING_PROFILES_ACTIVE`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `DB_*`.
3. Set `VITE_API_BASE_URL` trên Vercel (Production + Preview).
4. Bật Required reviewers cho Environment `production`; xác nhận có dùng Vercel Git Integration song song không
   (nếu có thì có thể bỏ 2 job deploy frontend để tránh deploy trùng).
