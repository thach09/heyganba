# Jiayou — handover to anh Hưng

Ganbarou remains a separate running application at heyganba.site. The owner confirms
this repository is not a source/update dependency of that running laptop deployment.
No host login, deployment, public route, DNS change or live DB write is part of repository
handover. Jiayou has no selected domain and must use its own hostname and stack.

## Source and build contract

The repository is https://github.com/thach09/jiayou. Read
`docs/Operations/FINAL-ENGINEERING-AUDIT.md` and its evidence index for the reviewed
release; verify the current main SHA with Git, not an uncommitted research worktree.
Frontend lives in frontend/, backend in
backend/, immutable SQL under backend/src/main/resources/db/, CI in .github/workflows/,
current operations guidance in docs/Operations/. Historical reports are not release gates.

Use Node24, JDK21, Maven3.9 and PostgreSQL16. In frontend run npm ci, full npm audit,
npm run lint, npm run build and npm test. In backend run mvn -B clean verify and the
runtime dependency audit. PostgreSQL and bootstrap rehearsals use disposable loopback
fixtures only; see the independent bootstrap guide and the dedicated CI job.

The backend artifact is jiayou-backend-0.0.1-SNAPSHOT.jar. Frontend output is frontend/dist.
Build images only from the final clean clone with its lockfile. Floating upstream image
tags must be resolved to reviewed immutable digests in the operator's deployment manifest;
this repository does not pretend to know the target laptop's hardware budget.

## Production profile and initialization

Default/required Jiayou profile is jiayou-prod. Explicit product, production environment,
target UUID, datasource coordinates/role/secret, JWT key, HTTPS CORS origin and target-bound
authorization are mandatory. Missing/misspelled Jiayou settings fail closed. Never use
the legacy prod profile to make startup pass. No default administrator or curriculum is
created; review-status constraints block APPROVED publication in this initial lineage.

Read [the full contract](Operations/jiayou-independent-bootstrap.md) before bootstrap.
One-time initialize requires an explicitly approved empty new target and acknowledgement;
later starts validate only. No repair/baseline/clean, legacy history import or arbitrary
content SQL is authorized. PR48's source-history checker remains available as an explicit
read-only manual CI check; it is not a first-bootstrap or live-schema authorization.

## Shared Arch Linux + Docker boundary

The owner confirms Ganbarou already runs on the Arch laptop and Tailscale is administrative
access. Keep Ganbarou untouched. Use a distinct Compose project, images, secrets, networks,
DB instance/roles/history and external volume; never reuse its database or Compose project.
No database or backend host port is published by the review template. The frontend is also
private until an explicitly approved ingress adapter is configured. No actual domain,
host port, subnet, storage path or TLS proxy choice is embedded here.

Measure shared CPU/RAM/disk/thermal/backup peaks before filling resource variables; reserve
Ganbarou and OS headroom. External volumes must be provisioned deliberately and not deleted
by rollout/rollback. Image/user/project names are Jiayou-scoped; avoid global container_name.
The same physical laptop remains a common power/disk/kernel/network failure domain.

docker-compose.yml is a review template, not an executable deployment authorization. It
starts backend in validate mode and cannot silently bootstrap a new DB. Its PostgreSQL
owner is separate from the application role; role creation/grants and initial bootstrap
are separately approved operator steps. No entrypoint curriculum/admin script is installed.
Provide required secrets via a protected external environment or service-scoped mounted
config tree; never commit actual .env files. Docker local environment secrets remain visible
to privileged daemon operators, so apply host permissions and use scoped secret files when
the selected deployment tooling supports them.

The frontend proxies same-origin /api/v1 and blocks public health/actuator routes. An outer
HTTPS proxy or optional Cloudflare Tunnel must sanitize forwarded headers and set trusted
peer CIDRs, cookies, TLS/renewal, body/time limits and cache exclusions. Do not infer public
connectivity from Tailscale. Discover the existing ingress before planning any additive route;
do not replace the Ganbarou proxy or contend for its ports. Health/dependency checks are
startup gates, not guarantees of continuous recovery. Restart policies cannot wake a sleeping
host, restore a failed disk or make an unapproved schema compatible.

## Backups and later activation sequence

1. Select Jiayou's hostname and confirm shared-host capacity/ingress/storage ownership.
2. Provision dedicated roles, external volume and immutable images/secrets in a separately
   authorized host task. Define an initial bootstrap invocation and switch to validate mode
   afterward; the application is a long-running server, not a one-shot completion job.
3. Define RPO/RTO/retention; schedule encrypted logical backups plus required role metadata,
   retain copies off the laptop, monitor freshness/disk and test restore to a separate empty
   target. Verify migration checksums, row/FK integrity, content statuses and application reads.
   A live PGDATA copy or backup in the same data volume is insufficient.
4. Rehearse full bootstrap/restart/restore and guest/auth/ownership/SRS/admin behavior in an
   isolated environment. Keep pending curriculum hidden; no synthetic completeness claims.
5. Review the exact ingress/TLS/Tunnel diff and rollback, then obtain activation approval.
   Rollback only Jiayou routes/services/artifacts; never remove volumes or touch Ganbarou data.

## CI/CD and known limitations

CI is validation-only, with contents:read permissions; it does not deploy to Render,
Vercel or the laptop. The legacy Render hook workflow is archived, not invoked, and stored
production secrets are not deleted merely for cleanup. Vercel Git disconnection/provider
isolation must be confirmed in the final report; vercel.json also disables Git deployments.
Do not reconnect old integrations automatically after the repository rename.

Future deployment should be a separate explicit operator approval against an immutable
reviewed main artifact, after all required CI/audits pass. No push/main merge should itself
deploy to the laptop. Repository rename redirects are not evidence that integrations or
image references have been updated safely.

No legacy users, notes, SRS/exam history or rewards are transferred. Curriculum/provenance
work retained on the archive branch/private backup needs separate review and content rights;
do not cherry-pick publication migrations merely because tests pass. The new bootstrap
intentionally has no learner-visible corpus and no default administrator. Full teaching
coverage, account recovery/email, privacy/legal policy and production performance still need
owner decisions. Remaining compatibility identifiers are listed in Operations/legacy-identifiers.md.
