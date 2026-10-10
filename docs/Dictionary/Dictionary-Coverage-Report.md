# HeyGanba Dictionary Coverage Report

**Search readiness: SEARCH COVERAGE PASS. Content approval: PENDING_REVIEW.**

Measured: 2026-10-10T12:00:28.623Z. The source tree includes normal merge 074594d2d172671bb491ad88e319f2f9a7aff6ca (released main → develop) and the focused Dictionary fixes in PR #31. No rebasing, history rewrite, frontend change, QA test change, main merge or production deploy was performed by this fix task.

This is a disposable local rehearsal, **not production coverage**. All 500 drafted records remain PENDING_REVIEW, including 48 C-confidence records. The runtime migration never loads the pending JSON. Hosted CI must pass on the current PR head; local checks do not replace it.

## Full catalog measurement

500 fixed concepts, 1,000 primary VI/EN queries, 153 VI aliases and 59 EN aliases; 1208 unique HTTP requests. Catalog: 218,867 entries. A PASS requires the intended negative JMdict ID in Top 10 on page 0. No assertion, benchmark ID or cutoff was weakened.

| Metric | Original clean develop baseline | Current pending rehearsal |
|---|---:|---:|
| VI Top-1 | 111/500 (22.2%) | 489/500 (97.8%) |
| VI Top-3 | 117/500 (23.4%) | 499/500 (99.8%) |
| VI Top-10 | 118/500 (23.6%) | 500/500 (100.0%) |
| EN Top-1 | 133/500 (26.6%) | 283/500 (56.6%) |
| EN Top-3 | 238/500 (47.6%) | 398/500 (79.6%) |
| EN Top-10 | 305/500 (61.0%) | 485/500 (97.0%) |
| Combined primary Top-10 | 423/1000 (42.3%) | 985/1000 (98.5%) |

Prior submitted rehearsal: VI 99.4%, EN 64.8%. Current VI aliases: 153/153 (100%). EN aliases: 54/59 (91.53%). The readiness gate applies the unchanged >=95% **per-language primary** threshold plus all 28 mandatory queries. Alias failures remain visible and are not hidden by the primary gate.

## Mandatory bilingual regression

| English query | VI canonical rank | EN canonical rank |
|---|---:|---:|
| cat | 1 | 2 |
| dog | 1 | 1 |
| lion | 1 | 3 |
| elephant | 1 | 2 |
| strawberry | 1 | 1 |
| watermelon | 1 | 1 |
| refrigerator | 1 | 4 |
| washing machine | 1 | 2 |
| motorcycle | 1 | 5 |
| truck | 1 | 1 |
| firefighter | 1 | 1 |
| accountant | 1 | 2 |
| hairdresser | 1 | 5 |
| veterinarian | 1 | 1 |

Remaining failures: 15 primary queries and 5 aliases. See [all ranks](coverage-results.csv), [remaining failures with returned IDs](coverage-remaining-failures.json) and [raw measurements](coverage-after-rehearsal.json). First-page absence is not claimed as absence from the entire dictionary.

## General search fix

Candidate selection now uses the same relevance tiers as service re-sorting before pagination: JP identity, VI exact meaning/alias, first gloss of the primary English sense, other primary glosses, secondary glosses, bounded tokens, partial matches. Parenthetical annotations do not become exact glosses. Every English infinitive may also match without “to”. The rules apply to the whole catalog; no individual-word boost or global common_rank change was introduced.

The existing search_text stores derived gloss metadata; no schema/table/dependency was added. The repeatable Flyway checksum includes the transformer revision. Query boundary regexes are compiled once per request and reused across indexed glosses. Curated VI semicolon-separated meanings retain their individual normalized/accented forms. Displayed English and the source JMdict snapshot remain unchanged.

## Wrong-sense corrections and content limits

The existing reviewed meanings were moved to the user-specified canonical IDs: bánh mì → 1103090 (bread), xe buýt → 1098390 (bus). IDs 2850597 (pan-) and 2845315 (bass fish) no longer carry those VI meanings or the transferred reviewed rank. The reviewed set still contains 204 records. Integrity tests lock the corrected IDs against their English sense anchors. No new translation was published.

The pilot remains 380 new VI drafts plus 120 previously reviewed benchmark meanings; 139 proposed VI aliases and 25 EN aliases, across 16 themes. Confidence: 452 A, 0 B, 48 C. Confidence does not authorize publication. No C entry was reclassified or approved, and no source identity was changed to satisfy the benchmark.

## Validation and performance

- After main → develop synchronization, QA-001 and all 58 frontend unit tests pass; no frontend code/test changes were needed. Frontend legacy tests (8), lint/build and npm audit pass (existing lint warnings; zero audit findings).
- Backend full H2 and real PostgreSQL 16 suites: 215 passed, one intentionally skipped opt-in test. Mandatory Dictionary, tone-sensitive aliases, notebook isolation, pagination and existing QA/security regressions pass. Runtime dependency audit preserves the released guarded advisory handling.
- Flyway/Hibernate validate through V38 on real PostgreSQL. The opt-in local overlay test passes, verifies 218,867 active entries and unchanged full curriculum plus canonical ID/word/reading/English/rank/active fingerprints. It now reapplies the overlay whenever a transformer refresh clears it.
- Median sequential HTTP latency: 52.86 ms; slowest: to, 134.3 ms. Historical submitted rehearsal median: 38.95 ms. Different runs are workstation measurements, not a controlled production latency guarantee; the increase is explicitly retained for review. Rate limit was kept at 600/minute, admin at 30/minute.

## Provenance and release decision

Canonical source: [JMdict / EDRDG](https://www.edrdg.org/jmdict/j_jmdict.html), pinned source SHA-256 96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7. Derived data retains [CC BY-SA 4.0 and EDRDG attribution](https://www.edrdg.org/edrdg/licence.html). No new external dataset or translation service was used. See [provenance and reproduction](README.md).

The search gate passes. Academic content review is still required: all 500 drafts remain pending, and the 48 C records must be reviewed or excluded before publication. PR #31 remains open for review; no production deployment is certified by this report.
