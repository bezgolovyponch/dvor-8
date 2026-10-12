// Watches the sky in headless Chrome: the plane and its banner, a throw that cuts the banner loose, the
// airship and its board, the same from down in the yard, and the news turned off. Saves screenshots.
//
//   node --experimental-websocket tools/news-check.mjs [out-dir]
//
// The headlines are the real ones of the day, so this needs the network; without it the yard's own
// news flies and `news` below says 'yard'.

import { withPage } from './browser.mjs';

const out = process.argv[2] || '.';
const BASE = process.env.BASE || 'http://127.0.0.1:4310/';
const sleep = (ms) => `await new Promise((r) => setTimeout(r, ${ms}));`;
const tap = (fx, fy) => `{ const r = document.getElementById('frame').getBoundingClientRect(), o = { clientX: r.left + r.width * ${fx}, clientY: r.top + r.height * ${fy}, bubbles: true, cancelable: true, pointerId: 1 };
  document.getElementById('tilt').dispatchEvent(new PointerEvent('pointerdown', o)); document.getElementById('tilt').dispatchEvent(new PointerEvent('pointerup', o)); }`;
const state = `({ news: document.body.dataset.news, kept: (JSON.parse(localStorage.getItem('dvor8.news') || '{}').lines || []).length, score: +document.getElementById('score').textContent,
  pops: [...document.querySelectorAll('.pop')].map((p) => p.textContent).join(' | '), note: document.getElementById('note').textContent, on: document.getElementById('newsBtn').getAttribute('aria-pressed') })`;
const results = [];
await withPage(BASE, {}, async (page) => {
  await page.wait(3000);
  results.push({ step: 'loaded', ...(await page.run(`return ${state}`)), lines: await page.run(`return (JSON.parse(localStorage.getItem('dvor8.news') || '{}').lines || [])`) });
  await page.run(`document.getElementById('demoBtn').click(); ${sleep(1700 + 2500 + 4200)}`);
  await page.shot(`${out}/n1-plane.png`);
  const before = (await page.run(`return ${state}`)).score;
  await page.run(`${tap(0.5, 0.066)} ${sleep(450)}`);
  await page.shot(`${out}/n2-cut.png`);
  const cut = await page.run(`return ${state}`);
  results.push({ step: 'threw at the banner', gained: cut.score - before, pops: cut.pops });
  await page.run(sleep(1100));
  await page.shot(`${out}/n3-falling.png`);
  await page.run(sleep(2700 + 6500));
  await page.shot(`${out}/n4-ship.png`);
  await page.run(`document.getElementById('viewBtn').click(); ${sleep(1500)}`);
  await page.shot(`${out}/n5-ship-walk.png`);
  const mid = (await page.run(`return ${state}`)).score;
  await page.run(`${tap(0.5, 0.11)} ${sleep(500)}`);
  await page.shot(`${out}/n6-dark.png`);
  const dark = await page.run(`return ${state}`);
  results.push({ step: 'threw at the ship from the yard', gained: dark.score - mid, pops: dark.pops });
  await page.run(sleep(1500 + 1500 + 3500));
  await page.shot(`${out}/n7-plane-walk.png`);
  await page.run(`document.getElementById('newsBtn').click(); ${sleep(700)}`);
  await page.shot(`${out}/n8-off.png`);
  results.push({ step: 'news off', ...(await page.run(`return ${state}`)) });
  results.push({ step: 'page errors', errors: page.errors });
});
console.log(JSON.stringify(results, null, 1));
process.exit(0);
