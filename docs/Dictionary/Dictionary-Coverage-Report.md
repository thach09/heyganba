# HeyGanba Dictionary Coverage Report

**Recommendation: DICTIONARY COVERAGE NEEDS MORE WORK**

Branch: `feat/dictionary-coverage-expansion`, based on clean `develop` commit `8895a5f9cba41b484398dd24f87aa1e400bcd6be`.
Date: 2026-10-09. This is a **pending review pilot and disposable local rehearsal**, not a release or production coverage claim. All new content remains `PENDING_REVIEW`; no managed staging/production database was used.

## Baseline

Benchmark concepts: **500**, with **1,000 primary VI/EN queries**, 153 VI alias queries and 59 EN alias queries (1,208 unique queries).
Full catalog: **218,867 JMdict entries** plus existing course content. PASS requires the intended negative JMdict ID within Top 10 on page 0; course equivalents and headword-only matches do not substitute for canonical-ID hits.

| Metric | Before: original develop | After: pending pilot rehearsal |
|---|---:|---:|
| Vietnamese Top-1 | 111/500 (22.2%) | 489/500 (97.8%) |
| Vietnamese Top-3 | 117/500 (23.4%) | 496/500 (99.2%) |
| Vietnamese Top-10 | 118/500 (23.6%) | 497/500 (99.4%) |
| English Top-1 | 133/500 (26.6%) | 153/500 (30.6%) |
| English Top-3 | 238/500 (47.6%) | 257/500 (51.4%) |
| English Top-10 | 305/500 (61.0%) | 324/500 (64.8%) |
| Combined primary Top-10 | 423/1000 (42.3%) | 821/1000 (82.1%) |
| Concepts passing both languages | 86/500 (17.2%) | 322/500 (64.4%) |
| VI absent from first page | 381 | 3 |
| EN absent from first page | 167 | 149 |

“Not found” is first-page absence, not proof of absence from every page or from JMdict. The original baseline was collected before enrichment; a clean detached build of the pinned develop commit confirmed the same coverage counts, eliminating leftover build artifacts from the earlier release task.

## Data added

- Vietnamese curated entries: **380 new gloss drafts**, with 120 existing reviewed benchmark meanings preserved. **0 new entries published.** The existing reviewed TSV remains unchanged at 204 rows.
- Vietnamese aliases proposed: **139**. Accent placement variants such as khóa/khoá and thủy/thuỷ are explicitly retained; folded equivalence is not treated as accented-query equivalence.
- English aliases proposed: **25** missing whole-token learner synonyms/phrases. Existing JMdict English meanings are never rewritten. Alias reasons are recorded per entry.
- Categories covered: **16**. animals (38), food-drinks (35), fruit-vegetables (33), household (40), transport (29), jobs (29), school (29), body-health (30), clothing (30), places (30), family (29), weather-nature (30), emotions-personality (23), technology (30), daily-verbs (40), adjectives (25).

The new data lives only in [the pending staging artifact](../../backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json). The production migration does not load it. IDs are unique and tied to representative headword, reading and actual JMdict sense; no new Japanese dictionary, entry IDs, course words or learning rewards were created.

## Quality

- A-confidence: **452**, independently authored agent drafts with direct canonical mappings; this is not human approval or a claim of external row-by-row verification.
- B-reviewed: **0**; no reviewed ambiguity is claimed without the required verification.
- C / needs review: **48**, with explicit notes. They must be excluded from any release until human review/reclassification. All 500 remain PENDING_REVIEW.

The local 500-entry rehearsal deliberately includes C records solely to measure/search and expose issues. Consequently its hit rate does not certify an approved 500-concept release. Human review and reliable additional references are still needed for ambiguous/specialized wording.

Manual inspection covered animals, fruit, appliances, transportation, occupations, technology and daily verbs. Cat, lion, strawberry, refrigerator, washer, motorcycle, truck, firefighter, veterinarian, computer, wash and sleep map to the intended canonical entries in VI. JP 猫/ねこ/ネコ, romaji neko, unaccented meo and alias con mèo were checked. No duplicate headword/reading pairs appeared in the 22 captured responses.

**Two pre-existing semantic mapping errors were found:** bánh mì is attached to ID 2850597 (`pan-`) instead of bread ID 1103090; xe buýt is attached to ID 2845315 (bass fish) instead of bus ID 1098390. Incorrect rank-1 entries suppress the correct pending entries during deduplication. Corrections are documented for review, not silently promoted into published data. See [review actions](coverage-review-actions.md) and [actual spot-check responses](coverage-spot-checks.json).

## Search results

Before: VI Top-10 **23.6%**, EN **61.0%**, combined primary **42.3%**.
After rehearsal: VI Top-10 **99.4%**, EN **64.8%**, combined primary **82.1%**.
VI alias Top-10: 9.8% → **100%**; EN alias Top-10: 64.41% → **76.27%**.

Remaining primary failures: **179** — 176 English ranking failures, 2 Vietnamese homograph/sense collisions, and 1 mixed-language/course-merge case (`to`). An additional 14 English alias queries miss Top 10. No VI alias failures remain.

