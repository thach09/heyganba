# Independent Jiayou production bootstrap

This is an opt-in schema bootstrap, not a deployment, legacy upgrade, user-data
transfer or content release. Ganbarou's hostname, database, migrations, credentials
and provider settings must remain unchanged. The authoritative recovery context is
the 30 October 2026 recovery report and independent-production architecture proposal,
as amended by the owner's later hosting decision: **Jiayou will be self-hosted on a
dedicated laptop after domain acquisition. Vercel and Render are not its intended
production hosts.** The following plan supersedes earlier provider-project proposals.

## Source inventory and deliberate derivation

The new `db/jiayou-production/V1__jiayou_schema_only.sql` is a **reviewed structural
derivation**, not a replay or silent copy of the Chinese curriculum migrations.
All historical V1–V11 files and `beforeEachMigrate.sql` remain unchanged.

| Existing source | Classification | Independent-lineage decision |
| --- | --- | --- |
| V1 init_chinese_schema | Required tables/indexes/FKs and legacy-compatible entity fields; unsafe APPROVED defaults | Retain entity-required structure, remove IF NOT EXISTS, make review defaults pending, lock APPROVED out, make dictionary entries inactive by default |
| V2 seed_chinese_hsk1_data | Required role names plus lessons/characters/vocabulary/grammar/reading | Retain only ROLE_USER / ROLE_ADMIN reference rows, generated IDs; no user, password hash or curriculum |
| V3 disable_public_seed_admin_credential | Administrative credential revocation | No seeded account exists in this lineage; do not reproduce any credential. Restart rejects the known public seed admin identity |
| V4 sample_lesson_greetings | Sample content and explicit-ID sequence reconciliation | Exclude all content and sequence adjustments |
| V5 hsk1_thematic_curriculum_expansion | Curriculum and sequence reconciliation | Exclude |
| V6 hsk1_standard_course_grammar_and_exams | Grammar/exam content and sequence reconciliation | Exclude |
| V7 hsk1_complete_150_vocab_and_hanzi_radicals | Curriculum/reference learning content and sequence reconciliation | Exclude; linguistic radicals are learning content, not authorization reference data |
| V8 hsk2_standard_course_and_approve_all_curriculum | Blanket approval mutations and more curriculum | Exclude all approval updates and content |
| V9 hsk1_to_hsk6_complete_curriculum_and_grammar | Mixed schema and curriculum/publication | Retain exam/reading level columns and checks plus mock_exam_presets structure; exclude every content row |
| V10 learning_insights_and_sentence_order | Wallet/quest structures and exercise_type, plus approved drills and sequence mutations | Retain structures already represented by V1; exclude drills and setval |
| V11 align_optional_content_nullability | Required entity nullability corrections | Reconcile vocabulary pinyin/pinyin_normalized/han_viet/meaning_vi, hanzi pinyin/han_viet/meaning_vi, grammar examples_json |
| beforeEachMigrate callback | Legacy column/sequence compatibility writes | Do not load; define radicals.review_status directly. Generated IDs remove the need for seed sequence repair |

Compatibility fields/tables such as kana, kanji_radicals and legacy vocabulary
aliases remain **empty structures** because current entities/services still refer
to them. This does not import Japanese content or establish cross-language ID
equivalence. Only roles and the database identity marker are inserted.

Existing main's admin create methods can assign APPROVED directly. This bootstrap
does not modify those methods or weaken approval authority: its new SQL constrains
review statuses to PENDING_REVIEW/ARCHIVED until a separately reviewed publication
release exists. Admin attempts to approve content therefore fail in this initial
lineage. Dictionary rows default inactive. No automatic curriculum or default
administrator exists; an empty app is not a complete learning-content launch.

## Explicit configuration and authorization

Select **only** `SPRING_PROFILES_ACTIVE=jiayou-prod`. Mixed prod/staging/dev/test
profiles are rejected. The new profile overrides legacy datasource/Flyway fallbacks.
Supplying any Jiayou-only input with a missing or misspelled profile also fails
before datasource construction. Existing profiles without Jiayou inputs retain their
behavior; an artifact with no Jiayou inputs cannot infer an operator's launch intent.
Every value below must be provisioned independently for the authorized new target;
no actual hostname, provider project, credential or production resource is created
by this implementation.

