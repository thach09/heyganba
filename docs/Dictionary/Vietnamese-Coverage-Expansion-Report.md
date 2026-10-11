# Vietnamese Dictionary Coverage Expansion Report

**Recommendation: ENRICHMENT BLOCKED — MANUAL REVIEW REQUIRED.** No entries were promoted or deployed. The current implementation is local to the feature branch.

## Dataset

- JMdict snapshot: 218867 entries, pinned source SHA-256 `96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7`.
- Currently reviewed in the dictionary: 204. Staging batch A adds 343 new A-confidence `ASSISTED` drafts with 104 Vietnamese aliases and 9 English aliases. The potential combined coverage is 547 entries after qualified review; the release target is at least 5,000 approved high-value entries.
- Batch A is `backend/src/main/resources/db/migration-staging/vietnamese-assisted-batch-a.tsv`. It is not loaded by the production Flyway path. No assisted runtime resource has been promoted.

## Confidence

- Batch A: 343 A-confidence rows; no B or C rows.
- The 35 new C-confidence pilot candidates remain excluded. The other 13 C-confidence concepts were already in the independently reviewed source. Confidence is not human approval, and the 343 A drafts still need qualified Japanese review.

## Historical pilot search quality (not current readiness evidence)

The measurements below came from the earlier 500-concept pilot, which used 378 new drafts and 122 already-reviewed benchmark meanings. They predate the status migration and do not establish readiness for the current 343-row A-only batch. Re-run the full-catalog benchmark against the final reviewed candidate before release.

Canonical entry rank is measured within the first page. The new density metric counts visible result cards with a non-empty Vietnamese meaning, independently from the intended canonical entry rank.

| Metric | Before (clean develop baseline) | After (pending local rehearsal) |
|---|---:|---:|
| Vietnamese canonical Top-10 | 122/500 (24.4%) | 500/500 (100%) |
| English canonical Top-10 | 468/500 (93.6%) | 485/500 (97%) |
| VI-query Top-10 results with Vietnamese meaning | 278/471 (59.02%) | 805/954 (84.38%) |
| EN-query Top-10 results with Vietnamese meaning | 154/4696 (3.28%) | 541/4709 (11.49%) |
| Primary-query Top-10 results with Vietnamese meaning | 432/5167 (8.36%) | 1346/5663 (23.77%) |
| Primary queries meeting 80% Top-10 Vietnamese coverage | 139/1000 | 486/1000 |
| Primary-query first-page results with Vietnamese meaning | 544/9566 (5.69%) | 1534/10101 (15.19%) |

### Sample queries

Ranks show VI / English canonical result. Coverage columns show cards with Vietnamese meaning on the full first page and Top-10.

| Queries | Before VI / EN rank | After VI / EN rank | After first-page VI coverage | After Top-10 VI coverage |
|---|---:|---:|---:|---:|
| dog / chó | absent / 1 | 1 / 1 | 2/2 (100%) | 2/2 (100%) |
| cat / mèo | absent / 1 | 1 / 2 | 1/1 (100%) | 1/1 (100%) |
| lion / sư tử | absent / 3 | 1 / 3 | 1/1 (100%) | 1/1 (100%) |
| truck / xe tải | absent / 1 | 1 / 1 | 1/1 (100%) | 1/1 (100%) |
| refrigerator / tủ lạnh | absent / 4 | 1 / 4 | 1/1 (100%) | 1/1 (100%) |
| firefighter / lính cứu hỏa | absent / 1 | 1 / 1 | 1/1 (100%) | 1/1 (100%) |

Per-query first-page counts, coverage, canonical ranks and the first ten returned entries are in [coverage-query-density.csv](coverage-query-density.csv). The full-catalog before and after request results are in [vietnamese-coverage-baseline.json](vietnamese-coverage-baseline.json) and [vietnamese-coverage-candidate.json](vietnamese-coverage-candidate.json).

## Corrected old data

The prior reviewed mapping fixes remain: bánh mì → JMdict ID 1103090 (`パン`, bread), and xe buýt → ID 1098390 (`バス`, bus). The incorrect pan and bass-fish IDs no longer carry those meanings.

## Validation

- Identity, reading and English sense are checked against the pinned JMdict snapshot by `DictionaryCurationIntegrityTest`.
- Baseline CI after normal main → develop merge: H2 PASS, PostgreSQL/Flyway PASS through V38, frontend lint/build PASS. Run: [38052704294](https://github.com/thach09/heyganba/actions/runs/38052704294).
- Local validation: backend H2 suite passes. PostgreSQL 16 Flyway rehearsal through V39 passes with 218,867 active entries, 204 `VERIFIED`, 343 `ASSISTED`, 218,320 `NONE`, idempotent catalog refresh, and unchanged learning-content fingerprints. Frontend unit coverage checks all three displayed provenance states; lint/build and desktop/mobile visual checks are part of the implementation validation.
- V39 has not been applied to production. Before any production migration, verify that the existing nonblank runtime values came from the reviewed TSV source.
- Candidate search timing: median 64.14 ms, slowest `to` at 156.58 ms (sequential local HTTP on PostgreSQL 16; not a production latency guarantee).

## Remaining gaps

The reviewed dictionary currently covers 204 entries against the 5,000-entry target; the current batch adds 343 staged drafts. The required full-catalog density benchmark has not been run against the final reviewed candidate, and the 80% Top-10 gate is not established. Human review remains required for every staged row; all 35 new C-confidence pilot candidates remain excluded.

The JMdict/EDRDG snapshot and license remain pinned as described in [the curation README](README.md); Vietnamese drafts are independently authored and not claimed externally verified row by row. V39 and the provenance-aware API/UI changes are implemented locally. No runtime translation API was added. Measurements used disposable local PostgreSQL databases; no staging or production database was written.
