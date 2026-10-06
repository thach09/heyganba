import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = process.env.AUDIT_WEB_URL || 'http://127.0.0.1:5174';
const api = process.env.AUDIT_API_URL || 'http://127.0.0.1:8081/api/v1';
const out = process.env.AUDIT_OUTPUT || '../scratch/ui-audit';
mkdirSync(out, { recursive: true });
const email = `ui-audit-${Date.now()}@heyganba.test`;
const authResponse = await fetch(`${api}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'LocalAudit123!', fullName: 'Local UI Audit' }) });
assert.equal(authResponse.status, 201);
const auth = (await authResponse.json()).data;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-first-run'] });
const results = [];
const errors = [];
const page = await browser.newPage();
page.on('pageerror', e => errors.push(e.message));
const clickText = async (text, scope = 'body') => {
  const clicked = await page.evaluate((text, scope) => {
    const root = document.querySelector(scope);
    const button = [...root.querySelectorAll('button')].find(b => b.textContent.trim().includes(text));
    if (!button) return false;
    button.click(); return true;
  }, text, scope);
  assert.equal(clicked, true, `Missing button: ${text}`);
};
const screenshot = async name => {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  await page.screenshot({ path: `${out}/viewport-${name}.png` });
};
const waitText = async text => page.waitForFunction(text => document.body.textContent.includes(text), {}, text);
const search = async query => {
  const input = await page.$('input[aria-label="Từ khoá tra cứu"]');
  await input.click(); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace');
  await input.type(query); await page.keyboard.press('Enter');
  await page.waitForFunction(q => document.body.textContent.includes(`kết quả cho "${q}"`) && !document.body.textContent.includes('Đang tra cứu…'), {}, query);
};
try {
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${origin}/dictionary`, { waitUntil: 'networkidle0' });
  await search('gakko');
  assert.ok(await page.evaluate(() => document.body.textContent.includes('学校')));
  await screenshot('dictionary-desktop-1440');
  await page.evaluate(auth => { localStorage.setItem('heyganba_access_token', auth.accessToken); localStorage.setItem('heyganba_refresh_token', auth.refreshToken); localStorage.setItem('heyganba_user', JSON.stringify(auth)); }, auth);
  await page.reload({ waitUntil: 'networkidle0' });
  await clickText('Lưu vào sổ tay');
  await page.waitForSelector('dialog[open]');
  await waitText('Bạn chưa có sổ cá nhân');
  await clickText('Tạo sổ đầu tiên', 'dialog[open]');
  await page.waitForSelector('input[aria-label="Tên sổ từ"]');
  await page.type('input[aria-label="Tên sổ từ"]', 'Sổ kiểm thử local');
  await page.click('dialog[open] button[type="submit"]');
  await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 1);
  await page.waitForFunction(() => Boolean(document.querySelector('select[aria-label="Chọn sổ từ vựng"]')?.value));
  await clickText('Lưu từ', 'dialog[open]');
  await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 0);
  await search('寿司');
  await clickText('Lưu vào sổ tay');
  await page.waitForSelector('dialog[open]');
  await clickText('Lưu từ', 'dialog[open]');
  await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 0);
  await clickText('Kho từ vựng cá nhân');
  await waitText('Sổ kiểm thử local');
  await clickText('Xem từ (2)');
  await screenshot('notebook-desktop-1440');
  await clickText('Bắt đầu luyện tập nhóm từ này');
  await page.waitForSelector('dialog[open]');
  await page.keyboard.press('1');
  await page.waitForFunction(() => document.querySelector('dialog[open]')?.textContent.includes('Câu tiếp'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('dialog[open]').textContent.includes('2 / 2'));
  await page.keyboard.press('1'); await page.keyboard.press('Enter');
  await waitText('Hoàn thành phiên luyện tập!');
  await screenshot('notebook-result-desktop-1440');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  results.push({ check: 'dictionary-save-first-notebook-practice-keyboard', passed: true });
  await clickText('Lưu về sổ tay của tôi');
  await waitText('(Bản sao)');
  await waitText('Sổ từ vựng của bạn (2)');
  assert.equal(await page.evaluate(() => document.body.textContent.includes('Sổ từ vựng của bạn (2)')), true);
  results.push({ check: 'clone-reviewed-basic-sample', passed: true });

  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1 });
    for (const route of ['/dictionary?q=日本語', '/kana', '/vocabulary', '/kanji', '/grammar', '/exam', '/', '/admin']) {
      await page.goto(`${origin}${route}`, { waitUntil: 'networkidle0' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `Horizontal overflow ${route} at ${width}`);
      await screenshot(`${route.split('?')[0].replaceAll('/', '') || 'dashboard'}-${width}`);
      results.push({ route, width, overflow });
    }
    await page.goto(`${origin}/kana`, { waitUntil: 'networkidle0' });
    await clickText('Luyện viết');
    await page.waitForSelector('canvas');
    await page.$eval('canvas', c => c.scrollIntoView({block:'center'}));
    const box = await page.$eval('canvas', c => { const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; });
    await page.mouse.move(box.x+20,box.y+20); await page.mouse.down(); await page.mouse.move(box.x+box.width-20,box.y+box.height-20,{steps:20}); await page.mouse.up();
    await clickText('Kiểm tra nét viết');
    await waitText('Chưa đạt 80%');
    assert.equal(await page.evaluate(() => document.body.textContent.includes('Đã luyện xong chữ')), false);
    await screenshot(`handwriting-wrong-${width}`);
    results.push({check:'wrong-handwriting-rejected',width,passed:true});
  }
  await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });
  await page.click('button[aria-label="Mở thanh điều hướng"]');
  await clickText('Đổi mật khẩu');
  await page.waitForSelector('dialog[open] input[type="password"]');
  await screenshot('password-mobile-390');
  const passwordFields = await page.$$('dialog[open] input[type="password"]');
  for (const [i, value] of ['LocalAudit123!','NewLocalAudit456!','NewLocalAudit456!'].entries()) await passwordFields[i].type(value);
  await page.click('dialog[open] button[type="submit"]');
  await page.waitForFunction(() => !localStorage.getItem('heyganba_access_token'));
  await waitText('Đăng nhập');
  await page.waitForSelector('dialog[aria-label="Đăng nhập vào HeyGanba"][open]');
  await page.type('#auth-email', email);
  await page.type('#auth-password', 'NewLocalAudit456!');
  await page.click('dialog[open] button[type="submit"]');
  await page.waitForFunction(() => Boolean(localStorage.getItem('heyganba_access_token')) && !document.querySelector('dialog[open]'));
  assert.equal(await page.evaluate(() => document.body.textContent.includes('Đã đổi mật khẩu. Vui lòng đăng nhập lại')), false);
  await page.click('button[aria-label="Mở thanh điều hướng"]');
  await clickText('Đăng xuất');
  await page.waitForFunction(() => !localStorage.getItem('heyganba_access_token'));
  results.push({ check: 'password-change-logs-out-and-opens-login', passed: true });
  assert.deepEqual(errors, []);
  writeFileSync(`${out}/results.json`, JSON.stringify({ email, userId: auth.userId, results, errors }, null, 2));
  console.log(`Passed ${results.length} UI checks; screenshots: ${out}; test user id: ${auth.userId}`);
} catch (error) {
  await screenshot('failure');
  writeFileSync(`${out}/failure.txt`, JSON.stringify(await page.evaluate(() => ({text:document.body.innerText, inputs:[...document.querySelectorAll('input')].map(i=>({label:i.ariaLabel,value:i.value,valid:i.validity.valid})),dialogs:document.querySelectorAll('dialog[open]').length})),null,2));
  throw error;
} finally { await browser.close(); }
