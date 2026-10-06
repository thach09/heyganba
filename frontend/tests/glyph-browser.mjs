import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.AUDIT_WEB_URL || 'http://127.0.0.1:5174/kana', { waitUntil: 'networkidle0' });
  const results = await page.evaluate(async () => {
    const { skeletonize, gradeHandwriting } = await import('/src/features/kana/handwritingScore.ts');
    const results = [];
    for (const char of ['あ','い','す','が','シ','ツ','きゃ','学校','日','本','語','食']) {
      const fonts = await document.fonts.load("400 200px 'Noto Serif JP'", char);
      if (!fonts.length) throw new Error(`Missing glyph font: ${char}`);
      const c=document.createElement('canvas'); c.width=c.height=256;
      const ctx=c.getContext('2d',{willReadFrequently:true});
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#000';
      ctx.font=`400 ${Math.round(256*(char.length===1?.74:char.length===2?.52:.36))}px 'Noto Serif JP', serif`;
      ctx.fillText(char,128,256*.52);
      const pixels=ctx.getImageData(0,0,256,256).data;
      const skeleton=skeletonize(Uint8Array.from({length:256*256},(_,i)=>pixels[i*4+3]>=100?1:0),256);
      const strokes=[];
      for(let i=0;i<skeleton.length;i++)if(skeleton[i])strokes.push([{x:(i%256)/256,y:Math.floor(i/256)/256}]);
      const complete=gradeHandwriting(char,strokes);
      const incomplete=gradeHandwriting(char,strokes.filter(s=>s[0].x<.5));
      results.push({char,complete,incomplete});
    }
    return results;
  });
  for(const r of results) { assert.equal(r.complete.accepted,true,`Complete ${r.char}`);assert.equal(r.incomplete.accepted,false,`Half ${r.char}`); }
  writeFileSync('../scratch/ui-audit/glyph-results.json',JSON.stringify(results,null,2));
  console.log(`Verified complete and incomplete ink for ${results.length} real Japanese glyphs in Chrome`);
} finally { await browser.close(); }
