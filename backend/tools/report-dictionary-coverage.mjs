import { readFileSync, writeFileSync } from 'node:fs';
const before = JSON.parse(readFileSync('docs/Dictionary/coverage-baseline.json', 'utf8'));
const after = JSON.parse(readFileSync('docs/Dictionary/coverage-after-rehearsal.json', 'utf8'));
const pilot = JSON.parse(readFileSync('backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json', 'utf8'));
const concepts = new Map(pilot.concepts.map(c => [c.conceptId, c]));
const csv = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const columns = ['concept_id','category','jmdict_id','headword','reading','vi','en','quality','review_status',
  'before_vi_rank','before_en_rank','after_vi_rank','after_en_rank','before_vi_pass','before_en_pass','after_vi_pass','after_en_pass',
  'before_vi_reason','before_en_reason','after_vi_reason','after_en_reason'];
const lines = [columns.join(',')], remaining = [];
const outcome = (row, language) => row.outcomes.find(o => o.language === language);
for (const row of after.rows) {
  const c = concepts.get(row.conceptId), original = before.rows.find(r => r.conceptId === row.conceptId);
  if (!c || !original || original.jmdictId !== row.jmdictId || c.jmdictId !== row.jmdictId)
    throw new Error('Benchmark identity changed');
  for (const o of row.outcomes.filter(o => !o.pass)) {
    remaining.push({ conceptId: row.conceptId, category: c.category, jmdictId: c.jmdictId, word: c.word, reading: c.reading,
      language: o.language, query: o.query, rank: o.rank, reason: o.courseEquivalentRank ? 'OTHER' : 'WRONG_ENTRY_RANKING',
      courseEquivalentRank: o.courseEquivalentRank, top10: o.top10 });
  }
  const bvi = outcome(original,'vi'), ben = outcome(original,'en'), avi = outcome(row,'vi'), aen = outcome(row,'en');
  lines.push([c.conceptId,c.category,c.jmdictId,c.word,c.reading,c.vi,c.en,c.quality,c.reviewStatus,
    bvi.rank,ben.rank,avi.rank,aen.rank,...[bvi,ben,avi,aen].map(o=>o.pass?'PASS':'FAIL'),
    bvi.reason,ben.reason,avi.reason,aen.reason].map(csv).join(','));
}
writeFileSync('docs/Dictionary/coverage-results.csv', '\uFEFF'+lines.join('\n')+'\n');
writeFileSync('docs/Dictionary/coverage-remaining-failures.json', JSON.stringify(remaining,null,2)+'\n');
const percent = (count,total=500) => (count/total*100).toFixed(1)+'%';
const metricRow = (label,language,key) => `| ${label} | ${before.metrics[language][key]}/500 (${percent(before.metrics[language][key])}) | ${after.metrics[language][key]}/500 (${percent(after.metrics[language][key])}) |`;
const mandatory = new Set(['cat','dog','lion','elephant','strawberry','watermelon','motorcycle','truck',
  'refrigerator','washing machine','firefighter','hairdresser','accountant','veterinarian']);
