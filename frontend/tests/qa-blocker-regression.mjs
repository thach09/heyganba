/** Local PostgreSQL/Chrome probes for committed responses lost before reaching Grammar/SRS UI. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const web = process.env.QA_WEB || 'http://127.0.0.1:5174';
const api = process.env.QA_API || 'http://127.0.0.1:8081/api/v1';
const db = process.env.QA_DB || 'heyganba_blocker_ui_20261008';
const out = process.env.QA_OUTPUT_DIR;
assert(out, 'QA_OUTPUT_DIR is required');
assert.match(db, /^heyganba_(?:qa|blocker)_[a-z0-9_]+$/);
for (const url of [web, api]) assert(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Local QA only');
mkdirSync(out, { recursive: true });
const password = 'LocalBlockerRegression123!';
const sql = query => execFileSync('docker', ['exec', 'heyganba-postgres', 'psql', '-U', 'postgres', '-d', db, '-Atc', query], { encoding: 'utf8' }).trim();
async function call(path, body, token) {
  const response = await fetch(api + path, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const json = await response.json(); assert.equal(response.status, body && path === '/auth/register' ? 201 : 200);
  assert.equal(json.success, true); return json.data;
}
const source = module => module === 'grammar' ? 'GRAMMAR' : 'FLASHCARD';
function items(userId, module) {
  assert(Number.isSafeInteger(userId) && userId > 0);
  return Number(sql(`SELECT COALESCE(sum(item_count),0) FROM study_activities WHERE user_id=${userId} AND source='${source(module)}'`));
}
function reviewState(userId) {
  assert(Number.isSafeInteger(userId) && userId > 0);
  return sql(`SELECT COALESCE(json_agg(r ORDER BY vocabulary_id)::text,'[]') FROM
    (SELECT vocabulary_id,repetitions,interval_days,ease_factor,due_date,last_reviewed_at,updated_at FROM srs_reviews WHERE user_id=${userId}) r`);
}
async function click(page, text) {
  await page.waitForFunction(text => [...document.querySelectorAll('button')].some(b => {
    const r = b.getBoundingClientRect(); return b.textContent.trim() === text && !b.disabled && r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth;
  }), {}, text);
  const handle = await page.evaluateHandle(text => [...document.querySelectorAll('button')].find(b => {
    const r = b.getBoundingClientRect(); return b.textContent.trim() === text && !b.disabled && r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth;
  }), text);
  const button = handle.asElement(); assert(button);
  await button.evaluate(b => b.scrollIntoView({ block: 'center' }));
  assert.equal(await button.evaluate(b => {
    const rect = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
  }), true, `Click target obscured: ${text}`);
  await button.click(); await handle.dispose();
}
async function capture(page, name) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
  await page.screenshot({ path: join(out, `${name}-viewport.png`) });
}

// Run this mode after restarting the backend. Fixture files contain no credentials or tokens.
if (process.env.QA_REPLAY_FILE) {
  const fixtures = JSON.parse(readFileSync(process.env.QA_REPLAY_FILE, 'utf8'));
  const results = [];
  for (const fixture of fixtures) {
    assert(['grammar', 'srs'].includes(fixture.module));
    assert.equal(fixture.path, fixture.module === 'grammar' ? `/grammar/exercises/${fixture.body.exerciseId}/check` : '/flashcard/review');
    const account = await call('/auth/login', { email: fixture.email, password });
    assert.equal(account.userId, fixture.userId);
    const payload = { ...fixture.body }; delete payload.exerciseId;
    assert.deepEqual(await call(fixture.path, payload, account.accessToken), fixture.originalResult);
    assert.equal(items(fixture.userId, fixture.module), fixture.activityCount);
    if (fixture.module === 'srs') assert.equal(reviewState(fixture.userId), fixture.reviewState);
    results.push({ module: fixture.module, userId: fixture.userId, originalResultReplayed: true, activityUnchanged: true });
  }
  writeFileSync(join(out, 'restart-replay.json'), JSON.stringify(results, null, 2));
  console.log(`PASS restart replay: ${results.length} receipts`);
} else {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const results = [], fixtures = [], errors = [];
  try {
    for (const module of ['grammar', 'srs']) for (const width of [1440, 390]) {
      const email = `qa-blocker-${module}-${width}-${Date.now()}@heyganba.test`;
      const account = await call('/auth/register', { email, password, fullName: `Blocker ${module} ${width}` });
      const context = await browser.createBrowserContext(), page = await context.newPage();
      page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: width === 390 ? 844 : 1000 }); await page.bringToFront();
      await page.goto(web + (module === 'grammar' ? '/grammar' : '/vocabulary'), { waitUntil: 'domcontentloaded' });
      await click(page, module === 'grammar' ? 'Đăng nhập / Đăng ký' : 'Đăng nhập'); await page.waitForSelector('#auth-email');
      await page.type('#auth-email', email); await page.type('#auth-password', password); await page.click('#auth-submit-btn');
      await page.waitForFunction(() => !document.querySelector('#auth-email'));
      let firstExercise;
      if (module === 'grammar') {
        const loaded = page.waitForResponse(r => r.url().includes('/grammar/exercises') && r.request().method() === 'GET');
        await click(page, 'Luyện tập'); firstExercise = (await (await loaded).json()).data[0]; await page.waitForSelector('main kbd');
      } else await page.waitForFunction(() => document.body.textContent.includes('Nghĩa tiếng Việt là gì?') || document.body.textContent.includes('Cách đọc là gì?'));
      let mode = 'lose'; const requests = [];
      await page.setRequestInterception(true);
      page.on('request', async request => {
        try {
          if (module === 'grammar' ? request.url().endsWith('/check') : request.url().endsWith('/flashcard/review')) {
            const observation = { path: new URL(request.url()).pathname.replace('/api/v1', ''), body: JSON.parse(request.postData()), preCommitFailure: mode === 'precommit', responseDropped: mode === 'lose' };
            requests.push(observation);
            if (mode === 'precommit') { await request.abort('internetdisconnected'); return; }
            const response = await fetch(request.url(), { method: request.method(), headers: request.headers(), body: request.postData(), signal: AbortSignal.timeout(15000) });
            const text = await response.text(); observation.serverStatus = response.status; observation.result = JSON.parse(text).data;
            assert.equal(response.status, 200); assert.equal(JSON.parse(text).success, true);
            if (mode === 'lose') { await request.abort('connectionreset'); return; }
            await request.respond({ status: response.status, contentType: 'application/json', body: text }); return;
          }
          await request.continue();
        } catch (error) { errors.push(error.message); if (!request.isInterceptResolutionHandled()) await request.abort().catch(() => {}); }
      });
      if (module === 'grammar') {
        assert(Number.isSafeInteger(firstExercise.id));
        const correct = sql(`SELECT correct_answer FROM grammar_exercises WHERE id=${firstExercise.id}`);
        const key = firstExercise.options.indexOf(correct) + 1; assert(key > 0); await page.keyboard.press(String(key));
      } else {
        const word = (await call('/flashcard/due-today', null, account.accessToken))[0];
        const value = await page.evaluate(word => document.body.textContent.includes('Cách đọc là gì?') ? word.reading : word.meaning, word);
        const selected = await page.evaluate(value => {
          const button = [...document.querySelectorAll('main button')].find(b => b.children.length === 2 && b.lastElementChild.textContent === value);
          button?.click(); return !!button;
        }, value); assert.equal(selected, true);
      }
      const waitRetry = () => page.waitForFunction(module => [...document.querySelectorAll('button')]
        .some(b => b.textContent.trim() === (module === 'grammar' ? 'Thử chấm lại' : 'Thử lưu lại') && !b.disabled), {}, module);
      const waitGraded = count => page.waitForFunction(({ module, count }) => module === 'grammar'
        ? [...document.querySelectorAll('main p')].some(p => p.textContent.includes(`/${count} câu`))
        : document.querySelector('main b')?.textContent === String(count), {}, { module, count });
      await waitRetry(); assert.equal(requests.length, 1); assert.equal(items(account.userId, module), 1);
      if (module === 'srs') assert.equal(requests[0].body.rating, 'GOOD');
      const committedSchedule = module === 'srs' ? reviewState(account.userId) : null;
      const committedExp = await call('/exp', null, account.accessToken);
      const committedStreak = await call('/streak', null, account.accessToken);
      await capture(page, `${module}-lost-response-${width}`);
      mode = 'deliver'; await click(page, module === 'grammar' ? 'Thử chấm lại' : 'Thử lưu lại'); await waitGraded(1);
      assert.equal(requests.length, 2); assert.deepEqual(requests[1].body, requests[0].body);
      assert.deepEqual(requests[1].result, requests[0].result); assert.equal(items(account.userId, module), 1);
      if (module === 'srs') assert.equal(reviewState(account.userId), committedSchedule);
      assert.deepEqual(await call('/exp', null, account.accessToken), committedExp);
      assert.deepEqual(await call('/streak', null, account.accessToken), committedStreak);
      await capture(page, `${module}-safe-retry-${width}`);
      await page.keyboard.press('Enter'); await page.keyboard.press('1'); await waitGraded(2);
      assert.equal(requests.length, 3); assert.notEqual(requests[2].body.attemptId, requests[0].body.attemptId);
      if (module === 'srs') assert.notEqual(requests[2].body.vocabularyId, requests[0].body.vocabularyId);
      else assert.notEqual(requests[2].path, requests[0].path);
      assert.equal(items(account.userId, module), 2);
      await page.keyboard.press('Enter'); mode = 'precommit'; await page.keyboard.press('1'); await waitRetry();
      assert.equal(items(account.userId, module), 2); assert.equal(requests.length, 4);
      mode = 'deliver'; await click(page, module === 'grammar' ? 'Thử chấm lại' : 'Thử lưu lại'); await waitGraded(3);
      assert.equal(requests.length, 5); assert.deepEqual(requests[4].body, requests[3].body); assert.equal(items(account.userId, module), 3);
      assert.equal(Number(sql(`SELECT count(*) FROM learning_mutation_receipts WHERE user_id=${account.userId}`)), 3);
      assert.equal(Number(sql(`SELECT count(*) FROM learning_attempts WHERE user_id=${account.userId}`)), 3);
      await capture(page, `${module}-new-action-precommit-retry-${width}`);
      fixtures.push({ module, userId: account.userId, email, path: requests[0].path,
        body: { ...requests[0].body, ...(module === 'grammar' ? { exerciseId: firstExercise.id } : {}) },
        originalResult: requests[0].result, activityCount: 3, ...(module === 'srs' ? { reviewState: reviewState(account.userId) } : {}) });
      results.push({ id: module === 'grammar' ? 'QA-008' : 'NEW-REGRESSION-001', width, status: 'PASS', userId: account.userId,
        committedItemsBeforeRetry: 1, itemsAfterRetry: 1, originalResultReplayed: true, srsScheduleUnchanged: module === 'srs',
        expAndStreakUnchanged: true, uiCountAfterRetry: 1, newActionItems: 2, precommitFailureItems: 2, precommitRetryItems: 3,
        receipts: 3, evidenceFacts: 3, requests: requests.map(({ result: _result, ...request }) => request) });
      writeFileSync(join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2));
      writeFileSync(join(out, 'restart-fixtures.json'), JSON.stringify(fixtures, null, 2));
      console.log(`PASS ${module} ${width}: lost-response retry, new action, pre-commit retry`);
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
