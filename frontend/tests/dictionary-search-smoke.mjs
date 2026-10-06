import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const api = process.env.AUDIT_API_URL || 'http://127.0.0.1:8081/api/v1';
const web = process.env.AUDIT_WEB_URL || 'http://127.0.0.1:5174';
const out = process.env.AUDIT_OUTPUT || '../scratch/ui-audit';
mkdirSync(out, { recursive: true });

async function lookup(query, page = 0) {
  const response = await fetch(`${api}/dictionary/search?q=${encodeURIComponent(query)}&page=${page}`);
  assert.equal(response.status, 200, `Search failed for ${query}`);
  return (await response.json()).data;
}

const police = await lookup('cảnh sát');
const officer = police.vocabularies.find(word => word.word === '警察');
assert.ok(officer, 'Vietnamese lookup should find 警察');
assert.match(officer.vietnameseMeaning, /cảnh sát/);
assert.match(officer.meaning, /police/i);

const doctor = await lookup('bác sĩ');
const physician = doctor.vocabularies.find(word => word.word === '医者');
assert.ok(physician, 'Vietnamese lookup should find 医者');
assert.match(physician.vietnameseMeaning, /bác sĩ/);
assert.match(physician.meaning, /doctor/i);

const fire = await lookup('cháy');
assert.ok(fire.vocabularies.length <= 40, 'Broad queries must stay paged');
assert.ok(fire.vocabularies.some(word => ['燃える', '火事', '火災'].includes(word.word)), 'Fire lookup should return relevant everyday words');
const japaneseFire = await lookup('火');
assert.equal(japaneseFire.vocabularies[0].word, '火', 'Exact Japanese headword should rank first');
assert.equal(new Set(japaneseFire.vocabularies.map(word => `${word.word}|${word.reading}`)).size,
  japaneseFire.vocabularies.length, 'Duplicate headword and reading pairs should be collapsed');
const accentedFire = await lookup('h\u1ecfa');
assert.ok(accentedFire.totalMatches < 40, 'Accented Vietnamese search should not broaden into unrelated normalized matches');
assert.ok(accentedFire.vocabularies.some(word => ['\u706b\u4e8b', '\u706b\u707d'].includes(word.word)), 'Vietnamese fire lookup should find fire vocabulary');
assert.ok(!accentedFire.vocabularies.some(word => word.word === '\u679c\u7269'), 'Tone marks must keep hỏa distinct from hoa');
assert.match((await lookup('cà phê')).vocabularies.find(word => word.word === 'コーヒー')?.vietnameseMeaning ?? '', /cà phê/);
assert.ok((await lookup('火', 1)).vocabularies.length > 0, 'Broad Japanese lookup should paginate');

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--no-first-run']
});
try {
  const page = await browser.newPage();
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 1000 });
    await page.goto(`${web}/dictionary?q=${encodeURIComponent('bác sĩ')}`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.textContent.includes('Chưa có nghĩa Việt đã đối chiếu') || document.body.textContent.includes('bác sĩ'));
    assert.ok(await page.evaluate(() => document.body.textContent.includes('Việt')));
    assert.ok(await page.evaluate(() => document.body.textContent.includes('Anh')));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Horizontal overflow at ${width}px`);
    await page.screenshot({ path: `${out}/dictionary-search-${width}.png`, fullPage: true });
  }
  console.log('Dictionary smoke passed: Vietnamese and Japanese searches, ranking, paging, bilingual glosses and 1440/390 layout.');
} finally { await browser.close(); }
