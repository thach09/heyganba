# Review actions — dictionary pilot

**DRAFT — chờ duyệt. The pilot is not release-ready.**

## Two pre-existing semantic mapping errors

The current reviewed TSV checks source spelling/reading but does not include an English-sense anchor. Identical spelling and reading are insufficient for homographic entries. Both issues predate this branch and appear in the actual local search responses; the new 500-concept benchmark locks the correct sense-specific IDs.

| VI meaning | Existing curated ID / English sense | Correct benchmark ID / sense | Effect |
|---|---|---|---|
| bánh mì | 2850597, パン / パン, `pan-` | 1103090, パン / パン, bread | Existing rank-1 incorrect entry suppresses the correct candidate during headword/reading deduplication. |
| xe buýt | 2845315, バス / バス, bass (fish) | 1098390, バス / バス, bus | Same collision; the candidate bus entry exists with the correct draft gloss but is suppressed. |

Review the two mapping corrections and the existing curated set's homograph/sense matching before promotion. The currently published TSV remains unchanged in this branch; a Japanese reviewer has not approved replacement mappings. The pending artifact and benchmark identify the correct source entries without rewriting Japanese/English definitions.

## Full-catalog ranking and normalization interaction

- English Top-10 coverage is 324/500 (64.8%); 176 primary queries still fail. The full-catalog readiness check exits **1**.
- Required English regressions that fail: `lion` at rank 19; `motorcycle` and `truck` absent from the first page. Vietnamese counterparts all reach rank 1.
- `to` (Vietnamese “big”) collides with English infinitive/preposition tokens; 大きい is not a Top-10 canonical hit. A course-equivalent result at rank 21 is recorded separately and not counted as a PASS.
- `cat` finds cát (“sand”) before 猫 because unaccented VI folding and current relevance ordering apply to all Latin queries. 猫 is still within Top 3. This existing mixed-language contract was preserved.
- SQL candidate selection ranks space-delimited text differently from service word-boundary relevance. Some common entries are excluded before the service can reorder its first 20 catalog candidates. Existing curated ranks also favour short related entries. No global rank manipulation was performed.

See `coverage-results.csv` for all 500 before/after primary ranks and reasons, and `coverage-remaining-failures.json` for every failed primary/alias query with returned Top-10 IDs. The remaining failures are measured, not inferred as global absence from JMdict.

## Approval scope needed next

1. Review the 452 A-confidence draft records. Confidence is not human approval; all remain PENDING_REVIEW.
2. Resolve or exclude the 48 C records listed in the pending JSON. They have explicit contextual notes (kinship usage, financial bank, fruit versus colour, hardware mouse, hairdresser versus barber, tactile/weather adjectives, etc.). No B-reviewed records are claimed. Verify ambiguous/specialized candidates against more than one reliable reference before reclassification.
3. Approve the two existing mapping corrections, with sense anchors in the review record.
4. Decide how to rank common English concepts using defensible relevance/frequency evidence, then rerun the complete benchmark. A new schema, language selector or major search design would require Tech Lead approval under the sprint's STOP rules.
5. Review the measured median latency increase from 34.74 to 38.95 ms (+4.21 ms, about 12.1%); no latency acceptance threshold was supplied.

There is no approval to seed this draft automatically, and no expansion beyond the 500-concept pilot.
