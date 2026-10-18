// Capture actual release-candidate results for the founder's common bilingual queries.
import { readFileSync, writeFileSync } from 'node:fs';
const concepts=JSON.parse(readFileSync('docs/Dictionary/coverage-benchmark.draft.json','utf8'));
const selected=['dog','cat','lion','elephant','truck','motorcycle','teacher','doctor','firefighter','programmer',
  'refrigerator','washing machine','computer','apple','banana'];
const byEnglish=new Map(concepts.map(concept=>[concept.en,concept]));
const samples=selected.map(en=>{
  const concept=byEnglish.get(en);
  if(!concept)throw new Error(`Missing benchmark concept: ${en}`);
  return {en,vi:concept.vi,jmdictId:concept.jmdictId,word:concept.word,reading:concept.reading};
});
samples.push({en:'phone',vi:'điện thoại',jmdictId:null,word:null,reading:null});
const queries=[...new Set(samples.flatMap(sample=>[sample.en,sample.vi]))];
const rows=[];
for(const query of queries){
  const response=await fetch('http://127.0.0.1:18081/api/v1/dictionary/search?q='+encodeURIComponent(query));
  if(!response.ok)throw new Error(`Search failed ${response.status}: ${query}`);
  const data=(await response.json()).data;
  rows.push({query,top3:data.vocabularies.slice(0,3).map(w=>({id:w.id,word:w.word,reading:w.reading,vi:w.vietnameseMeaning,en:w.meaning})),
    duplicates:data.vocabularies.length-new Set(data.vocabularies.map(w=>w.word+'|'+w.reading)).size});
}
const byQuery=new Map(rows.map(row=>[row.query,row]));
const rankOf=(query,id)=>{
  if(id===null)return null;
  const index=byQuery.get(query)?.top3.findIndex(word=>word.id===-id)??-1;
  return index<0?null:index+1;
};
const report=samples.map(sample=>({
  ...sample,
  vietnamese:byQuery.get(sample.vi),
  english:byQuery.get(sample.en),
  canonicalRank:{
    vietnamese:rankOf(sample.vi,sample.jmdictId),
    english:rankOf(sample.en,sample.jmdictId)
  }
}));
writeFileSync('docs/Dictionary/coverage-spot-checks.json',JSON.stringify(report,null,2)+'\n');
for(const row of report)console.log(`${row.en} / ${row.vi} | VI ${row.canonicalRank.vietnamese ?? 'n/a'}: ${(row.vietnamese?.top3??[]).map(w=>`${w.word} ${w.reading} ${w.vi}`).join(' ;; ')} | EN ${row.canonicalRank.english ?? 'n/a'}: ${(row.english?.top3??[]).map(w=>`${w.word} ${w.reading} ${w.vi}`).join(' ;; ')}`);
