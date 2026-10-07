# Backup and recovery runbook

Verified on 2026-10-07. Owner: the founder operating the production infrastructure;
the other founder reviews a recovery/cutover. This is an operational procedure,
not a promised SLA. Do not paste connection strings, passwords or dumps into Git,
issues, screenshots, shell history or chat.

## Actual provider and coverage

Production is the `heyganba` database on the production branch of an existing
Neon project shared with another application. Staging has a separate Neon branch.
The Neon API matched both configured branch IDs and reported
`history_retention_seconds=21600`: **6 hours**, not seven days. Current production
is still V34; foundation V35-V37 have not been deployed to it.

Neon retains database change history for point-in-time recovery within that
window. This covers database tables, indexes, constraints and role/catalog state
as supported by provider branching. It does not back up Render/Vercel environment
secrets, GitHub permissions, external R2 objects, DNS or local files. Source/config
templates remain in Git; secrets remain in the provider/credential store.
There is no verified seven-day scheduled logical backup in this repository.

Provider behavior and plan limits can change. Before any production release,
check the actual project restore window and available history in the Neon
console/API, not an old plan-price description. References:
[Neon instant restore](https://neon.com/docs/introduction/branch-restore),
[PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html),
[pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).

## Recovery procedure

1. Pause deployment and application writes when destructive migration/UPDATE/
   DELETE damage is suspected. Record the incident time and last known good UTC
   timestamp immediately; six hours is a short detection/recovery window.
2. Preserve the current branch/database as forensic evidence. Do not run Flyway
   `repair`, reset production, replay old content migrations or restore in place.
3. In Neon, create an isolated recovery branch from a known good point within
   available history. Confirm the project, branch and **HeyGanba database**; do
   not modify the other application's database. If history has expired, recover
   from an independently retained verified dump if one exists. Otherwise report
   the data-loss limit honestly; Git/Flyway cannot recover deleted user data.
4. Restore/test with the exact intended release artifact and reviewed migrations.
   A logical dump uses a PostgreSQL client compatible with the server, `pg_dump
   -Fc --no-owner --no-acl`, and `pg_restore --exit-on-error --no-owner --no-acl`
   into a **new empty isolated database**. Use secure environment/credential
   injection; never put passwords on the command line. Restoring without owner/
   ACL requires deliberately reapplying restricted runtime/migrator roles.
5. Validate all application table counts, migration versions/checksums/success,
   constraints, application schema validation, login, own preferences, SRS,
   grammar, exams and dictionary. Check restored new event/attempt data. Compare
   a damaged database only against trusted pre-incident evidence; matching a
   damaged source is not proof of correctness.
6. Test runtime DML/default table and sequence privileges separately from the
   Flyway owner. Confirm TLS, CORS, cookie configuration and production-only
   Flyway locations. Review pending Japanese content before any promotion.
7. Founder approves cutover after tests and records possible lost writes. Update
   the complete provider environment safely, invalidate sessions where incident
   scope requires it, redeploy through the existing production gate, verify API
   health and browser smoke. Keep the old branch until incident review completes.

## Safe rehearsal evidence

On 2026-10-07, PostgreSQL 16 local DB `heyganba_local_release_20261007` was dumped
and restored into new DBs `heyganba_foundation_restore_20261007` and
`heyganba_foundation_restore_events_20261007`. No production data was modified.
The second rehearsal included a local test learner who used the real login,
preference, practice-start, grammar-check, SRS-review and exam-submit APIs.

- All **28 public tables / 220,134 rows** matched after the second restore.
- New tables round-tripped: 7 product events, 2 learning attempts, 1 preference.
- Flyway V37 and every migration row/checksum/success matched; 27 FKs validated.
- Restored app started with Flyway validation and Hibernate `validate`; `/health`
  returned UP. Login and the restored 20-minute, reminder-OFF preference passed.
- Dump/restore took about 3 seconds locally and app startup about 9 seconds.
  These are rehearsal observations, not cloud recovery objectives or an SLA.

Dump files stayed inside the local Docker container under `/tmp`, not in source.
Test DBs contain local fixtures and staging content, not production learner data.
For a future rehearsal, use new unique target names, assert source/target differ,
and stop if a target already exists. Never add `--clean` to reuse a target.

## Outstanding recovery decisions

Before broader learner launch, founders must decide acceptable data loss and
recovery time, whether the verified six-hour history is sufficient, who monitors
incidents outside working hours, and whether a longer provider restore window or
encrypted independent backup retention is needed. Do not claim daily backups or
seven-day protection until configured and restored successfully. Rehearse again
after schema/role/provider changes and before a destructive migration. Retention
for recovery copies must align with the eventual personal-data deletion policy.
