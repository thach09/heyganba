import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const web = process.env.AUDIT_WEB_URL || 'http://127.0.0.1:5174';
const api = process.env.AUDIT_API_URL || 'http://127.0.0.1:8081/api/v1';
const out = process.env.AUDIT_OUTPUT || '../scratch/ui-audit';
const email = `cookie-browser-${Date.now()}@heyganba.test`;
const password = 'LocalCookieAudit123!';
mkdirSync(out, { recursive: true });
const registered = await fetch(`${api}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, fullName: 'Cookie Browser Audit' }) });
assert.equal(registered.status, 201);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(web, { waitUntil: 'networkidle0' });
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Đăng nhập'))?.click());
  await page.waitForSelector('#auth-email');
  await page.type('#auth-email', email);
  await page.type('#auth-password', password);
  const login = page.waitForResponse(r => r.url().includes('/auth/login') && r.request().method() === 'POST');
  await page.click('#auth-submit-btn');
  const response = await login;
  assert.equal(response.status(), 200);
  assert.equal((await response.json()).data.refreshToken, null);
  await page.waitForFunction(() => !document.querySelector('#auth-email'));
  const cookies = await browser.cookies();
  const refresh = cookies.find(c => c.name === 'heyganba_refresh');
  assert.ok(refresh?.httpOnly);
  assert.equal(refresh.sameSite, 'Lax');
  assert.equal(refresh.path, '/api/v1/auth');
  assert.ok(await page.evaluate(() => !document.cookie.includes('heyganba_refresh')));
  assert.ok(await page.evaluate(() => !localStorage.getItem('heyganba_access_token') && !localStorage.getItem('heyganba_refresh_token')
    && !/accessToken|refreshToken/.test(localStorage.getItem('heyganba_user') || '')));
  const resumed = page.waitForResponse(r => r.url().endsWith('/streak') && r.status() === 200);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await resumed;
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 1000 });
    if (width <= 900) {
      await page.waitForFunction(() => matchMedia('(max-width: 900px)').matches
        && document.querySelector('button.fixed.left-2.top-2') !== null);
      await new Promise(resolve => setTimeout(resolve, 200)); // Let the sidebar and content-margin transitions finish.
      const mobileLayout = await page.evaluate(() => {
        const box = (element) => { const r = element.getBoundingClientRect(); return { x: Math.round(r.x), width: Math.round(r.width) }; };
        const sidebar = document.querySelector('aside[aria-label]');
        const main = document.querySelector('main');
        return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, scrollX,
          sidebar: { ...box(sidebar), closed: sidebar.hasAttribute('inert') }, main: box(main), content: box(main.firstElementChild) };
      });
      assert.ok(mobileLayout.sidebar.closed && mobileLayout.sidebar.x <= -mobileLayout.sidebar.width + 1,
        'The mobile drawer must be off-screen after resizing');
      assert.equal(mobileLayout.main.x, 0, 'The dashboard must reclaim the mobile viewport after the drawer closes');
      assert.ok(mobileLayout.documentWidth <= mobileLayout.viewport, 'Mobile dashboard must not overflow horizontally');
    }
    await page.evaluate(() => window.scrollTo({ left: 0, top: 0, behavior: 'instant' }));
    assert.equal(await page.evaluate(() => window.scrollX), 0, `Screenshot must start at the left edge at ${width}px`);
    await page.screenshot({ path: `${out}/cookie-auth-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Đăng xuất'))?.click());
  await page.waitForFunction(() => !localStorage.getItem('heyganba_user'));
  assert.ok(!(await browser.cookies()).some(c => c.name === 'heyganba_refresh'));
  console.log('Cookie browser smoke passed: UI sign-in, HttpOnly refresh, no persisted JWTs, reload recovery and desktop/mobile layout.');
} finally { await browser.close(); }
