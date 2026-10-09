// Pilot readiness gate, separate from collecting measurements. Draft rehearsal is not release approval.
import { readFileSync } from 'node:fs';
const [,, resultFile] = process.argv;
if (!resultFile) throw new Error('Usage: node backend/tools/check-dictionary-coverage.mjs measured-results.json');
const data = JSON.parse(readFileSync(resultFile,'utf8'));
const required = new Set(['mèo','chó','sư tử','voi','dâu tây','dưa hấu','xe máy','xe tải','tủ lạnh','máy giặt',
  'lính cứu hỏa','thợ cắt tóc','kế toán','bác sĩ thú y','cat','dog','lion','elephant','strawberry','watermelon',
  'motorcycle','truck','refrigerator','washing machine','firefighter','hairdresser','accountant','veterinarian']);
const queries = data.rows.flatMap(r=>r.outcomes.filter(o=>['vi','en'].includes(o.language)));
const failures = queries.filter(o=>required.has(o.query)&&!o.pass).map(o=>({query:o.query,rank:o.rank,reason:o.reason}));
if (queries.filter(o=>required.has(o.query)).length !== 28) throw new Error('Missing required bilingual regressions');
const pass = data.metrics.vi.coveragePercent>=95 && data.metrics.en.coveragePercent>=95 && !failures.length;
console.log(JSON.stringify({readiness:pass?'SEARCH COVERAGE PASS':'SEARCH COVERAGE FAIL',
  viTop10:data.metrics.vi.coveragePercent,enTop10:data.metrics.en.coveragePercent,mandatoryFailures:failures},null,2));
process.exitCode=pass?0:1;
