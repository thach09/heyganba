# Vietnamese Dictionary Coverage Expansion Report

**Recommendation: VIETNAMESE COVERAGE NEEDS MORE WORK.** No entries were promoted or deployed. All new draft content remains `PENDING_REVIEW`.

## Dataset

- JMdict snapshot: 218867 entries, pinned source SHA-256 `96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7`.
- Total distinct entries with existing or staged Vietnamese: 582. Currently approved in the reviewed dictionary: 204. Release target: at least 5,000 approved high-value entries.
- Staged meanings in the existing pilot file: 378 new drafts, plus 122 already-reviewed benchmark meanings. Benchmark concepts measured: 500.
- Vietnamese aliases proposed: 139. English aliases proposed: 25.

## Confidence

- A: 452.
- B: 0.
- C excluded from release: 48.
- Every staged record remains `PENDING_REVIEW`; confidence is not human approval. The pending JSON is not loaded by the production Flyway path.

## Search Quality

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
- Local candidate validation: backend H2 215 passed, one opt-in PostgreSQL test skipped; the separate PostgreSQL 16 rehearsal passed with 218,867 active catalog entries and intact curriculum fingerprints. Frontend legacy/unit tests passed (8 + 58), lint passed, and production build passed.
- The post-change hosted CI run is recorded after the review branch is pushed; the baseline CI above covers the synchronized tree.
- Candidate search timing: median 64.14 ms, slowest `to` at 156.58 ms (sequential local HTTP on PostgreSQL 16; not a production latency guarantee).

## Remaining gaps

The reviewed dictionary currently covers 204 approved entries against the 5,000-entry target; 582 dictionary IDs would be covered if all staged drafts were later approved. Top-10 Vietnamese result density does not meet the 80% target for every primary query. The catalog entries outside the focused batch remain without Vietnamese because they include low-frequency, technical, archaic, slang and polysemous senses that need prioritization and semantic review; they were not translated to inflate the metric. Human review is still required for all staged A/B records, and C records must remain excluded from release.

The JMdict/EDRDG snapshot and license remain pinned as described in [the curation README](README.md); Vietnamese drafts are independently authored and not claimed externally verified row by row. No application schema migration, runtime translation API or UI redesign was introduced. Measurements used disposable local PostgreSQL databases; no staging or production database was written.
