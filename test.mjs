// DVOR-8 tests. Every claim in the README is checked here, and the tests assert BEHAVIOUR rather than the
// presence of code: a yard is playable if the scan recognises everything and a rock can break something.
//
// Usage:  node test.mjs

import { buildYard, yardSummary, WORLD_W, WORLD_H, GROUND } from './src/yard.js';
import { VIEW_H } from './src/render.js';
import { makeScan, startScan, stepScan, SCAN_MS } from './src/scan.js';
import { makeEffect, throwAt, stepEffect } from './src/throw.js';
import { KINDS, LAYERS, hitObject, spendRock } from './src/state.js';
import { forLayer, onLadder, shade } from './src/palette.js';
import { applyLabels } from './src/scan.js';
import { makeRecogniser, buildMessages, scanCost, laneAffords, parseLabels, MAX_ITEMS } from './src/recognise.js';
import { PROVIDERS } from './src/llm.js';

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
check('the world is as tall as the picture, and every object is VISIBLE: in the view, above the rail',
  WORLD_H === VIEW_H && a.objects.every((o) => o.y >= 0 && o.y + o.h <= GROUND),
  `lowest edge ${Math.max(...a.objects.map((o) => o.y + o.h))} of ${GROUND}`);
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

// ---- the routed recogniser: one bounded call, down the free-tier cascade ---------------------------
// The network is stubbed with the refusals the providers actually send. No provider is called from here.
const calls = [];
const sse = (text) => new Response(
  `data: ${JSON.stringify({ model: 'stub-model', choices: [{ delta: { content: text }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`,
  { status: 200 });
const refuse = (status, headers = {}) => new Response(JSON.stringify({ error: { message: `stub ${status}` } }), { status, headers });
const laneOf = (url) => Object.keys(PROVIDERS).find((id) => PROVIDERS[id].url === url);
const stub = (answer) => {
  calls.length = 0;
  globalThis.fetch = async (url, init) => {
    const lane = laneOf(url);
    const sent = JSON.parse(JSON.parse(init.body).messages[1].content).length;
    calls.push({ lane, sent });
    return answer(lane, sent, calls.length);
  };
};
const good = JSON.stringify({ items: [{ id: 'bin-1', label: 'ржавый бак' }, { id: 'bench-1', label: 'лавка у подъезда' }] });

const yard = () => buildYard('двор-1');
const full = buildMessages(yard().objects);
const cost = scanCost(full);
check('one scan request fits a third of EVERY lane\'s minute, the smallest included',
  Object.values(PROVIDERS).every((c) => laneAffords(c, cost)), `${cost} tok, groq ${PROVIDERS.groq.tokensPerMinute}/3`);

stub(() => { throw new Error('must not be called'); });
check('with no key there is no recogniser and no request', makeRecogniser({}) === null && calls.length === 0);

stub(() => sse(good));
let rw = yard();
let r = await makeRecogniser({ gemini: 'k'.repeat(30) }).recognise(rw);
check('one key, one scan, exactly ONE request', r.source === 'routed' && calls.length === 1, `${calls.length} call via ${r.lane}`);
const rs = makeScan(rw); startScan(rs, 0);
check('the source is local until labels are applied, then routed',
  rs.source === 'local' && applyLabels(rs, r.labels).length === 2 && rs.source === 'routed'
  && rw.objects.find((o) => o.id === 'bin-1').label === 'ржавый бак', rs.source);

stub((lane) => (lane === 'cerebras' ? refuse(429, { 'retry-after': '7' }) : sse(good)));
const two = makeRecogniser({ cerebras: 'c'.repeat(30), groq: 'g'.repeat(30) });
r = await two.recognise(yard());
check('a 429 cools the lane for as long as the provider says and the NEXT lane serves',
  r.source === 'routed' && r.lane === 'groq' && two.router.cooldownSeconds('cerebras') === 7,
  `${calls.map((c) => c.lane).join(' → ')}, cool ${two.router.cooldownSeconds('cerebras')}s`);
