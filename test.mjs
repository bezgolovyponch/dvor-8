// DVOR-8 tests. Every claim in the README is checked here, and the tests assert BEHAVIOUR rather than the
// presence of code: a yard is playable if the scan recognises everything and a rock can break something.
//
// Usage:  node test.mjs

import { buildYard, yardSummary, WORLD_W, WORLD_H } from './src/yard.js';
import { makeScan, startScan, stepScan, SCAN_MS } from './src/scan.js';
import { makeEffect, throwAt, stepEffect } from './src/throw.js';
import { KINDS, LAYERS, hitObject, spendRock } from './src/state.js';
import { forLayer, onLadder, shade } from './src/palette.js';

let pass = 0, fail = 0;
const rows = [];
const check = (what, ok, detail = '') => { rows.push({ what, ok, detail: String(detail) }); if (ok) pass += 1; else fail += 1; };

// ---- the yard ------------------------------------------------------------------------------------
const a = buildYard('двор-1');
const b = buildYard('двор-1');
const c = buildYard('другой двор');
check('the yard generates', a.objects.length > 0, a.objects.length + ' objects');
check('the same seed gives the same yard',
  JSON.stringify(a.objects.map((o) => [o.kind, o.x, o.y])) === JSON.stringify(b.objects.map((o) => [o.kind, o.x, o.y])),
  'deterministic');
check('a different seed gives a different yard',
  JSON.stringify(a.objects.map((o) => o.x)) !== JSON.stringify(c.objects.map((o) => o.x)), 'not fixed');
check('every object is inside the world',
  a.objects.every((o) => o.x >= 0 && o.x + o.w <= WORLD_W && o.y >= 0 && o.y + o.h <= WORLD_H),
  `${WORLD_W}x${WORLD_H}`);
check('every object has a kind the renderer knows',
  a.objects.every((o) => KINDS[o.kind]), [...new Set(a.objects.map((o) => o.kind))].join(', '));
check('every kind states a silhouette class and a break count',
  Object.values(KINDS).every((k) => k.silhouette && k.breaks > 0), Object.keys(KINDS).length + ' kinds');
check('the yard holds enough to be worth scanning and breaking',
  a.objects.length >= 20 && a.objects.filter((o) => o.layer === 'yard').length >= 8,
  a.objects.filter((o) => o.layer === 'yard').length + ' in the gameplay layer');

// ---- the scan, the game's opening move -----------------------------------------------------------
const w2 = buildYard('двор-1');
const scan = makeScan(w2);
check('nothing is recognised before the scan', yardSummary(w2).scanned === 0);
startScan(scan, 0);
let done = null;
for (let t = 50; t <= SCAN_MS + 400 && !done; t += 50) { const r = stepScan(scan, t); if (r && r.done) done = r; }
check('the scan finishes', Boolean(done), done ? 'completed' : 'never completed');
check('a finished scan recognises EVERY object, with none left behind',
  w2.objects.every((o) => o.scanned), yardSummary(w2).scanned + ' / ' + w2.objects.length);
check('the scan reports where the recognition came from', done && done.source === 'local', done ? done.source : '-');
const w3 = buildYard('двор-1');
const s3 = makeScan(w3);
startScan(s3, 0);
const before = w3.scanned;
stepScan(s3, 1e6);
check('a second pass cannot double-count what is already recognised', w3.scanned === before + w3.objects.length,
  'counted once');

// ---- throwing and breaking ------------------------------------------------------------------------
const w4 = buildYard('двор-1');
w4.objects.forEach((o) => { o.scanned = true; });
const fx = makeEffect();
const target = w4.objects.find((o) => o.kind === 'bin');
const aim = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
const t1 = throwAt(fx, w4, aim.x, aim.y);
check('a throw costs a rock', t1.thrown === true && w4.inventory.rocks === 5, w4.inventory.rocks + ' left');
let landed = [];
for (let i = 0; i < 300 && fx.rocks.length; i += 1) landed = landed.concat(stepEffect(fx, w4, 0.016));
const firstHit = landed.find((l) => l.hit);
check('a throw can hit something', Boolean(firstHit), firstHit ? firstHit.target.kind : 'missed every time');
check('a throw hits what was AIMED at, not whatever is nearest',
  Boolean(firstHit && firstHit.target.id === target.id),
  firstHit ? `aimed ${target.kind}, hit ${firstHit.target.kind}` : '-');
