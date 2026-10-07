# Foundation operational readiness

Verified 2026-10-07. Use this record plus
[backup/recovery](backup-recovery-runbook.md),
[privacy/lifecycle](privacy-account-lifecycle-audit.md) and
[foundation report](FoundationReadinessReport.md), rather than historical plans
as evidence of deployed settings.

## Delivery authority

- `main` remains production; foundation integrates through focused PRs into
  `develop`. No foundation code is merged/deployed to production in this task.
- Main branch protection was configured and read back: strict/up-to-date required
  checks `Backend Build & Test (H2)`, `Backend Migration Check (PostgreSQL +
  Flyway)`, `Frontend Lint & Build`, enforced for admins, PR required, force push
  and deletion disabled. Zero mandatory approving reviews allows the existing
  two-founder workflow; this does not bypass required CI checks.
- Backend production deploy has the same three `needs` gates and GitHub
  `production` environment reviewer (`thach09`); Render auto-deploy is disabled.
  Frontend uses existing Vercel Git Integration from main. Main PR validation
  gates both release entry paths; no second deploy job was added.
- Staging remains separate: Vercel develop preview and Render staging service /
  Neon staging branch. Render `autoDeploy=yes` was recorded earlier, but its
  current Git integration cannot be reverified with the rejected management key.
  Do not claim an observed staging deployment just from a successful develop CI.
  Resolve Render API access and verify staging HEAD/config before a release.
- Production Flyway only `db/migration`; local/staging also include
  `db/migration-staging`. Existing location/review-status guard tests pass. No
  old applied migrations were edited and no Japanese content was introduced.

## Monitoring and diagnostics

Sentry remains optional/conditional on existing DSNs. Frontend privacy callbacks
cover error events, network/navigation breadcrumbs and SDK 11 **streamed spans**;
beforeSendTransaction alone would not scrub the latter. Console/DOM breadcrumbs,
user identity, request bodies/headers/cookies/query/fragment and arbitrary extras
are excluded. Error type/function/line/public source filename remains available.
Backend uses SDK 7 auto-configured beforeSend and beforeSendTransaction beans:
redacted exception values/contexts and root request duration; SQL child spans
are omitted. This intentionally reduces detailed trace diagnostics.

No new observability service or dependency. Official behavior was checked against
installed SDK declarations/bytecode and primary documentation:
[Sentry JS data collection](https://github.com/getsentry/sentry-javascript/blob/develop/MIGRATION.md),
[Sentry Spring callback registration](https://blog.sentry.io/troubleshooting-spring-boot-applications-with-sentry/).
Synthetic privacy regression tests must pass before a real DSN smoke test.

| Operator question | Available signal |
|---|---|
| Did release/build fail? | Required GitHub job results, protected deployment approval, provider deploy status/logs. |
| Did API errors rise? | Scrubbed Sentry exceptions when configured; structured `unhandled_request_failure category=...`. DSN enablement/alert ownership remains a launch dependency. |
| Did a migration fail? | Flyway startup/version logs and PostgreSQL CI. Do not repair a checksum mismatch to hide it. |
| Can users start learning? | Browser smoke/auth integration and counts of `learning.started.v1` for SRS/grammar; exam starts from existing mock exams. |
| Are facts being recorded? | Internal count queries on product_events/learning_attempts and study_activities; `product_event_write_failed` / `learning_evidence_write_failed` with safe event/module/category. No per-answer logs. |

`/health` stays lightweight and returns only service/status/version/timestamp.
Production actuator details remain hidden. Redis health is disabled while memory
cache is selected; no new Redis/infrastructure requirement.

## Security/configuration evidence and limits

Full H2 and PostgreSQL security regressions preserve JWT type/version validation,
revocation/rotation, cookie Origin rules, admin RBAC/2FA, 30 admin writes/minute,
64KiB payload limits, CORS/CSP and content review. New preferences use only the
authenticated principal. Feature flags are OFF when absent and cannot grant
permissions. Analytics/evidence writes isolate failures from learning commits.

Production role audit via TLS confirmed: runtime is non-superuser, cannot create
roles/databases/schema, DML is available and owner default privileges cover new
tables. Both production and staging default table **and sequence** grants were
verified, along with existing sequence access and no runtime schema creation.
Recheck after applying V35-V37 before foundation deployment. Flyway uses
a separate owner; never use it as the runtime role. Production is still V34.

Neon endpoints are internet reachable; private networking/IP allowlisting is not
configured. DNS/proxy and provider monitoring remain external configuration
limits, not code-tested assurances. Render management key returns 401; don't
rotate or invent a replacement without the account owner.

## Artifact handling

Browser scripts default to the OS temp directory (AUDIT_OUTPUT override). Only
reviewed summaries belong in Git; generated dumps, reports with account data,
downloads and credentials do not. Test runs target disposable local databases,
never production; scope cleanup to the exact created accounts/targets.

The pre-existing scratch directory remains untracked. An explicit recursive
PowerShell cleanup was rejected by automatic action review. No alternative
delete route was used; cleanup remains unresolved and is not claimed complete.
This is a local artifact-handling limitation, not a reason to commit scratch.
