// Measures real application HTTP search, including course/catalog merge and pagination.
// No database writes. Top-10 PASS requires the intended negative JMdict ID.
import { readFileSync, writeFileSync } from 'node:fs';
const [,, input, output, base = 'http://127.0.0.1:18081/api/v1'] = process.argv;
if (!input || !output) throw new Error('Usage: node backend/tools/measure-dictionary-coverage.mjs benchmark.json output.json [local API URL]');
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw new Error('Benchmark is restricted to a disposable local API');
const concepts = JSON.parse(readFileSync(input, 'utf8'));
const cache = new Map();
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
    const reason = rank !== null && rank <= 10 ? null : equivalent >= 0 ? 'OTHER' :
      rank !== null ? 'WRONG_ENTRY_RANKING' : language === 'vi' && !matched ? 'MISSING_VI_GLOSS' :
        language.endsWith('Alias') ? 'MISSING_ALIAS' : 'WRONG_ENTRY_RANKING';
    outcomes.push({ language, query, rank, pass: rank !== null && rank <= 10, reason,
      courseEquivalentRank: equivalent < 0 ? null : equivalent + 1, ms,
      top10: data.vocabularies.slice(0,10).map(w => ({ id: w.id, word: w.word, reading: w.reading })) });
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
const timings = [...cache.entries()].map(([query,v]) => ({query,ms:v.ms})).sort((a,b) => a.ms-b.ms);
const primary = rows.flatMap(r => r.outcomes).filter(o => ['vi','en'].includes(o.language));
const result = { measuredAt: new Date().toISOString(), base, concepts: concepts.length,
  metrics: { vi: metric('vi'), en: metric('en'), viAlias: metric('viAlias'), enAlias: metric('enAlias'),
    combinedPrimary: { total: primary.length, top10: primary.filter(o=>o.pass).length, coveragePercent: Math.round(primary.filter(o=>o.pass).length/primary.length*10000)/100 } },
  performance: { uniqueQueries: timings.length, medianMs: timings[Math.floor(timings.length/2)].ms, slowest: timings.at(-1),
    methodology: 'Sequential HTTP page 0 on full catalog, one excluded warm-up; wall-clock includes HTTP, count query, ORM and course merge. Missing from page 0 does not claim absent from all pages.' }, rows };
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ metrics: result.metrics, performance: result.performance }, null, 2));
