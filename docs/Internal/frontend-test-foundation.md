# Frontend test foundation

`npm test` runs both the existing Node handwriting tests and Vitest React/API
regressions. `npm run test:legacy` and `npm run test:unit` remain independently
available. CI invokes the combined command and retains lint/build/dependency
auditing. No arbitrary coverage threshold is used.

## Dependency decision

Vitest is a development-only runner that uses the existing Vite/TypeScript
pipeline. React Testing Library exercises user-visible React behavior; jsdom
supplies DOM APIs for components without launching a full browser. These are
the approved test dependencies from Issue #13; no state/fetch library, MSW or
additional browser framework is introduced. Existing locked production
dependency versions are preserved.

## Critical regressions

Transport success/network failures, unauthorized refresh/retry, concurrent
single-flight rotation, invalid-session expiry, transient refresh failure,
logout/refresh races and cookie transport migration are tested before shell
refactoring. Shell tests cover restore, login, logout, expiration, public routes
and the admin gate. Cancellation and provider/boundary/lazy-route behavior get
additional tests with the corresponding Phase 2 implementation.

## Browser gate decision

Preserve the existing Puppeteer smoke/glyph/handwriting scripts. The full smoke
currently assumes a populated isolated backend, creates a test account without
self-contained fixture teardown, and defaults to a Windows Chrome path. Glyph
tests depend on externally loaded Google fonts and a running Vite source server.
These assumptions make an unattended CI job dependent on mutable fixtures and
network availability. Keep this as a release/manual gate until its bootstrap,
local fonts and disposable test-account cleanup are made deterministic. Do not
point it at production and do not add a heavyweight browser dependency.

Use `CHROME_PATH`, `AUDIT_WEB_URL`, `AUDIT_API_URL` and `AUDIT_OUTPUT` for the
isolated rehearsal. Review screenshots at 1440px and 390px. Generated logs,
downloads, screenshots and dependencies are ephemeral evidence; the reviewed
release report is the durable source-controlled record.