**Full-catalog readiness gate: FAIL (exit 1).** Required English regressions still failing: `lion` rank 19; `motorcycle` and `truck` absent from the first page. All 14 required VI counterparts reach rank 1. The isolated fixture regression passes but does not override these full-catalog failures.

Source and SQL inspection confirm a candidate-selection issue for motorcycle/truck: their canonical glosses contain `motorcycle, motorbike` / `truck, lorry`, while the repository's space-token ranking gives a zero token position before the comma; related compounds can occupy the first 20 candidates before service re-sorting. Also, `cat` ranks cát (sand) first under the unchanged unaccented VI contract, with the intended cat at rank 3. No global common_rank boost, normalization redesign or new search architecture was introduced.

All before/after primary ranks and PASS/FAIL diagnostics are in [coverage-results.csv](coverage-results.csv). Every remaining primary/alias failure, with returned Top-10 IDs, is in [coverage-remaining-failures.json](coverage-remaining-failures.json). The complete raw measurements are [baseline](coverage-baseline.json) and [after rehearsal](coverage-after-rehearsal.json).

## Technical changes

- Data/review artifacts and authoring/measurement tools under `docs/Dictionary`, `backend/tools`, and the pending staging JSON.
- `DictionaryCuration.java`: backward-compatible seven-column reviewed TSV parser; optional two alias columns, strict validation and separate normalized/accented search metadata.
- `R__refresh_jmdict_catalog.java`: reuse that parser and include transformer revision in its repeatable checksum; no versioned migration changes.
- `DictionaryService.java`: preserve metadata relevance during service re-sorting. An equal-common-rank regression failed before the fix because an exact alias hit was scored 9 and a partial gloss hit 8; it now passes on the existing relevance scale.
- Dictionary integrity, mandatory bilingual/all-theme fixture regression, and an opt-in test-only PostgreSQL/Flyway rehearsal. Existing notebook/course isolation and tone-sensitive search checks pass.
- Schema changed: **No**. Search algorithm changed: **small confirmed metadata re-sorting fix only**. Repository candidate query and pagination are unchanged. Frontend, auth, SRS, exams, Foundation and Japanese/English source snapshot are unchanged.

## Licensing / provenance

Canonical source: [JMdict / EDRDG](https://www.edrdg.org/jmdict/j_jmdict.html), repository snapshot source SHA-256 `96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7`. Derived dictionary data keeps **CC BY-SA 4.0** and EDRDG attribution under its [licence statement](https://www.edrdg.org/edrdg/licence.html).

[Japan Foundation Marugoto A1 resources](https://marugoto.jpf.go.jp/en/teacher/resource/starter_c/) and the official Vietnamese index were consulted for beginner themes/basic terminology context, without importing their lists or assuming a redistribution licence. VI glosses and aliases were independently authored; no commercial dictionary was scraped, no external database imported, and no automatic translation service used. They are not falsely labelled externally verified. Ambiguous C entries require human review and more than one reliable reference before release. See [provenance and reproduction](README.md).

## Validation

- Data integrity: **PASS** — all 500 canonical tuples and senses checked against the full snapshot; unique IDs/concepts, required meanings, controls, alias variants and ranks validated; malformed/duplicate curated rows rejected. This does not certify the correctness of every pre-existing Vietnamese meaning; the two old semantic errors remain explicit review blockers.
- Backend: **PASS** — full normal suite: 201 passed plus the intentionally disabled opt-in PostgreSQL test; subsequent focused integrity/query/notebook tests pass. Package build exit 0.
- Frontend: **PASS** — 8 legacy + 33 unit tests, lint exit 0 (existing warnings), build exit 0.
- PostgreSQL/Flyway: **PASS** — real local PostgreSQL 16.15; clean develop migrations through V37, canonical refresh plus test-only pending overlay, Flyway validate, unchanged complete curriculum and canonical ID/word/reading/English/rank/active fingerprints. Rehearsal refresh avoids accumulating aliases across changed draft runs. V38 belongs to the separate release lineage and was not introduced into develop by this sprint.
- Search regression: **fixture PASS; full-catalog target FAIL**, with failures listed above. Readiness checker exits 1 and does not approve a release.
- Browser smoke: **PASS** — dictionary bilingual display, JP/VI search, tone distinction, ranking/pagination and duplicate collapse; 1440 px desktop and 390 px mobile screenshots manually inspected. No horizontal overflow observed. UI remains unchanged.
- Performance: same sequential 1,208-query local HTTP protocol, one excluded warm-up, fresh baseline/candidate JVMs. Median **34.74 → 38.95 ms** (+4.21 ms, +12.1%). Slowest: **cat 94.48 ms → cat 106.17 ms**. These are workstation measurements, not production/load guarantees; no acceptance threshold was supplied.

## Recommendation

**DICTIONARY COVERAGE NEEDS MORE WORK**

Do not release or automatically seed this pilot. Tech Lead/Japanese reviewer should review the pending meanings/aliases, resolve the 48 C records and two old wrong-sense mappings, and approve a defensible approach to common English ranking before another full-catalog validation. The 95% bilingual target is not met. No schema, major search redesign or further vocabulary expansion is undertaken without that review.

Work is limited to this 500-concept review package. No push, PR, merge, deploy, production mutation or fix-branch cleanup was performed.