const mandatoryRows = after.rows.filter(r=>mandatory.has(outcome(r,'en').query));
if (mandatoryRows.length !== 14) throw new Error('Missing mandatory bilingual concepts');
const mandatoryFailures = mandatoryRows.flatMap(r=>r.outcomes.filter(o=>['vi','en'].includes(o.language)&&!o.pass));
const searchPass = after.metrics.vi.coveragePercent>=95 && after.metrics.en.coveragePercent>=95 && !mandatoryFailures.length;
const ranks = mandatoryRows.map(r=>`| ${outcome(r,'en').query} | ${outcome(r,'vi').rank??'absent'} | ${outcome(r,'en').rank??'absent'} |`).join('\n');
const primaryFailures = remaining.filter(r=>['vi','en'].includes(r.language)).length;
const cCount = pilot.concepts.filter(c=>c.quality==='C').length;
const report = `# HeyGanba Dictionary Coverage Report

**Search readiness: ${searchPass?'SEARCH COVERAGE PASS':'SEARCH COVERAGE FAIL'}. Content approval: PENDING_REVIEW.**

Measured: ${after.measuredAt}. The source tree includes normal merge 074594d2d172671bb491ad88e319f2f9a7aff6ca (released main → develop) and the focused Dictionary fixes in PR #31. No rebasing, history rewrite, frontend change, QA test change, main merge or production deploy was performed by this fix task.

This is a disposable local rehearsal, **not production coverage**. All 500 drafted records remain PENDING_REVIEW, including ${cCount} C-confidence records. The runtime migration never loads the pending JSON. Hosted CI must pass on the current PR head; local checks do not replace it.

## Full catalog measurement

500 fixed concepts, 1,000 primary VI/EN queries, 153 VI aliases and 59 EN aliases; ${after.performance.uniqueQueries} unique HTTP requests. Catalog: 218,867 entries. A PASS requires the intended negative JMdict ID in Top 10 on page 0. No assertion, benchmark ID or cutoff was weakened.

| Metric | Original clean develop baseline | Current pending rehearsal |
|---|---:|---:|
${metricRow('VI Top-1','vi','top1')}
${metricRow('VI Top-3','vi','top3')}
${metricRow('VI Top-10','vi','top10')}
${metricRow('EN Top-1','en','top1')}
${metricRow('EN Top-3','en','top3')}
${metricRow('EN Top-10','en','top10')}
| Combined primary Top-10 | ${before.metrics.combinedPrimary.top10}/1000 (${before.metrics.combinedPrimary.coveragePercent}%) | ${after.metrics.combinedPrimary.top10}/1000 (${after.metrics.combinedPrimary.coveragePercent}%) |

Prior submitted rehearsal: VI 99.4%, EN 64.8%. Current VI aliases: ${after.metrics.viAlias.top10}/${after.metrics.viAlias.total} (${after.metrics.viAlias.coveragePercent}%). EN aliases: ${after.metrics.enAlias.top10}/${after.metrics.enAlias.total} (${after.metrics.enAlias.coveragePercent}%). The readiness gate applies the unchanged >=95% **per-language primary** threshold plus all 28 mandatory queries. Alias failures remain visible and are not hidden by the primary gate.

## Mandatory bilingual regression

| English query | VI canonical rank | EN canonical rank |
|---|---:|---:|
${ranks}

Remaining failures: ${primaryFailures} primary queries and ${remaining.length-primaryFailures} aliases. See [all ranks](coverage-results.csv), [remaining failures with returned IDs](coverage-remaining-failures.json) and [raw measurements](coverage-after-rehearsal.json). First-page absence is not claimed as absence from the entire dictionary.

## General search fix

Candidate selection now uses the same relevance tiers as service re-sorting before pagination: JP identity, VI exact meaning/alias, first gloss of the primary English sense, other primary glosses, secondary glosses, bounded tokens, partial matches. Parenthetical annotations do not become exact glosses. Every English infinitive may also match without “to”. The rules apply to the whole catalog; no individual-word boost or global common_rank change was introduced.

The existing search_text stores derived gloss metadata; no schema/table/dependency was added. The repeatable Flyway checksum includes the transformer revision. Query boundary regexes are compiled once per request and reused across indexed glosses. Curated VI semicolon-separated meanings retain their individual normalized/accented forms. Displayed English and the source JMdict snapshot remain unchanged.

## Wrong-sense corrections and content limits

The existing reviewed meanings were moved to the user-specified canonical IDs: bánh mì → 1103090 (bread), xe buýt → 1098390 (bus). IDs 2850597 (pan-) and 2845315 (bass fish) no longer carry those VI meanings or the transferred reviewed rank. The reviewed set still contains 204 records. Integrity tests lock the corrected IDs against their English sense anchors. No new translation was published.

The pilot remains 380 new VI drafts plus 120 previously reviewed benchmark meanings; 139 proposed VI aliases and 25 EN aliases, across 16 themes. Confidence: 452 A, 0 B, ${cCount} C. Confidence does not authorize publication. No C entry was reclassified or approved, and no source identity was changed to satisfy the benchmark.

## Validation and performance

- After main → develop synchronization, QA-001 and all 58 frontend unit tests pass; no frontend code/test changes were needed. Frontend legacy tests (8), lint/build and npm audit pass (existing lint warnings; zero audit findings).
- Backend full H2 and real PostgreSQL 16 suites: 215 passed, one intentionally skipped opt-in test. Mandatory Dictionary, tone-sensitive aliases, notebook isolation, pagination and existing QA/security regressions pass. Runtime dependency audit preserves the released guarded advisory handling.
- Flyway/Hibernate validate through V38 on real PostgreSQL. The opt-in local overlay test passes, verifies 218,867 active entries and unchanged full curriculum plus canonical ID/word/reading/English/rank/active fingerprints. It now reapplies the overlay whenever a transformer refresh clears it.
- Median sequential HTTP latency: ${after.performance.medianMs} ms; slowest: ${after.performance.slowest.query}, ${after.performance.slowest.ms} ms. Historical submitted rehearsal median: 38.95 ms. Different runs are workstation measurements, not a controlled production latency guarantee; the increase is explicitly retained for review. Rate limit was kept at 600/minute, admin at 30/minute.

## Provenance and release decision

Canonical source: [JMdict / EDRDG](https://www.edrdg.org/jmdict/j_jmdict.html), pinned source SHA-256 96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7. Derived data retains [CC BY-SA 4.0 and EDRDG attribution](https://www.edrdg.org/edrdg/licence.html). No new external dataset or translation service was used. See [provenance and reproduction](README.md).

The search gate ${searchPass?'passes':'fails'}. Academic content review is still required: all 500 drafts remain pending, and the ${cCount} C records must be reviewed or excluded before publication. PR #31 remains open for review; no production deployment is certified by this report.
`;
writeFileSync('docs/Dictionary/Dictionary-Coverage-Report.md', report);
console.log(JSON.stringify({searchPass,primaryFailures,aliasFailures:remaining.length-primaryFailures,cPending:cCount}));