| Input | Required meaning |
| --- | --- |
| JIAYOU_PRODUCT | Exact `Jiayou` |
| JIAYOU_ENVIRONMENT | Exact `production` |
| JIAYOU_TARGET_ID | Canonical UUID recorded in the operator-approved target inventory; never reuse a legacy or other-environment identity |
| JIAYOU_DATABASE_URL | Explicit single-host PostgreSQL JDBC URL with explicit port and database; only optional sslmode=require or verify-full; no embedded credentials/session options |
| JIAYOU_DATABASE_HOST / PORT / NAME | Independently recorded target coordinates; database name must start `jiayou_`; confirmed against URL and actual connection |
| JIAYOU_DATABASE_USER / PASSWORD | Dedicated DB role/credential; actual current_user must match. No shared Ganbarou secret or environment group |
| JIAYOU_JWT_SECRET | Independent Base64 key, at least 32 decoded bytes; development default forbidden |
| JIAYOU_CORS_ALLOWED_ORIGINS | Explicit HTTPS origins; no wildcard or Ganbarou root/www; selected Jiayou hostname still requires owner approval |
| JIAYOU_BOOTSTRAP_MODE | `initialize` for the first empty-target bootstrap; `validate` for all later starts |
| JIAYOU_BOOTSTRAP_AUTHORIZATION | Exact `<mode>:Jiayou:production:<target UUID>` operator acknowledgement |

Authorization is a target-bound, testable acknowledgement, **not** a secret bearer
token or proof of provider ownership. A database name/UUID cannot prove that an
operator selected the right infrastructure. The release owner must verify the
provider project, endpoint, database, role, exclusivity and empty target inventory
and approve bootstrap before placing this acknowledgement in a deployment. No
acknowledgement or provider configuration was installed by this task.

Spring properties, including externally supplied SPRING_DATASOURCE/Flyway overrides,
must resolve to the independent inputs exactly. SQL init, Hibernate creation,
baseline, clean, alternate Flyway locations, callbacks/custom migration resolvers,
session init SQL and seeded administrator overrides are rejected. A bean-factory
gate runs before datasource/SQL-init/JPA construction; the migration strategy
rechecks effective Flyway configuration before any schema operation.

## Initial and later startup behavior

Before initialize, inspect the actual connection's URL/database/current_user.
Require no user schemas other than empty public, user relations/sequences/views,
functions/types or extra extensions; any legacy history or unrelated object blocks
bootstrap. A session advisory lock serializes this initializer with itself. It does
not stop unrelated privileged clients: provision exclusively and withhold concurrent
DDL access during bootstrap. The role and exact provider target still need operator
verification; tests use only disposable loopback PostgreSQL.

The packaged migration inventory must contain exactly the one reviewed SQL file,
with a pinned normalized SHA-256. No extra callback or content-release file is
accepted. Flyway uses public.jiayou_schema_history, baseline disabled, clean disabled,
create-schemas disabled and transactional execution. Its V1 creates the schema,
pending-content constraints, two role references and Jiayou/production/target/lineage
marker. Hibernate validates the resulting entities; it never creates tables.

Restart in `validate` mode verifies the marker and exact known history, rejects the
public seed admin identity and calls Flyway.validate, not migrate. No pending release
is applied. Repeating initialize against even this known database is rejected. A
failed/partially initialized target is not repaired or baselined automatically.
Investigate it separately; do not remove objects to force this check through.

This initial lineage intentionally cannot publish curriculum or apply a V2. A future
schema/content release needs an independent reviewed migration inventory and scoped
authorization path, including publication/provenance evidence and rollback analysis.
Do not casually update the manifest hash or relax constraints to unblock content.

## Local tests and CI