const limited = calls.filter((c) => c.lane === 'cerebras').length;
check('a 429 is not retried inside the scan', limited === 1, `${limited} request to the limited lane`);
calls.length = 0;
r = await two.recognise(yard());
check('the next scan waits the cooldown out: the cooled lane is not asked',
  r.lane === 'groq' && calls.length === 1 && calls[0].lane === 'groq', calls.map((c) => c.lane).join(','));

stub((lane, sent) => (sent > 16 ? refuse(413) : sse(good)));
r = await makeRecogniser({ groq: 'g'.repeat(30) }).recognise(yard());
check('a 413 is SPLIT, not retried at the same size',
  r.source === 'routed' && calls.length === 2 && calls[1].sent < calls[0].sent, calls.map((c) => c.sent).join(' → ') + ' objects');

stub((lane) => (lane === 'gemini' ? refuse(401) : sse(good)));
const auth = makeRecogniser({ gemini: 'bad'.repeat(10), mistral: 'm'.repeat(30) });
r = await auth.recognise(yard());
check('a rejected key is not a rate limit: no cooldown, the next lane serves',
  r.lane === 'mistral' && auth.router.cooldownSeconds('gemini') === 0, `gemini cool ${auth.router.cooldownSeconds('gemini')}s`);

stub(() => { throw new TypeError('network down'); });
rw = yard();
r = await makeRecogniser({ gemini: 'k'.repeat(30), groq: 'g'.repeat(30) }).recognise(rw);
const offline = makeScan(rw); startScan(offline, 0); stepScan(offline, SCAN_MS + 1, () => {});
check('with the network down the scan is local and the yard is still fully recognised',
  r.source === 'local' && calls.length === 2 && rw.objects.every((o) => o.scanned) && offline.source === 'local',
  `${calls.length} lanes tried, ${rw.scanned} recognised`);

const many = Array.from({ length: 12 }, (_, i) => ({ id: yard().objects[i].id, label: 'вещь' }));
const dirty = JSON.stringify({ items: [{ id: 'сосед-1', label: 'сосед' }, { id: 'bin-1', label: 'x'.repeat(60) },
  { id: 'bin-1', label: 'бак' }, { id: 'bin-1', label: 'ещё бак' }, ...many] });
const clean = parseLabels(dirty, yard().objects);
check('the answer is bounded and checked: known ids only, one label each, short, at most eight',
  clean.length === MAX_ITEMS && clean.every((l) => l.id !== 'сосед-1' && l.label.length <= 28)
  && new Set(clean.map((l) => l.id)).size === clean.length, `${clean.length} kept of 16`);
check('an answer that is not JSON names nothing', parseLabels('двор как двор', yard().objects).length === 0);

// ---- filters: a state of the viewer, expressed as a palette ---------------------------------------
const { FILTERS, setFilter, tint, saturationOf, lightnessOf } = await import('./src/palette.js');
const { viewEffect, viewToWorld, SWAY_MAX, makeCamera: mkCam } = await import('./src/render.js');
const SWATCH = ['#7aa8c9', '#a8783a', '#5a7a5a', '#3a8a3a', '#7a5a9a', '#8a5a3a'];
const DEPTHS = LAYERS.map((l) => l.id);
const mean = (xs) => xs.reduce((n, x) => n + x, 0) / xs.length;
const look = (id, t = 0) => { setFilter(id, t); const out = SWATCH.map(tint); setFilter('sober'); return out; };
const ladder = (id, t = 0) => {
  setFilter(id, t);
  const out = DEPTHS.flatMap((d) => SWATCH.map((c) => forLayer(c, d)));
  setFilter('sober');
  return out;
};
const soberLook = look('sober');
check('sober is the identity: the unfiltered yard is unchanged', soberLook.join() === SWATCH.join(), 'no remap');
check('under every filter every colour is still on the 8-step ladder',
  Object.keys(FILTERS).every((id) => ladder(id, 1.7).every((hex) => [1, 3, 5].every((i) => onLadder(parseInt(hex.slice(i, i + 2), 16))))),
  Object.keys(FILTERS).length + ' filters x 30 colours');
