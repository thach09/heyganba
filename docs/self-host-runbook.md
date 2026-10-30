# Self-host runbook

Current readiness: **local build, PostgreSQL rehearsal and restore verified; target-machine deployment unverified.** Use this as an operator checklist, not a record of a completed production deployment. Follow `docs/QA/master-readiness-2026-10-20.md` for current evidence and limitations; the 19 October report is historical.

## Status vocabulary

- **VERIFIED (local):** command or behavior succeeded in the isolated local environment recorded in the QA report.
- **UNVERIFIED:** operator must inspect/configure the named host or service and record evidence.
- **BLOCKED:** do not expose the feature/content until the stated prerequisite is resolved.

## Before choosing a host

| Check | Status | Operator action |
|---|---|---|
| Java / build toolchain | VERIFIED (local) | Java 21 and Maven 3.9.16 build and test locally. Confirm the chosen host supports the same supported Java release. |
| Frontend toolchain | VERIFIED (local) | Node 24 `npm ci`, lint and build passed locally. Build the frontend from the reviewed commit. |
| Database migration compatibility | VERIFIED (local) | PostgreSQL 16 fresh install and V13 upgrade applied the current default locations through V15, passed Hibernate validation and API smoke; a custom dump was restored into an isolated database. Rehearse the exact process on a disposable target-like database before release. |
| Host CPU/RAM/disk and expected users | UNVERIFIED | Measure the actual host and expected workload. This review did not benchmark or inspect the target laptop. Do not infer capacity from a local successful build. |
| Domain and certificate ownership | UNVERIFIED | Record domain, DNS owner, certificate renewal path and expiry monitoring. |
| Provider access and secrets | UNVERIFIED | Inventory the chosen platform's deploy hooks, environment variables, backups, logs and access policy. This review did not inspect remote provider settings. |

## Deployment shape

**UNVERIFIED planning budget:** choose a supported 64-bit Linux OS able to run Java 21, with at least 2 CPU cores and 4 GB RAM as an initial allocation for the API plus local database/Redis; build artifacts elsewhere if the laptop cannot comfortably build. This is a starting budget, not measured capacity. Reserve disk separately for PostgreSQL, logs, several backups and growth; measure free space and expected dataset sizes before selecting a capacity. The actual laptop's OS, RAM, CPU, SSD health, thermal behavior, power and network resilience have not been inspected. Load-test the intended concurrency on staging and adjust limits before accepting traffic.

Use a frontend static build and a Spring Boot API behind one HTTPS origin. Frontend requests use `/api/v1`; route this prefix at the reverse proxy to the backend. This keeps the default browser CSP same-origin. If using separate origins, set a narrow `connect-src` and backend CORS allowlist for the exact frontend origin and verify credential behavior in a real browser. Do not add wildcard CORS with credentials.

Keep PostgreSQL and Redis on private interfaces/network only. Permit inbound public traffic only to the reverse proxy. Permit backend-to-database and backend-to-Redis traffic only from the application network. Set trusted proxy addresses explicitly; never trust arbitrary client-supplied `X-Forwarded-*` headers. Enable HTTPS and secure cookies at the proxy and verify the app's secure-cookie setting after proxy headers are configured.

Use separate database roles for application runtime and controlled migration. Give runtime only the read/write/schema privileges it needs; keep ownership and DDL rights with the migration operator. Confirm actual grants on the target instead of copying broad superuser credentials. The `migration-staging` directory is included by the current production Flyway defaults; it is a historical path name, not a deployment boundary. Review every pending migration in both configured locations before release.

## Startup, reboot and rollback

**UNVERIFIED operator template:** on a systemd host, run the API under a dedicated unprivileged `heyganba` account with the service environment in `/etc/heyganba/backend.env` (root-owned and readable only by the required service group). A service can use `WorkingDirectory=/opt/heyganba/backend`, `ExecStart=/usr/bin/java -jar /opt/heyganba/backend/current.jar`, `Restart=on-failure`, `RestartSec=5`, `Wants=network-online.target`, `After=network-online.target` and `WantedBy=multi-user.target`. Set the reviewed production profile and secrets in the environment file; confirm write paths before adding filesystem sandbox directives. Apply an appropriate JVM memory limit after measuring the host. Enable the selected service and reverse proxy only during the separately authorized deployment.

Record the exact startup command and artifact checksum. Reboot staging deliberately and verify database/Redis startup, API readiness, HTTPS frontend, login, one learning write and logging without manual repair. Repeat on the target during the authorized maintenance window. This reboot test has not been performed here. For rollback, keep the prior frontend/backend artifact with its environment contract; forward-only database migrations may make an old binary incompatible, so rehearse binary rollback against the migrated schema and restore to a fresh database if recovery is needed. Do not run destructive down-migrations or overwrite the only backup.

## Release sequence

