# Security release audit — 07/10/2026

This audit maps the 20-point checklist supplied with the release request to repository, local integration, and public endpoint evidence. The old table in `security-plan.md` records the 27/09 snapshot; this report is the current status for the items it revisits.

## Checklist status

| # | Check | Status | Evidence and remaining work |
|---|---|---|---|
| 1 | Password hashing | Pass | BCrypt remains the password encoder. Registration and account responses do not return password hashes. The production account reviewed during this audit does not use the published sample credential. |
| 2 | Authentication rate limits | Pass | Existing per-account and per-IP login throttles and generic credential errors remain covered by backend tests. Admin write limit remains 30 requests/minute. |
| 3 | Session expiry and revocation | Pass | Access and refresh token TTLs remain bounded; logout/password changes revoke tokens. Refresh rotation now serializes concurrent refreshes and rejects replay. |
| 4 | Remove excess debug logs | Pass | Frontend auth no longer writes refresh/logout failures to the console. Error handling avoids echoing untrusted values. No secret or token logging was found in the changed paths. |
| 5 | Keep secrets out of frontend | Pass | Removed the development UI prefill for the published admin password. Migration V34 disables only the seed account that still has the exact public password hash and increments its token version. PostgreSQL regression coverage passed, and the production backend rollout completed with V34 in the deployed migration set. |
| 6 | Avoid detailed client errors | Pass | API validation responses do not echo rejected values; unhandled errors use the generic response path. Error details remain server-side. |
| 7 | Restrict uploaded file types | Not applicable | The application has no file upload endpoint. |
| 8 | Restrict request/file size | Pass | Request bodies are capped at 64 KiB, including chunked requests; larger bodies receive 413. |
| 9 | Validate on the server | Pass | Bean validation and authorization checks remain server-side; scoring and learning progress are computed by the backend. |
| 10 | Prevent IDOR | Pass | User-owned resources are queried by both resource ID and owner ID; backend regression coverage remains in place. |
| 11 | Enforce admin RBAC | Pass | Admin routes and methods enforce backend roles. Regression coverage verifies regular users receive 403. |
| 12 | Parameterize database queries | Pass | Repositories use JPA derived/named parameters. SQL-injection regression tests remain in the suite. |
| 13 | Require HTTPS | Pass | Public HTTP endpoints redirect to HTTPS; HSTS is enabled. |
| 14 | Security headers | Pass | API and frontend configure HSTS and the expected content, framing, MIME-sniffing, referrer, and permissions protections. |
| 15 | HttpOnly, Secure, SameSite cookies | Pass | Production uses refresh tokens in an HttpOnly, Secure, SameSite=Lax cookie, validates the request Origin, rotates refresh tokens, and returns `no-store`. The production browser smoke observed `X-Auth-Transport: cookie`; trusted-origin CORS succeeds and an untrusted origin is rejected. Legacy API clients remain compatible; preview builds retain legacy transport because the preview origin is cross-site. |
| 16 | Restrict CORS | Pass | API CORS uses explicit origins. Cookie-auth mutations additionally require an allowed Origin. |
| 17 | Keep database private | Partial | Neon requires TLS and the runtime uses a restricted role, but the managed database endpoint is reachable from the public internet so Render can connect; IP allowlisting/private networking is not configured. |
| 18 | Least-privilege database role | Pass | The runtime role is not a superuser, cannot create roles/databases/schemas, and has only required data access. Flyway retains a separate owner role. Verified against production on 07/10 without exposing row data. |
| 19 | Put the web app behind Cloudflare | Partial | The API is served through Cloudflare's Render edge. The website is hosted by Vercel and is not proxied through Cloudflare. DNS is managed outside the repository; moving it requires the domain provider's configuration. |
| 20 | Backup and error monitoring | Partial | A production-format PostgreSQL backup was restored into an isolated database and key row counts matched. Neon PITR is enabled. A Sentry DSN is not configured in the Vercel production environment, and the current Render API key is rejected, so backend monitoring configuration could not be verified. |

## Release code and local verification

- Spring Boot upgraded to 3.5.16; runtime component versions were refreshed. Dependency auditing is part of CI. The sole OSV finding for Spring MVC is guarded by a regression test proving the app has no `XsltView` or `XsltViewResolver`; the vulnerable surface requires XSLT view rendering and a wildcard view mapping, neither of which this JSON API enables.
- Refresh cookie tests cover cookie flags, Origin rejection, rotation, replay rejection, and logout revocation. Browser smoke covers login, reload recovery, token storage, and desktop/mobile layouts.
- V34 is narrowly scoped to `admin@heyganba.vn` with the exact public sample hash; changed credentials are untouched. It passed PostgreSQL regression coverage and was included in the production backend rollout.
- The production database backup was created with `pg_dump` and restored into an isolated audit database. User, vocabulary, kanji, and migration counts matched. The backup file and connection credentials are excluded from Git.
- H2 backend suite: 177 tests passed. Fresh PostgreSQL 16 CI migration suite passed. A restored production backup clone validated 28 migrations, applied 9 through V34, and started the production profile successfully.
- Frontend checks: lint, build, unit tests, npm audit, dictionary/auth browser smoke, and 1440px/390px layout screenshots. Lint currently reports existing React hook warnings; it exits successfully.
- Docker Compose binds its published service ports to loopback; PostgreSQL and Redis are healthy with the existing named data volume preserved. The separate older `heyganba` development database has checksum drift in V9/V12 and was left untouched. The live local tester at ports 5174/8081 uses an isolated current-schema database and passed dictionary, cookie-auth, and responsive browser smoke suites.

## Production deployment

- Verified `develop` commit `d1c4133` and merged/pushed `main` commit `a7ebfeb`. H2, frontend, PostgreSQL/Flyway, dependency, and npm audit checks passed; the protected Render deploy hook completed.
- Production API health is `UP`. Live dictionary queries return 3 relevant matches for `hỏa` (without `hoa quả`), 4 for `cháy`, 4 for `cảnh sát`, and 3 for `bác sĩ`. Production browser checks passed at 1440px and 390px with no horizontal overflow.
- Set `VITE_AUTH_COOKIE=true` only for Vercel production and built a new deployment from `a7ebfeb`; its production alias is ready. A browser smoke observed the cookie transport header on `heyganba.site`.
- Remaining infrastructure work: configure private/allowlisted Neon connectivity if the provider/network plan supports it, proxy the website through Cloudflare if required, and configure/verify Sentry DSNs for both deployed apps. Render API management credentials currently return HTTP 401; the GitHub deploy hook remains operational.
