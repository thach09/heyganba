# Jiayou — local UX and account QA

Reviewed 2026-10-31. Base main: `ce80be4b9adf780aee2bb387bb26e93770df7243`.
The final main SHA and GitHub run URLs are recorded in the release handover receipt
and final delivery message after the protected merge. A commit cannot contain its own SHA.

## Brand and interface

The approved attachment is preserved byte-for-byte at
`docs/Design/brand/jiayou-logo-approved.png` (2172×724 RGBA;
SHA-256 `8ea10c5e31017d9bad370051195b817654dbe472b32b3597b1d19e01752acbab`).
The suggested `D:\GitHub\jiayou-assets` source was absent; the owner's attached PNG
was available in Downloads. No replacement artwork was generated.
`scripts/prepare-approved-brand.py` crops, pads and proportionally resamples that
PNG; `frontend/public/brand/manifest.json` records the derivatives and hashes.
Wordmarks, compact icon, 32px favicon and 180px touch icon retain the approved artwork.
The original is raster, not SVG. Obsolete public placeholder icons are archived under
`docs/Design/brand/legacy-*`; active references use the approved PNG variants.

`BrandLogo` supplies alt text, proportional sizing, high-density wordmark and text
fallback. A fixed existing dark palette plate keeps the white wordmark legible in
both themes. The Chinese subtitle is removed. Navigation is flat and Vietnamese:
Hôm nay, Pinyin, Chữ Hán, Từ vựng, Từ điển, Ngữ pháp, Luyện tập, Tôi.
Quản trị remains admin-only. Redundant Chinese UI labels, decorative text and
developer milestone labels were removed; educational Hanzi/Pinyin were retained.
The mobile header, drawer, focus restoration and theme controls remain available.

## Encoding root cause and regression

The old real anonymous `/api/v1/users/me` response was HTTP401,
`application/json;charset=ISO-8859-1`. Raw bytes contained `l\xf2ng` and literal
question marks where Vietnamese characters had already been lost. Decoding that
response as UTF-8 reproduced the owner's corrupted message. This was a servlet
writer/transport defect, not missing font glyphs or a corrupted database row.

Security401/403, admin429 and payload413 responses now share `JsonHttpResponse`:
set JSON and UTF-8 before serialization and write Jackson JSON to the byte stream.
The new real HTTP401 preserves exactly “Vui lòng đăng nhập để tiếp tục.”
Tests cover Vietnamese, Hanzi, Pinyin tone marks and combining marks, plus a real
registration/profile database round trip. No mass normalization or SQL rewrite occurred.
321 active source/resource files decoded as UTF-8 with no replacement characters
or the searched corruption signatures. PostgreSQL reports UTF8. Local font coverage,
fallback declarations and notices retain their existing regressions.

