# Foundation audit — current HEAD

Baseline: `d8c5444` on 2026-10-07, before foundation refactoring. This audit
compares actual files with Issue #13; its checkboxes are not completion evidence.

## Repository and documentation truth

- Remote `develop` had zero unique commits and was three commits behind `main`.
  It was safely fast-forwarded to `main`, then this branch originated from it.
- Root AGENTS referenced absent root PRODUCT/DESIGN files. An existing product
  briefing lives in `frontend/PRODUCT.md`; root PRODUCT now captures approved
  behavior and the explicitly unimplemented five-item roadmap, without invented
  learner requirements. The visual source remains `frontend/DESIGN.md`.
- README claimed Boot 3.4.3, TypeScript 5.x and a static passing-test count. Actual
  build files use Boot 3.5.16 and TypeScript ~6.0.2. CI owns test status.
- README conflated D7/D30 retention with uninterrupted streak. These require
  separate cohort/activity and streak-survival definitions.
- ARCHITECTURE's localStorage-only auth description is stale. Production's
  cookie mode keeps access tokens in memory and refresh tokens in HttpOnly
  cookies. Legacy bearer transport remains supported for preview/local clients.
- `docs/Design/` referenced by AGENTS is absent at this HEAD. Existing visual
  rules and shipped UI are the preservation baseline; no layout redesign planned.

## Frontend audit

`App.tsx` owns layout, responsive drawer, auth profile, auth/password modals,
expiration notifications, logout, health/streak requests, route definitions and
in-memory Kana script selection. Auth is passed through each station. Routes are
eager; refreshing a Katakana selection loses script state. There is no root
ErrorBoundary. Shared FeedbackAlert/SubmitButton/Modal already exist.

`services/api.ts` mixes transport, profile/token persistence, refresh/logout and
the class-code domain call. Refresh single-flight and epoch protection already
exist and must be regression-tested, not replaced. It returns result envelopes;
no need to change all views to exception semantics. Errors are untyped and abort
is treated as a network error. Views own endpoint strings and inline DTOs.
TTS uses a separate raw fetch and protects playback against stale requests, but
has no shared refresh transport. Most view requests have no abort lifecycle.

Large components: AdminView 1299 lines, DictionaryNotebookView 960, ExamView 774,
GrammarView 637, KanjiStationView 548, FlashcardView 507. Some splits are justified
after safety tests; avoid blanket rewrite or splitting unrelated behavior.

Issue #13's no-tests claim is stale: Node ink scoring tests and Puppeteer browser,
glyph and pointer-based handwriting smoke scripts exist. CI runs Node tests.
React/API/auth/routing component tests are missing. Browser smoke creates an
account in an isolated backend; it must not run against production.

Baseline `npm run build`: initial JS **485.97 kB / 138.54 kB gzip**, CSS
39.42 kB / 8.12 kB gzip; one eager application JS chunk. Compare same build mode
after lazy routes. Lint passes with existing React effect warnings.

## Backend and data audit

- User: email/name/class code, role, active state, 2FA secret/enable state and
  token version. No reminder consent, daily-goal preferences or placement model.
- StudyActivity is a daily `(user,date,source)` aggregate with item/correct counts
  for FLASHCARD/GRAMMAR/EXAM. It can measure meaningful completion days independently
  of streak qualification, but cannot identify a grammar exercise/mistake.
- SrsReview is current SM-2 state per user/vocabulary; it overwrites history and
  does not preserve individual graded attempts. Kanji progress stores practice
  count. Grammar checks record daily totals, not per-exercise attempts. Exams
  persist server-graded results and detailed responses. Notebook practice has
  its own metrics. EXP is derived from existing activity/progress, not a separate
  EXP event history. No general analytics event stream exists.
- Password change revokes sessions through token version; disabled users fail
  JWT/refresh checks. Recovery email, verification and self-service personal-data
  deletion APIs are absent. Existing security/audit retention decisions are not
  a legal privacy policy. Document launch dependencies before implementing any.
- Security boundaries include access-token type/version/revocation checks, 2FA,
  RBAC, origin validation for cookie auth, CORS, CSP and payload/rate limits.
  Preserve their architecture and current regression suites.
- Flyway approved migrations are in `db/migration`, pending academic content in
  `db/migration-staging`; prod loads only approved locations. Existing Java
  dictionary repeatable migration and V34 must remain unchanged. New schema
  requires new versions. H2 and real PostgreSQL/Flyway CI are already present.

## Delivery and operations audit

CI has frontend lint/build/Node tests/dependency audit, backend clean verify and
runtime dependency audit, then PostgreSQL migration/schema test. Production
Render deploy depends on all validation jobs and uses the protected production
environment. Develop Render auto-deploy and Vercel Git integration are distinct
paths; do not add duplicate hooks. Frontend production Git integration currently
deploys independently of GitHub test completion; this is an operational limitation
to document, not a reason to add a duplicate deploy job.

Sentry SDKs are present, frontend initialized only with a DSN; no ErrorBoundary
or explicit privacy scrubbing exists. Last release evidence says frontend DSN
unset and Render management API access rejected (401); do not claim active
monitoring from SDK presence alone. Health already exposes lightweight app UP,
production actuator details are hidden and optional Redis health is disabled.

The prior release exercised a production-format backup restore into an isolated
database and documented matching key counts. Neon PITR exists, but a dated claim
of six-hour retention is not a current plan guarantee. A usable runbook with
safe local rehearsal and provider verification remains necessary.

## Execution gates

Proceed in focused phases: truth → test safety net → API/shell → analytics →
learning contract → preferences/flags → operations. Tests must pass before the
next phase. No new learner-facing roadmap feature, Japanese seed, state library,
notification provider, queue or mandatory Redis is introduced. Record phase
validation and remaining limits in the final readiness report; foundation is
not complete merely because existing tests pass.
