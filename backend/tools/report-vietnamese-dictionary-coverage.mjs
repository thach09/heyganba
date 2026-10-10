import { readFileSync, writeFileSync } from 'node:fs';

const before = JSON.parse(readFileSync('docs/Dictionary/vietnamese-coverage-baseline.json', 'utf8'));
const after = JSON.parse(readFileSync('docs/Dictionary/vietnamese-coverage-candidate.json', 'utf8'));
const pilot = JSON.parse(readFileSync('backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json', 'utf8'));
const reviewedText = readFileSync('backend/src/main/resources/dictionary/curated-ja-vi.tsv', 'utf8');
const reviewed = reviewedText.split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => line.split('\t'));
const reviewedIds = new Set(reviewed.map(fields => Number(fields[0])));
const drafts = pilot.concepts;
const newDrafts = drafts.filter(concept => !reviewedIds.has(concept.jmdictId));
const uniqueEnrichedIds = new Set([...reviewedIds, ...drafts.map(concept => concept.jmdictId)]);
const quality = level => drafts.filter(concept => concept.quality === level).length;
const csv = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const outcomeKey = outcome => `${outcome.language}\0${outcome.query}`;
const beforeRows = new Map(before.rows.map(row => [row.conceptId, row]));
const columns = ['concept_id','category','jmdict_id','headword','reading','language','query','canonical_rank',
  'baseline_first_page_results','baseline_first_page_with_vi','baseline_first_page_vi_percent',
  'candidate_first_page_results','candidate_first_page_with_vi','candidate_first_page_vi_percent',
  'baseline_top10_results','baseline_top10_with_vi','baseline_top10_vi_percent',
  'candidate_top10_results','candidate_top10_with_vi','candidate_top10_vi_percent',
  'candidate_top10_entries'];
const lines = [columns.join(',')];
for (const row of after.rows) {
  const original = beforeRows.get(row.conceptId);
  if (!original || original.jmdictId !== row.jmdictId) throw new Error(`Benchmark identity changed: ${row.conceptId}`);
  const baselineOutcomes = new Map(original.outcomes.map(outcome => [outcomeKey(outcome), outcome]));
  for (const outcome of row.outcomes) {
    const prior = baselineOutcomes.get(outcomeKey(outcome));
    if (!prior) throw new Error(`Baseline query missing: ${outcome.language}/${outcome.query}`);
    lines.push([row.conceptId,row.category,row.jmdictId,row.word,row.reading,outcome.language,outcome.query,outcome.rank,
      prior.firstPageResultCount,prior.firstPageWithVietnameseMeaning,prior.firstPageVietnameseCoveragePercent,
      outcome.firstPageResultCount,outcome.firstPageWithVietnameseMeaning,outcome.firstPageVietnameseCoveragePercent,
      prior.top10ResultCount,prior.top10WithVietnameseMeaning,prior.top10VietnameseCoveragePercent,
      outcome.top10ResultCount,outcome.top10WithVietnameseMeaning,outcome.top10VietnameseCoveragePercent,
      outcome.top10.map(entry => `${entry.id}:${entry.word}:${entry.hasVietnameseMeaning ? 'VI' : 'NO_VI'}`).join(' | ')].map(csv).join(','));
  }
}
writeFileSync('docs/Dictionary/coverage-query-density.csv', '\uFEFF' + lines.join('\n') + '\n');

const primaryBefore = before.metrics.resultCoverage.primary;
const primaryAfter = after.metrics.resultCoverage.primary;
const coveragePass = primaryAfter.queriesMeeting80PercentTop10 === primaryAfter.queryCount;
const dataTargetPass = reviewedIds.size >= 5000;
const releaseReady = coveragePass && dataTargetPass;
const sampleQueries = [
  ['dog','chó'], ['cat','mèo'], ['lion','sư tử'], ['truck','xe tải'],
  ['refrigerator','tủ lạnh'], ['firefighter','lính cứu hỏa']
];
const sampleRows = sampleQueries.map(([english,vietnamese]) => {
  const concept = drafts.find(candidate => candidate.en === english);
  if (!concept) throw new Error(`Missing sample concept: ${english}`);
  const afterRow = after.rows.find(candidate => candidate.conceptId === concept.conceptId);
  const beforeRow = beforeRows.get(concept.conceptId);
  if (!afterRow || !beforeRow) throw new Error(`Missing sample result: ${english}`);
  const vi = afterRow.outcomes.find(outcome => outcome.language === 'vi');
  const en = afterRow.outcomes.find(outcome => outcome.language === 'en');
  const beforeVi = beforeRow.outcomes.find(outcome => outcome.language === 'vi');
  const beforeEn = beforeRow.outcomes.find(outcome => outcome.language === 'en');
  return `| ${english} / ${vietnamese} | ${beforeVi.rank ?? 'absent'} / ${beforeEn.rank ?? 'absent'} | ${vi.rank ?? 'absent'} / ${en.rank ?? 'absent'} | ${vi.firstPageWithVietnameseMeaning}/${vi.firstPageResultCount} (${vi.firstPageVietnameseCoveragePercent}%) | ${vi.top10WithVietnameseMeaning}/${vi.top10ResultCount} (${vi.top10VietnameseCoveragePercent}%) |`;
}).join('\n');

