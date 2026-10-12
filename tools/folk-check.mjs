// Plays the people in headless Chrome: someone comes, is soaked, looks up; the player hides and is lost;
// soaked again they run and call; the police come; then the player stands in the open and is seen.
//
//   node --experimental-websocket tools/folk-check.mjs [out-dir]
//
// The page is opened with ?debug, which is the one place it tells a script where the people are.

import { withPage } from './browser.mjs';

const out = process.argv[2] || '.';
const BASE = (process.env.BASE || 'http://127.0.0.1:4310/') + '?debug';
const sleep = (ms) => `await new Promise((r) => setTimeout(r, ${ms}));`;
const state = `(() => { const f = window.dvor8.folk(); return { people: f.people.map((p) => p.kind + ':' + p.state + (p.wet ? ' wet' + p.wet : '')).join(', '), heat: +f.heat.toFixed(2), stars: document.querySelectorAll('#heat u.on').length,
  hidden: f.hidden, calls: f.calls, seen: f.seen, score: +document.getElementById('score').textContent, end: document.getElementById('end').hidden ? '' : document.getElementById('endTitle').textContent + ' · ' + document.getElementById('endLine').textContent }; })()`;
// throw at the first person of this kind (or anyone), where they will be when it lands
const soakOne = (kind) => `{ const f = window.dvor8.folk(), c = window.dvor8.cam(), p = f.people.find((q) => (${JSON.stringify(kind)} ? q.kind === ${JSON.stringify(kind)} : q.kind !== 'cop') && q.x > c.x + 8 && q.x < c.x + c.w - 8 && q.state !== 'flee');
  if (!p) return false;
  const r = document.getElementById('frame').getBoundingClientRect(), o = { clientX: r.left + ((p.x - c.x) / c.w) * r.width, clientY: r.top + ((p.y - 7 - c.y) / c.h) * r.height, bubbles: true, cancelable: true, pointerId: 1 };
  document.getElementById('tilt').dispatchEvent(new PointerEvent('pointerdown', o)); document.getElementById('tilt').dispatchEvent(new PointerEvent('pointerup', o)); return true; }`;
const until = (cond, ms) => `for (let i = 0; i < ${ms / 50}; i += 1) { if (${cond}) return true; await new Promise((r) => setTimeout(r, 50)); } return false;`;
const results = [], step = async (page, name, extra = {}) => results.push({ step: name, ...extra, ...(await page.run(`return ${state}`)) });
await withPage(BASE, {}, async (page) => {
  await page.wait(2500);
  await page.run(`document.getElementById('newsBtn').click(); document.getElementById('demoBtn').click(); ${sleep(1600)}`);
  await page.run(until(`window.dvor8.folk().people.some((p) => p.x > 30 && p.x < 160)`, 12000));
  await page.shot(`${out}/f1-comes.png`);
  await step(page, 'someone is in the yard');
  let hit = false;
  for (let n = 0; n < 6 && !hit; n += 1) { await page.run(soakOne('')); hit = await page.run(until(`window.dvor8.folk().soaked > 0`, 600)); }
  await page.run(until(`window.dvor8.folk().people.some((p) => p.state === 'look')`, 2500));
  await page.run(sleep(350));
  await page.shot(`${out}/f2-looks.png`);
  await step(page, 'soaked, looks up', { hit });
  await page.run(`document.getElementById('hideBtn').click(); ${sleep(500)}`);
  await page.shot(`${out}/f3-hidden.png`);
  await page.run(until(`!window.dvor8.folk().people.some((p) => p.state === 'look')`, 4000));
  await step(page, 'hidden: lost');
  await page.run(`document.getElementById('hideBtn').click(); ${sleep(200)}`);
  // the same one again, or the next to come: twice wet is a call (the lady calls at once, the drunk never)
  await page.run(`for (let i = 0; i < 400; i += 1) {
    const f = window.dvor8.folk();
    if (f.calls || f.police >= 0 || f.people.some((p) => p.kind === 'cop')) break;
    if (f.people.some((p) => p.state === 'look' || p.state === 'alarm')) { if (!f.hidden) document.getElementById('hideBtn').click(); }
    else { if (f.hidden) document.getElementById('hideBtn').click(); if (!f.people.some((p) => p.state === 'flee')) await (async () => ${soakOne('')})(); }
    await new Promise((r) => setTimeout(r, 120));
  }`);
  await step(page, 'someone called');
  await page.shot(`${out}/f4-call.png`);
  await page.run(until(`window.dvor8.folk().people.some((p) => p.kind === 'cop' && p.state === 'look')`, 14000));
  await page.run(`if (!window.dvor8.folk().hidden) document.getElementById('hideBtn').click(); ${sleep(300)}`);
  await page.shot(`${out}/f5-police.png`);
  await step(page, 'police looking, player hidden');
  await page.run(until(`window.dvor8.folk().people.some((p) => p.kind === 'cop' && p.state === 'search')`, 5000));
  await page.run(`document.getElementById('hideBtn').click(); ${sleep(150)}`);
  const before = await page.run(`return +document.getElementById('left').textContent`);
  await page.run(`{ const r = document.getElementById('frame').getBoundingClientRect(); for (const [fx, fy] of [[0.25, 0.72], [0.25, 0.72], [0.25, 0.72]]) { const o = { clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, bubbles: true, cancelable: true, pointerId: 1 };
    document.getElementById('tilt').dispatchEvent(new PointerEvent('pointerdown', o)); document.getElementById('tilt').dispatchEvent(new PointerEvent('pointerup', o)); await new Promise((r) => setTimeout(r, 250)); } }`);
  await step(page, 'wrecked while the police looked away', { leftBefore: before, leftAfter: await page.run(`return +document.getElementById('left').textContent`) });
  await page.run(soakOne('cop'));
  await page.run(until(`window.dvor8.folk().seen`, 9000));
  await page.shot(`${out}/f6-seen.png`);
  await page.run(sleep(1400));
  await page.shot(`${out}/f7-end.png`);
  await step(page, 'stood in the open: seen');
  results.push({ step: 'errors', errors: page.errors });
});
for (const r of results) console.log(JSON.stringify(r));
process.exit(0);
