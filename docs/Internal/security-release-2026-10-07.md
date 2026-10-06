# Security release audit — 07/10/2026

This audit maps the 20-point checklist supplied with the release request to repository, local integration, and public endpoint evidence. The old table in `security-plan.md` records the 27/09 snapshot; this report is the current status for the items it revisits.

## Checklist status

| # | Check | Status | Evidence and remaining work |
|---|---|---|---|
| 1 | Password hashing | Pass | BCrypt remains the password encoder. Registration and account responses do not return password hashes. The production account reviewed during this audit does not use the published sample credential. |
| 2 | Authentication rate limits | Pass | Existing per-account and per-IP login throttles and generic credential errors remain covered by backend tests. Admin write limit remains 30 requests/minute. |
| 3 | Session expiry and revocation | Pass | Access and refresh token TTLs remain bounded; logout/password changes revoke tokens. Refresh rotation now serializes concurrent refreshes and rejects replay. |
| 4 | Remove excess debug logs | Pass | Frontend auth no longer writes refresh/logout failures to the console. Error handling avoids echoing untrusted values. No secret or token logging was found in the changed paths. |
| 5 | Keep secrets out of frontend | Pass in source; deploy migration pending | Removed the development UI prefill for the published admin password. Migration V34 disables only the seed account that still has the exact public password hash and increments its token version. PostgreSQL test and production release must apply V34 before the item is fully deployed. |
| 6 | Avoid detailed client errors | Pass | API validation responses do not echo rejected values; unhandled errors use the generic response path. Error details remain server-side. |
| 7 | Restrict uploaded file types | Not applicable | The application has no file upload endpoint. |
| 8 | Restrict request/file size | Pass | Request bodies are capped at 64 KiB, including chunked requests; larger bodies receive 413. |
| 9 | Validate on the server | Pass | Bean validation and authorization checks remain server-side; scoring and learning progress are computed by the backend. |
| 10 | Prevent IDOR | Pass | User-owned resources are queried by both resource ID and owner ID; backend regression coverage remains in place. |
| 11 | Enforce admin RBAC | Pass | Admin routes and methods enforce backend roles. Regression coverage verifies regular users receive 403. |
| 12 | Parameterize database queries | Pass | Repositories use JPA derived/named parameters. SQL-injection regression tests remain in the suite. |
| 13 | Require HTTPS | Pass | Public HTTP endpoints redirect to HTTPS; HSTS is enabled. |
| 14 | Security headers | Pass | API and frontend configure HSTS and the expected content, framing, MIME-sniffing, referrer, and permissions protections. |
| 15 | HttpOnly, Secure, SameSite cookies | Code pass; production rollout pending | Opt-in browser auth now keeps refresh tokens in an HttpOnly, Secure, SameSite=Lax cookie, validates the request Origin, rotates refresh tokens, and returns `no-store`. Legacy clients remain compatible. Roll out only after the backend deploy: enable `VITE_AUTH_COOKIE=true` in Vercel production and redeploy the frontend. Keep preview builds on legacy transport because the preview origin is cross-site. |
| 16 | Restrict CORS | Pass | API CORS uses explicit origins. Cookie-auth mutations additionally require an allowed Origin. |
| 17 | Keep database private | Partial | Neon requires TLS and the runtime uses a restricted role, but the managed database endpoint is reachable from the public internet so Render can connect; IP allowlisting/private networking is not configured. |
| 18 | Least-privilege database role | Pass | The runtime role is not a superuser, cannot create roles/databases/schemas, and has only required data access. Flyway retains a separate owner role. Verified against production on 07/10 without exposing row data. |
| 19 | Put the web app behind Cloudflare | Partial | The API is served through Cloudflare's Render edge. The website is hosted by Vercel and is not proxied through Cloudflare. DNS is managed outside the repository; moving it requires the domain provider's configuration. |
| 20 | Backup and error monitoring | Partial | A production-format PostgreSQL backup was restored into an isolated database and key row counts matched. Neon PITR is enabled. A Sentry DSN is not configured in the Vercel production environment, and the current Render API key is rejected, so backend monitoring configuration could not be verified. |

## Release code and local verification

- Spring Boot upgraded to 3.5.16; runtime component versions were refreshed. Dependency auditing is part of CI. The sole OSV finding for Spring MVC is guarded by a regression test proving the app has no `XsltView` or `XsltViewResolver`; the vulnerable surface requires XSLT view rendering and a wildcard view mapping, neither of which this JSON API enables.
- Refresh cookie tests cover cookie flags, Origin rejection, rotation, replay rejection, and logout revocation. Browser smoke covers login, reload recovery, token storage, and desktop/mobile layouts.
- V34 is narrowly scoped to `admin@heyganba.vn` with the exact public sample hash; changed credentials are untouched. Apply it through Flyway during backend deployment.
- The production database backup was created with `pg_dump` and restored into an isolated audit database. User, vocabulary, kanji, and migration counts matched. The backup file and connection credentials are excluded from Git.
- H2 backend suite: 176 tests passed. The final PostgreSQL suite is run separately against the isolated `heyganba_security_master_20261007` database before release.
- Frontend checks: lint, build, unit tests, npm audit, dictionary/auth browser smoke, and 1440px/390px layout screenshots. Lint currently reports existing React hook warnings; it exits successfully.
- Docker Compose now binds its published service ports to loopback. Existing containers need recreation for the new binding to take effect.

## Deployment gates

1. Push the grouped commits to `develop` and wait for CI, including PostgreSQL migration and dependency checks.
2. Merge the verified `develop` tip into `main` and push `main`.
3. Wait for the protected production deployment workflow to run the Render deploy hook. Verify backend health and the V34 migration before changing frontend auth mode.
4. Set `VITE_AUTH_COOKIE=true` only in the Vercel production environment and redeploy the production frontend. Verify the cookie flow and public dictionary lookup.
5. Track remaining infrastructure work: make the Neon endpoint private/allowlisted if the provider/network plan supports it, proxy the website through Cloudflare if required, and configure/verify Sentry DSNs for both deployed apps.
