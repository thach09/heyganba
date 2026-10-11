// Measures real application HTTP search, including course/catalog merge and pagination.
// No database writes. Top-10 PASS requires the intended negative JMdict ID.
import { readFileSync, writeFileSync } from 'node:fs';
const [,, input, output, base = 'http://127.0.0.1:18081/api/v1'] = process.argv;
if (!input || !output) throw new Error('Usage: node backend/tools/measure-dictionary-coverage.mjs benchmark.json output.json [local API URL]');
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw new Error('Benchmark is restricted to a disposable local API');
const concepts = JSON.parse(readFileSync(input, 'utf8'));
const cache = new Map();
const hasVietnameseMeaning = word =>
  (typeof word.vietnameseMeaning === 'string' && word.vietnameseMeaning.trim().length > 0) ||
  (word.meaningLanguage === 'vi' && typeof word.meaning === 'string' && word.meaning.trim().length > 0);
async function search(query) {
  if (cache.has(query)) return cache.get(query);
  const start = performance.now();
  const response = await fetch(`${base}/dictionary/search?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Search failed ${response.status}: ${query}`);
  const data = await response.json();
  const result = { data: data.data ?? data, ms: Math.round((performance.now() - start) * 100) / 100 };
  cache.set(query, result);
  // Respect the existing anonymous 600/minute limit; never change application limits for benchmarking.
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 115 - (performance.now() - start))));
  return result;
}
// Warm up ORM/database before timing; excluded from statistics.
await search('猫'); cache.clear();
const rows = [];
for (const c of concepts) {
  const queries = [['vi', c.vi], ['en', c.en], ...c.viAliases.map(q => ['viAlias', q]), ...c.enAliases.map(q => ['enAlias', q])];
  const outcomes = [];
  for (const [language, query] of queries) {
    const { data, ms } = await search(query);
    if (!Array.isArray(data.vocabularies)) throw new Error('Unexpected dictionary response shape');
    const position = data.vocabularies.findIndex(w => w.id === -c.jmdictId);
    const rank = position < 0 ? null : position + 1;
    const equivalent = data.vocabularies.findIndex(w => w.id >= 0 && w.word === c.word && w.reading === c.reading);
    const matched = data.vocabularies.find(w => w.id === -c.jmdictId);
    const top10 = data.vocabularies.slice(0, 10);
    const firstPageWithVietnameseMeaning = data.vocabularies.filter(hasVietnameseMeaning).length;
    const top10WithVietnameseMeaning = top10.filter(hasVietnameseMeaning).length;
    const reason = rank !== null && rank <= 10 ? null : equivalent >= 0 ? 'OTHER' :
      rank !== null ? 'WRONG_ENTRY_RANKING' : language === 'vi' && !matched ? 'MISSING_VI_GLOSS' :
        language.endsWith('Alias') ? 'MISSING_ALIAS' : 'WRONG_ENTRY_RANKING';
    outcomes.push({ language, query, rank, pass: rank !== null && rank <= 10, reason,
      courseEquivalentRank: equivalent < 0 ? null : equivalent + 1, ms,
      firstPageResultCount: data.vocabularies.length, firstPageWithVietnameseMeaning,
      firstPageVietnameseCoveragePercent: data.vocabularies.length === 0 ? 0 :
        Math.round(firstPageWithVietnameseMeaning / data.vocabularies.length * 10000) / 100,
      top10ResultCount: top10.length, top10WithVietnameseMeaning,
      top10VietnameseCoveragePercent: top10.length === 0 ? 0 :
        Math.round(top10WithVietnameseMeaning / top10.length * 10000) / 100,
      top10: top10.map(w => ({ id: w.id, word: w.word, reading: w.reading, hasVietnameseMeaning: hasVietnameseMeaning(w) })) });
  }
  rows.push({ conceptId: c.conceptId, jmdictId: c.jmdictId, word: c.word, reading: c.reading, outcomes });
  if (rows.length % 50 === 0) console.log(`Measured ${rows.length}/${concepts.length}`);
}
function metric(language) {
  const all = rows.flatMap(r => r.outcomes).filter(o => !language || o.language === language);
  const total = all.length;
  const count = n => all.filter(o => o.rank !== null && o.rank <= n).length;
  return { total, top1: count(1), top3: count(3), top10: count(10), outsideTop10: total-count(10),
    notFoundFirstPage: all.filter(o => o.rank === null).length, coveragePercent: Math.round(count(10)/total*10000)/100 };
}
function resultCoverage(language) {
  const unique = new Map();
  for (const row of rows) for (const outcome of row.outcomes) {
    if (!language || outcome.language === language) unique.set(`${outcome.language}\0${outcome.query}`, outcome);
  }
  const queries = [...unique.values()];
  const total = key => queries.reduce((sum, query) => sum + query[key], 0);
  const percent = (count, denominator) => denominator === 0 ? 0 : Math.round(count / denominator * 10000) / 100;
  return {
    queryCount: queries.length,
    firstPageResults: total('firstPageResultCount'),
    firstPageWithVietnameseMeaning: total('firstPageWithVietnameseMeaning'),
    firstPageCoveragePercent: percent(total('firstPageWithVietnameseMeaning'), total('firstPageResultCount')),
    top10Results: total('top10ResultCount'),
    top10WithVietnameseMeaning: total('top10WithVietnameseMeaning'),
    top10CoveragePercent: percent(total('top10WithVietnameseMeaning'), total('top10ResultCount')),
    queriesMeeting80PercentTop10: queries.filter(query => query.top10ResultCount > 0 && query.top10VietnameseCoveragePercent >= 80).length,
    perQuery: queries.map(query => ({ language: query.language, query: query.query,
      firstPageResultCount: query.firstPageResultCount,
      firstPageWithVietnameseMeaning: query.firstPageWithVietnameseMeaning,
      firstPageVietnameseCoveragePercent: query.firstPageVietnameseCoveragePercent,
      top10ResultCount: query.top10ResultCount, top10WithVietnameseMeaning: query.top10WithVietnameseMeaning,
      top10VietnameseCoveragePercent: query.top10VietnameseCoveragePercent }))
  };
}
const timings = [...cache.entries()].map(([query,v]) => ({query,ms:v.ms})).sort((a,b) => a.ms-b.ms);
const primary = rows.flatMap(r => r.outcomes).filter(o => ['vi','en'].includes(o.language));
const allResultCoverage = resultCoverage();
const viResultCoverage = resultCoverage('vi');
const enResultCoverage = resultCoverage('en');
const primaryResultCoverage = {
  queryCount: viResultCoverage.queryCount + enResultCoverage.queryCount,
  firstPageResults: viResultCoverage.firstPageResults + enResultCoverage.firstPageResults,
  firstPageWithVietnameseMeaning: viResultCoverage.firstPageWithVietnameseMeaning + enResultCoverage.firstPageWithVietnameseMeaning,
  top10Results: viResultCoverage.top10Results + enResultCoverage.top10Results,
  top10WithVietnameseMeaning: viResultCoverage.top10WithVietnameseMeaning + enResultCoverage.top10WithVietnameseMeaning,
  top10CoveragePercent: viResultCoverage.top10Results + enResultCoverage.top10Results === 0 ? 0 :
    Math.round((viResultCoverage.top10WithVietnameseMeaning + enResultCoverage.top10WithVietnameseMeaning) /
      (viResultCoverage.top10Results + enResultCoverage.top10Results) * 10000) / 100,
  queriesMeeting80PercentTop10: viResultCoverage.queriesMeeting80PercentTop10 + enResultCoverage.queriesMeeting80PercentTop10
};
const result = { measuredAt: new Date().toISOString(), base, concepts: concepts.length,
  metrics: { vi: metric('vi'), en: metric('en'), viAlias: metric('viAlias'), enAlias: metric('enAlias'),
    combinedPrimary: { total: primary.length, top10: primary.filter(o=>o.pass).length, coveragePercent: Math.round(primary.filter(o=>o.pass).length/primary.length*10000)/100 },
    resultCoverage: { all: allResultCoverage, vietnameseQueries: viResultCoverage, englishQueries: enResultCoverage,
      primary: primaryResultCoverage } },
  performance: { uniqueQueries: timings.length, medianMs: timings[Math.floor(timings.length/2)].ms, slowest: timings.at(-1),
    methodology: 'Sequential HTTP page 0 on full catalog, one excluded warm-up; wall-clock includes HTTP, count query, ORM and course merge. Missing from page 0 does not claim absent from all pages.' }, rows };
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
const coverageSummary = coverage => Object.fromEntries(Object.entries(coverage).filter(([key]) => key !== 'perQuery'));
console.log(JSON.stringify({ metrics: { ...result.metrics,
  resultCoverage: Object.fromEntries(Object.entries(result.metrics.resultCoverage).map(([key,value]) => [key,coverageSummary(value)])) },
  performance: result.performance }, null, 2));
