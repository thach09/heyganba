# Dictionary coverage pilot

**DRAFT — chờ duyệt. No new translations are published by this branch.**

The benchmark contains exactly 500 independently selected everyday concepts across 16 themes. Its expected IDs, representative headwords, readings and relevant English senses were checked against the bundled JMdict snapshot. `coverage-identities.json` locks the selected IDs, including choices between common and rare readings; it is authoring metadata, not another dictionary.

`coverage-benchmark.draft.json` defines primary VI/EN queries and natural aliases. `coverage-baseline.json` records real HTTP results from clean `develop` commit `8895a5f9cba41b484398dd24f87aa1e400bcd6be`. `coverage-after-rehearsal.json` records the candidate rehearsal on the same disposable database and catalog. Every primary PASS requires the intended negative JMdict ID within the first ten vocabulary results on page 0. Equivalent course rows are reported separately. “Not found” means absent from the first page, not absent from the entire database. No estimates or fixture hit rates substitute for these measurements.

The pending enrichment artifact is `backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json`. It contains 380 new VI gloss drafts, keeps the 120 existing reviewed meanings in the benchmark unchanged, and proposes 139 VI aliases and 25 missing English learner synonyms/phrases. All 500 records remain `PENDING_REVIEW`; 452 have A confidence and 48 are C with explicit contextual notes. None is marked human-approved or B-reviewed. C entries must be excluded from any release until reviewed and reclassified. The full 500-entry rehearsal includes C entries solely to expose search/semantic problems; its results are not an approved release coverage claim.

## Sources and authorship

Canonical Japanese identity, readings and English senses come from [JMdict / EDRDG](https://www.edrdg.org/jmdict/j_jmdict.html), using the repository's existing snapshot (218,867 entries, source SHA-256 `96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7`). No catalog refresh was performed. Derived dictionary data retains **CC BY-SA 4.0** and EDRDG attribution under the [EDRDG licence statement](https://www.edrdg.org/edrdg/licence.html).

[Japan Foundation Marugoto A1 resources](https://marugoto.jpf.go.jp/en/teacher/resource/starter_c/) and its [Vietnamese vocabulary index](https://marugoto.jpf.go.jp/assets/docs/download/starter_c/MarugotoStarterCompetencesVocabularyIndex2_VN.pdf) were consulted for beginner topic selection and basic terminology context. Their lists were not imported, scraped or redistributed; availability for download is not assumed to grant a redistribution licence. The VI wording and aliases here were independently authored by the agent. They are **not claimed to have been externally verified row by row**. No commercial dictionary database or translation service was used. Ambiguous/specialized C records still require human review and more than one reliable reference before release.

## Existing pipeline extension

The reviewed `dictionary/curated-ja-vi.tsv` remains unchanged at 204 entries. Its existing seven columns are supported; optional columns 8/9 hold VI/EN aliases separated by semicolons. `DictionaryCuration` validates IDs, duplicate IDs, required fields, control characters, row shape, ranks and aliases before Flyway applies them. Build-time integrity tests validate source IDs/headwords/readings against the complete snapshot and validate the pending pilot independently.

Aliases use the existing search metadata fields, never displayed meanings. `vietnamese_search_text` stores deduplicated normalized and accent-preserving variants separated by ` | `. `search_text` keeps JMdict's original normalized JP/romaji/EN text and appends only justified missing English aliases as delimited metadata. The separator is reserved; it is rejected in curated input. Existing `DictionaryText` normalization is unchanged: accented VI queries retain their tones; unaccented queries can match folded forms.

The repeatable Flyway checksum includes a transformer revision so the 204 reviewed entries receive consistent alias indexing even if source bytes are unchanged. There is **no schema migration**, new table, search service or runtime external API. The pending JSON is never read by the production migration. Only the opt-in test-source Flyway migration rehearses it on a restricted localhost database. That test checks full-content curriculum fingerprints and the canonical ID/word/reading/English/rank/active fingerprint before and after. New entries keep rank 1000; existing ranks are preserved. No rank boost is used to force benchmark passes.

The confirmed ranking fix makes service re-sorting account for metadata hits on the existing relevance scale. Previously an exact alias hit was treated as unrelated (rank 9), below a partial displayed-gloss hit (rank 8). Its regression was observed failing on the original service before the fix, with equal common ranks on both fixtures. Repository candidate selection and pagination are unchanged; full-catalog ranking failures remain documented separately.

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
