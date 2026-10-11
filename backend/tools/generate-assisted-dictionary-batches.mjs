// Offline corpus builder for A-confidence ASSISTED rows.
// Translation is performed once during authoring; the application never calls a translation service.
// Usage: node backend/tools/generate-assisted-dictionary-batches.mjs <JMdict_e.gz> <B-F> [row-count]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const [sourcePath, batchName, countArg = '900'] = process.argv.slice(2);
if (!sourcePath || !/^[B-F]$/.test(batchName ?? '')) {
  throw new Error('Usage: node backend/tools/generate-assisted-dictionary-batches.mjs <JMdict_e.gz> <B-F> [row-count]');
}
const targetCount = Number(countArg);
if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 1200) throw new Error('Batch size must be 1-1200');

const resource = 'backend/src/main/resources';
const catalog = gunzipSync(readFileSync(`${resource}/dictionary/jmdict.tsv.gz`)).toString('utf8');
const pinned = new Map(catalog.split(/\r?\n/u).filter(Boolean).map(line => {
  const [id, word, reading, sense] = line.split('\t');
  return [Number(id), { word, reading, sense }];
}));
const readIds = path => new Set(readFileSync(path, 'utf8').split(/\r?\n/u)
  .filter(line => line && !line.startsWith('#')).map(line => Number(line.split('\t')[0])));
const excluded = new Set(readIds(`${resource}/dictionary/curated-ja-vi.tsv`));
for (const item of JSON.parse(readFileSync(`${resource}/db/migration-staging/dictionary-coverage-pilot.json`, 'utf8')).concepts)
  excluded.add(item.jmdictId);
for (const name of ['A', 'B', 'C', 'D', 'E', 'F']) {
  const path = `${resource}/db/migration-staging/vietnamese-assisted-batch-${name.toLowerCase()}.tsv`;
  if (existsSync(path)) for (const id of readIds(path)) excluded.add(id);
}
const exclusionLedger = `${resource}/db/migration-staging/vietnamese-assisted-exclusions.tsv`;
if (existsSync(exclusionLedger)) for (const id of readIds(exclusionLedger)) excluded.add(id);

const sourceBytes = readFileSync(sourcePath);
const xml = gunzipSync(sourceBytes).toString('utf8');
const entities = new Map([...xml.matchAll(/<!ENTITY\s+(\S+)\s+"([^"]*)">/gu)].map(match => [match[1], match[2]]));
const decode = value => value.replace(/&([^;]+);/gu, (_, name) =>
  ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[name] ?? entities.get(name) ?? name);
const tags = (value, tag) => [...value.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gu'))]
  .map(match => decode(match[1]));

const priorityValue = entry => {
  const values = [...tags(entry, 'ke_pri'), ...tags(entry, 're_pri')];
  const frequencyRanks = values.map(value => value.match(/^nf(\d\d)$/u)?.[1]).filter(Boolean).map(Number);
  if (frequencyRanks.length) {
    const rank = Math.min(...frequencyRanks);
    if (rank <= 20) return rank;
    if (rank <= 48) return 20 + rank;
  }
  if (values.includes('ichi1')) return 100;
  if (values.includes('news1')) return 200;
  if (values.includes('gai1')) return 300;
  return Number.POSITIVE_INFINITY;
};
const forbidden = /\b(?:archaic|obsolete|dated|historical|technical|slang|vulgar|derogatory|offensive|proper noun|person name|place name|company|brand name|surname|given name|family name|nickname|fictional|mythological|abbreviation|rare term|poetic|literary|agency|secretariat|ministry|department|bureau|board of audit|molotov cocktail|soka gakkai)\b/iu;
const candidates = [];
const candidateIds = new Set();
let excludedPriority = 0;
for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gu)) {
  const entry = match[1];
  const rank = priorityValue(entry);
  if (!Number.isFinite(rank)) continue;
  const id = Number(tags(entry, 'ent_seq')[0]);
  if (!id || excluded.has(id) || candidateIds.has(id)) continue;
  const words = tags(entry, 'keb');
  const readings = tags(entry, 'r_ele');
  const firstReading = readings[0];
  if (!firstReading) continue;
  const reading = tags(firstReading, 'reb')[0];
  const restrictions = tags(firstReading, 're_restr');
  const word = firstReading.includes('<re_nokanji') || !words.length ? reading : (restrictions[0] ?? words[0]);
  const senses = tags(entry, 'sense').filter(sense =>
    (!tags(sense, 'stagk').length || tags(sense, 'stagk').includes(word))
    && (!tags(sense, 'stagr').length || tags(sense, 'stagr').includes(reading)));
  const englishSense = senses.map(sense => tags(sense, 'gloss').join(', ')).filter(Boolean).join(' / ');
  const firstSense = senses[0];
  // A single JMdict sense is required for A confidence; multiple Japanese senses are not auto-collapsed.
  if (!id || !reading || !englishSense || senses.length !== 1 || englishSense.includes(' / ') || !firstSense) continue;
  const canonical = pinned.get(id);
  // Candidate priority comes from JMdict; identity and every sense are locked to the repository's pinned snapshot.
  if (!canonical || canonical.word !== word || canonical.reading !== reading || canonical.sense !== englishSense) continue;
  const glosses = tags(firstSense, 'gloss');
  const rawGloss = glosses.join(', ');
  const annotations = [...tags(firstSense, 's_inf'), ...tags(firstSense, 'pos')].join(' ');
  if (!rawGloss || forbidden.test(`${rawGloss} ${annotations}`) || /\b(?:1[0-9]{3}|20[0-9]{2})\b|\b(?:period|era)\b/iu.test(rawGloss)) { excludedPriority++; continue; }
  if (!rawGloss || glosses.length > 5 || rawGloss.length > 250 || /[\t\r\n|]/u.test(rawGloss)) {
    excludedPriority++;
    continue;
  }
  candidates.push({ id, word, reading, englishSense, gloss: rawGloss, rank, priority: [...tags(entry, 'ke_pri'), ...tags(entry, 're_pri')].join(','), pos: tags(firstSense, 'pos').join(',') });
  candidateIds.add(id);
}
candidates.sort((a, b) => a.rank - b.rank || a.id - b.id);
const outputPath = `${resource}/db/migration-staging/vietnamese-assisted-batch-${batchName.toLowerCase()}.tsv`;

