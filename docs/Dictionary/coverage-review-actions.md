# Review actions — dictionary pilot

**DRAFT — chờ duyệt. Search coverage success does not approve publication.**

## Resolved wrong-sense mappings

The user requested corrections to two pre-existing homograph errors. Existing reviewed meanings/ranks are transferred, without new translations, source snapshot changes or edits to versioned migrations:

| VI meaning | Wrong ID/sense | Correct ID/sense |
|---|---|---|
| bánh mì | 2850597, パン / パン, pan- | 1103090, パン / パン, bread |
| xe buýt | 2845315, バス / バス, bass fish | 1098390, バス / バス, bus |

The repeatable refresh clears wrong VI metadata and reapplies the corrected 204-row reviewed TSV. Integrity assertions check the IDs and canonical English sense anchors, so matching spelling/reading alone cannot conceal these two errors again.

## Search coverage and remaining ambiguity

General candidate selection distinguishes the first primary gloss, other primary glosses, secondary senses, bounded tokens and partial matches before pagination. VI tone-sensitive lookup and headword/reading deduplication remain covered. No global common_rank change or word-specific boost is used. No Top-10 assertion, threshold or benchmark identity was weakened.

See the [report](Dictionary-Coverage-Report.md) for metrics and all 28 mandatory ranks. [Remaining failures](coverage-remaining-failures.json) retains every primary/alias miss with returned IDs. [The CSV](coverage-results.csv) compares all 500 fixed concepts to the baseline. Alias coverage below the primary gate remains visible; a primary search PASS does not claim universal dictionary correctness.

## Academic approval still needed

1. All **500** draft concepts remain PENDING_REVIEW. The **452 A-confidence** records are not human-approved merely because confidence is high.
2. The **48 C-confidence** records must be reviewed or excluded before publication. They retain their notes and status; none was reclassified or promoted to make tests pass.
3. Context-dependent terms (kinship, fruit/colour, hardware mouse, barber/hairdresser, financial bank, tactile/weather adjectives) need human Japanese review and reliable references before promotion.
4. Review remaining ambiguous rankings and measured local latency. The search gate does not substitute for academic approval or production health verification.

The pending JSON is loaded only by the restricted disposable-database rehearsal. Production's repeatable migration does not read it. No Admin UI bulk import, content expansion, schema change or production deployment was performed in this fix task.