`mvn -B clean verify` runs configuration guard tests and the existing backend suite.
PostgreSQL bootstrap tests are explicitly opt-in and reject non-loopback URLs or
database names outside `jiayou_bootstrap_<run>_*` **before connecting**. Create eight
fresh fixture databases in a dedicated disposable PostgreSQL16 container, with
suffixes `a legacy nonempty wrong schema function tampered manifest`.

Run against that dedicated container's loopback port (substitute only its verified
local port/run prefix; never a live URL):

```text
mvn -B test -Dtest=JiayouBootstrapGuardTest,JiayouBootstrapPostgresTest
  -Djiayou.bootstrap.rehearsal=true
  -Djiayou.bootstrap.url=jdbc:postgresql://127.0.0.1:<local-port>/jiayou_bootstrap_<run>_a
```

The fixture-only password defaults to `local_jiayou_rehearsal`; CI passes the disposable
service password via `jiayou.bootstrap.password`. This is not a production credential.
Never point these tests at an existing local application database. Use a new run
prefix after a rehearsal; no repair/reset/clean/DB deletion is part of the test.

The separate `Jiayou isolated bootstrap` Actions workflow runs these tests against
its own PostgreSQL service for PRs, with read-only repository permission and no
deployment jobs/secrets. Existing CI remains unchanged. Tests exercise actual Spring
startup + Hibernate twice, immutable snapshots, wrong targets, legacy/unrelated
objects, unknown lineage/checksum, default admin, callback and content-file injection.

## Relationship to PR47 / PR48 and release prerequisites

PR47 dependency fixes and PR48 legacy preflight remain separate and unmodified.
PR48's existing source-history check must continue rejecting legacy→Chinese upgrades.
It does not authorize an empty-target bootstrap: never set its deployed SHA to the
candidate to simulate compatibility. A future infrastructure/release PR must provide
an explicit Jiayou first-bootstrap job/approval and scoped target metadata, while
preserving the legacy upgrade gate. This implementation adds no deployment pathway.

Before release: an owner-selected separate hostname and laptop environment, an isolated
Compose stack with dedicated PostgreSQL storage/roles/secrets, target identity inventory,
HTTPS/CORS/cookie verification, backup/restore rehearsal and explicit owner approval.
**Merge gate:** existing Vercel main auto-deploy is independent of GitHub Actions. It
must be isolated or disabled through a separately authorized change before merges
resume. Render/Vercel settings remain untouched; this decision does not itself disable
either integration. A branch push also needs independently verified safe Preview targets.
No legacy user/account/progress/SRS/notebook/exam/reward transfer is included.

## Self-hosting readiness — future deployment plan only

The bootstrap profile is provider independent. A regression test accepts a private
Compose DNS service name with an explicit database/port/role/target, without a public
IP or hosting API. No Compose deployment file, network, volume, tunnel or production
credential is created by this change. Host operating system, CPU/RAM/storage capacity,
Docker runtime availability, network/CGNAT conditions and the domain remain undecided.

Proposed service boundaries:

| Service | Responsibility and isolation |
| --- | --- |
| PostgreSQL | Private database network, dedicated Jiayou database/roles and external persistent volume; **no published host database port**; no Ganbarou database or shared data directory |
| Spring Boot | Immutable backend image, explicit jiayou-prod inputs, private DB connection and internal HTTP listener; reachable only through the reverse proxy |
| Static frontend | Immutable compiled assets in a static web service; no browser-side secrets; explicit API target, preferably same-origin `/api/v1` behind the proxy |
| HTTPS reverse proxy | Owner-selected hostname, TLS/renewal, static frontend and API routing; preserve `/api/v1`, Secure/HttpOnly cookies and authenticated-response cache exclusions |
| Optional cloudflared | Only after network/domain review and authorization; outbound Tunnel to the proxy instead of requiring a public IP/inbound router mapping; tunnel token external and service-scoped |
| Backup job | Scoped backup credential, external output location and encrypted off-laptop retention; never writes backups only into the database's own volume |

Keep host-specific paths and volume identities outside the image/repository. Persist
PostgreSQL data, proxy certificates/state and any selected file/blob storage separately
from containers; define ownership/permissions and disk-capacity monitoring after the OS
is known. Database-backed audio stays in DB backups unless a separately reviewed local
file/object backend is selected; do not assume existing Cloudflare R2 configuration.
Keep logs bounded/rotated and exclude secrets from images, frontend builds and logs.

