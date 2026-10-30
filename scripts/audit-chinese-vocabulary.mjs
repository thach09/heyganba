// Read-only audit of a JSON export: SELECT json_agg(v ORDER BY id) FROM vocabulary v.
// Presence checks are not linguistic validation or approval of learning content.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const [input, output] = process.argv.slice(2);
assert(input && output, 'Usage: node scripts/audit-chinese-vocabulary.mjs input.json output.json');
const rows = JSON.parse(readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));
assert(Array.isArray(rows), 'Expected vocabulary rows');
const fields = ['word', 'pinyin', 'han_viet', 'meaning_vi', 'part_of_speech', 'example_zh', 'example_pinyin', 'example_vi', 'source_ref', 'review_status'];
const present = value => value !== null && value !== undefined && String(value).trim() !== '';
const grouped = key => Object.groupBy(rows, key);
const summarize = items => ({
  rows: items.length,
  distinctWords: new Set(items.map(r => r.word?.trim())).size,
  duplicateRows: items.length - new Set(items.map(r => r.word?.trim())).size,
  missing: Object.fromEntries(fields.map(f => [f, items.filter(r => !present(r[f])).length])),
  reviewStatus: Object.fromEntries(Object.entries(Object.groupBy(items, r => r.review_status ?? 'NULL')).map(([k, v]) => [k, v.length])),
});
const duplicates = Object.entries(grouped(r => r.word?.trim())).filter(([, items]) => items.length > 1).map(([word, items]) => ({ word, ids: items.map(r => r.id), levels: items.map(r => r.hsk_level) }));
const perWord = rows.map(r => ({
  id: r.id, word: r.word, level: r.hsk_level, lessonId: r.lesson_id, lessonNumber: r.lesson_number,
  missing: fields.filter(f => !present(r[f])),
  reviewStatus: r.review_status, sourceRef: r.source_ref,
  hasHanCharacter: /\p{Script=Han}/u.test(r.word ?? ''),
  // Neutral-tone words can legitimately have no marked vowel: this flag needs human review.
  needsToneReview: !/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu.test(r.pinyin ?? ''),
  needsAssignmentReview: !present(r.hsk_level) || !present(r.lesson_id),
}));
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'Isolated test database export; structural checks only. No database writes.',
  standard: 'Repository historical six-level curriculum; not a certification of HSK 3.0 coverage.',
  total: summarize(rows),
  byLevel: Object.fromEntries(Object.entries(grouped(r => r.hsk_level ?? 'intro/unassigned')).map(([k, v]) => [k, summarize(v)])),
  byLesson: Object.fromEntries(Object.entries(grouped(r => r.lesson_id ?? 'unassigned')).map(([k, v]) => [k, summarize(v)])),
  duplicates,
  pendingSourceReview: perWord.filter(r => r.missing.includes('source_ref')).map(r => ({ ...r, recommendedReviewStatus: 'PENDING_REVIEW' })),
  perWord,
};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ rows: report.total.rows, distinctWords: report.total.distinctWords, missingSource: report.pendingSourceReview.length, output }));
