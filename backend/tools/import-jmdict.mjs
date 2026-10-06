import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

// Source: EDRDG JMdict_e. Derived data is CC BY-SA 4.0; see dictionary/README.md.
// Run: node backend/tools/import-jmdict.mjs downloaded/JMdict_e.gz
const source = readFileSync(process.argv[2]);
const xml = gunzipSync(source).toString('utf8');
const entities = new Map([...xml.matchAll(/<!ENTITY\s+(\S+)\s+"([^"]*)">/g)].map(m => [m[1], m[2]]));
const decode = s => s.replace(/&([^;]+);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[name] ?? entities.get(name) ?? name));
const tags = (s, tag) => [...s.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => decode(m[1]));
const normalize = s => s.normalize('NFKC').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
  .normalize('NFD').replace(/([a-zA-Z])\p{M}+/gu, '$1').normalize('NFC').toLowerCase().replaceAll('đ', 'd');
const rows = ['a i u e o', 'ka ki ku ke ko', 'sa shi su se so', 'ta chi tsu te to', 'na ni nu ne no', 'ha hi fu he ho', 'ma mi mu me mo', 'ya yu yo', 'ra ri ru re ro', 'wa wo n', 'ga gi gu ge go', 'za ji zu ze zo', 'da ji zu de do', 'ba bi bu be bo', 'pa pi pu pe po'];
const chars = ['あいうえお','かきくけこ','さしすせそ','たちつてと','なにぬねの','はひふへほ','まみむめも','やゆよ','らりるれろ','わをん','がぎぐげご','ざじずぜぞ','だぢづでど','ばびぶべぼ','ぱぴぷぺぽ'];
const roman = Object.fromEntries(chars.flatMap((r, i) => [...r].map((c, j) => [c, rows[i].split(' ')[j]])));
Object.assign(roman, {ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o',ゔ:'vu',ゎ:'wa',ゕ:'ka',ゖ:'ke'});
function romaji(reading) {
  const kana = [...normalize(reading)];
  let result = '';
  for (let i = 0; i < kana.length; i++) {
    const c = kana[i];
    let syllable = roman[c] ?? c;
    if (c === 'っ') { result += (roman[kana[i+1]] ?? '')[0] ?? ''; continue; }
    if (c === 'ー') { result += result.match(/[aeiou][^aeiou]*$/)?.[0][0] ?? ''; continue; }
    if ('ゃゅょ'.includes(kana[i+1]) && syllable.endsWith('i')) {
      const base = syllable === 'shi' ? 'sh' : syllable === 'chi' ? 'ch' : syllable === 'ji' ? 'j' : syllable.slice(0, -1) + 'y';
      syllable = base + ({ゃ:'a',ゅ:'u',ょ:'o'}[kana[++i]]);
    }
    result += syllable;
  }
  return result;
}
const data = [];
for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
  const entry = match[1];
  const id = tags(entry, 'ent_seq')[0];
  const words = tags(entry, 'keb');
  const readings = tags(entry, 'r_ele');
  const first = readings[0];
  const reading = tags(first, 'reb')[0];
  const restrictions = tags(first, 're_restr');
  const word = first.includes('<re_nokanji') || !words.length ? reading : (restrictions[0] ?? words[0]);
  const senses = tags(entry, 'sense').filter(s => (!tags(s, 'stagk').length || tags(s, 'stagk').includes(word))
    && (!tags(s, 'stagr').length || tags(s, 'stagr').includes(reading)));
  const meanings = senses.map(s => tags(s, 'gloss').join(', ')).filter(Boolean);
  if (!id || !reading || !meanings.length || word.length > 100 || reading.length > 100) continue;
  const aliases = [...words, ...readings.flatMap(r => tags(r, 'reb'))];
  const romanAliases = aliases.map(romaji);
  const meaning = meanings.join(' / ');
  const search = normalize([...aliases, ...romanAliases, ...romanAliases.map(r => r.replaceAll('ou','o').replaceAll('oo','o').replaceAll('uu','u')), meaning].join(' '));
  data.push([id, word, reading, meaning, search].map(s => s.replace(/[\t\r\n]/g, ' ')).join('\t'));
}
if (data.length < 200000) throw new Error(`Incomplete dictionary: ${data.length}`);
mkdirSync('backend/src/main/resources/dictionary', { recursive: true });
writeFileSync('backend/src/main/resources/dictionary/jmdict.tsv.gz', gzipSync(data.join('\n') + '\n', { level: 9 }));
writeFileSync('backend/src/main/resources/dictionary/snapshot.json', JSON.stringify({
  source: 'https://www.edrdg.org/pub/Nihongo/JMdict_e.gz',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  entries: data.length, generatedAt: new Date().toISOString(),
  license: 'CC-BY-SA-4.0', language: 'en',
  transformations: 'First valid word/reading pair, senses restricted to that pair, search aliases and Hepburn romaji'
}, null, 2) + '\n');
console.log(`Imported ${data.length} entries`);