References: [ServletResponse writer charset](https://jakarta.ee/specifications/platform/10/apidocs/jakarta/servlet/ServletResponse.html),
[RFC8259 JSON UTF-8](https://www.rfc-editor.org/rfc/rfc8259.html).
Windows console/log encoding alone is not evidence of corrupt HTTP or stored data;
the regression checks inspect response bytes and parsed Unicode values.

## Guest and account boundaries

| Area | Guest behavior / personal boundary |
|---|---|
| Dashboard | Public introduction; personal activity/statistics need login |
| Pinyin | Honest pending state; login does not unlock unapproved lessons |
| Hanzi | GET approved list/detail; local writing exploration; saving progress needs login |
| Vocabulary / flashcards | Public approved collection when available; notebook/SRS persistence needs login |
| Dictionary | Public lookup; personal notebook modifications need login |
| Grammar | GET approved rule list/detail; exercises/checks and saved progress need login |
| Exams | Friendly login prompt; sessions/results/history remain private |
| Tôi | Separate login/register actions; no private profile for guests |

Only exact GET routes for Hanzi/legacy Kanji and grammar rules became public.
Existing `ContentAccess` filters still reject pending content. Anonymous Hanzi reads
do not query another user's practice counts. Writes, private APIs and admin controls
retain authentication/ownership/rate limits. Admin writes remain 30/minute/admin.

`/toi` reuses GET `/users/me`, PUT `/users/me/class-code`, PUT `/auth/password`
and POST `/auth/logout`, existing auth context and password modal. No new API or
profile-edit endpoint was introduced. Name/email/role/join date are read-only;
class code is the existing supported setting. Tokens, hashes and 2FA secrets are
not rendered. Responses are owner-checked and late previous-account responses are
discarded. Malformed/foreign profiles fail closed; logout remains available when
profile loading fails. Failed server revocation retains the local session and an
honest retry notice. Password change requires the current password, revokes tokens
and requires reauthentication. Learning recovery behavior is unchanged.

## Verification and evidence

| Check | Local result |
|---|---|
| Node24 `npm ci`, full `npm audit`, production audit | PASS, zero vulnerabilities |
| Frontend lint / production build | PASS |
| Node tests / Vitest | 9 / 303 PASS |
| `mvn -B clean verify` (H2) | 537 tests, zero failures/errors, 7 conditional skips |
| Full API suite with PostgreSQL16 / Flyway / Hibernate validate | PASS |
| Opt-in legacy schema rehearsal | 3 PASS |
| Independent Jiayou bootstrap guards + real PostgreSQL bootstrap | 20 + 4 PASS |
| Runtime dependency audit | PASS, 104 dependencies; two existing reachability exclusions, detailed below |
| Compose validation, both Docker images, offline Nginx test | PASS |
| Backend offline with missing production identity | Expected nonzero exit; JIAYOU_PRODUCT guard rejects startup |
| Real Chrome / Windows, development and production build | 118 checks PASS |
| Public routes ×390/768/1024/1440 ×light/dark | 64 combinations PASS |

The seven default-suite skips are the opt-in 3 PostgreSQL rehearsal and 4 bootstrap
tests; both were explicitly enabled and passed separately. Source-history preflight
is intentionally skipped in normal GitHub CI: it requires an explicit operator
workflow input and is not a production compatibility certificate.
The runtime audit still reports `spring-webmvc 6.2.19` advisories
`GHSA-j9f9-w8pj-32f8` (SSE view fragments) and `GHSA-pc63-qcmh-9cmg` (XsltView)
as NOT REACHABLE under existing, test-guarded exclusions. This change adds no
exception or severity downgrade. Those conditions must be revisited before adding
SSE fragments/server-rendered views. “PASS” does not mean the audit returned no advisory records.

Browser journeys used real registration/login, Spring Boot `dev` and a dedicated
loopback PostgreSQL16 container/database, not fabricated JWTs or mocked API responses.
They checked profile reload, mixed Unicode, class-code persistence, current-password
change, old-token401, logout/relogin, protected URL after logout, genuinely revoked
sessions and switching two normal accounts. Guest route checks covered meaningful
content/empty states, no horizontal overflow, loaded logos and no replacement text.
Mobile drawer open/Escape/focus return passed. No uncaught JS exceptions occurred.
Expected401 responses belong to deliberate revocation/expiry tests, not public
guest browsing. Initial test failures from outdated UI labels were updated while
retaining scoring, visibility and persistence assertions. A real contrast defect in
the new guest login button was found by screenshot review and fixed.

Evidence: [browser checks](local-ux-evidence/real-browser-results.json),
[public visual matrix](local-ux-evidence/public-visual-matrix.json),
[static review](local-ux-evidence/static-review.json),
[PostgreSQL checks](local-ux-evidence/postgres-checks.json),
[container checks](local-ux-evidence/container-checks.json),
[separate final diff review](local-ux-evidence/final-diff-review.json).
Private local runtime files, passwords, JWTs and raw debug logs stay outside Git.

Before: [desktop](local-ux-evidence/before-1440-guest.png),
[mobile](local-ux-evidence/before-390-guest.png).
After: [desktop dark guest](local-ux-evidence/production-1440-dark-guest-account.png),
[desktop account](local-ux-evidence/production-1440-account-signed-in.png),
[mobile account](local-ux-evidence/production-390-account-signed-in.png),
[mobile menu](local-ux-evidence/production-390-menu.png),
[mobile homepage](local-ux-evidence/after-dashboard-390-light.png).
Only disposable fictional accounts appear in screenshots.

## Content and limits

No curriculum, Chinese/Vietnamese pair, Pinyin lesson, historical migration or
publication permission was changed. Vietnamese feedback labels are UI states, not
dictionary translations. Existing source/rights limitations remain documented in
`engineering-audit-evidence/source-ledger.json` and `docs/m6-curriculum-sources.md`.
Unsupported HSK-certification wording was not introduced; internal exercises remain
internal practice. This work does not certify every historical academic claim.

The disposable `dev` lineage contains historical approved fixtures (75 Hanzi,
42 grammar rules), not a newly approved production corpus. No content was promoted
for testing. Initial `jiayou-prod` stays schema-only with publication guards intact.
No real local admin browser journey was claimed: the fixture had zero admin users;
admin/RBAC behavior was covered by isolated automated test fixtures. No insecure
admin seed, demo password, bypass or production fixture was added.
Chrome was automated on Windows; Linux execution is covered by GitHub CI. Safari,
Firefox, physical Mandarin voice output and real production infrastructure were
not certified by these tests. They remain manual acceptance checks where needed.

## Safe local acceptance workflow

Use Node24, JDK21, Maven3.9, PostgreSQL16. Start from a clean checkout of main.
Keep private local environment files outside the repository. Create a uniquely
named disposable database/container, generate a random local database password and
JWT secret, and bind PostgreSQL and backend only to `127.0.0.1` on free ports.
Never reuse Ganbarou, Neon, staging, a shared database or a production datasource.

In the backend terminal explicitly set `SPRING_PROFILES_ACTIVE=dev`,
`SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:<free-port>/<disposable-db>`,
`SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`,
`SERVER_ADDRESS=127.0.0.1`, `PORT=<free-backend-port>` and
`CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173` from that private
environment. Then run `mvn spring-boot:run` from `backend`.
The explicitly selected dev lineage initializes only this disposable database;
do not point it at a fresh production bootstrap or a legacy live database.

In a separate frontend terminal run `npm ci`, set `DEV_API_TARGET` to
`http://127.0.0.1:<free-backend-port>`, and run
`npm run dev -- --host 127.0.0.1`. This existing Vite setting is a server-side local
proxy target, not a credential or production API variable. Do not override an
already-running developer service. Open `/toi`, register your own normal user,
check reload, class code, password change, logout, guest refresh and a second user.
Do not add an administrator to make pending lessons appear available.

For production-build local acceptance use `npm run build` and
`npm run preview -- --host 127.0.0.1 --port <free-port>` with the same loopback
`DEV_API_TARGET` and include that origin in the disposable backend CORS list.
Keep `VITE_API_BASE_URL` unset or `/api/v1`; requests use the local same-origin proxy.
Never pull production secrets into this workflow. Stop only task-owned processes
and containers after testing; retain or remove disposable storage only under its
explicit owner-controlled lifecycle. Production bootstrap is a separate procedure.

## Release isolation

Read-only verification: GitHub main is strict and admin-enforced with the three
required CI checks; no repository webhooks. Vercel repo-ID lookup returns no linked
projects and tracked deployment configuration disables Git deployment. Render's
historical main/develop services have auto-deploy off and PR previews off. Other
projects remain untouched. CI validates; it does not deploy. These gates must still
hold immediately before a protected merge. GitHub job results and exact merged SHA
are verified separately in the final release receipt, never inferred from local tests.

Ganbarou, its host, DNS, public routing, live databases and production settings were
not accessed or modified. `jiayou-prod`, SQL checksums, independent Flyway lineage,
publication controls and original preservation evidence remain unchanged.
