# Foundation Readiness Report

Audit date: 2026-10-07. Recommendation: **READY to begin development of Product
Update #1 behind default-OFF flags after founder approval. NOT READY for an
unconditional broad public launch** until the external/policy dependencies below
are resolved. No future product feature is implemented or enabled by this task.

## Foundation status

| Phase | Completed outcome | Validation / intentional limits |
|---|---|---|
| 0 — Truth/hygiene | Actual HEAD audit before edits, safe develop fast-forward, canonical root PRODUCT, truthful stack/docs. | No divergent history overwritten; production remains unchanged by foundation. |
| 1 — Frontend tests | Vitest/RTL/jsdom added, existing Node/Puppeteer retained, combined tests in CI. | Three justified dev dependencies only; no coverage gate or new state/browser framework. |
| 2 — API/shell | Typed client/session transport, feature APIs/types, AuthProvider, small App composition, lazy routes/Suspense, boundary/Sentry, keyed cancellation, Kana URL query. | Refresh single-flight/logout/transient/abort regressions; admin remains backend-authorized. Issue #13 updated, remaining component debt kept open. |
| 3 — Product metrics | Cohort D7/D30 separated from streak; existing study_activities reused; versioned minimal login/practice-start facts. | Mature windows only; dedupe, own principal, failed writes isolate from learning. No click stream or raw answers/PII metadata. |
| 4 — Learning contract | ADR before schema; immutable missing grammar/SRS attempt evidence after successful commit; grammar-rule skills derived on demand. | Rollback leaves no fact; SRS self-rating is not an independently graded answer. No invented taxonomy/mastery/backfill. |
| 5 — Preferences/flags | Own-account duration/consent/time API; reminder OFF, canonical zone; validated deterministic server rollout. | IDOR/input/delete cascade and Spring config tests. No preference UI, delivery or future product behavior. |
| 6 — Operations | Safe restore rehearsed, privacy/lifecycle requirements explicit, Sentry scrubbed, main CI branch protection, docs reconciled. | See runbooks for verified evidence and external launch dependencies. |

