// Moves the small set of historical and named-institution rows out of release batches.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const directory = 'backend/src/main/resources/db/migration-staging';
const outOfScope = /\b(?:1[0-9]{3}|20[0-9]{2})\b|\b(?:Agency|Secretariat|Bureau|Ministry|Department|Party|Act|Board of Audit|Molotov cocktail|Soka Gakkai)\b/u;
const exclusions = [];
const counts = {};
for (const batch of ['a', 'b', 'c', 'd', 'e', 'f']) {
  const path = `${directory}/vietnamese-assisted-batch-${batch}.tsv`;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/u);
  const header = lines.filter(line => line.startsWith('#'));
  const rows = lines.filter(line => line && !line.startsWith('#'));
  const keep = [];
  for (const line of rows) {
    const fields = line.split('\t');
    if (outOfScope.test(fields[3])) exclusions.push([fields[0], fields[1], fields[2], fields[3], 'historical or named institution/eponym']);
    else keep.push(line);
  }
  counts[batch.toUpperCase()] = { before: rows.length, excluded: rows.length - keep.length, after: keep.length };
  writeFileSync(path, [...header, ...keep].join('\n') + '\n', 'utf8');
  const metadataPath = path.replace(/\.tsv$/u, '.metadata.json');
  if (existsSync(metadataPath)) {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    const previouslyExcluded = metadata.outOfScopeExcluded ?? Math.max(0, Number(metadata.rows) - rows.length);
    metadata.rowsBeforeOutOfScopeFilter = metadata.rowsBeforeOutOfScopeFilter ?? (rows.length + previouslyExcluded);
    metadata.outOfScopeExcluded = previouslyExcluded + rows.length - keep.length;
    metadata.rows = keep.length;
    metadata.preparedAt = new Date().toISOString();
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  }
}
if (exclusions.length > 100) throw new Error(`Unexpectedly large out-of-scope set: ${exclusions.length}`);
const ledger = `${directory}/vietnamese-assisted-exclusions.tsv`;
if (exclusions.length) writeFileSync(ledger,
  '# Excluded from release; historical or named institution/eponym. Not loaded by Flyway.\n'
  + exclusions.map(row => row.join('\t')).join('\n') + '\n', 'utf8');
else if (!existsSync(ledger)) writeFileSync(ledger, '# Excluded from release; none. Not loaded by Flyway.\n', 'utf8');
process.stdout.write(JSON.stringify({ counts, excluded: exclusions.length || Math.max(0, readFileSync(ledger, 'utf8').split(/\r?\n/u).filter(line => line && !line.startsWith('#')).length), ledger }, null, 2));
