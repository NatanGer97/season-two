// Walk the whole e2e mockup like a user on a phone, screenshot each beat.
// Run: serve mockup/ on :5177, then `node test/walkthrough.js <out-dir>` (needs `npm i playwright`).
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || 'shots';
const URL = 'http://localhost:5177/v4/';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  let n = 0;
  const shot = async (name) => page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png` });
  const idle = () => page.waitForFunction(() => window.__state && !window.__state().busy, null, { timeout: 20000 });
  const at = (i) => page.waitForFunction((i) => window.__state().idx === i && !window.__state().busy, i, { timeout: 20000 });
  const down = async (ms = 700) => { await idle(); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); await idle(); await page.waitForTimeout(ms); };
  const busyWait = (ms) => page.waitForTimeout(ms);

  await page.goto(URL);
  await busyWait(4500);
  await shot('intro');
  await page.click('#intro-go');
  await at(0); await busyWait(600);
  await shot('s0-open');
  await down(); await shot('s0-story');

  // scene 1: run + ring
  await idle(); await page.keyboard.press('ArrowDown'); await busyWait(900); await shot('run-cal'); await at(1); await busyWait(600); await shot('s1-open');
  await down(); await shot('s1-story');
  await down(); await shot('s1-widget');
  const range = page.locator('.range');
  for (let v = 1; v <= 3; v++) { await range.fill(String(v)); await busyWait(400); }
  await busyWait(500); await shot('s1-done');
  await at(2); await busyWait(600); await shot('s2-open');
  await down(); await down(); await shot('s2-widget');
  for (const tile of await page.locator('.tile canvas').all()) {
    const b = await tile.boundingBox();
    await page.mouse.move(b.x + 4, b.y + 6); await page.mouse.down();
    for (let y = 6; y < b.height; y += 12) { await page.mouse.move(b.x + 4, b.y + y); await page.mouse.move(b.x + b.width - 4, b.y + y); }
    await page.mouse.up();
  }
  await busyWait(600); await shot('s2-done');
  await at(3); await busyWait(600); await shot('s3-open');
  await down(); await down(); await shot('s3-widget');
  for (let k = 0; k < 6; k++) await page.click('[data-side="0"]');
  await busyWait(700); await shot('s3-batyam');
  for (let k = 0; k < 3; k++) await page.click('[data-side="1"]');
  await page.click('.judge'); await busyWait(1800); await shot('s3-done');
  await at(4); await busyWait(600); await shot('s4-open');
  await down(); await down(); await busyWait(1200); await shot('s4-widget');
  await at(5); await busyWait(600); await shot('s5-open');
  await down(); await down(); await page.click('.opt[data-i="1"]'); await busyWait(1200); await shot('s5-done');
  await at(6); await busyWait(600); await shot('s6-open');
  await down(); await shot('s6-story');
  await down(); await shot('s6-widget');
  for (const c of await page.locator('.cake .hit').all()) { await c.click(); await busyWait(250); }
  await busyWait(900); await shot('s6-done');
  await at(7); await busyWait(1200); await shot('roadmap');
  await down(0); await at(8); await busyWait(2500); await shot('credits');
  await page.click('.skip'); await busyWait(1500); await shot('credits-end');

  // back navigation check
  await page.goto(URL + '?scene=2&step=1'); await busyWait(2500);
  await page.keyboard.press('ArrowUp'); await busyWait(1000);
  await page.keyboard.press('ArrowUp'); await busyWait(3500); await shot('back-to-s1');

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
  await browser.close();
})();