const sat = (id) => mean(look(id).map(saturationOf));
const lum = (id) => mean(look(id).map(lightnessOf));
const warmth = (id) => mean(look(id).map((h) => parseInt(h.slice(1, 3), 16) - parseInt(h.slice(5, 7), 16)));
check('depression: the yard is nearly colourless, and darker', sat('depression') < sat('sober') * 0.35 && lum('depression') < lum('sober'),
  `sat ${sat('sober').toFixed(2)} → ${sat('depression').toFixed(2)}`);
check('depression: what colour is left is cold', warmth('depression') < 0, `red-blue ${warmth('depression').toFixed(0)}`);
check('alcohol: warmer and less saturated than sober', warmth('alcohol') > warmth('sober') && sat('alcohol') < sat('sober'),
  `red-blue ${warmth('sober').toFixed(0)} → ${warmth('alcohol').toFixed(0)}`);
check('weed: more saturated than sober', sat('weed') > sat('sober'), `sat ${sat('sober').toFixed(2)} → ${sat('weed').toFixed(2)}`);
check('weed: the hue drifts with time, and comes back', look('weed', 0).join() !== look('weed', 2.6).join()
  && look('weed', 0).join() === look('weed', Math.PI / 0.6).join(), 'colour cycling');
check('only weed moves the palette over time', ['sober', 'alcohol', 'depression'].every((id) => look(id, 0).join() === look(id, 9).join()));
const depthSat = (id) => { setFilter(id); const out = DEPTHS.map((d) => saturationOf(forLayer('#5a7a5a', d))); setFilter('sober'); return out; };
const keepsDepth = Object.keys(FILTERS).filter((id) => depthSat(id).every((v, i, a) => i === 0 || v >= a[i - 1] - 1e-9));
check('atmospheric perspective survives the filters that keep colour', ['sober', 'weed', 'alcohol'].every((id) => keepsDepth.includes(id)),
  'holds for: ' + keepsDepth.join(' '));

const still = ['sober', 'depression'].every((id) => { const e = viewEffect(id, 3.3); return e.swayX === 0 && e.swayY === 0 && !e.ghost; });
check('sober and depression leave the view still', still);
let worst = 0; let ghosts = true;
for (let t = 0; t < 60; t += 0.05) { const e = viewEffect('alcohol', t); worst = Math.max(worst, Math.abs(e.swayX), Math.abs(e.swayY)); ghosts = ghosts && Boolean(e.ghost); }
check('alcohol sways, never by more than the stated maximum, and always sees double', worst > 0 && worst <= SWAY_MAX && ghosts, `max ${worst}px of ${SWAY_MAX}`);

// A filter is a look, never a rule: the same throw at the same thing ends the same way under each.
const outcome = (id) => {
  const w = buildYard('двор-1'); w.filter = id;
  const target = w.objects.find((o) => o.kind === 'bin');
  const cam = mkCam(WORLD_W); const fx = viewEffect(id, 7.1);
  // where the bin is DRAWN under this filter, then back through the one conversion
  const at = viewToWorld(target.x + target.w / 2 - cam.x + fx.swayX, target.y + target.h / 2 + fx.swayY, cam, fx);
  const e = makeEffect(); throwAt(e, w, at.x, at.y);
  let hit = null; for (let i = 0; i < 400 && !hit; i += 1) { const hs = stepEffect(e, w, 0.016, () => {}); if (hs.length) hit = hs[0]; }
  return `${hit?.target?.id}:${w.inventory.rocks}:${w.objects.find((o) => o.id === target.id).hits}`;
};
const outcomes = Object.keys(FILTERS).map(outcome);
check('a throw at what the player SEES hits it under every filter, sway included',
  outcomes.every((o) => o === outcomes[0]) && outcomes[0].startsWith('bin-'), outcomes[0]);

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