const report = `# Vietnamese Dictionary Coverage Expansion Report

**Recommendation: ${releaseReady ? 'VIETNAMESE COVERAGE READY FOR REVIEW' : 'VIETNAMESE COVERAGE NEEDS MORE WORK'}.** No entries were promoted or deployed. All new draft content remains \`PENDING_REVIEW\`.

## Dataset

- JMdict snapshot: ${after.snapshot?.entries ?? 218867} entries, pinned source SHA-256 \`${after.snapshot?.sourceSha256 ?? '96d749f97e845f98ac05cca9234d805e42059a56edff34a3349862cefe8176a7'}\`.
- Total distinct entries with existing or staged Vietnamese: ${uniqueEnrichedIds.size}. Currently approved in the reviewed dictionary: ${reviewed.length}. Release target: at least 5,000 approved high-value entries.
- Staged meanings in the existing pilot file: ${newDrafts.length} new drafts, plus ${drafts.length - newDrafts.length} already-reviewed benchmark meanings. Benchmark concepts measured: ${drafts.length}.
- Vietnamese aliases proposed: ${drafts.reduce((count, concept) => count + concept.vietnameseAliases.length, 0)}. English aliases proposed: ${drafts.reduce((count, concept) => count + concept.englishAliases.length, 0)}.

## Confidence

- A: ${quality('A')}.
- B: ${quality('B')}.
- C excluded from release: ${quality('C')}.
- Every staged record remains \`PENDING_REVIEW\`; confidence is not human approval. The pending JSON is not loaded by the production Flyway path.

## Search Quality

Canonical entry rank is measured within the first page. The new density metric counts visible result cards with a non-empty Vietnamese meaning, independently from the intended canonical entry rank.

| Metric | Before (clean develop baseline) | After (pending local rehearsal) |
|---|---:|---:|
| Vietnamese canonical Top-10 | ${before.metrics.vi.top10}/500 (${before.metrics.vi.coveragePercent}%) | ${after.metrics.vi.top10}/500 (${after.metrics.vi.coveragePercent}%) |
| English canonical Top-10 | ${before.metrics.en.top10}/500 (${before.metrics.en.coveragePercent}%) | ${after.metrics.en.top10}/500 (${after.metrics.en.coveragePercent}%) |
| VI-query Top-10 results with Vietnamese meaning | ${before.metrics.resultCoverage.vietnameseQueries.top10WithVietnameseMeaning}/${before.metrics.resultCoverage.vietnameseQueries.top10Results} (${before.metrics.resultCoverage.vietnameseQueries.top10CoveragePercent}%) | ${after.metrics.resultCoverage.vietnameseQueries.top10WithVietnameseMeaning}/${after.metrics.resultCoverage.vietnameseQueries.top10Results} (${after.metrics.resultCoverage.vietnameseQueries.top10CoveragePercent}%) |
| EN-query Top-10 results with Vietnamese meaning | ${before.metrics.resultCoverage.englishQueries.top10WithVietnameseMeaning}/${before.metrics.resultCoverage.englishQueries.top10Results} (${before.metrics.resultCoverage.englishQueries.top10CoveragePercent}%) | ${after.metrics.resultCoverage.englishQueries.top10WithVietnameseMeaning}/${after.metrics.resultCoverage.englishQueries.top10Results} (${after.metrics.resultCoverage.englishQueries.top10CoveragePercent}%) |
| Primary-query Top-10 results with Vietnamese meaning | ${primaryBefore.top10WithVietnameseMeaning}/${primaryBefore.top10Results} (${primaryBefore.top10CoveragePercent}%) | ${primaryAfter.top10WithVietnameseMeaning}/${primaryAfter.top10Results} (${primaryAfter.top10CoveragePercent}%) |
| Primary queries meeting 80% Top-10 Vietnamese coverage | ${primaryBefore.queriesMeeting80PercentTop10}/${primaryBefore.queryCount} | ${primaryAfter.queriesMeeting80PercentTop10}/${primaryAfter.queryCount} |
| Primary-query first-page results with Vietnamese meaning | ${primaryBefore.firstPageWithVietnameseMeaning}/${primaryBefore.firstPageResults} (${Math.round(primaryBefore.firstPageWithVietnameseMeaning/primaryBefore.firstPageResults*10000)/100}%) | ${primaryAfter.firstPageWithVietnameseMeaning}/${primaryAfter.firstPageResults} (${Math.round(primaryAfter.firstPageWithVietnameseMeaning/primaryAfter.firstPageResults*10000)/100}%) |

### Sample queries

Ranks show VI / English canonical result. Coverage columns show cards with Vietnamese meaning on the full first page and Top-10.

| Queries | Before VI / EN rank | After VI / EN rank | After first-page VI coverage | After Top-10 VI coverage |
|---|---:|---:|---:|---:|
${sampleRows}

Per-query first-page counts, coverage, canonical ranks and the first ten returned entries are in [coverage-query-density.csv](coverage-query-density.csv). The full-catalog before and after request results are in [vietnamese-coverage-baseline.json](vietnamese-coverage-baseline.json) and [vietnamese-coverage-candidate.json](vietnamese-coverage-candidate.json).

## Corrected old data

The prior reviewed mapping fixes remain: bánh mì → JMdict ID 1103090 (\`パン\`, bread), and xe buýt → ID 1098390 (\`バス\`, bus). The incorrect pan and bass-fish IDs no longer carry those meanings.

## Validation

- Identity, reading and English sense are checked against the pinned JMdict snapshot by \`DictionaryCurationIntegrityTest\`.
- Baseline CI after normal main → develop merge: H2 PASS, PostgreSQL/Flyway PASS through V38, frontend lint/build PASS. Run: [38052704294](https://github.com/thach09/heyganba/actions/runs/38052704294).
- Local candidate validation: backend H2 215 passed, one opt-in PostgreSQL test skipped; the separate PostgreSQL 16 rehearsal passed with 218,867 active catalog entries and intact curriculum fingerprints. Frontend legacy/unit tests passed (8 + 58), lint passed, and production build passed.
- Hosted checks run on [draft PR #32](https://github.com/thach09/heyganba/pull/32), targeting develop. The merge remains blocked by the failed dictionary readiness gate.
- Candidate search timing: median ${after.performance.medianMs} ms, slowest \`${after.performance.slowest.query}\` at ${after.performance.slowest.ms} ms (sequential local HTTP on PostgreSQL 16; not a production latency guarantee).

## Remaining gaps

The reviewed dictionary currently covers ${reviewedIds.size} approved entries against the 5,000-entry target; ${uniqueEnrichedIds.size} dictionary IDs would be covered if all staged drafts were later approved. Top-10 Vietnamese result density ${coveragePass ? 'meets the target for every primary query' : 'does not meet the 80% target for every primary query'}. The catalog entries outside the focused batch remain without Vietnamese because they include low-frequency, technical, archaic, slang and polysemous senses that need prioritization and semantic review; they were not translated to inflate the metric. Human review is still required for all staged A/B records, and C records must remain excluded from release.

The JMdict/EDRDG snapshot and license remain pinned as described in [the curation README](README.md); Vietnamese drafts are independently authored and not claimed externally verified row by row. No application schema migration, runtime translation API or UI redesign was introduced. Measurements used disposable local PostgreSQL databases; no staging or production database was written.
`;
writeFileSync('docs/Dictionary/Vietnamese-Coverage-Expansion-Report.md', report);
console.log(JSON.stringify({releaseReady,coveragePass,dataTargetPass,enrichedEntries:uniqueEnrichedIds.size,
  top10CoveragePercent:primaryAfter.top10CoveragePercent,queriesMeeting80PercentTop10:primaryAfter.queriesMeeting80PercentTop10,
  primaryQueryCount:primaryAfter.queryCount}));
if (process.argv.includes('--check') && !releaseReady) process.exitCode = 1;
