// Review artifact only. The production repeatable migration never reads this staging JSON.
// This does not translate, download, approve or publish anything.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const benchmark = JSON.parse(readFileSync('docs/Dictionary/coverage-benchmark.draft.json', 'utf8'));
const baselineBytes = readFileSync('docs/Dictionary/coverage-baseline.json');
const baseline = JSON.parse(baselineBytes);
if (benchmark.length !== 500 || baseline.concepts !== 500) throw new Error('Full pre-change baseline required');
const reviewed = new Map(readFileSync('backend/src/main/resources/dictionary/curated-ja-vi.tsv', 'utf8').split(/\r?\n/)
  .filter(l=>l && !l.startsWith('#')).map(l=> { const f=l.split('\t'); return [Number(f[0]), f]; }));
const normalize = s => s.normalize('NFKC').normalize('NFD').replace(/([a-zA-Z])\p{M}+/gu, '$1').normalize('NFC').toLowerCase().replaceAll('đ','d').trim();
const preserve = s => s.normalize('NFKC').toLowerCase().trim();
const token = (value, query) => new RegExp(`(?<![\\p{L}\\p{N}])${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![\\p{L}\\p{N}])`,'u').test(value);
const caution = {
  'pear': '梨 is Japanese/Asian pear, not the narrower Western pear 西洋梨.',
  'hairdresser': '美容師 selected for hair styling; barber/shaving profession 理容師 is distinct.',
  'accountant': '会計士 is a professional accountant; not every clerical bookkeeping role.',
  'bank': 'Financial institution 銀行; not a river bank.',
  'orange': 'Fruit sense of オレンジ, not the colour concept.',
  'kiwi fruit': 'Fruit sense of キウイ, not the bird.',
  'computer mouse': 'Device sense of マウス, not the laboratory animal.',
  'spring': 'Season 春, not a coil spring or water spring.',
  'lightweight': 'Weight sense of 軽い, not illumination.',
  'hot weather': '暑い weather sense; 熱い is hot to touch. External review pending.',
  'cold weather': '寒い weather sense; 冷たい is cold to touch.',
  'hot to touch': '熱い tactile sense; not hot weather.',
  'cold to touch': '冷たい tactile sense; not cold weather.',
  'fast': 'Snapshot representative 早い also indexes 速い; speed sense selected, not early.',
  'expensive': 'Price sense of 高い, not tall/high.',
  'beautiful': '綺麗 has beauty and cleanliness senses; no promise that those are interchangeable.',
  'family': 'Kinship labels use citation forms; address/own-versus-other-family pragmatics need human review.',
  'boredom': '退屈 adjective/nominal usage; independently authored learner synonym needs human review.',
  'cooking': '料理 noun/verbal noun; not a conjugated verb form.',
  'study': '勉強 noun/verbal noun, everyday studying; not a research investigation.'
};
const pilot = [];
for (const c of benchmark) {
  const source = reviewed.get(c.jmdictId);
  const meaning = source?.[5] ?? c.vi;
  // Accent placement variants (khoá/khóa, thuỷ/thủy) remain distinct for tone-sensitive lookup.
  const viAliases = [...new Set([c.vi, ...c.viAliases].filter(q=>!token(preserve(meaning),preserve(q))))];
  const enCandidates = [...new Set([c.en,...c.enAliases])];
  const englishAliases = enCandidates.filter(q=>!token(normalize(c.englishSense),normalize(q)));
  const row = baseline.rows.find(r=>r.conceptId===c.conceptId);
  if (!row || row.jmdictId !== c.jmdictId) throw new Error('Baseline identity mismatch');
  for (const o of row.outcomes) {
    if (o.pass) continue;
    if (o.courseEquivalentRank) o.reason='OTHER';
    else if (o.language.startsWith('vi')) o.reason=!source ? 'MISSING_VI_GLOSS' : token(normalize(source[5]),normalize(o.query)) ? 'WRONG_ENTRY_RANKING' : 'MISSING_ALIAS';
    else o.reason=token(normalize(c.englishSense),normalize(o.query)) ? 'WRONG_ENTRY_RANKING' : 'MISSING_ALIAS';
  }
  const note = caution[c.en] ?? (c.category==='family' ? caution.family : null);
  pilot.push({ ...c, quality: note ? 'C' : 'A', reviewNote: note ?? c.reviewNote,
    vietnameseMeaning: meaning, vietnameseAliases: viAliases, englishAliases,
    commonRank: source ? Number(source[6]) : 1000,
    source: 'Bundled JMdict / EDRDG (CC-BY-SA-4.0); Vietnamese independently authored, not claimed externally verified.',
    aliasReasons: englishAliases.map(alias=>({alias, reason: 'Common learner synonym/phrase absent as a whole token from canonical English gloss; human review pending.'})) });
}
const result = { notice: 'DRAFT — chờ duyệt. PENDING_REVIEW. Never automatically seed/publish.',
  baselineSha256: createHash('sha256').update(baselineBytes).digest('hex'), snapshot: JSON.parse(readFileSync('backend/src/main/resources/dictionary/snapshot.json')),
  license: 'CC-BY-SA-4.0', concepts: pilot };
writeFileSync('backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json', JSON.stringify(result,null,2)+'\n');
writeFileSync('docs/Dictionary/coverage-baseline.json', JSON.stringify(baseline,null,2)+'\n');
// Hash includes the final diagnostic annotation.
result.baselineSha256=createHash('sha256').update(readFileSync('docs/Dictionary/coverage-baseline.json')).digest('hex');
writeFileSync('backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json', JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({concepts:pilot.length, newVietnameseGlosses:pilot.filter(c=>!reviewed.has(c.jmdictId)).length,
  vietnameseAliases:pilot.reduce((n,c)=>n+c.vietnameseAliases.length,0), englishAliases:pilot.reduce((n,c)=>n+c.englishAliases.length,0),
  A:pilot.filter(c=>c.quality==='A').length,C:pilot.filter(c=>c.quality==='C').length}));
