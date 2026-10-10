// Draft benchmark authoring helper. Never fetches/translates/publishes data.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const snapshot = gunzipSync(readFileSync('backend/src/main/resources/dictionary/jmdict.tsv.gz')).toString('utf8')
  .trimEnd().split('\n').map(line => { const [id, word, reading, sense, search] = line.split('\t'); return { id: Number(id), word, reading, sense, search }; });
let category;
const concepts = [];
const unresolved = [];
const selected = JSON.parse(readFileSync('docs/Dictionary/coverage-identities.json', 'utf8'));
const byWord = new Map();
const byAlias = new Map();
for (const e of snapshot) {
  byWord.set(e.word, [...(byWord.get(e.word) ?? []), e]);
  for (const alias of new Set(e.search.split(' '))) byAlias.set(alias, [...(byAlias.get(alias) ?? []), e]);
}
for (const line of readFileSync('docs/Dictionary/coverage-concepts.txt', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  if (line.startsWith('[')) { category = line.slice(1, -1); continue; }
  const [headword, vi, en, viAliases, enAliases] = line.split('|');
  const exact = byWord.get(headword) ?? [];
  const alternatives = byAlias.get(headword.toLowerCase()) ?? [];
  const matches = selected[headword] ? snapshot.filter(e => e.id === selected[headword]) : exact.length ? exact : alternatives;
  if (matches.length !== 1) { unresolved.push({ headword, en, candidates: matches }); continue; }
  const e = matches[0];
  concepts.push({ conceptId: `${category}-${String(concepts.filter(c => c.category === category).length + 1).padStart(2, '0')}`,
    category, vi, viAliases: viAliases ? viAliases.split(';').map(s => s.trim()) : [],
    requestedHeadword: headword,
    en, enAliases: enAliases ? enAliases.split(';').map(s => s.trim()) : [],
    jmdictId: e.id, word: e.word, reading: e.reading, englishSense: e.sense,
    reviewStatus: 'PENDING_REVIEW',
    reviewNote: 'Agent-authored Vietnamese draft; canonical word/reading/sense checked against bundled JMdict. Human Japanese review pending.' });
}
const ids = new Set();
for (const c of concepts) { if (ids.has(c.jmdictId)) unresolved.push({ duplicate: c }); ids.add(c.jmdictId); }
if (unresolved.length) throw new Error(`Manual identity resolution required: ${JSON.stringify(unresolved)}`);
if (concepts.length !== 500) throw new Error(`Expected locked 500-concept pilot, found ${concepts.length}`);
writeFileSync('docs/Dictionary/coverage-benchmark.draft.json', JSON.stringify(concepts, null, 2) + '\n');
console.log(JSON.stringify({ matched: concepts.length, unresolved: unresolved.length, categories: Object.fromEntries([...new Set(concepts.map(c => c.category))].map(k => [k, concepts.filter(c => c.category === k).length])) }));
