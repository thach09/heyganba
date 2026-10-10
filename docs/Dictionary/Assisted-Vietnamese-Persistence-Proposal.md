# Assisted Vietnamese persistence proposal

## Decision required

The current dictionary model cannot distinguish a human-reviewed Vietnamese meaning from an assisted draft after persistence. The enrichment batch must stop here until Tech Lead approval is given for a minimal status field. No migration or assisted batch has been created.

## Evidence in the current implementation

- `dictionary_entries` has `vietnamese_meaning` and `vietnamese_search_text`, added in V33, but no Vietnamese review status.
- `DictionaryEntry` stores the meaning and search text only. `DictionarySearchResponse.Word` exposes the meaning without its provenance.
- The runtime refresh imports `curated-ja-vi.tsv`, which is the reviewed source, and does not load the pending pilot in `migration-staging`.
- The dictionary card currently uses one “Việt” label for any non-empty meaning, so it cannot label assisted text differently.

## Smallest persistence change

Keep `vietnamese_meaning` as the text field already in use. Add one constrained status column to `dictionary_entries`:

```sql
vietnamese_status VARCHAR(10) NOT NULL DEFAULT 'NONE'
  CHECK (vietnamese_status IN ('VERIFIED', 'ASSISTED', 'NONE'))
```

Add a consistency constraint so `NONE` has no non-blank Vietnamese meaning, while `VERIFIED` and `ASSISTED` require one. Existing populated runtime values can be backfilled as `VERIFIED` because the current repeatable migration clears the catalog and repopulates Vietnamese meanings exclusively from the reviewed TSV. Confirm that provenance against the production data before applying the migration.

The states mean:

- `VERIFIED`: reviewed and approved by a qualified human.
- `ASSISTED`: generated offline after checking the Japanese entry, reading, JMdict sense, restrictions, and part of speech; never represented as human-reviewed.
- `NONE`: no Vietnamese meaning.

This adds no review-history table, generic review workflow, or new content architecture. Search aliases remain in `vietnamese_search_text`; English JMdict meanings remain unchanged.

## Follow-on implementation after approval

1. Add a versioned Flyway migration (next version after V38) for `vietnamese_status`, its allowed values, consistency constraint, and reviewed-data backfill.
2. Update the repeatable dictionary refresh to reset entries to `NONE`, then mark entries loaded from `curated-ja-vi.tsv` as `VERIFIED`. Add a separate, explicitly status-bearing offline import for approved assisted batches; never load `NEEDS_REVIEW` rows.
3. Expose the status in the dictionary response. Preserve the current verified label, display assisted text as “Việt tham khảo” (or approved equivalent), and keep the current no-meaning fallback. Keep English meanings visible.
4. Add migration and refresh tests proving all three states survive a full catalog refresh, plus API/UI coverage that an assisted result is never labeled verified.

The first batch remains blocked until this status design is approved. Only then should the approximately 5,000 high-value candidates be selected, translated semantically, split into reviewable chunks, and evaluated against the specified search-density gates.
