import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  const page=await browser.newPage();
  const results=[];
  for(const width of [1440,390]){
    await page.setViewport({width,height:width===390?844:1000});
    await page.goto(`${process.env.AUDIT_WEB_URL || 'http://127.0.0.1:5174'}/kana`,{waitUntil:'networkidle0'});
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Luyện viết tay').click());
    await page.waitForSelector('canvas');
    await page.$eval('canvas',c=>c.scrollIntoView({block:'center'}));
    const paths=await page.evaluate(async()=>{
      const {skeletonize}=await import('/src/features/kana/handwritingScore.ts');
      await document.fonts.load("400 200px 'Noto Serif JP'",'あ');
      const c=document.createElement('canvas');c.width=c.height=256;
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.textAlign='center';ctx.textBaseline='middle';ctx.font="400 189px 'Noto Serif JP', serif";ctx.fillText('あ',128,256*.52);
      const p=ctx.getImageData(0,0,256,256).data;
      const s=skeletonize(Uint8Array.from({length:65536},(_,i)=>p[i*4+3]>=100?1:0),256);
      const visited=new Set(),paths=[];
      const neighbours=i=>[-257,-256,-255,-1,1,255,256,257].map(d=>i+d).filter(n=>n>=0&&n<s.length&&Math.abs(n%256-i%256)<=1&&s[n]);
      const walk=(i,path)=>{visited.add(i);path.push(i);for(const n of neighbours(i))if(!visited.has(n)){walk(n,path);path.push(i);}};
      for(let i=0;i<s.length;i++)if(s[i]&&!visited.has(i)){const path=[];walk(i,path);paths.push(path.filter((_,j)=>j%2===0).map(i=>({x:i%256/256,y:Math.floor(i/256)/256})));}
      return paths;
    });
    const box=await page.$eval('canvas',c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
    for(const path of paths){const first=path[0];await page.mouse.move(box.x+first.x*box.width,box.y+first.y*box.height);await page.mouse.down();for(const point of path.slice(1))await page.mouse.move(box.x+point.x*box.width,box.y+point.y*box.height);await page.mouse.up();}
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Kiểm tra nét viết').click());
    await page.waitForFunction(()=>document.body.textContent.includes('Đã luyện xong chữ あ'));
    await page.screenshot({path:`../scratch/ui-audit/handwriting-correct-${width}.png`});
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Xoá hết').click());
    assert.equal(await page.evaluate(()=>document.body.textContent.includes('Đã luyện xong chữ')),false,'Clearing ink clears old congratulations');
    results.push({width,correctTraceAccepted:true,oldFeedbackCleared:true});
  }
  writeFileSync('../scratch/ui-audit/handwriting-ui-results.json',JSON.stringify(results,null,2));
  console.log('Correct traces accepted and old feedback cleared at 1440 and 390');
} finally {await browser.close();}
