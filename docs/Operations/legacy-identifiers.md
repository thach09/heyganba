# Intentional compatibility and archived identities

| Identifier/source | Disposition |
| --- | --- |
| `com.heyganba` Java package, HeyGanbaApplication class | Keep for API/test/tool compatibility; package refactor is not branding and needs separate testing |
| Historical db/migration, migration-staging and callback SQL/checksums | Immutable; preserved for legacy fixtures. Never rewrite history to rename the product or connect Jiayou to Ganbarou |
| users, vocabulary, kana, kanji_* and compatibility columns | Persisted/entity contracts retained. New Jiayou lineage starts empty; no language-code or legacy-data migration is implied |
| Browser storage keys and existing auth transport identifiers | Keep current client compatibility; new hostname and signing keys isolate sessions. Do not copy Ganbarou cookies/tokens |
| Public seed admin identity / development JWT denylist | Keep exact legacy values in guards and test fixtures so old default credentials remain rejected; these are not seeded production secrets |
| prod/staging/dev profiles | Explicit legacy/dev compatibility profiles. Default launch is jiayou-prod; deployment guide forbids legacy prod/staging for Jiayou |
| Legacy Postgres rehearsal tests/scripts | Clearly named opt-in fixtures, loopback-only. Existing hardcoded development-container browser QA scripts require separate safety review and are not handover deploy commands |
| Provider deploy workflows, old Compose/Docker/Vercel examples | Exact sources retained under docs/archive/provider-deployment. They are not active CI jobs or deployment instructions |
| Historical HeyGanba/Ganbarou branding, old repository links and QA reports | Historical evidence; do not blanket-replace provenance. README/HANDOVER and Operations guide define current behavior |
| Pending original feature/content work | Local archive/jiayou-original-138-20261030 branch plus verified private backup; not approved for release/publication |

Current application identity is Jiayou: frontend/auth labels and document title,
Spring application/Maven artifact, Docker image user and project-scoped Compose template,
TOTP enrollment issuer and CI workflow name. TOTP algorithm/secrets, API paths, database
history and persisted identifiers are not changed by branding.

Ganbarou's running laptop deployment is out of scope and independent, as confirmed by
the owner. Repository archival material does not authorize changing its service names,
networks, volumes, datasource, public domain or deployment configuration.
