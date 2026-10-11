# Assisted Vietnamese persistence: approved implementation

Tech Lead approved the minimal status design on 2026-10-11. The implementation is local to the dictionary model and does not add review history, a general-purpose workflow, or external runtime translation.

## Persisted states

`dictionary_entries.vietnamese_meaning` remains the displayed text. V39 adds `vietnamese_status VARCHAR(10) NOT NULL` with the constrained values `VERIFIED`, `ASSISTED`, and `NONE`, plus a consistency constraint:

- `VERIFIED`: a Vietnamese meaning approved by a qualified human.
- `ASSISTED`: an offline assisted draft, explicitly labeled as reference text.
- `NONE`: no Vietnamese meaning.

V39 backfills existing nonblank meanings as `VERIFIED` and empty meanings as `NONE`. Before applying this migration in production, verify that the persisted nonblank values came from the reviewed `curated-ja-vi.tsv` source, as the current production refresh path indicates. V39 has not been applied to production.

## Refresh and assisted import

The repeatable catalog refresh resets entries to `NONE`, then marks rows from `curated-ja-vi.tsv` as `VERIFIED`. It supports an optional, explicitly status-bearing `/dictionary/assisted-ja-vi.tsv` resource through a strict importer that accepts only `ASSISTED` rows with confidence A/B and exact JMdict ID, word, reading, and English-sense identity. It rejects C confidence, `NEEDS_REVIEW`, malformed fields, duplicate IDs, and mismatched catalog rows. It does not read `migration-staging`.

The staging-only rehearsal batch lives at `backend/src/main/resources/db/migration-staging/vietnamese-assisted-batch-a.tsv`; it is not part of the production classpath. No assisted resource has been promoted to the runtime dictionary resources.

## API and display

Dictionary search and notebook responses expose `vietnameseStatus`. The dictionary card keeps `Việt` for verified text, shows `Việt tham khảo` for assisted text, retains the no-meaning fallback, and keeps English JMdict meanings visible. Notebook list and add-word views retain the assisted label as well.

## Validation completed

- H2 backend suite passes, including API status assertions for all three states.
- A disposable PostgreSQL 16 Flyway rehearsal passes through V39 and a full catalog refresh. It verifies 218,867 active entries, 204 `VERIFIED`, 343 `ASSISTED`, 218,320 `NONE`, and unchanged learning-content fingerprints.
- The PostgreSQL rehearsal also confirms the repeatable refresh is idempotent and that the assisted staging rows match the pinned JMdict snapshot.
- Frontend coverage verifies the `ASSISTED`, `VERIFIED`, and `NONE` labels, including that assisted text is never labeled verified.

## Enrichment readiness remains blocked

The persistence design and first staging batch are implemented, but the batch is not release-ready. It contains 343 new A/B assisted drafts, not the requested approximately 5,000 high-value entries; the 35 C-confidence candidates remain excluded, and the 343 drafts still need qualified Japanese review. The approved dictionary contains 204 verified entries. The prior pilot density benchmark is historical and does not prove the current release gates. Keep the drafts in staging and do not merge or deploy until the complete batch, semantic review, full-catalog benchmark, and readiness thresholds pass.
