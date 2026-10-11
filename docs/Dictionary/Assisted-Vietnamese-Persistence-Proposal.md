# Assisted Vietnamese persistence: approved implementation

The founder approved A-confidence `ASSISTED` Vietnamese meanings for production without human row-by-row review. `ASSISTED` stays visibly distinct from human-reviewed `VERIFIED`; only promotion to `VERIFIED` requires a qualified human review. Density goals are targets, not release gates.

## Persisted states

V39 adds `dictionary_entries.vietnamese_status VARCHAR(10) NOT NULL` with the constrained values `VERIFIED`, `ASSISTED`, and `NONE`, plus a consistency constraint:

- `VERIFIED`: a Vietnamese meaning approved by a qualified human.
- `ASSISTED`: offline machine/agent-assisted meaning that has not been human-reviewed.
- `NONE`: no Vietnamese meaning.

The migration backfills existing nonblank meanings as `VERIFIED` and empty meanings as `NONE`. Before applying V39 to production, mechanically verify that existing nonblank runtime values originated from the reviewed `curated-ja-vi.tsv` source. Do not guess or mark unknown values `VERIFIED`.

## Refresh and assisted import

The repeatable catalog refresh resets entries to `NONE`, imports `dictionary/curated-ja-vi.tsv` as `VERIFIED`, and imports the explicitly status-bearing `dictionary/assisted-ja-vi.tsv` as `ASSISTED`. The strict importer accepts only confidence A and exact JMdict ID, word, reading, and full English-sense identity. It rejects B/C confidence, `NEEDS_REVIEW`, malformed fields, duplicate IDs, reviewed IDs, and mismatched catalog rows. The application never loads `migration-staging` and never calls an external translation service.

The runtime candidate contains batches A–F (4,796 rows). Batch files and exclusions remain in `backend/src/main/resources/db/migration-staging/`; the older 500-concept pilot, including its 48 C-confidence concepts, is not a runtime data source. Forty-seven historical or named-institution/eponym entries were removed from the release batches. See [the release report](Vietnamese-Coverage-Expansion-Report.md) for the complete counts, benchmark, and production blockers.

## API and display

Dictionary search and notebook responses expose `vietnameseStatus`. The UI keeps `Việt` for verified text, displays `Việt tham khảo` for assisted text, and retains the existing no-meaning fallback. English JMdict meanings stay visible. Notebook views preserve the assisted label.

## Validation and release state

- H2: 221 passed, 0 failed, 1 opt-in PostgreSQL test skipped.
- PostgreSQL 16.15/Flyway through V39: passed on a disposable database with 218,867 active entries, 204 `VERIFIED`, 4,796 `ASSISTED`, and 213,867 `NONE`; full refresh idempotency and learning-content fingerprints passed.
- Frontend: 8 legacy and 61 unit tests, lint, and production build passed.
- A-only integrity checks cover every batch and the runtime resource; assisted data remains distinct from verified data.

The local candidate and benchmark are ready for hosted CI. Production remains blocked until production data provenance is mechanically verified and a custom-format PostgreSQL backup is created and verified before V39. No migration has been applied to production and no merge or deployment has occurred.