Supply credentials via service-scoped external secret files or an operator-protected
environment. Spring's external `SPRING_CONFIG_IMPORT=configtree:<mounted-directory>/`
can load the Jiayou keys from mounted files; this does not add automatic `_FILE` support
to arbitrary variables. Database image secret-file support is a separate contract.
Do not commit `.env`, passwords, signing keys, tunnel tokens or certificates. Compose
local secret files require host access controls and are not automatically an encrypted
secret store. Externalize profile selection, coordinates, mode, authorization and target
identity; the approved packaged migration path/hash remain allowlisted, not an arbitrary
host-mounted SQL directory. No staging migration or initial admin script goes into
PostgreSQL entrypoint initialization folders.

Planned startup ordering: database ready → explicitly approved one-time initialization
→ validated backend ready → proxy routes API traffic. The bootstrap acknowledgement
must **not** remain an automatically retried initialize command: on failure, stop and
inspect; after success, switch subsequent starts to validate mode. A future bootstrap
service must exit after successful verification or otherwise provide an explicit
completion contract; the current application is a long-running server, not a finished
one-shot migration executable. Do not use service_completed_successfully on it as-is.

Use a PostgreSQL connection/readiness check plus an actual expected-database/lineage
verification; pg_isready alone does not attest identity or migration success. Backend
readiness must include database access, while liveness should describe the process
without causing restart storms during DB outages. Probe only internal endpoints and
review their security matchers: current security permits the aggregate actuator health
path, not automatically every readiness/liveness subpath. Static/proxy checks must also
verify the intended frontend artifact/API route. Compose dependency health checks gate
startup, not continuous recovery; an unhealthy status alone does not restart a container.

Plan `unless-stopped` restart policies for long-running DB/backend/static/proxy/tunnel
services and `no` for the explicitly invoked initialization step; initialization must
not loop on failure. Verify Docker/runtime autostart on the selected OS separately.
Include graceful backend termination and
adequate database stop time. Set measured per-service CPU/memory/PID limits, JVM heap
headroom and PostgreSQL connection/memory budgets only after laptop capacity is known.
The existing backend Dockerfile's Render-oriented EXPOSE metadata and JVM percentage
are not a laptop sizing decision; future Compose must set and verify its own internal
port/resource budget. Never assume DB dependency ordering guarantees a recovered backend.

Backup/restore acceptance: define owner-approved RPO/RTO and retention; scheduled logical
backups of the dedicated DB with required role metadata, encryption and off-laptop copies;
monitor backup success, disk space and retention. Rehearse restore into a separate empty
isolated database/volume with no public route, then verify history/checksums, users/FKs,
content status and application reads before documenting recovery time. A live filesystem
copy of PGDATA is not a sufficient backup strategy. Do not restore over the running
production DB or change its lineage as a shortcut. Laptop sleep, reboot, power loss,
disk loss and network interruption need an explicit operational policy; Compose restart
settings cannot keep an asleep/offline host available.

For direct HTTPS, assess real inbound connectivity/firewall/CGNAT and certificate
renewal before choosing any ports or NAT mapping. For Tunnel, verify outbound reachability,
TLS termination/origin transport and the trusted proxy chain instead. In both cases,
sanitize forwarded headers at the proxy, narrowly configure trusted proxy CIDRs, and
validate scheme/client-IP handling, cookies, CORS and auth/admin rate limits. No wildcard
trust of arbitrary forwarded headers and no caching of authenticated/progress/admin
responses. No actual hostname, public IP, router rule, DNS record or Tunnel is assumed.

Official references for the future implementation:
- [Compose startup ordering](https://docs.docker.com/compose/how-tos/startup-order/)
- [Compose service configuration](https://docs.docker.com/reference/compose-file/services/)
- [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Cloudflare Tunnel fundamentals](https://developers.cloudflare.com/tunnel/concepts/)
- [Spring Boot external configuration](https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html)
