# Dictionary coverage pilot

**DRAFT — chờ duyệt. No new translations are published by this branch.**

The benchmark contains exactly 500 independently selected everyday concepts across 16 themes. Its expected IDs, representative headwords, readings and relevant English senses were checked against the bundled JMdict snapshot. `coverage-identities.json` locks the selected IDs, including choices between common and rare readings; it is authoring metadata, not another dictionary.

`coverage-benchmark.draft.json` defines primary VI/EN queries and natural aliases. `coverage-baseline.json` and `coverage-after-rehearsal.json` are the earlier PR #31 ranking pilot artifacts. The latest clean, main-synchronized `develop` baseline (`b42d18206e8d84f6536160c038f97d3a74b86dfa`) and candidate rehearsal are in `vietnamese-coverage-baseline.json` and `vietnamese-coverage-candidate.json`. Every primary PASS requires the intended negative JMdict ID within the first ten vocabulary results on page 0. Equivalent course rows are reported separately. “Not found” means absent from the first page, not absent from the entire database. No estimates or fixture hit rates substitute for these measurements.

The pending enrichment artifact is `backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json`. It contains 378 new VI gloss drafts, keeps 122 existing reviewed meanings in the benchmark unchanged, and proposes 139 VI aliases and 25 missing English learner synonyms/phrases. All 500 records remain `PENDING_REVIEW`; 452 have A confidence and 48 are C with explicit contextual notes. The `confidence` field records A/B/C and mirrors the legacy `quality` field for compatibility. None is marked human-approved or B-reviewed. C entries must be excluded from any release until reviewed and reclassified. The full 500-entry rehearsal includes C entries solely to expose search/semantic problems; its results are not an approved release coverage claim.

The latest query-density measurements and release gaps are in [Vietnamese-Coverage-Expansion-Report.md](Vietnamese-Coverage-Expansion-Report.md), with one CSV row per benchmark query in [coverage-query-density.csv](coverage-query-density.csv). That report supersedes the earlier PR #31 search-ranking report for current coverage status.

## Sources and authorship

