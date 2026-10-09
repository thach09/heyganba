// Capture an actual bilingual review sample; semantic judgment is recorded in the report.
import { readFileSync, writeFileSync } from 'node:fs';
const concepts=JSON.parse(readFileSync('docs/Dictionary/coverage-benchmark.draft.json','utf8'));
const selected=new Set(['cat','lion','strawberry','refrigerator','washing machine','motorcycle','truck','firefighter',
  'veterinarian','computer','wash','sleep','bread','bus','big']);
const queries=[...concepts.filter(c=>selected.has(c.en)).map(c=>c.vi),'cat','猫','ねこ','ネコ','neko','meo','con mèo'];
const rows=[];
for(const query of queries){
  const response=await fetch('http://127.0.0.1:18081/api/v1/dictionary/search?q='+encodeURIComponent(query));
  if(!response.ok)throw new Error(`Search failed ${response.status}: ${query}`);
  const data=(await response.json()).data;
  rows.push({query,top3:data.vocabularies.slice(0,3).map(w=>({id:w.id,word:w.word,reading:w.reading,vi:w.vietnameseMeaning,en:w.meaning})),
    duplicates:data.vocabularies.length-new Set(data.vocabularies.map(w=>w.word+'|'+w.reading)).size});
}
writeFileSync('docs/Dictionary/coverage-spot-checks.json',JSON.stringify(rows,null,2)+'\n');
for(const row of rows)console.log(row.query+' | '+row.top3.map(w=>w.id+' '+w.word+' '+w.reading+' '+w.vi+' / '+w.en.slice(0,85)).join(' ;; ')+' | duplicates='+row.duplicates);