Focused integration PRs: [#18](https://github.com/thach09/heyganba/pull/18),
[#19](https://github.com/thach09/heyganba/pull/19),
[#20](https://github.com/thach09/heyganba/pull/20),
[#21](https://github.com/thach09/heyganba/pull/21),
[#22](https://github.com/thach09/heyganba/pull/22),
[#23](https://github.com/thach09/heyganba/pull/23),
[#24](https://github.com/thach09/heyganba/pull/24),
[#25](https://github.com/thach09/heyganba/pull/25),
[#26](https://github.com/thach09/heyganba/pull/26).
Documentation closes the milestone through a separate develop PR. Never infer
production rollout from those integration merges.

## Validation snapshot

These numbers describe this audit, not a permanent README promise. CI is the
ongoing source of truth.

- Frontend `npm ci`, lint, `npm test`, build and moderate dependency audit pass.
  32 React/API/privacy tests and 8 existing Node handwriting tests pass.
  Lint exits successfully with nine existing React effect warnings.
- Backend `mvn -B clean verify` passes all 196 tests. The complete same suite
  passes real PostgreSQL 16 with Flyway enabled and Hibernate schema validation,
  including V35-V37. Runtime dependency audit checks 104 artifacts: one existing
  Spring MVC OSV finding is guarded as unreachable (no XsltView/Resolver); it is
  not falsely reported as zero findings.
- Puppeteer: 21 browser checks pass, 12 real Japanese glyphs accept full traces
  and reject half traces, correct handwriting/cleared feedback pass at 1440/390.
  Desktop and mobile screenshots were inspected; no horizontal overflow or
  new modal/menu obstruction was observed. Existing font-network limitations
  keep these scripts a documented release/manual gate.
- Local real API flows: login, own preferences, practice start, server-graded
  grammar answer, SRS review and exam submission succeed; ordinary learner
  receives 403 from admin. Admin authorized content/review/2FA/rate-limit flows
  are covered by the complete H2/PostgreSQL integration suite. Browser smoke
  exercises dictionary save/notebook practice/clone and auth password/logout.
- Provider/config checks: main's three strict required jobs enforced for admins,
  production reviewer gate retained, distinct Flyway locations and content
  review guards pass; production/staging runtime default table/sequence grants
  verified over TLS. No foundation secret or academic content is introduced.

## Performance

Measured with existing Vite output, same empty-DSN build configuration; no new
bundle-analysis dependency. Entry-only and total static initial JS are distinct:

| Asset | Before foundation | After foundation |
|---|---:|---:|
| Entry JS | 485.97 kB / 138.54 kB gzip | 293.08 kB / 93.03 kB gzip |
| Initial JS including explicit static modulepreload | 485.97 / 138.54 | 305.39 / 97.80 |
| CSS | 39.42 / 8.12 | 39.51 / 8.13 |

Initial static JS decreases about 37% raw / 29% gzip. The default dashboard lazy
chunk and its shared dependencies are fetched when that route loads; they are
not included in the static initial sum. Major station chunks load on demand.
Configuring a real Sentry DSN includes its existing SDK in the build; these
empty-DSN numbers must not be presented as a Sentry-enabled production budget.

## Migration and data impact

- V35 product_events: minimal first-party start/login facts; unique dedupe and
  event/module constraints; user cascade; targeted time/event index.
- V36 learning_attempts: versioned grammar/SRS facts only where history was
  missing; existing exam/notebook results and daily aggregates remain canonical.
  User cascade, immutable content refs, targeted learner/skill/time index.
- V37 user_learning_preferences: one row per learner, constrained values,
  reminder default OFF, user cascade. Existing accounts read defaults until saved.
- No old applied migration changed. Production is still V34. Before any later
  deployment, take/verify recovery evidence, apply with Flyway owner, check
  runtime DML/sequence grants and monitor isolated event-write failures.
- There is no historical per-attempt backfill; anonymous Kana/handwriting has
  no durable attempt coverage. Cohort metrics use only available trustworthy
  completion facts and must disclose coverage. Skill evidence is counts/latest
  for existing grammar-rule identifiers, not validated mastery or learning level.

## Security, recovery and privacy

JWT/cookie migration remains intact, with type/version/revocation, Origin,
refresh rotation/replay, logout/password-change and admin RBAC/2FA tests passing.
Admin writes remain 30/minute. CSP/CORS, payload limits, content review and
least-privilege roles are preserved. New preferences cannot access another user;
flags cannot grant authorization. New telemetry explicitly excludes user text
and secrets. These tests are scoped evidence, not a guarantee of no vulnerability.

Neon actual PITR history is six hours. Local restore round-tripped 28 tables,
220,134 rows, V37 checksums and 27 FKs, including nonempty new facts/preferences;
restored application health/login/preferences passed. No production database
was restored in place. See [backup runbook](backup-recovery-runbook.md).

Password recovery, mailbox verification, account/complete personal-data deletion,
security/audit retention and legal documents remain explicit founder/provider
launch dependencies in [privacy audit](privacy-account-lifecycle-audit.md).
Existing deactivation rejects issued access/refresh sessions. Reminder storage
does not constitute notification delivery or marketing consent.

## Remaining debt and launch dependencies

1. Large admin/dictionary/station render panels, nine effect warnings and some
   shared feedback/heatmap/pure-logic extraction remain incremental debt in
   Issue #13. They were not rewritten merely to meet a line-count target.
2. Browser fixtures/font loading/teardown are not self-contained CI fixtures;
   manual smoke stays required. No validated broad skill taxonomy or full
   historical learner-event coverage exists.
3. Configure/verify deployed Sentry and alert ownership. Frontend production DSN
   was absent; current Render management key returns 401, so current backend
   monitoring/staging integration cannot be certified. Verify staging deployed
   HEAD before a production proposal.
4. Founders must choose recovery objectives/retention beyond the verified six
   hours if required. No seven-day daily backup, private Neon networking or
   Cloudflare-proxied website is claimed.
5. Resolve the privacy/account/email dependencies before broad public launch.
6. Pre-existing local scratch cleanup remains blocked by automatic action review;
   artifacts stay untracked and were not committed. New tests default outside
   the repo. This unresolved cleanup is explicitly recorded, not hidden.

## Decision and hard stop

Foundation provides tested extension points to begin **developing** Daily Learning
Plan after founder approval, with all future flags OFF. A production release or
broad launch needs the listed provider/privacy decisions and fresh release
validation. This task stops here: no Daily Plan, Mistake Notebook, streak freeze/
reminder delivery, placement test or new feedback UI is implemented automatically.