if (process.argv.includes('--inspect')) {
  process.stdout.write(JSON.stringify({ batch: batchName, availableCandidates: candidates.length, excludedAmbiguousOrSpecialized: excludedPriority,
    sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'), examples: candidates.slice(0, 25) }, null, 2));
  process.exit(0);
}
if (existsSync(outputPath) && !process.argv.includes('--force')) throw new Error(`Refusing to overwrite ${outputPath}`);
if (candidates.length < targetCount) throw new Error(`Only ${candidates.length} pinned, common, clear candidates remain; need ${targetCount}`);

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function translateChunk(chunk, language, textFor) {
  const params = new URLSearchParams({ client: 'gtx', sl: language, tl: 'vi', dt: 't', q: chunk.map(textFor).join('\n') });
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`translation endpoint returned HTTP ${response.status}`);
      const payload = await response.json();
      const translated = Array.isArray(payload?.[0]) ? payload[0].map(segment => String(segment?.[0] ?? '')).join('') : '';
      const parts = translated.split(/\r?\n/u).map(value => value.trim());
      while (parts.at(-1) === '') parts.pop();
      if (parts.length !== chunk.length || parts.some(value => !value)) throw new Error('translation response did not preserve every line');
      return parts;
    } catch (error) {
      lastError = error;
      await delay(500 * (attempt + 1));
    }
  }
  throw lastError;
}
const clean = value => value.replace(/\s+/gu, ' ').replace(/^[\s"'“”]+|[\s"'“”.,;:!?]+$/gu, '').trim();
const normalized = value => ` ${value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/giu, 'd')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/gu, ' ')} `;
const senseMatches = (left, right) => {
  const a = normalized(left);
  const b = normalized(right);
  return a === b || (a.trim().length >= 4 && b.includes(a)) || (b.trim().length >= 4 && a.includes(b));
};

const rows = [];
let examined = 0;
let senseMismatches = 0;
for (let start = 0; start < candidates.length && rows.length < targetCount; start += 25) {
  const chunk = candidates.slice(start, start + 25);
  const meanings = await translateChunk(chunk, 'ja', row => row.word);
  const englishMeanings = await translateChunk(chunk, 'en', row => row.gloss);
  for (let index = 0; index < chunk.length; index++) {
    const item = chunk[index];
    examined++;
    const meaning = clean(meanings[index]);
    const englishMeaning = clean(englishMeanings[index]);
    if (!meaning || !englishMeaning
      || /[\t\r\n|\p{Cc}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(meaning)
      || meaning.length > 100 || !senseMatches(meaning, englishMeaning)) {
      senseMismatches++;
      continue;
    }
    const fields = [item.id, item.word, item.reading, item.englishSense, meaning, '', '', 'ASSISTED', 'A',
      `Google Translate ja-to-vi; English-to-Vietnamese sense cross-check matched; single unrestricted JMdict sense; ${item.priority}; POS ${item.pos || 'not tagged'}; pinned ID/word/reading/full sense matched; not human-reviewed.`];
    if (fields.some(value => String(value).includes('\t') || String(value).includes('\n') || String(value).includes('\r') || String(value).includes('|')))
      throw new Error(`Unsafe TSV field for ${item.id}`);
    rows.push(fields.join('\t'));
    if (rows.length >= targetCount) break;
  }
  process.stdout.write(`Examined ${Math.min(start + chunk.length, candidates.length)} candidates; accepted ${rows.length}/${targetCount}\n`);
  await delay(180);
}
if (rows.length !== targetCount) throw new Error(`Only ${rows.length}/${targetCount} rows passed the bilingual sense check after examining ${examined} candidates`);
const header = `# STAGING ONLY — ${batchName} — ASSISTED A-confidence, common JMdict priority, machine-translated and not human-reviewed.\n`;
writeFileSync(outputPath, header + rows.join('\n') + '\n', 'utf8');
const metadataPath = outputPath.replace(/\.tsv$/u, '.metadata.json');
writeFileSync(metadataPath, JSON.stringify({ batch: batchName, rows: rows.length, examined, senseMismatches,
  translation: 'Google Translate ja→vi of the headword, cross-checked against en→vi translation of its complete JMdict sense',
  selection: 'JMdict frequency nf01–nf48, then ichi1/news1/gai1; one unrestricted sense; pinned ID/headword/reading/full-sense match; excludes curated and pilot IDs; obvious specialized/name/sensitive gloss filters',
  jmdictSourceSha256: createHash('sha256').update(sourceBytes).digest('hex'), sourceUrl: 'https://www.edrdg.org/pub/Nihongo/JMdict_e.gz',
  generatedAt: new Date().toISOString() }, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify({ batch: batchName, rows: rows.length, outputPath, metadataPath }, null, 2));
