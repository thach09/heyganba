import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=new URL('../public/fonts/',import.meta.url);
test('same-origin fonts retain authenticated assets, notices and complete fallback declarations',()=>{
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
 for(const [name,digest] of Object.entries(manifest.assets)){
  assert(!name.includes('/')&&!name.includes('..'));
  assert.equal(createHash('sha256').update(readFileSync(new URL(name,base))).digest('hex'),digest,name);
 }
 assert.equal(manifest.fonts.length,6);
 assert(manifest.fonts.every(font=>font.fallbackComplete&&/^[a-f0-9]{64}$/.test(font.sha256)));
 const css=readFileSync(new URL('fonts.css',base),'utf8');
 assert(!/https?:/.test(css));
 for(const match of css.matchAll(/url\('\/fonts\/([^']+)'\)/g)) assert(manifest.assets[match[1]],match[1]);
 for(const family of ['BeVietnamPro','NotoSansSC','NotoSerifSC'])assert(manifest.assets[`${family}-OFL.txt`]);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert(html.includes('href="/fonts/fonts.css"'));
 assert(!html.includes('fonts.googleapis.com'));
});
