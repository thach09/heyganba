# Dictionary data and coverage

## Current assisted Vietnamese candidate

Founder-approved release policy allows A-confidence `ASSISTED` meanings without row-by-row human review. These meanings remain labeled `Việt tham khảo` and persisted as `ASSISTED`; they are never represented as `VERIFIED`. The current local candidate has 204 reviewed `VERIFIED` entries and 4,796 A-confidence `ASSISTED` entries. Its only runtime assisted source is `backend/src/main/resources/dictionary/assisted-ja-vi.tsv`.

The corresponding source batches A–F and the 47-row historical/named-entry exclusion ledger are under `backend/src/main/resources/db/migration-staging/`. These staging files are authoring and audit artifacts; the application does not import them. The old `dictionary-coverage-pilot.json` remains a historical benchmark/review artifact. Its C-confidence rows are not part of the runtime source. See [the release report](Vietnamese-Coverage-Expansion-Report.md) for the status counts, search benchmark, representative results, validation, and release gate.

## Sources and licensing

Canonical Japanese identity, readings, and English senses come from the bundled [JMdict / EDRDG](https://www.edrdg.org/jmdict/j_jmdict.html) snapshot (218,867 entries, SHA-256 `96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7`). Derived dictionary data retains **CC BY-SA 4.0** and EDRDG attribution under the [EDRDG licence statement](https://www.edrdg.org/edrdg/licence.html).

Offline assisted authoring prioritizes JMdict frequency tags. Each accepted row is pinned to the exact repository catalog ID, headword, reading, and full English sense; one unrestricted sense is required. JA→VI headword translation is cross-checked against EN→VI translation of that complete sense. Rows with mismatched meaning, empty or malformed text, duplicates, existing reviewed IDs, ambiguity, specialized or archaic terms, slang-heavy senses, and named entries are excluded. This automated check is not human review, and assisted meanings remain explicitly marked as such. The application has no runtime translation API.

`Japan Foundation Marugoto A1 resources` and its Vietnamese vocabulary index were consulted earlier for pilot topic selection and basic terminology context. Their lists were not imported or redistributed. No redistribution license is inferred from download availability.

## Persistence and search

V39 adds the constrained `vietnamese_status` states `VERIFIED`, `ASSISTED`, and `NONE`. The repeatable refresh resets the catalog to `NONE`, loads the reviewed TSV as `VERIFIED`, and loads the explicit runtime assisted TSV as `ASSISTED`. It does not load pending pilot content. The refresh checksum includes the catalog transformer so a full refresh preserves gloss indexing and statuses.

Vietnamese aliases remain in `vietnamese_search_text` and are distinct from displayed meanings. Search ranking applies general relevance tiers before pagination; it uses no individual-word boosts and does not globally manipulate `common_rank`. Benchmark identities and Top-10 assertions remain unchanged. See the coverage report for measured candidate ranking and result-density figures; density is a product target, not a production release gate.

## Reproduction

Run `backend/tools/prepare-assisted-dictionary-batch.mjs` for Batch A, `backend/tools/generate-assisted-dictionary-batches.mjs` for offline B–F authoring, `backend/tools/clean-assisted-batch-out-of-scope.mjs` to maintain the exclusion ledger and batch metadata, and `backend/tools/assemble-assisted-dictionary-release.mjs` to validate and assemble the runtime import. Use only a disposable local PostgreSQL database for the Flyway rehearsal and benchmark; the benchmark scripts reject non-local URLs. The release report records the latest measured output.

## Production status

V39 has not been applied to production. Before doing so, mechanically verify the provenance of existing production Vietnamese values against the reviewed TSV and create/verify a custom-format PostgreSQL backup. The current workspace has no production DB URL/Render credentials, no `pg_dump`, and no connected production dashboard session; therefore release remains blocked until those two hard gates are completed.

Hosted CI run [#150](https://github.com/thach09/heyganba/actions/runs/38124235315) passed frontend, backend H2, PostgreSQL/Flyway, and Vercel checks. The Render production deploy job was skipped; no production merge or deployment has occurred.