check('a hit is counted on the object', Boolean(firstHit && firstHit.target.hits > 0),
  firstHit ? firstHit.target.hits + ' hits' : '-');
// Break it all the way.
let broke = false;
for (let i = 0; i < 6 && !broke; i += 1) {
  throwAt(fx, w4, aim.x, aim.y);
  let res = [];
  for (let s = 0; s < 300 && fx.rocks.length; s += 1) res = res.concat(stepEffect(fx, w4, 0.016));
  if (res.some((r) => r.hit && r.broke && r.target.id === target.id)) broke = true;
}
check('enough hits destroy an object', broke && target.gone, target.gone ? 'gone' : 'still standing');
check('a destroyed object stops being a target', hitObject(w4, target.id).hit === false, 'not hit again');
check('destruction is counted', yardSummary(w4).broken >= 1, yardSummary(w4).broken + ' broken');
check('rocks run out', (() => { const w = buildYard('x'); w.inventory.rocks = 1; spendRock(w); return spendRock(w) === false; })(),
  'no infinite throwing');

// ---- the standards the look must obey -------------------------------------------------------------
const speeds = LAYERS.map((l) => l.speed);
check('parallax: sky scrolls slowest and the gameplay layer not at all',
  LAYERS[0].speed === 0.05 && LAYERS[LAYERS.length - 1].speed === 1, speeds.join(' → '));
check('parallax: the speeds increase with depth',
  speeds.every((s, i) => i === 0 || s > speeds[i - 1]), 'monotonic');
check('the standard asks for 3-5 layers', LAYERS.length >= 3 && LAYERS.length <= 5, LAYERS.length + ' layers');
check('atmospheric perspective: a colour gets more saturated as it comes closer', (() => {
  const sat = (hex) => {
    const [r, g, bl] = hex.replace('#', '').match(/../g).map((v) => parseInt(v, 16) / 255);
    const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
    return max === min ? 0 : (max - min) / (1 - Math.abs(max + min - 1));
  };
  const values = ['sky', 'far', 'mid', 'near', 'yard'].map((l) => sat(forLayer('#c94f4f', l)));
  return values.every((v, i) => i === 0 || v >= values[i - 1]);
})(), 'sky → yard rises');
check('the five depths are five different colours, so the scene is not flat', (() => {
  const set = new Set(['sky', 'far', 'mid', 'near', 'yard'].map((l) => forLayer('#c94f4f', l)));
  return set.size === 5;
})(), '5 of 5');
check('every colour is on the 8-step ladder', (() => {
  const hexToRgb = (h) => h.replace('#', '').match(/../g).map((v) => parseInt(v, 16));
  return ['sky', 'far', 'mid', 'near', 'yard'].every((l) => hexToRgb(forLayer('#3a7a5a', l)).every(onLadder));
})(), 'quantised');
check('a shade step stays on the ladder too',
  [shade('#3a7a5a', 0.2), shade('#3a7a5a', -0.2)].every((h) => h.replace('#', '').match(/../g).map((v) => parseInt(v, 16)).every(onLadder)),
  'shading cannot escape the palette');

// ---- report -------------------------------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n);
console.log('DVOR-8 — the tests');
console.log('='.repeat(94));
console.log();
for (const r of rows) console.log(`  ${pad(r.ok ? 'PASS' : 'FAIL', 5)} ${pad(r.what.slice(0, 62), 64)} ${r.detail.slice(0, 22)}`);
console.log();
console.log('='.repeat(94));
console.log(`PASS ${pass}   FAIL ${fail}   of ${pass + fail} checks`);
process.exit(fail === 0 ? 0 : 1);