1. **VERIFIED locally — vocabulary checkpoint:** V13 quarantined 560 legacy records. V14–V15 now support maintainer-authorized `WEB_CROSS_CHECKED` evidence and publish 491 reviewed legacy records plus four additions. 69 legacy records remain pending for specific unresolved evidence, with optional Han-Viet/examples withheld separately. No teacher identity is claimed. Use [the current policy and per-entry manifest](Content/web-cross-check-policy.md), preserve digest/revocation and admin authorization. This is not complete HSK 1–6 coverage or a production deployment.
2. **UNVERIFIED — freeze and review:** identify the exact reviewed commit; confirm the working tree is clean or account for every intended patch; inspect CI on that commit. HEAD `220fb25` is the source baseline for the current uncommitted readiness work. Its working-tree build now includes the `SpeakOptions.slow` fix and requires the fresh-snapshot gates in the current QA report; the historical CI result does not cover this worktree.
3. **VERIFIED locally — build artifacts:** the current source snapshot, including intended untracked source and assets, passed fresh frontend install, tests, lint and production build. Backend H2/PostgreSQL tests and isolated PostgreSQL rehearsal are recorded in the current QA report. Archive logs and checksums with the reviewed release artifact.
4. **VERIFIED locally, target still UNVERIFIED — database:** the current prod binary was started on fresh PostgreSQL 16 and upgraded from V13 using the repository's existing default locations (`db/migration` plus `db/migration-staging`), Hibernate validation and real API smoke. No staging override was added to make it pass. V1–V13 remain unchanged; V14–V15 are new release migrations. A custom-format backup was restored into a new isolated database and integrity counts were checked. Rehearse this exact release on a disposable target-like database before a separately authorized deployment; no real database was contacted here.
5. **UNVERIFIED — deploy:** install the backend artifact and static frontend through the selected self-host procedure. Keep the old artifact/database backup available for rollback. The Render workflow was removed from CI and its old blueprint archived; the repo does not prove remote GitHub/Vercel/Render integrations are disabled. The provider owner must inspect and disable any unwanted remote hooks.
6. **UNVERIFIED — smoke check:** use a guest browser and dedicated test learner/admin to check health, login/logout/refresh, protected routes, content visibility, SRS, exam ownership, CORS, error handling, and no secret/debug output. Never use real learner data as a test fixture.
7. **UNVERIFIED — observe:** confirm access/error logs omit tokens and passwords; set alerts for health failures, 5xx rate, database disk/connection usage, certificate expiry and backup age. Define an incident owner and rollback trigger before accepting public traffic.

## Secrets and settings

Generate new random production secrets in the deployment platform's secret store. Never reuse values from local files, tests, browser storage or QA logs. Set a strong JWT secret with the application's required length/format; restrict who can read it and define rotation/revocation steps. Set explicit frontend origins/CORS, trusted proxy addresses, cookie security and database/Redis credentials. Keep `DEBUG` and SQL/request body logging off in production. Do not commit `.env` files or secrets.

Confirm request/body limits at both proxy and application layers. Verify rate limiting is per authenticated admin and remains 30 writes/minute/admin. Confirm login throttling and public endpoint limits against the chosen proxy topology. Errors shown to users should contain a correlation ID, while server logs redact credentials and personal data.

## Backups and recovery

**VERIFIED (local drill only):** a custom-format `pg_dump` was listed/restored into a new isolated local database; source and restore each had 566 test vocabulary rows with matching aggregate MD5 `6f59d39de9b6297b9b7be99d578b8dc4`; Hibernate schema validation passed. This does not verify encryption, offsite storage, a schedule, production permissions, the target host, retention, recovery time or the app's full operational recovery.

**UNVERIFIED:** choose encrypted offsite backup storage, retention, schedule, RPO and RTO. Record who can decrypt backups separately from who can administer the application. Alert on failed/stale backups. Periodically restore into a clean isolated database, run Flyway/Hibernate validation and application smoke tests, then document elapsed time and data-integrity checks. Test restore and rollback before the first public release.

## Blocking release gates

- **BLOCKED — curriculum completeness:** 495 vocabulary rows are now published under the evidence policy and 69 legacy rows remain pending for unresolved source or sense conflicts. The published group is not full HSK 1–6 coverage; the current CTI identity checkpoint and missing counts are in `docs/Content/curriculum-coverage-checkpoint-2026-10-20.json`. Optional Hán Việt/examples remain withheld where unverified. Other Chinese content types still require their own review policy.
- **RETIRED from the Chinese release gate — Japanese dictionary:** the Japanese-only legacy corpus and release assertion are archived outside the default runtime/test path. The original checks remain available through the opt-in `legacy-japanese-audit` profile; the historical empty enrichment is documented and is not represented as repaired.
- **UNVERIFIED — deployment failure:** Vercel reported failure on commit `220fb25`; the exact snapshot build reproduces TypeScript errors, but the original Vercel logs were not accessible. Obtain provider logs and verify a later reviewed commit through the real CI before deployment.
- **UNVERIFIED — performance/accessibility:** the current local mobile Lighthouse median and range, LCP element/stage trace, CLS, remaining lab gap, screenshot review and browser limits are recorded in the current QA report. These are lab samples, not field Core Web Vitals; accessibility automation is not a substitute for testing with actual assistive technology.
- **UNVERIFIED — operational policy:** confirm account recovery/email, privacy/legal text, incident response and data-retention decisions for the real service.

Keep this runbook updated with the exact commit, host, migration IDs/checksums, health checks, backup restore timestamp, responsible operator and evidence links after the operator has actually completed those steps.
