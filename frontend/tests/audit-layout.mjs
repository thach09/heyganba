import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin=process.env.M6_WEB_URL || 'http://127.0.0.1:15174';
const api=process.env.M6_API_URL || 'http://127.0.0.1:18089/api/v1';
const out=process.env.M6_OUTPUT || '../backups/audit-ui';
assert(['127.0.0.1','localhost'].includes(new URL(api).hostname),'Only a disposable local API is supported');
mkdirSync(out,{recursive:true});
const credentials={email:`audit-ui-${Date.now()}@heyganba.test`,password:'LocalAuditOnly123!',fullName:'Kiểm tra giao diện'};
const response=await fetch(`${api}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});
assert.equal(response.status,201);
const auth=(await response.json()).data;
let admin=null;
if(process.env.M6_ADMIN_EMAIL) {
 const login=await fetch(`${api}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.M6_ADMIN_EMAIL,password:process.env.M6_ADMIN_PASSWORD})});
 assert.equal(login.status,200); admin=(await login.json()).data;
}
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--enable-unsafe-swiftshader']});
const results=[];
try {
 const page=await browser.newPage();
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.evaluateOnNewDocument((auth,admin)=>{
  const session=location.pathname.startsWith('/admin')&&admin ? admin : auth;
  localStorage.setItem('heyganba_access_token',session.accessToken);
  localStorage.setItem('heyganba_refresh_token',session.refreshToken);
  localStorage.setItem('heyganba_user',JSON.stringify(session));
 },auth,admin);
 const routes=[['dashboard','/'],['vocabulary','/vocabulary?level=HSK6'],['grammar','/grammar'],['hanzi','/hanzi'],['pinyin','/pinyin'],['reading','/dictionary'],['exam','/exam'],['admin','/admin']];
 for(const theme of ['light','dark']) for(const width of [1440,1024,390]) {
  await page.setViewport({width,height:1000,deviceScaleFactor:1});
  for(const [name,path] of routes) {
   const failures=[];
   const onResponse=r=>{if(['/api/v1/','/hanzi-data/','/vendor/'].some(path=>r.url().includes(path)) && r.status()>=400)failures.push({url:new URL(r.url()).pathname,status:r.status()});};
   page.on('response',onResponse);
   await page.goto(origin+path,{waitUntil:'networkidle0'});
   await page.evaluate((theme,session)=>{
    localStorage.setItem('chinese-learning-theme',theme);
    if(session) { localStorage.setItem('heyganba_access_token',session.accessToken); localStorage.setItem('heyganba_user',JSON.stringify(session)); }
   },theme,name==='admin'&&admin ? admin : auth);
   await page.reload({waitUntil:'networkidle0'});
   await page.evaluate(()=>document.fonts.ready);
   const click=async text=>page.evaluate(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text)?.click(),text);
   if(name==='grammar') await click('HSK 6 (6)');
   if(name==='hanzi') await click('HSK 6');
   if(name==='reading') { await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Đọc hiểu ngữ cảnh'))?.click()); await click('HSK 6 (1)'); }
   if(name==='exam') await click('HSK 6');
   await page.waitForNetworkIdle({idleTime:200,timeout:10000});
   const metrics=await page.evaluate(()=>{
    const collisions=[...document.querySelectorAll('[data-card-tag]')].flatMap(tag=>{const title=tag.parentElement.querySelector('h3');if(!title)return [];const a=tag.getBoundingClientRect(),b=title.getBoundingClientRect();return a.bottom>b.top+1?[tag.textContent.trim()]:[];});
    const lantern=document.querySelector('[data-lanterns]');
    const headings=[...document.querySelectorAll('main h1,main h2,main h3')];
    const lanternBottom=lantern ? Math.max(...[...lantern.querySelectorAll('svg')].map(e=>e.getBoundingClientRect().bottom)) : 0;
    const covered=headings.filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.top<lanternBottom && r.bottom>0;}).map(e=>e.textContent);
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,collisions,covered,theme:document.documentElement.dataset.theme,body:document.body.innerText};
   });
   assert.equal(metrics.theme,theme);
   assert.equal(metrics.scrollWidth,width,`${name} overflow ${width}`);
   assert.deepEqual(metrics.collisions,[],`${name} badge collision`);
   assert.deepEqual(metrics.covered,[],`${name} ceiling margin`);
   assert(!metrics.body.includes('Chưa hiển thị được trang này'),`${name} error boundary`);
   assert(!/\b(Kanji|Kana|Furigana|Onyomi|Kunyomi|JLPT)\b/.test(metrics.body),`${name} retired label`);
   if(name==='vocabulary')assert(metrics.body.includes('HSK 6 ·'),'HSK 6 lessons');
   if(name==='grammar')assert(metrics.body.includes('Phủ định kép'),'HSK 6 grammar');
   if(name==='hanzi')assert(metrics.body.includes('鉴'),'HSK 6 Hanzi');
   if(name==='reading')assert(metrics.body.includes('创新与责任'),'HSK 6 reading');
   if(name==='exam')assert(metrics.body.includes('180 / 300'),'HSK 6 scoring');
   await page.screenshot({path:`${out}/${name}-${theme}-${width}.png`});
   if(name==='dashboard') {
    await page.evaluate(()=>window.scrollTo(0,300));
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-lanterns]')).opacity==='0');
    await page.screenshot({path:`${out}/dashboard-scroll-${theme}-${width}.png`});
    await (await page.$('[aria-labelledby="hsk-roadmap-title"]')).screenshot({path:`${out}/roadmap-${theme}-${width}.png`});
   }
   if(name==='grammar') {
    await click('Luyện tập'); await click('连词成句 · Sắp xếp câu');
    await page.waitForSelector('[aria-label="Các từ cần sắp xếp"]');
    for(const word of ['倘若','有机会','，','我','便','去参观','。']) {
      await page.evaluate(word=>[...document.querySelectorAll('[aria-label="Các từ cần sắp xếp"] button')].find(button=>button.textContent===word && !button.disabled)?.click(),word);
    }
    await click('Chấm câu');
    await page.waitForFunction(()=>/chính xác/i.test(document.body.innerText));
    await page.$eval('[aria-label="Dạng bài tập"]',e=>e.scrollIntoView({block:'start'}));
    await page.screenshot({path:`${out}/ordering-${theme}-${width}.png`});
   }
   const unexpected=failures.filter(f=>!(name==='admin'&&f.status===403));
   assert.deepEqual(unexpected,[],`${name} API errors`);
   results.push({name,theme,width,scrollWidth:metrics.scrollWidth,collisions:metrics.collisions,failures});
   page.off('response',onResponse);
   console.log(`${name} ${theme} ${width}: PASS`);
  }
 }
 writeFileSync(`${out}/layout-results.json`,JSON.stringify(results,null,2));
} finally { await browser.close(); }
