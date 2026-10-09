import { readFileSync, writeFileSync } from 'node:fs';
const before=JSON.parse(readFileSync('docs/Dictionary/coverage-baseline.json'));
const after=JSON.parse(readFileSync('docs/Dictionary/coverage-after-rehearsal.json'));
const pilot=JSON.parse(readFileSync('backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json'));
const concepts=new Map(pilot.concepts.map(c=>[c.conceptId,c]));
const csv=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const columns=['concept_id','category','jmdict_id','headword','reading','vi','en','quality','review_status',
  'before_vi_rank','before_en_rank','after_vi_rank','after_en_rank','before_vi_pass','before_en_pass','after_vi_pass','after_en_pass',
  'before_vi_reason','before_en_reason','after_vi_reason','after_en_reason'];
const lines=[columns.join(',')]; const remaining=[];
for(const row of after.rows){
  const c=concepts.get(row.conceptId);const original=before.rows.find(r=>r.conceptId===row.conceptId);
  if(!c||original.jmdictId!==row.jmdictId)throw new Error('Benchmark identity changed');
  for(const o of row.outcomes.filter(o=>!o.pass)){
    o.reason=o.courseEquivalentRank?'OTHER':'WRONG_ENTRY_RANKING';
    if(['food-drinks-02','transport-04'].includes(row.conceptId)&&o.language.startsWith('vi'))o.reason='POLYSEMY';
    remaining.push({conceptId:row.conceptId,category:c.category,jmdictId:c.jmdictId,word:c.word,reading:c.reading,
      language:o.language,query:o.query,rank:o.rank,reason:o.reason,courseEquivalentRank:o.courseEquivalentRank,top10:o.top10});
  }
  const get=(r,l)=>r.outcomes.find(o=>o.language===l);
  lines.push([row.conceptId,c.category,c.jmdictId,c.word,c.reading,c.vi,c.en,c.quality,c.reviewStatus,
    get(original,'vi').rank,get(original,'en').rank,get(row,'vi').rank,get(row,'en').rank,
    get(original,'vi').pass?'PASS':'FAIL',get(original,'en').pass?'PASS':'FAIL',get(row,'vi').pass?'PASS':'FAIL',get(row,'en').pass?'PASS':'FAIL',
    get(original,'vi').reason,get(original,'en').reason,get(row,'vi').reason,get(row,'en').reason].map(csv).join(','));
}
after.environment={source:'Candidate dictionary changes on develop 8895a5f9cba41b484398dd24f87aa1e400bcd6be',
  database:'Disposable dictionary_pilot_clean on PostgreSQL 16.15, same DB as clean baseline',catalogEntries:218867,
  dataStatus:'Test-only rehearsal of all 500 PENDING_REVIEW concepts, including 48 C. None released.',
  schemaVersion:37,commonRankPolicy:'Preserve existing ranks; 380 new meanings remain rank 1000.'};
writeFileSync('docs/Dictionary/coverage-after-rehearsal.json',JSON.stringify(after,null,2)+'\n');
writeFileSync('docs/Dictionary/coverage-results.csv','\uFEFF'+lines.join('\n')+'\n');
writeFileSync('docs/Dictionary/coverage-remaining-failures.json',JSON.stringify(remaining,null,2)+'\n');
console.log(JSON.stringify({remainingPrimary:remaining.filter(r=>['vi','en'].includes(r.language)).length,
  primaryReasons:remaining.filter(r=>['vi','en'].includes(r.language)).reduce((a,r)=>(a[r.reason]=(a[r.reason]??0)+1,a),{})}));
