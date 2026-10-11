// Produces an isolated review/rehearsal chunk. It never writes to the production dictionary resource.
import { readFileSync, writeFileSync } from 'node:fs';

const pilotPath = 'backend/src/main/resources/db/migration-staging/dictionary-coverage-pilot.json';
const reviewedPath = 'backend/src/main/resources/dictionary/curated-ja-vi.tsv';
const outputPath = 'backend/src/main/resources/db/migration-staging/vietnamese-assisted-batch-a.tsv';
const pilot = JSON.parse(readFileSync(pilotPath, 'utf8'));
const reviewedIds = new Set(readFileSync(reviewedPath, 'utf8').split(/\r?\n/u)
  .filter(line => line && !line.startsWith('#')).map(line => Number(line.split('\t')[0])));

const candidates = pilot.concepts.filter(row => {
  if (row.reviewStatus !== 'PENDING_REVIEW') throw new Error(`Unexpected source review state: ${row.conceptId}`);
  return !reviewedIds.has(row.jmdictId) && ['A', 'B'].includes(row.confidence);
});
if (candidates.length !== 343) throw new Error(`Expected 343 new high-confidence pilot rows; found ${candidates.length}`);

const fields = [
  row => row.jmdictId,
  row => row.word,
  row => row.reading,
  row => row.englishSense,
  row => row.vietnameseMeaning,
  row => row.vietnameseAliases.join(';'),
  row => row.englishAliases.join(';'),
  () => 'ASSISTED',
  row => row.confidence,
  row => row.reviewNote,
];
const lines = candidates.map(row => {
  const values = fields.map(field => String(field(row)));
  if (values.some(value => value.includes('\t') || value.includes('\n') || value.includes('\r') || value.includes('|')))
    throw new Error(`Unsafe TSV field: ${row.conceptId}`);
  if (!values[4].trim() || !values[9].trim()) throw new Error(`Missing assisted meaning or note: ${row.conceptId}`);
  return values.join('\t');
});
writeFileSync(outputPath,
  '# STAGING ONLY — ASSISTED, not human-verified. Confidence C and already-VERIFIED IDs are excluded.\n'
  + lines.join('\n') + '\n');
console.log(JSON.stringify({ batch: 'A', assistedRows: candidates.length, sourcePilot: pilot.concepts.length,
  excludedC: pilot.concepts.filter(row => row.confidence === 'C' && !reviewedIds.has(row.jmdictId)).length,
  alreadyVerified: pilot.concepts.filter(row => reviewedIds.has(row.jmdictId)).length,
  output: outputPath }, null, 2));
