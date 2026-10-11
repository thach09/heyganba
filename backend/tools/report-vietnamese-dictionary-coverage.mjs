import { readFileSync, writeFileSync } from "node:fs";

const before = JSON.parse(readFileSync("docs/Dictionary/vietnamese-coverage-baseline.json", "utf8"));
const after = JSON.parse(readFileSync("docs/Dictionary/vietnamese-coverage-candidate.json", "utf8"));
const beforeById = new Map(before.rows.map(row => [row.conceptId, row]));
const outcomeKey = outcome => outcome.language + "\0" + outcome.query;
const quote = value => '"' + String(value ?? "").replaceAll('"', '""') + '"';
const columns = ["concept_id","jmdict_id","headword","reading","language","query","canonical_rank",
  "baseline_first_page_results","baseline_first_page_with_vi","baseline_first_page_vi_percent",
  "candidate_first_page_results","candidate_first_page_with_vi","candidate_first_page_vi_percent",
  "baseline_top10_results","baseline_top10_with_vi","baseline_top10_vi_percent",
  "candidate_top10_results","candidate_top10_with_vi","candidate_top10_vi_percent","candidate_top10_entries"];
const lines = [columns.join(",")];
for (const row of after.rows) {
  const original = beforeById.get(row.conceptId);
  if (!original || original.jmdictId !== row.jmdictId) throw new Error("Benchmark identity changed: " + row.conceptId);
  const beforeOutcomes = new Map(original.outcomes.map(outcome => [outcomeKey(outcome), outcome]));
  for (const outcome of row.outcomes) {
    const previous = beforeOutcomes.get(outcomeKey(outcome));
    if (!previous) throw new Error("Baseline query missing: " + outcome.language + "/" + outcome.query);
    lines.push([row.conceptId,row.jmdictId,row.word,row.reading,outcome.language,outcome.query,outcome.rank,
      previous.firstPageResultCount,previous.firstPageWithVietnameseMeaning,previous.firstPageVietnameseCoveragePercent,
      outcome.firstPageResultCount,outcome.firstPageWithVietnameseMeaning,outcome.firstPageVietnameseCoveragePercent,
      previous.top10ResultCount,previous.top10WithVietnameseMeaning,previous.top10VietnameseCoveragePercent,
      outcome.top10ResultCount,outcome.top10WithVietnameseMeaning,outcome.top10VietnameseCoveragePercent,
      outcome.top10.map(entry => entry.id + ":" + entry.word + ":" + (entry.hasVietnameseMeaning ? "VI" : "NO_VI")).join(" | " )]
      .map(quote).join(","));
  }
}
writeFileSync("docs/Dictionary/coverage-query-density.csv", "\uFEFF" + lines.join("\n") + "\n");

const root = "backend/src/main/resources";
const lineRows = path => readFileSync(path, "utf8").split(/\r?\n/u).filter(line => line && !line.startsWith("#"));
const assisted = lineRows(root + "/dictionary/assisted-ja-vi.tsv");
const reviewed = lineRows(root + "/dictionary/curated-ja-vi.tsv");
if (assisted.some(line => {
  const fields = line.split("\t");
  return fields.length !== 10 || fields[7] !== "ASSISTED" || fields[8] !== "A";
})) throw new Error("Runtime resource contains a malformed or non-A assisted row");
process.stdout.write(JSON.stringify({
  benchmarkConcepts: after.rows.length,
  verified: reviewed.length,
  assisted: assisted.length,
  canonicalTop10: { vi: after.metrics.vi.top10, en: after.metrics.en.top10 },
  top10VietnameseDensity: after.metrics.resultCoverage.primary.top10CoveragePercent,
  densityTargetsAreNonBlocking: true,
  queryCsv: "docs/Dictionary/coverage-query-density.csv"
}, null, 2) + "\n");