const pct=(n,total=500)=>(n/total*100).toFixed(1)+'%';
const metricRow=(label,language,key)=>`| ${label} | ${before.metrics[language][key]}/500 (${pct(before.metrics[language][key])}) | ${after.metrics[language][key]}/500 (${pct(after.metrics[language][key])}) |`;
const both=r=>r.rows.filter(row=>row.outcomes.filter(o=>['vi','en'].includes(o.language)).every(o=>o.pass)).length;
const delta=after.performance.medianMs-before.performance.medianMs;
const categoryCounts=Object.fromEntries([...new Set(pilot.concepts.map(c=>c.category))].map(k=>[k,pilot.concepts.filter(c=>c.category===k).length]));
const report=`# HeyGanba Dictionary Coverage Report

**Recommendation: DICTIONARY COVERAGE NEEDS MORE WORK**

Branch: \`feat/dictionary-coverage-expansion\`, based on clean \`develop\` commit \`8895a5f9cba41b484398dd24f87aa1e400bcd6be\`.
Date: 2026-10-09. This is a **pending review pilot and disposable local rehearsal**, not a release or production coverage claim. All new content remains \`PENDING_REVIEW\`; no managed staging/production database was used.

## Baseline

Benchmark concepts: **500**, with **1,000 primary VI/EN queries**, 153 VI alias queries and 59 EN alias queries (1,208 unique queries).
Full catalog: **218,867 JMdict entries** plus existing course content. PASS requires the intended negative JMdict ID within Top 10 on page 0; course equivalents and headword-only matches do not substitute for canonical-ID hits.

| Metric | Before: original develop | After: pending pilot rehearsal |
|---|---:|---:|
${metricRow('Vietnamese Top-1','vi','top1')}
${metricRow('Vietnamese Top-3','vi','top3')}
${metricRow('Vietnamese Top-10','vi','top10')}
${metricRow('English Top-1','en','top1')}
${metricRow('English Top-3','en','top3')}
${metricRow('English Top-10','en','top10')}
| Combined primary Top-10 | ${before.metrics.combinedPrimary.top10}/1000 (${before.metrics.combinedPrimary.coveragePercent}%) | ${after.metrics.combinedPrimary.top10}/1000 (${after.metrics.combinedPrimary.coveragePercent}%) |
| Concepts passing both languages | ${both(before)}/500 (${pct(both(before))}) | ${both(after)}/500 (${pct(both(after))}) |
| VI absent from first page | ${before.metrics.vi.notFoundFirstPage} | ${after.metrics.vi.notFoundFirstPage} |
| EN absent from first page | ${before.metrics.en.notFoundFirstPage} | ${after.metrics.en.notFoundFirstPage} |

“Not found” is first-page absence, not proof of absence from every page or from JMdict. The original baseline was collected before enrichment; a clean detached build of the pinned develop commit confirmed the same coverage counts, eliminating leftover build artifacts from the earlier release task.

## Data added

- Vietnamese curated entries: **380 new gloss drafts**, with 120 existing reviewed benchmark meanings preserved. **0 new entries published.** The existing reviewed TSV remains unchanged at 204 rows.
- Vietnamese aliases proposed: **139**. Accent placement variants such as khóa/khoá and thủy/thuỷ are explicitly retained; folded equivalence is not treated as accented-query equivalence.
- English aliases proposed: **25** missing whole-token learner synonyms/phrases. Existing JMdict English meanings are never rewritten. Alias reasons are recorded per entry.
- Categories covered: **16**. ${Object.entries(categoryCounts).map(([k,n])=>k+' ('+n+')').join(', ')}.

The new data lives only in [the pending staging artifact](../../backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json). The production migration does not load it. IDs are unique and tied to representative headword, reading and actual JMdict sense; no new Japanese dictionary, entry IDs, course words or learning rewards were created.

## Quality

- A-confidence: **452**, independently authored agent drafts with direct canonical mappings; this is not human approval or a claim of external row-by-row verification.
- B-reviewed: **0**; no reviewed ambiguity is claimed without the required verification.
- C / needs review: **48**, with explicit notes. They must be excluded from any release until human review/reclassification. All 500 remain PENDING_REVIEW.

The local 500-entry rehearsal deliberately includes C records solely to measure/search and expose issues. Consequently its hit rate does not certify an approved 500-concept release. Human review and reliable additional references are still needed for ambiguous/specialized wording.

Manual inspection covered animals, fruit, appliances, transportation, occupations, technology and daily verbs. Cat, lion, strawberry, refrigerator, washer, motorcycle, truck, firefighter, veterinarian, computer, wash and sleep map to the intended canonical entries in VI. JP 猫/ねこ/ネコ, romaji neko, unaccented meo and alias con mèo were checked. No duplicate headword/reading pairs appeared in the 22 captured responses.

**Two pre-existing semantic mapping errors were found:** bánh mì is attached to ID 2850597 (\`pan-\`) instead of bread ID 1103090; xe buýt is attached to ID 2845315 (bass fish) instead of bus ID 1098390. Incorrect rank-1 entries suppress the correct pending entries during deduplication. Corrections are documented for review, not silently promoted into published data. See [review actions](coverage-review-actions.md) and [actual spot-check responses](coverage-spot-checks.json).

## Search results

Before: VI Top-10 **23.6%**, EN **61.0%**, combined primary **42.3%**.
After rehearsal: VI Top-10 **99.4%**, EN **64.8%**, combined primary **82.1%**.
VI alias Top-10: ${before.metrics.viAlias.coveragePercent}% → **${after.metrics.viAlias.coveragePercent}%**; EN alias Top-10: ${before.metrics.enAlias.coveragePercent}% → **${after.metrics.enAlias.coveragePercent}%**.

Remaining primary failures: **179** — 176 English ranking failures, 2 Vietnamese homograph/sense collisions, and 1 mixed-language/course-merge case (\`to\`). An additional 14 English alias queries miss Top 10. No VI alias failures remain.

**Full-catalog readiness gate: FAIL (exit 1).** Required English regressions still failing: \`lion\` rank 19; \`motorcycle\` and \`truck\` absent from the first page. All 14 required VI counterparts reach rank 1. The isolated fixture regression passes but does not override these full-catalog failures.

Source and SQL inspection confirm a candidate-selection issue for motorcycle/truck: their canonical glosses contain \`motorcycle, motorbike\` / \`truck, lorry\`, while the repository's space-token ranking gives a zero token position before the comma; related compounds can occupy the first 20 candidates before service re-sorting. Also, \`cat\` ranks cát (sand) first under the unchanged unaccented VI contract, with the intended cat at rank 3. No global common_rank boost, normalization redesign or new search architecture was introduced.

All before/after primary ranks and PASS/FAIL diagnostics are in [coverage-results.csv](coverage-results.csv). Every remaining primary/alias failure, with returned Top-10 IDs, is in [coverage-remaining-failures.json](coverage-remaining-failures.json). The complete raw measurements are [baseline](coverage-baseline.json) and [after rehearsal](coverage-after-rehearsal.json).

## Technical changes

- Data/review artifacts and authoring/measurement tools under \`docs/Dictionary\`, \`backend/tools\`, and the pending staging JSON.
- \`DictionaryCuration.java\`: backward-compatible seven-column reviewed TSV parser; optional two alias columns, strict validation and separate normalized/accented search metadata.
- \`R__refresh_jmdict_catalog.java\`: reuse that parser and include transformer revision in its repeatable checksum; no versioned migration changes.
- \`DictionaryService.java\`: preserve metadata relevance during service re-sorting. An equal-common-rank regression failed before the fix because an exact alias hit was scored 9 and a partial gloss hit 8; it now passes on the existing relevance scale.
- Dictionary integrity, mandatory bilingual/all-theme fixture regression, and an opt-in test-only PostgreSQL/Flyway rehearsal. Existing notebook/course isolation and tone-sensitive search checks pass.
- Schema changed: **No**. Search algorithm changed: **small confirmed metadata re-sorting fix only**. Repository candidate query and pagination are unchanged. Frontend, auth, SRS, exams, Foundation and Japanese/English source snapshot are unchanged.

## Licensing / provenance

Canonical source: [JMdict / EDRDG](https://www.edrdg.org/jmdict/j_jmdict.html), repository snapshot source SHA-256 \`96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7\`. Derived dictionary data keeps **CC BY-SA 4.0** and EDRDG attribution under its [licence statement](https://www.edrdg.org/edrdg/licence.html).

[Japan Foundation Marugoto A1 resources](https://marugoto.jpf.go.jp/en/teacher/resource/starter_c/) and the official Vietnamese index were consulted for beginner themes/basic terminology context, without importing their lists or assuming a redistribution licence. VI glosses and aliases were independently authored; no commercial dictionary was scraped, no external database imported, and no automatic translation service used. They are not falsely labelled externally verified. Ambiguous C entries require human review and more than one reliable reference before release. See [provenance and reproduction](README.md).

## Validation

- Data integrity: **PASS** — all 500 canonical tuples and senses checked against the full snapshot; unique IDs/concepts, required meanings, controls, alias variants and ranks validated; malformed/duplicate curated rows rejected. This does not certify the correctness of every pre-existing Vietnamese meaning; the two old semantic errors remain explicit review blockers.
- Backend: **PASS** — full normal suite: 201 passed plus the intentionally disabled opt-in PostgreSQL test; subsequent focused integrity/query/notebook tests pass. Package build exit 0.
- Frontend: **PASS** — 8 legacy + 33 unit tests, lint exit 0 (existing warnings), build exit 0.
- PostgreSQL/Flyway: **PASS** — real local PostgreSQL 16.15; clean develop migrations through V37, canonical refresh plus test-only pending overlay, Flyway validate, unchanged complete curriculum and canonical ID/word/reading/English/rank/active fingerprints. Rehearsal refresh avoids accumulating aliases across changed draft runs. V38 belongs to the separate release lineage and was not introduced into develop by this sprint.
- Search regression: **fixture PASS; full-catalog target FAIL**, with failures listed above. Readiness checker exits 1 and does not approve a release.
- Browser smoke: **PASS** — dictionary bilingual display, JP/VI search, tone distinction, ranking/pagination and duplicate collapse; 1440 px desktop and 390 px mobile screenshots manually inspected. No horizontal overflow observed. UI remains unchanged.
- Performance: same sequential 1,208-query local HTTP protocol, one excluded warm-up, fresh baseline/candidate JVMs. Median **${before.performance.medianMs} → ${after.performance.medianMs} ms** (+${delta.toFixed(2)} ms, +${(delta/before.performance.medianMs*100).toFixed(1)}%). Slowest: **${before.performance.slowest.query} ${before.performance.slowest.ms} ms → ${after.performance.slowest.query} ${after.performance.slowest.ms} ms**. These are workstation measurements, not production/load guarantees; no acceptance threshold was supplied.

## Recommendation

**DICTIONARY COVERAGE NEEDS MORE WORK**

Do not release or automatically seed this pilot. Tech Lead/Japanese reviewer should review the pending meanings/aliases, resolve the 48 C records and two old wrong-sense mappings, and approve a defensible approach to common English ranking before another full-catalog validation. The 95% bilingual target is not met. No schema, major search redesign or further vocabulary expansion is undertaken without that review.

Work is limited to this 500-concept review package. No push, PR, merge, deploy, production mutation or fix-branch cleanup was performed.
`;
writeFileSync('docs/Dictionary/Dictionary-Coverage-Report.md',report);
