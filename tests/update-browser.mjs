import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

let revision = 1;
const root = resolve('dist');
const worker = await readFile('static/sw.js', 'utf8');
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep)) throw Error('Invalid path');
    let body = await readFile(file);
    if (pathname === '/sw.js') body = worker.replace('__VERSION__', 'update-test-' + revision);
    if (pathname === '/app.js') body = body.toString() + `\nwindow.testRevision=${revision};`;
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.ttf':'font/ttf','.webmanifest':'application/manifest+json','.png':'image/png'})[extname(file)] || 'text/plain');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  } catch { res.statusCode = 404; res.end('Missing'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => navigator.serviceWorker.controller && window.testRevision === 1);
  await page.evaluate(() => localStorage.setItem('update-test-preserved', 'yes'));
  await page.getByRole('button', {name:/JACK IN/}).click();
  revision = 2;
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
  await page.locator('#app-update').waitFor();
  await page.locator('#app-update').click();
  assert.match(await page.locator('#app-update').textContent(), /Archive your session/);
  assert.equal(await page.evaluate(() => window.testRevision), 1, 'Never reload an active session');
  await page.getByRole('button', {name:/END SESSION & ARCHIVE/}).click();
  await page.locator('#app-update').click();
  await page.waitForFunction(() => window.testRevision === 2);
  assert.equal(await page.evaluate(() => localStorage.getItem('update-test-preserved')), 'yes');
  // A new launch gets current assets even before a worker update has activated.
  revision = 3;
  await page.reload();
  await page.waitForFunction(() => window.testRevision === 3);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.context().setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('heading', {name:'Choose your session.'}).waitFor();
  assert.equal(await page.evaluate(() => window.testRevision), 3);
  assert.deepEqual(errors, []);
  console.log('Update checks passed: cached app update, active-session protection, refresh, preserved storage, fresh launch, offline reload.');
} finally { await browser.close(); server.close(); }