Canonical Japanese identity, readings and English senses come from [JMdict / EDRDG](https://www.edrdg.org/jmdict/j_jmdict.html), using the repository's existing snapshot (218,867 entries, source SHA-256 `96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7`). No catalog refresh was performed. Derived dictionary data retains **CC BY-SA 4.0** and EDRDG attribution under the [EDRDG licence statement](https://www.edrdg.org/edrdg/licence.html).

[Japan Foundation Marugoto A1 resources](https://marugoto.jpf.go.jp/en/teacher/resource/starter_c/) and its [Vietnamese vocabulary index](https://marugoto.jpf.go.jp/assets/docs/download/starter_c/MarugotoStarterCompetencesVocabularyIndex2_VN.pdf) were consulted for beginner topic selection and basic terminology context. Their lists were not imported, scraped or redistributed; availability for download is not assumed to grant a redistribution licence. The VI wording and aliases here were independently authored by the agent. They are **not claimed to have been externally verified row by row**. No commercial dictionary database or translation service was used. Ambiguous/specialized C records still require human review and more than one reliable reference before release.

## Existing pipeline extension

The reviewed `dictionary/curated-ja-vi.tsv` still contains 204 entries. The user-requested bread/bus sense corrections move existing Vietnamese meanings and reviewed ranks to canonical IDs 1103090/1098390; no new translation is published. Its seven columns and optional columns 8/9 (VI/EN aliases separated by semicolons) remain supported. Integrity tests lock the corrected English sense anchors and validate the pending pilot independently.

Aliases use the existing search metadata fields, never displayed meanings. `vietnamese_search_text` stores normalized and accented variants separated by ` | `, including individual semicolon-separated meanings. `search_text` retains the original JP/romaji/EN corpus and appends glosses with reserved markers: `^ ` for the first primary gloss, `= ` for further primary glosses, `~ ` for secondary senses. Parenthetical annotations are excluded from exact gloss metadata; English infinitives also index the form without “to”. Reviewed/pending aliases are delimited separately. The separator is reserved in curated input. VI normalization remains unchanged.

The repeatable Flyway checksum includes the transformer revision so the whole catalog receives gloss indexing even if snapshot bytes are unchanged. There is **no schema migration**, new table, search service or runtime external API. The pending JSON is never read by the production migration. Only the opt-in test-source Flyway migration rehearses it on a restricted localhost database. Its checksum includes the catalog transformer so a refresh cannot leave the overlay missing. Full curriculum and canonical ID/word/reading/English/rank/active fingerprints remain unchanged by the overlay. New entries keep rank 1000; existing ranks are preserved. No rank boost is used to force benchmark passes.

Candidate selection and service re-sorting share the relevance tiers before pagination: JP identity, exact VI meaning/alias, first English gloss, further primary glosses, secondary glosses, bounded tokens, partial matches. No per-word boosts or global common_rank manipulation are used. The original exact-alias regression remains intact. Added coverage checks force an exact phrase ahead of more than one page of higher-frequency compounds and verify pagination. Regexes are reused across glosses. Benchmark identities, Top-10 assertions and readiness thresholds are unchanged. See the report for measured results and remaining failures.

## Reproduction

Use only a disposable local PostgreSQL database named `dictionary_pilot` or `dictionary_pilot_clean`, user `pilot`, password `local-dictionary-pilot`, on a loopback port. Do not use managed staging or production data. Baseline and candidate apps used PostgreSQL 16.15, Java 21, port 18081, the same dev profile and the same catalog/course seeds. Set Java timezone to `Asia/Ho_Chi_Minh` on this Windows machine because its legacy default `Asia/Saigon` is rejected by this PostgreSQL image. This is a test-launch setting, not an application timezone change.

1. Run a clean backend build of the pinned develop commit, start it against the disposable database with only `classpath:db/migration`, and run from repository root:

   ```powershell
   node backend/tools/measure-dictionary-coverage.mjs docs/Dictionary/coverage-benchmark.draft.json docs/Dictionary/coverage-baseline.json
   ```

2. Stop the baseline app. `prepare-dictionary-pilot.mjs` requires the full baseline and does not translate or publish data. It annotates failures against actual existing glosses and prepares the pending review artifact:

   ```powershell
   node backend/tools/prepare-dictionary-pilot.mjs
   ```

3. In `backend/`, run the integrity/query tests and the opt-in Flyway rehearsal:

   ```powershell
   mvn test
   mvn '-Dtest=DictionaryPilotPostgresRehearsalTest' '-Ddictionary.pilot.rehearsal=true' '-Ddictionary.pilot.jdbc=jdbc:postgresql://127.0.0.1:15439/dictionary_pilot_clean' '-DargLine=-Duser.timezone=Asia/Ho_Chi_Minh' test
   ```

4. Build the candidate app, launch it against that already-rehearsed database with Flyway disabled **only for this test launch** (the test-only repeatable migration is not deployed in the app), then measure from repository root:

   ```powershell
   node backend/tools/measure-dictionary-coverage.mjs docs/Dictionary/coverage-benchmark.draft.json docs/Dictionary/coverage-after-rehearsal.json
   ```

Timing includes sequential HTTP, DB/count queries, ORM and course/catalog merging; one warm-up is excluded. The runner preserves the public 600/minute rate limit with pacing and rejects non-local URLs. The 14 required bilingual pairs and representative queries from all themes have a separate automated fixture regression asserting exact IDs within Top 10. Their fixture success is not a claim about the entire catalog.

Promotion is a separate human-reviewed change: verify meanings and aliases, resolve or exclude C entries, then explicitly update the existing reviewed TSV. Do not move this draft into automatic production ingestion. No branch push, PR, merge or deployment is part of this pilot.
