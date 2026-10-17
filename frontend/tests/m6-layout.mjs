import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin=process.env.M6_WEB_URL || 'http://127.0.0.1:15174';
const api=process.env.M6_API_URL || 'http://127.0.0.1:18089/api/v1';
const out=process.env.M6_OUTPUT || '../backups/m6-ui';
mkdirSync(out,{recursive:true});
const response=await fetch(`${api}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`m6-layout-${Date.now()}@heyganba.test`,password:'LocalM6Audit123!',fullName:'M6 Local QA'})});
assert.equal(response.status,201,'Register only in disposable local rehearsal database');
const auth=(await response.json()).data;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--enable-unsafe-swiftshader']});
const results=[];
try {
 const page=await browser.newPage();
 await page.evaluateOnNewDocument(auth=>{
  localStorage.setItem('heyganba_access_token',auth.accessToken);
  localStorage.setItem('heyganba_refresh_token',auth.refreshToken);
  localStorage.setItem('heyganba_user',JSON.stringify(auth));
 },auth);
 const routes=[['dashboard','/'],['vocabulary','/vocabulary?level=HSK6'],['grammar','/grammar'],['hanzi','/hanzi'],['pinyin','/pinyin'],['reading','/dictionary'],['exam','/exam']];
 for(const width of [1440,1024,390]) {
  await page.setViewport({width,height:1000,deviceScaleFactor:1});
  for(const [name,path] of routes) {
   const failed=[];
   const onResponse=r=>{if(r.url().startsWith(api) && r.status()>=400)failed.push({url:r.url(),status:r.status()});};
   page.on('response',onResponse);
   await page.goto(origin+path,{waitUntil:'networkidle0'});
   await page.evaluate(()=>document.fonts.ready);
   const click=async text=>page.evaluate(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text)?.click(),text);
   if(name==='grammar') { await page.waitForSelector('button'); await click('HSK 6 (6)'); }
   if(name==='hanzi') { await page.waitForSelector('button'); await click('HSK 6'); }
   if(name==='reading') { await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Đọc hiểu ngữ cảnh'))?.click()); await click('HSK 6 (1)'); }
   if(name==='exam')await click('HSK 6');
   await page.waitForNetworkIdle({idleTime:300,timeout:10000});
   const metrics=await page.evaluate(()=>{
    const tags=[...document.querySelectorAll('[data-card-tag]')];
    const collisions=tags.flatMap(tag=>{const title=tag.parentElement.querySelector('h3');if(!title)return [];const a=tag.getBoundingClientRect(),b=title.getBoundingClientRect();return a.bottom>b.top+1?[tag.textContent.trim()]:[];});
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,collisions,heading:document.querySelector('h1')?.textContent,body:document.body.innerText};
   });
   assert.equal(metrics.scrollWidth,width,`${name} horizontal overflow at ${width}`);
   assert.deepEqual(metrics.collisions,[],`${name} badge/title collision`);
   assert(!metrics.body.includes('Chưa hiển thị được trang này'),`${name} error boundary`);
   if(name==='vocabulary')assert(metrics.body.includes('HSK 6 ·'),'HSK 6 lessons loaded');
   if(name==='grammar')assert(metrics.body.includes('Phủ định kép'),'HSK 6 grammar loaded');
   if(name==='hanzi')assert(metrics.body.includes('鉴'),'HSK 6 Hanzi loaded');
   if(name==='reading')assert(metrics.body.includes('创新与责任'),'HSK 6 reading selected');
   if(name==='exam')assert(metrics.body.includes('180 / 300'),'HSK 6 scoring displayed');
   await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});
   if(name==='dashboard')await page.$eval('[aria-labelledby="hsk-roadmap-title"]',e=>e.scrollIntoView());
   if(name==='dashboard')await (await page.$('[aria-labelledby="hsk-roadmap-title"]')).screenshot({path:`${out}/roadmap-${width}.png`});
   results.push({name,width,scrollWidth:metrics.scrollWidth,collisions:metrics.collisions,failed});
   page.off('response',onResponse);
   console.log(`${name} ${width}: PASS`);
  }
 }
 writeFileSync(`${out}/layout-results.json`,JSON.stringify(results,null,2));
} finally { await browser.close(); }
