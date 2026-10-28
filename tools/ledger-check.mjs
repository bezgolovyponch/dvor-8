// THE QUALITY LEDGER GATE — no verified number may regress, and a loosening is a recorded act.
//
// The operator's rule: "never go in circles in terms of quality; take precautions at every step, mandatory". This is the
// precaution: every row of docs/quality-ledger.json is a measurement of the OPERATOR'S OWN PRODUCT (the engine's FNV,
// its palette, its windows, its facade grids, the app's pixel identity with the engine's frame, its damaged frame, and
// the reference's own seven lines). This tool measures them again on every chain run and FAILS if any is worse.
//
//   node tools/ledger-check.mjs                 measure, compare, refuse a regression
//   node tools/ledger-check.mjs --accept "why"   accept the CURRENT measurements as the new lock, and record why
//
// The --accept path appends `docs/ledger-history.md` - a loosening is never silent.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { withPage } from './browser.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PNG } = require('../gates/node_modules/pngjs');

const LEDGER = new URL('../docs/quality-ledger.json', import.meta.url);
const HISTORY = new URL('../docs/ledger-history.md', import.meta.url);
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const accept = process.argv.includes('--accept');
const reason = process.argv[process.argv.indexOf('--accept') + 1] || '';

// ---- measure (one browser session: the engine's frame, then the app's frame, then the app's damaged frame) --------
const BASE = 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=7.5&debug&photo=/game/photos-test/v10a.jpg';
const m = await withPage(BASE, { width: 412, height: 915 }, async (page) => {
  return await page.run(`
    const png = (cv) => cv.toDataURL('image/png');
    // the engine alone
    const { Component } = await import('/game/src/ref/engine.js');
    const c = new Component();
    const sc = JSON.parse(JSON.stringify(c.SCENES.find((s) => s.id === 'prague-tower'))); sc.src = '/game/photos-test/v10a.jpg';
    const img = new Image(); img.src = sc.src; await img.decode();
    c.tok++; c.S = null; c.build(img, sc, 8);
    const goldIntact = (() => { const cv = document.createElement('canvas'); cv.width = c.W; cv.height = c.H; const g = cv.getContext('2d'); const im = g.createImageData(c.W, c.H); const o = new Uint32Array(im.data.buffer); for (let k = 0; k < c.W * c.H; k++) o[k] = c.P32[c.S.base[k]]; g.putImageData(im, 0, 0); return png(cv); })();
    for (let n = 0; n < 10; n++) c.damageAt(c.S, 40 + (n % 3) * 6 + 0.5, 120 + n * 9 + 0.5, []);
    const goldDamaged = (() => { const cv = document.createElement('canvas'); cv.width = c.W; cv.height = c.H; const g = cv.getContext('2d'); const im = g.createImageData(c.W, c.H); const o = new Uint32Array(im.data.buffer); for (let k = 0; k < c.W * c.H; k++) o[k] = c.P32[c.S.base[k]]; g.putImageData(im, 0, 0); return png(cv); })();
    // the app on the same photograph
    const t0 = performance.now();
    while (!window.__world && performance.now() - t0 < 90000) await new Promise((r) => setTimeout(r, 250));
    let t1 = performance.now();
    while (!window.__world.regions.every((r) => r.seen) && performance.now() - t1 < 60000) await new Promise((r) => setTimeout(r, 200));
    await new Promise((r) => setTimeout(r, 800));
    const yard = document.getElementById('yard');
    const oursIntact = png(yard);
    for (let n = 0; n < 10; n++) window.__strikeAt(40 + (n % 3) * 6, 120 + n * 9, 1);
    await new Promise((r) => setTimeout(r, 900));
    const oursDamaged = png(yard);
    const fac = (c.REP || []).map((r) => r.lu + 'x' + r.lv);
    return { goldIntact, goldDamaged, oursIntact, oursDamaged, fnv: c.fnv(c.clean), palette: c.SUB.length, windows: (c.WN || []).length, grids: fac };
  `);
});
const px = (a64, b64) => {
  const a = PNG.sync.read(Buffer.from(a64.split(',')[1], 'base64'));
  const b = PNG.sync.read(Buffer.from(b64.split(',')[1], 'base64'));
  let d = 0;
  for (let k = 0; k < 288 * 512; k += 1) if (a.data[k * 4] !== b.data[k * 4] || a.data[k * 4 + 1] !== b.data[k * 4 + 1] || a.data[k * 4 + 2] !== b.data[k * 4 + 2]) d += 1;
  return d;
};
const now = {
  'engine.fnv': m.fnv,
  'engine.palette': m.palette,
  'engine.windows': m.windows,
  'engine.grid.tower': m.grids[0],
  'engine.grid.checker': m.grids[1],
  'app.intactPx': px(m.oursIntact, m.goldIntact),
  'app.damagedPx': px(m.oursDamaged, m.goldDamaged),
};

// ---- compare ------------------------------------------------------------------------------------------------
let failed = 0;
const pad = (s, n) => String(s).padEnd(n);
console.log('THE QUALITY LEDGER — every row is the operator\'s own product, re-measured now');
console.log(`${pad('row', 22)} ${pad('locked', 10)} ${pad('now', 10)} verdict`);
for (const [key, row] of Object.entries(ledger.rows)) {
  if (!(key in now)) { console.log(`${pad(key, 22)} ${pad(row.value, 10)} ${pad('—', 10)} not measured by this gate (${row.source})`); continue; }
  const v = now[key];
  const ok = row.kind === 'equal' ? String(v) === String(row.value)
    : row.kind === 'max' ? Number(v) <= Number(row.value)
    : Number(v) >= Number(row.value);
  if (!ok) failed += 1;
  console.log(`${pad(key, 22)} ${pad(row.value, 10)} ${pad(v, 10)} ${ok ? 'ok' : 'REGRESSED'}`);
}
if (failed) {
  console.log(`\nLEDGER FAILED: ${failed} verified number(s) are worse than the lock.`);
  console.log('A regression is not shipped: fix it, or accept the new value with a recorded reason:');
  console.log('  node tools/ledger-check.mjs --accept "<what got worse and why it is acceptable>"');
  process.exit(1);
}
if (accept) {
  if (!reason) { console.log('REFUSED: --accept needs a reason'); process.exit(2); }
  for (const [key, row] of Object.entries(ledger.rows)) if (key in now) row.value = now[key];
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
  appendFileSync(HISTORY, `\n- ${new Date().toISOString()} — ledger re-locked: ${reason}\n  ${Object.keys(now).map((k) => `${k}=${now[k]}`).join(' · ')}\n`);
  console.log(`\nLEDGER RE-LOCKED: ${reason} (recorded in docs/ledger-history.md)`);
  process.exit(0);
}
console.log('\nLEDGER OK: every verified number holds or improves. The quality cannot go backwards silently.');
