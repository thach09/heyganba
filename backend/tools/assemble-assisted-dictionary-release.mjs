// Validates the batch ledger against the pinned catalog, then assembles the runtime-only import.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const root = 'backend/src/main/resources';
const catalog = gunzipSync(readFileSync(`${root}/dictionary/jmdict.tsv.gz`)).toString('utf8');
const pinned = new Map(catalog.split(/\r?\n/u).filter(Boolean).map(line => {
  const [id, word, reading, sense] = line.split('\t');
  return [Number(id), { word, reading, sense }];
}));
const reviewedIds = new Set(readFileSync(`${root}/dictionary/curated-ja-vi.tsv`, 'utf8').split(/\r?\n/u)
  .filter(line => line && !line.startsWith('#')).map(line => Number(line.split('\t')[0])));
const rows = [];
const ids = new Set();
const counts = {};
for (const batch of ['a', 'b', 'c', 'd', 'e', 'f']) {
  const path = `${root}/db/migration-staging/vietnamese-assisted-batch-${batch}.tsv`;
  const batchRows = readFileSync(path, 'utf8').split(/\r?\n/u).filter(line => line && !line.startsWith('#'));
  const expected = batch === 'a' ? 343 : batchRows.length;
  if (batch === 'a' && batchRows.length !== expected || batch !== 'a' && (batchRows.length < 800 || batchRows.length > 900))
    throw new Error(`Batch ${batch.toUpperCase()} has ${batchRows.length}; expected ${batch === 'a' ? 343 : '800-900'}`);
  counts[batch.toUpperCase()] = batchRows.length;
  for (const [index, line] of batchRows.entries()) {
    const fields = line.split('\t');
    if (fields.length !== 10) throw new Error(`Batch ${batch.toUpperCase()} row ${index + 1} has ${fields.length} fields`);
    const [rawId, word, reading, sense, meaning, viAliases, enAliases, status, confidence] = fields;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || !meaning.trim() || status !== 'ASSISTED' || confidence !== 'A')
      throw new Error(`Batch ${batch.toUpperCase()} row ${index + 1} is not a non-empty A-confidence ASSISTED row`);
    if (reviewedIds.has(id) || ids.has(id)) throw new Error(`Duplicate or already VERIFIED ID ${id}`);
    if (fields.some(field => /[\t\r\n|\p{Cc}]/u.test(field))) throw new Error(`Malformed field for JMdict ID ${id}`);
    const source = pinned.get(id);
    if (!source || source.word !== word || source.reading !== reading || source.sense !== sense)
      throw new Error(`Pinned JMdict identity/sense mismatch for ID ${id}`);
    ids.add(id);
    rows.push(line);
  }
}
const expectedTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
if (expectedTotal < 4780 || expectedTotal + reviewedIds.size < 5000) throw new Error(`Coverage target not met: ${expectedTotal} assisted + ${reviewedIds.size} verified`);
const excludedPath = `${root}/db/migration-staging/vietnamese-assisted-exclusions.tsv`;
const excludedIds = new Set(readFileSync(excludedPath, 'utf8').split(/\r?\n/u)
  .filter(line => line && !line.startsWith('#')).map(line => Number(line.split('\t')[0])));
if ([...excludedIds].some(id => ids.has(id))) throw new Error('An out-of-scope exclusion was reintroduced');
const destination = `${root}/dictionary/assisted-ja-vi.tsv`;
writeFileSync(destination,
  '# Runtime ASSISTED Vietnamese import. Every row is A-confidence and remains distinct from human-VERIFIED data.\n'
  + rows.join('\n') + '\n', 'utf8');
process.stdout.write(JSON.stringify({ batches: counts, excludedOutOfScope: excludedIds.size, assisted: rows.length, verifiedSource: reviewedIds.size,
  covered: rows.length + reviewedIds.size, pinnedCatalogEntries: pinned.size, runtimeResource: destination }, null, 2));
