# Vietnamese Assisted Dictionary Release Report

**Local candidate: validated. Production release: blocked pending production provenance verification and a verified pre-V39 PostgreSQL backup.** The founder approved A-confidence `ASSISTED` meanings for production without row-by-row human review. They remain distinct from `VERIFIED` meanings in storage, API responses, and the UI.

## Dataset

The pinned JMdict snapshot contains 218,867 active entries (`96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7`). The release candidate contains 204 reviewed `VERIFIED` entries and 4,796 A-confidence `ASSISTED` entries, for 5,000 Vietnamese-covered entries. After a full refresh, the expected counts are 204 `VERIFIED`, 4,796 `ASSISTED`, and 213,867 `NONE`.

| Batch | A | B | C | D | E | F | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| A-confidence ASSISTED rows | 343 | 890 | 882 | 888 | 896 | 897 | 4,796 |

Forty-seven historical or named-institution/eponym rows are in `migration-staging/vietnamese-assisted-exclusions.tsv` and are not loaded. The earlier 500-concept pilot's 48 C-confidence items remain outside the runtime resource; 35 are new candidates and 13 overlap the existing reviewed source. No B-confidence or `NEEDS_REVIEW` rows are loaded. The runtime importer rejects confidence other than A.

## Selection and translation checks

Candidate priority uses JMdict frequency tags (`nf01`–`nf48`, then `ichi1`, `news1`, and `gai1`). Each accepted item has one unrestricted JMdict sense and must exactly match the repository-pinned entry ID, Japanese headword, reading, and complete English sense. Offline authoring translates the Japanese headword JA→VI and cross-checks it against an EN→VI translation of the complete sense. Empty, malformed, non-Vietnamese-script, mismatched, duplicate, reviewed, ambiguous, specialized, archaic, slang-heavy, and named entries are rejected. The application does not call a translation service.

The full source and acceptance metadata are in `backend/tools/generate-assisted-dictionary-batches.mjs` and `backend/src/main/resources/db/migration-staging/`. The assembled runtime file is `backend/src/main/resources/dictionary/assisted-ja-vi.tsv`; only that explicitly status-bearing resource is loaded by the repeatable dictionary refresh. Pilot C rows remain staging-only.

## Full-catalog search benchmark

The benchmark measured 500 independently selected everyday concepts against the clean `develop` baseline and the full-catalog candidate. Canonical Top-10 assertions remain unchanged. Coverage density targets are reported for product planning and are not release blockers under the founder decision.

| Metric | Baseline | Candidate |
|---|---:|---:|
| Vietnamese canonical entries in Top 10 | 122/500 (24.4%) | 462/500 (92.4%) |
| English canonical entries in Top 10 | 468/500 (93.6%) | 473/500 (94.6%) |
| VI-query Top-10 results with Vietnamese meaning | 278/471 (59.02%) | 1,595/1,673 (95.34%) |
| EN-query Top-10 results with Vietnamese meaning | 154/4,696 (3.28%) | 635/4,701 (13.51%) |
| Combined primary-query Top-10 results with Vietnamese meaning | 432/5,167 (8.36%) | 2,230/6,374 (34.99%) |
| Primary queries meeting 80% Top-10 Vietnamese density | 139/1,000 | 476/1,000 |
| Combined primary-query first-page results with Vietnamese meaning | 544/9,566 (5.69%) | 2,905/11,080 (26.22%) |

Representative canonical ranks in the candidate are `VI / EN`: dog 1/1, cat 1/2, lion 1/3, elephant 1/2, truck 1/1, motorcycle 1/5, teacher 2/2, doctor 1/1, firefighter 1/1, programmer 1/1, refrigerator 1/4, washing machine 1/2, computer 2/5, apple 1/1, and banana 1/1. `phone` has no matching benchmark identity; live search returned the Japanese telephone entry with `điện thoại; cuộc gọi` in its top results. Query-level results and actual first-three result samples are in `coverage-spot-checks.json`; complete benchmark request results are in `vietnamese-coverage-baseline.json` and `vietnamese-coverage-candidate.json`.

Candidate timing was a 53.78 ms median and 234.88 ms slowest query (`tofu`) for sequential local PostgreSQL HTTP measurements. These are not production latency guarantees.

## Validation

- Backend H2: 221 tests passed, 0 failures, 0 errors, 1 opt-in PostgreSQL test skipped in the H2 suite.
- PostgreSQL 16.15/Flyway: opt-in rehearsal passed on a disposable database through V39; full refresh produced 218,867 active entries with 204 `VERIFIED`, 4,796 `ASSISTED`, and 213,867 `NONE`. Refresh fingerprint/idempotency and curriculum fingerprints passed.
- Dictionary integrity: all six batch files and the runtime resource are A-only, unique, non-reviewed, nonempty, and identity/sense-matched to the pinned catalog; excluded IDs are absent.
- Frontend: 8 legacy and 61 unit tests passed; lint and production build passed. Existing lint output contains warnings, with no lint errors.
- Local runtime smoke: health reported `UP`; dictionary search returned canonical `犬` with the `ASSISTED` status.

## Production release gate

V39 has not been applied to production. This environment cannot read the production PostgreSQL data or its deployment variables, has no configured production database URL or Render credentials, has no `pg_dump` executable, and exposes no signed-in dashboard session. Therefore it cannot mechanically confirm that existing production Vietnamese values came only from `curated-ja-vi.tsv`, nor create and verify the required custom-format pre-V39 backup. No production migration, merge, or deployment has been performed. PR #32 remains a draft until hosted checks run on the final candidate and the production gates are supplied and passed.

If provenance is uncertain or the backup cannot be verified, stop before V39. The expected result is a release block, not an assumption that unknown production meanings are `VERIFIED`.
