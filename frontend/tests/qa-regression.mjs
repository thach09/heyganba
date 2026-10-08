/** Real local PostgreSQL/browser regressions. No curriculum changes or production endpoints. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const web = process.env.QA_WEB || 'http://127.0.0.1:5174';
const api = process.env.QA_API || 'http://127.0.0.1:8081/api/v1';
const db = process.env.QA_DB || 'heyganba_qa_20261008';
const out = process.env.QA_OUTPUT_DIR;
const batch = process.env.QA_BATCH || 'ALL';
assert(out, 'QA_OUTPUT_DIR must be an external evidence directory');
assert.match(db, /^heyganba_qa_[a-z0-9_]+$/);
for (const url of [web, api]) assert(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Local QA only');
mkdirSync(out, { recursive: true });
const password = 'LocalRegression123!';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const records = [];
const sql = query => execFileSync('docker', ['exec', 'heyganba-postgres', 'psql', '-U', 'postgres', '-d', db, '-Atc', query], { encoding: 'utf8' }).trim();
async function call(path, body, token, method = body ? 'POST' : 'GET') {
  const response = await fetch(api + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, ...await response.json() };
}
async function account(label) {
  const email = `qa-fix-${label}-${Date.now()}@heyganba.test`;
  const response = await call('/auth/register', { email, password, fullName: `Sprint QA ${label}` });
  assert.equal(response.status, 201);
  return { ...response.data, email };
}
async function click(page, text) {
  await page.waitForFunction(text => [...document.querySelectorAll('button')].some(button => button.textContent.includes(text)), {}, text);
  await page.evaluate(text => {
    const buttons = [...document.querySelectorAll('button')];
    (buttons.find(b => b.textContent.trim() === text) || buttons.find(b => b.textContent.includes(text))).click();
  }, text);
}
async function login(page, user) {
  await click(page, 'Đăng nhập');
  await page.waitForSelector('#auth-email');
  await page.type('#auth-email', user.email); await page.type('#auth-password', password);
  await page.click('#auth-submit-btn'); await page.waitForFunction(() => !document.querySelector('#auth-email'));
}
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
async function pageFor(user, route) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(web + route, { waitUntil: 'domcontentloaded' });
  await login(page, user); return page;
}
async function capture(page, id, evidence) {
  await page.screenshot({ path: join(out, `${id}-desktop.png`), fullPage: true });
  await page.setViewport({ width: 390, height: 844 }); await sleep(150);
  await page.screenshot({ path: join(out, `${id}-mobile.png`), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Mobile horizontal overflow');
  return evidence;
}
async function test(id, group, fn) {
  if (batch !== 'ALL' && batch !== group) return;
  try { records.push({ id, status: 'PASS', evidence: await fn() }); console.log(`${id}: PASS`); }
  catch (error) { records.push({ id, status: 'FAIL', error: error.message }); console.error(`${id}: FAIL ${error.message}`); process.exitCode = 1; }
  writeFileSync(join(out, `results-${batch}.json`), JSON.stringify(records, null, 2));
}
async function generate(page) {
  await click(page, '10 câu');
  const pending = page.waitForResponse(r => r.url().endsWith('/exam/generate'));
  await click(page, 'Bắt đầu thi thử');
  const exam = (await (await pending).json()).data;
  await page.waitForSelector('[data-exam-question]'); return exam;
}
try {
  await test('QA-001', 'A', async () => {
    const a = await account('owner-A'), b = await account('owner-B'), page = await pageFor(a, '/exam');
    const exam = await generate(page); await page.keyboard.press('1');
    await click(page, 'Đổi mật khẩu'); await page.waitForSelector('dialog[open] input[type=password]');
    const fields = await page.$$('dialog[open] input[type=password]');
    for (const [i, value] of [password, 'ChangedRegression456!', 'ChangedRegression456!'].entries()) await fields[i].type(value);
    await page.click('dialog[open] button[type=submit]'); await page.waitForSelector('#auth-email');
    await page.type('#auth-email', b.email); await page.type('#auth-password', password); await page.click('#auth-submit-btn');
    await page.waitForFunction(() => !document.querySelector('#auth-email'));
    assert.equal(await page.$$eval('[data-exam-question]', nodes => nodes.length), 0);
    assert.equal(await page.evaluate(() => document.body.textContent.includes('Đã chọn')), false);
    assert.equal((await call(`/exam/${exam.examId}`, null, b.accessToken)).status, 404);
    const evidence = await capture(page, 'QA-001', { previousExam: exam.examId, newUser: b.userId, oldExamHidden: true, backendOwnership: 404 });
    await page.browserContext().close(); return evidence;
  });
  await test('QA-007', 'A', async () => {
    const a = await account('tabs-A'), b = await account('tabs-B'), page = await pageFor(a, '/exam');
    await generate(page); await page.keyboard.press('1');
    const second = await page.browserContext().newPage(); await second.goto(web, { waitUntil: 'domcontentloaded' });
    await second.waitForFunction(() => document.querySelector('aside')?.textContent.includes('Sprint QA tabs-A'));
    await click(second, 'Đăng xuất'); await second.waitForFunction(() => !localStorage.getItem('heyganba_user'));
    await login(second, b);
    assert.equal((await call('/auth/password', { currentPassword: password, newPassword: 'ChangedTabs456!' }, a.accessToken, 'PUT')).status, 200);
    await page.bringToFront();
    await page.waitForFunction(() => document.querySelector('aside')?.textContent.includes('Sprint QA tabs-B'));
    const principal = await page.evaluate(async () => {
      const { apiRequest } = await import('/src/lib/api/client.ts');
      return (await apiRequest('/users/me')).data.id;
    });
    assert.equal(principal, b.userId);
    assert.equal(await page.$$eval('[data-exam-question]', nodes => nodes.length), 0);
    await capture(page, 'QA-007', { principal, visibleUser: b.userId, previousExamHidden: true });
    await click(second, 'Đăng xuất'); await page.waitForFunction(() => !document.querySelector('aside')?.textContent.includes('Sprint QA tabs-B'));
    await page.browserContext().close(); return { principal, visibleUser: b.userId, crossTabLogout: true };
  });
  await test('QA-003', 'A', async () => {
    const user = await account('srs'), page = await pageFor(user, '/vocabulary');
    await page.waitForFunction(() => document.body.textContent.includes('Nghĩa tiếng Việt là gì?') || document.body.textContent.includes('Cách đọc là gì?'));
    const requests = []; await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.url().endsWith('/flashcard/review')) { requests.push(JSON.parse(request.postData())); await sleep(3000); }
      try { await request.continue(); } catch { /* Context closed after assertions. */ }
    });
    await page.keyboard.press('1'); await sleep(150); await page.keyboard.press('Enter'); await sleep(150); await page.keyboard.press('1');
    assert.equal(requests.length, 1);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Tiếp theo') && !b.disabled));
    await page.keyboard.press('Enter'); await page.keyboard.press('1');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Tiếp theo') && !b.disabled));
    assert.equal(requests.length, 2);
    assert.notEqual(requests[0].vocabularyId, requests[1].vocabularyId);
    assert.equal(Number(sql(`SELECT count(*) FROM srs_reviews WHERE user_id=${user.userId}`)), 2);
    const evidence = await capture(page, 'QA-003', { reviewRequests: requests.length, persistedReviews: 2, delayMs: 3000, nextBlockedUntilSaved: true });
    await page.browserContext().close(); return evidence;
  });
  await test('QA-005', 'A', async () => {
    const user = await account('deadline'), page = await pageFor(user, '/exam'), exam = await generate(page);
    const requests = []; await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.url().includes('/submit')) { requests.push(Date.now()); await sleep(3500); }
      try { await request.continue(); } catch { /* Context closed after assertions. */ }
    });
    await page.evaluate(expires => { const original = Date.now, offset = Date.parse(expires) - original() + 2000; Date.now = () => original() + offset; }, exam.expiresAt);
    await sleep(6500);
    assert.equal(requests.length, 1); assert.equal(sql(`SELECT status FROM mock_exams WHERE id=${exam.examId}`), 'SUBMITTED');
    assert(await page.evaluate(() => document.body.textContent.includes('Kết quả:')));
    const evidence = await capture(page, 'QA-005', { submitRequests: 1, dbStatus: 'SUBMITTED', outboundDelayMs: 3500, acceleratedClientClock: true });
    await page.browserContext().close(); return evidence;
  });
} finally { await browser.close(); }
