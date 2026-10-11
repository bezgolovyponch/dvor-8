// DVOR-8 tests. They assert BEHAVIOUR: that any photograph becomes a playable yard, that a tap hits what
// was under it, that every interaction is answered, and that the look obeys its own rules.
//
// What they cannot assert is that any of it is FUN. The "answered fast, answered always" checks below are
// the measurable part of that; the rest needs a person with a phone. See docs/concept.md.
//
// Usage:  node test.mjs

import { paletteFor, FILTERS, TONES, COOL, WARM, OUTLINE, VOID, SIZE, luma, toHsl } from './src/palette.js';
import { stylise } from './src/stylise.js';
import { segment, MIN_OBJECTS, MAX_OBJECTS } from './src/segment.js';
import { demoPhoto } from './src/demo.js';
import { makeWorld, pick, strike, tick, left, COMBO_WINDOW, DEBRIS_MAX } from './src/world.js';
import { makeFx, throwRock, impact, burst, stepFx, shakeOffset, ROCK_TIME, HIT_PAUSE, BREAK_PAUSE, SHAKE_MAX, RUBBLE_MAX } from './src/fx.js';
import { viewMotion, clientToWorld, worldToClient, LONG, SHORT, SCAN_TIME } from './src/view.js';
import { mulberry32 } from './src/rng.js';
import { makeRecogniser, buildMessages, scanCost, laneAffords, parseLabels, MAX_ITEMS, VISION } from './src/recognise.js';
import { PROVIDERS } from './src/llm.js';

let pass = 0, fail = 0;
const rows = [];
const section = (name) => rows.push({ name });
const check = (what, ok, detail = '') => { rows.push({ what, ok: Boolean(ok), detail: String(detail) }); if (ok) pass += 1; else fail += 1; };
const W = SHORT, H = LONG, N = W * H;
const yardFrom = (rgba, w = W, h = H) => { const st = stylise(rgba, w, h); return { st, seg: segment(st, w, h) }; };
const worldFrom = (rgba) => { const y = yardFrom(rgba); return makeWorld({ w: W, h: H, photo: rgba, st: y.st, seg: y.seg, seed: 8 }); };
const flat = () => new Uint8ClampedArray(N * 4).fill(128);
const noisy = () => { const r = mulberry32(3); return Uint8ClampedArray.from({ length: N * 4 }, () => r() * 255); };
const dark = () => { const r = mulberry32(5); return Uint8ClampedArray.from({ length: N * 4 }, () => r() * 22); };
const PHOTOS = { demo: demoPhoto(W, H, 8), flat: flat(), noise: noisy(), night: dark() };

// ---- the look --------------------------------------------------------------------------------------
section('the look');
const sober = paletteFor('sober');
check('the palette is 18 entries: two ramps of eight, an outline, a void', sober.length === SIZE && SIZE === 2 * TONES + 2);
const rises = (pal, from) => Array.from({ length: TONES - 1 }, (_, i) => luma(pal[from + i + 1]) > luma(pal[from + i])).every(Boolean);
check('both ramps run dark to light, so brightness in the photo is brightness in the picture', rises(sober, COOL) && rises(sober, WARM));
check('high contrast: the lightest tone is at least 8x the darkest', luma(sober[COOL + 7]) / luma(sober[COOL]) > 8 && luma(sober[WARM + 7]) / luma(sober[WARM]) > 8,
  `${(luma(sober[COOL + 7]) / luma(sober[COOL])).toFixed(0)}x cool, ${(luma(sober[WARM + 7]) / luma(sober[WARM])).toFixed(0)}x warm`);
const mid = (pal, from) => toHsl(pal[from + 3]);
check('the two ramps are two different hues: a warm thing and a cool thing stay different', Math.abs(mid(sober, COOL)[0] - mid(sober, WARM)[0]) > 0.2);
check('the middle of both ramps is saturated: neon, not pastel', mid(sober, COOL)[1] > 0.7 && mid(sober, WARM)[1] > 0.7,
  `cool ${mid(sober, COOL)[1].toFixed(2)}, warm ${mid(sober, WARM)[1].toFixed(2)}`);
check('the outline and the void are darker than every tone', [OUTLINE, VOID].every((k) => luma(sober[k]) < luma(sober[COOL]) && luma(sober[k]) < luma(sober[WARM])));

// ---- filters ---------------------------------------------------------------------------------------
section('filters');
const sat = (pal) => pal.slice(0, 16).reduce((n, c) => n + toHsl(c)[1], 0) / 16;
const lum = (pal) => pal.slice(0, 16).reduce((n, c) => n + luma(c), 0) / 16;
const heat = (pal) => pal.slice(0, 16).reduce((n, c) => n + c[0] - c[2], 0) / 16;
const P = (id, t = 0) => paletteFor(id, t);
check('every filter is a full table', Object.keys(FILTERS).every((id) => P(id, 1.7).length === SIZE && P(id, 1.7).every((c) => c.every((v) => Number.isInteger(v) && v >= 0 && v <= 255))));
check('under every filter the ramps still run dark to light: the yard stays readable',
  Object.keys(FILTERS).every((id) => [0, 2.6, 7].every((t) => rises(P(id, t), COOL) && rises(P(id, t), WARM))), Object.keys(FILTERS).join(' '));
check('depression: nearly colourless, darker, cold', sat(P('depression')) < sat(sober) * 0.35 && lum(P('depression')) < lum(sober) && heat(P('depression')) < 0,
  `sat ${sat(sober).toFixed(2)} → ${sat(P('depression')).toFixed(2)}`);
check('alcohol: warmer and less saturated', heat(P('alcohol')) > heat(sober) && sat(P('alcohol')) < sat(sober), `red-blue ${heat(sober).toFixed(0)} → ${heat(P('alcohol')).toFixed(0)}`);
check('weed: the whole wheel is turned, and keeps turning', toHsl(P('weed')[WARM + 3])[0] !== toHsl(sober[WARM + 3])[0]
  && P('weed', 0).join() !== P('weed', 2.6).join() && P('weed', 0).join() === P('weed', Math.PI / 0.6).join(), 'colour cycling');
check('only weed moves the palette over time', ['sober', 'alcohol', 'depression'].every((id) => P(id, 0).join() === P(id, 9).join()));
check('a filter changes the table and nothing else: the picture\'s indices are untouched',
  (() => { const w = worldFrom(PHOTOS.demo); const before = w.idx.join(); for (const id of Object.keys(FILTERS)) paletteFor(id, 3); return w.idx.join() === before; })());

// ---- the photograph becomes a picture ---------------------------------------------------------------
section('photograph → picture');
const demo = yardFrom(PHOTOS.demo);
check('every pixel of the picture is a palette index', demo.st.idx.every((v) => v < SIZE) && demo.st.idx.length === N);
check('the same photograph gives the same picture', stylise(PHOTOS.demo, W, H).idx.join() === demo.st.idx.join(), 'deterministic');
const used = new Set(demo.st.idx);
check('a daylight yard uses both ramps and has outlines', [...used].some((v) => v < 8) && [...used].some((v) => v >= 8 && v < 16) && used.has(OUTLINE), `${used.size} of ${SIZE} indices used`);
const nightUsed = new Set(stylise(PHOTOS.night, W, H).idx);
check('a dark photograph is stretched, not left black', Math.max(...[...nightUsed].filter((v) => v < 16).map((v) => v % 8)) >= 5, `brightest tone ${Math.max(...[...nightUsed].filter((v) => v < 16).map((v) => v % 8))} of 7`);
check('a landscape photograph works as well as a portrait one', (() => { const y = yardFrom(demoPhoto(LONG, SHORT, 8), LONG, SHORT); return y.seg.regions.length >= MIN_OBJECTS; })());

// ---- the things in it -------------------------------------------------------------------------------
section('finding things');
for (const [name, rgba] of Object.entries(PHOTOS)) {
  const { seg } = yardFrom(rgba);
  const n = seg.regions.length;
  const inside = seg.regions.every((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H && r.area > 0);
  const owned = seg.regions.every((r) => r.pixels.every((p) => seg.owner[p] === r.id));
  check(`${name}: between ${MIN_OBJECTS} and ${MAX_OBJECTS} things, all in the picture, none overlapping`, n >= MIN_OBJECTS && n <= MAX_OBJECTS && inside && owned, `${n} things`);
}
check('the same photograph gives the same things', JSON.stringify(yardFrom(PHOTOS.demo).seg.regions.map((r) => [r.x, r.y, r.area])) === JSON.stringify(demo.seg.regions.map((r) => [r.x, r.y, r.area])));
check('things are numbered top to bottom, the way the scan meets them', demo.seg.regions.every((r, i, a) => i === 0 || r.cy >= a[i - 1].cy));
check('a bigger thing takes more hits', (() => { const rs = [...demo.seg.regions].sort((a, b) => a.area - b.area); return rs[0].hp <= rs[rs.length - 1].hp && rs.every((r) => r.hp >= 1 && r.hp <= 3); })(),
  demo.seg.regions.map((r) => r.hp).join(''));

// ---- hitting ----------------------------------------------------------------------------------------
section('hitting');
let w = worldFrom(PHOTOS.demo);
check('a tap on a thing picks THAT thing', w.regions.every((r) => { const p = r.pixels[r.pixels.length >> 1]; return pick(w, p % W, (p / W) | 0) === r; }), `${w.regions.length} of ${w.regions.length}`);
const corner = (() => { for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) { let far = true; for (const r of w.regions) if (x > r.x - 12 && x < r.x + r.w + 12 && y > r.y - 12 && y < r.y + r.h + 12) far = false; if (far) return [x, y]; } return null; })();
check('a tap on nothing picks nothing', corner && pick(w, corner[0], corner[1]) === null, corner ? `at ${corner}` : 'no empty spot');
const edge = w.regions[0];
check('a near miss still counts: a finger is not a pixel', pick(w, edge.x - 3, edge.cy) === edge || pick(w, edge.cx, edge.y - 3) === edge);
const big = w.regions.find((r) => r.hp > 1) || w.regions[0];
const before = w.idx.join();
let res = strike(w, big, big.cx, big.cy);
check('a first hit on a tough thing cracks it: the picture changes, the thing stands', big.hp > 1 ? (res.kind === 'crack' && !big.gone && w.idx.join() !== before) : res.kind === 'break', res.kind);
while (!big.gone) res = strike(w, big, big.cx, big.cy);
check('enough hits break it: every pixel of it becomes the void', res.kind === 'break' && big.pixels.every((p) => w.idx[p] === VOID || w.idx[p] === OUTLINE) && left(w) === w.regions.length - 1);
check('a broken thing throws pieces, but never more than the cap', res.debris.length > 0 && res.debris.length <= DEBRIS_MAX + 1, `${res.debris.length} pieces`);
check('a broken thing cannot be picked or hit again', pick(w, big.cx, big.cy) !== big && strike(w, big, big.cx, big.cy) === null);
w = worldFrom(PHOTOS.demo);
const a1 = strike(w, w.regions[0], w.regions[0].cx, w.regions[0].cy);
const a2 = strike(w, w.regions[1], w.regions[1].cx, w.regions[1].cy);
check('hits in quick succession build a combo, and a combo multiplies the points', a1.combo === 1 && a2.combo === 2 && w.maxCombo === 2, `x${a1.combo} → x${a2.combo}`);
tick(w, COMBO_WINDOW + 0.01);
check('a combo runs out on its own; nothing is taken away when it does', w.combo === 0 && w.score === a1.points + a2.points, `score kept: ${w.score}`);
w = worldFrom(PHOTOS.demo);
for (const r of w.regions) while (!r.gone) strike(w, r, r.cx, r.cy);
check('breaking everything ends the yard', w.done && left(w) === 0 && w.score > 0, `score ${w.score}`);
const again = worldFrom(PHOTOS.demo);
check('«ещё раз» is a clean yard: same things, nothing broken, no score', again.regions.length === w.regions.length && again.regions.every((r) => !r.gone && r.hits === 0) && again.score === 0);

// ---- feel -------------------------------------------------------------------------------------------
section('feel: answered fast, answered always');
check('the opening scan takes under two seconds', SCAN_TIME < 2, `${SCAN_TIME} s`);
check('from tap to impact is under 150 ms', ROCK_TIME <= 0.15, `${ROCK_TIME * 1000} ms`);
w = worldFrom(PHOTOS.demo);
let fx = makeFx();
throwRock(fx, w, 40, 40, null);
check('a tap is answered in the same frame, before the rock lands', fx.rings.length === 1 && fx.rocks.length === 1);
let landed = 0, steps = 0;
while (fx.rocks.length && steps < 100) { landed += stepFx(fx, w, 1 / 60).length; steps += 1; }
check('the rock lands once, on time', landed === 1 && steps <= Math.ceil(ROCK_TIME * 60) + 1, `${steps} frames`);
const target = w.regions.find((r) => r.hp === 1) || w.regions[0];
while (!target.gone) res = strike(w, target, target.cx, target.cy);
impact(fx, 'break');
burst(fx, res.debris, target.cx, target.cy, mulberry32(1), 150);
const frozenAt = fx.particles.map((p) => p.x + p.y).join();
stepFx(fx, w, BREAK_PAUSE / 2);
check('a break stops the game for an instant: nothing moves during the pause', fx.particles.map((p) => p.x + p.y).join() === frozenAt && fx.freeze > 0, `${BREAK_PAUSE * 1000} ms, a hit ${HIT_PAUSE * 1000} ms`);
check('a break kicks the picture, within the stated maximum', (() => { stepFx(fx, w, BREAK_PAUSE); const o = shakeOffset(fx); return fx.shake > 0 && Math.abs(o.x) <= SHAKE_MAX && Math.abs(o.y) <= SHAKE_MAX; })());
for (let i = 0; i < 300; i += 1) stepFx(fx, w, 1 / 60);
check('the kick dies away and the pieces all come to rest', fx.shake === 0 && fx.particles.length === 0 && fx.flash === 0);
const rubble = w.rubble.filter((v) => v !== 255).length;
check('what falls STAYS: the rubble is still there afterwards', rubble > 0, `${rubble} pixels of rubble`);
check('rubble never piles past its cap', Math.max(...w.heights) <= RUBBLE_MAX, `highest ${Math.max(...w.heights)} of ${RUBBLE_MAX}`);
for (let i = 0; i < 6; i += 1) impact(fx, 'break');
check('many breaks at once do not shake the picture off the screen', fx.shake <= SHAKE_MAX);
fx = makeFx(); impact(fx, 'break', true);
check('with reduced motion asked for, nothing shakes and nothing tilts', fx.shake === 0 && viewMotion('alcohol', 3, true).angle === 0);

// ---- the view ---------------------------------------------------------------------------------------
section('the view');
const rect = { left: 30, top: 80, width: 300, height: 400 };
let worst = 0;
for (const id of Object.keys(FILTERS)) {
  for (let t = 0; t < 20; t += 0.37) {
    const m = viewMotion(id, t);
    const shift = { x: m.x + 3, y: m.y - 2 };
    for (const [x, y] of [[10, 12], [72, 96], [140, 188]]) {
      const c = worldToClient(x, y, rect, m.angle, shift, W, H);
      const back = clientToWorld(c.x, c.y, rect, m.angle, shift, W, H);
      worst = Math.max(worst, Math.abs(back.x - x), Math.abs(back.y - y));
    }
  }
}
check('a tap lands on the pixel that was DRAWN under the finger, whatever the tilt, sway and shake', worst < 1e-6, `worst error ${worst.toExponential(1)} px`);
check('the frame always leans a little; depression holds it still', viewMotion('sober', 1).angle !== 0 && viewMotion('depression', 1).angle === 0 && !viewMotion('depression', 1).ghost);
check('alcohol leans furthest and sees double', Math.abs(viewMotion('alcohol', 1.7).angle) > Math.abs(viewMotion('sober', 1.7).angle) && viewMotion('alcohol', 1.7).ghost);
const outcomes = Object.keys(FILTERS).map((id) => {
  const ww = worldFrom(PHOTOS.demo), m = viewMotion(id, 7.1), shift = { x: m.x, y: m.y }, t = ww.regions[2];
  const c = worldToClient(t.cx, t.cy, rect, m.angle, shift, W, H);
  const at = clientToWorld(c.x, c.y, rect, m.angle, shift, W, H);
  const r = strike(ww, pick(ww, at.x, at.y), at.x, at.y);
  return `${r.region.id}:${r.kind}:${r.points}`;
});
check('a filter is a look, never a rule: the same tap ends the same way under each', outcomes.every((o) => o === outcomes[0]), outcomes[0]);

// ---- naming, routed ---------------------------------------------------------------------------------
section('naming the things: one bounded call, down the free-tier cascade (network stubbed)');
const calls = [];
const sse = (text) => new Response(`data: ${JSON.stringify({ model: 'stub-model', choices: [{ delta: { content: text }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`, { status: 200 });
const refuse = (status, headers = {}) => new Response(JSON.stringify({ error: { message: `stub ${status}` } }), { status, headers });
const laneOf = (url) => Object.keys(PROVIDERS).find((id) => PROVIDERS[id].url === url);
const stub = (answer) => {
  calls.length = 0;
  globalThis.fetch = async (url, init) => {
    const user = JSON.parse(init.body).messages[1].content;
    const call = { lane: laneOf(url), sent: JSON.parse(user[0].text).length, image: user[1]?.image_url?.url };
    calls.push(call);
    return answer(call.lane, call.sent);
  };
};
const IMG = 'data:image/jpeg;base64,AAAA';
const good = JSON.stringify({ items: [{ id: 0, label: 'окно' }, { id: '1', label: 'мусорный бак' }] });
const key = (c) => c.repeat(30);
w = worldFrom(PHOTOS.demo);
const cost = scanCost(buildMessages(w, w.regions, IMG));
check('one request fits a third of the minute on every lane that can see', VISION.every((id) => laneAffords(PROVIDERS[id], cost)), `${cost} tokens`);
stub(() => { throw new Error('must not be called'); });
check('with no key there is no recogniser and no request: the photograph stays on the device', makeRecogniser({}) === null && calls.length === 0);
let r = await makeRecogniser({ groq: key('g'), cerebras: key('c') }).recognise(w, IMG);
check('a lane that cannot see is never sent the photograph', r.source === 'local' && calls.length === 0, r.why);
stub(() => sse(good));
r = await makeRecogniser({ gemini: key('k') }).recognise(w, IMG);
check('one key, one yard, exactly ONE request, and it carries the photograph', r.source === 'routed' && calls.length === 1 && calls[0].image === IMG, `${calls.length} call via ${r.lane}`);
check('ids sent back as text are still matched', r.labels.length === 2 && r.labels[1].id === 1);
stub((lane) => (lane === 'gemini' ? refuse(429, { 'retry-after': '7' }) : sse(good)));
const two = makeRecogniser({ gemini: key('k'), mistral: key('m') });
r = await two.recognise(w, IMG);
check('a 429 cools the lane for as long as the provider says and the NEXT lane serves', r.lane === 'mistral' && two.router.cooldownSeconds('gemini') === 7, calls.map((c) => c.lane).join(' → '));
calls.length = 0;
r = await two.recognise(w, IMG);
check('the next yard waits the cooldown out: the cooled lane is not asked', calls.length === 1 && calls[0].lane === 'mistral');
stub((lane, sent) => (sent > 4 ? refuse(413) : sse(good)));
r = await makeRecogniser({ gemini: key('k') }).recognise(w, IMG);
check('a 413 is SPLIT, not retried at the same size', calls.length >= 2 && calls.every((c, i) => i === 0 || c.sent < calls[i - 1].sent), calls.map((c) => c.sent).join(' → ') + ' boxes');
stub((lane) => (lane === 'gemini' ? refuse(401) : sse(good)));
const auth = makeRecogniser({ gemini: key('x'), mistral: key('m') });
r = await auth.recognise(w, IMG);
check('a rejected key is not a rate limit: no cooldown, the next lane serves', r.lane === 'mistral' && auth.router.cooldownSeconds('gemini') === 0);
stub(() => { throw new TypeError('network down'); });
r = await makeRecogniser({ gemini: key('k'), mistral: key('m') }).recognise(w, IMG);
check('with the network down nothing is named and the yard is exactly as playable', r.source === 'local' && w.regions.every((o) => !o.gone) && pick(w, w.regions[0].cx, w.regions[0].cy));
const dirty = JSON.stringify({ items: [{ id: 99, label: 'сосед' }, { id: 0, label: 'x'.repeat(60) }, { id: 0, label: 'бак' }, { id: 0, label: 'ещё бак' },
  ...w.regions.map((o) => ({ id: o.id, label: 'вещь' })), ...w.regions.map((o) => ({ id: o.id, label: 'вещь' }))] });
const clean = parseLabels(dirty, w.regions);
check('the answer is bounded and checked: known ids only, one name each, short, at most eight',
  clean.length <= MAX_ITEMS && clean.length >= Math.min(MAX_ITEMS, w.regions.length) - 1 && clean.every((l) => l.id !== 99 && l.label.length <= 28) && new Set(clean.map((l) => l.id)).size === clean.length, `${clean.length} kept`);
check('an answer that is not JSON names nothing', parseLabels('двор как двор', w.regions).length === 0);

// ---- report -----------------------------------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n);
console.log('DVOR-8 — the tests');
for (const r of rows) {
  if (r.name) { console.log(`\n  ${r.name}`); continue; }
  console.log(`    ${pad(r.ok ? 'PASS' : 'FAIL', 5)} ${pad(r.what.slice(0, 86), 88)} ${r.detail.slice(0, 30)}`);
}
console.log(`\nPASS ${pass}   FAIL ${fail}   of ${pass + fail} checks`);
process.exit(fail === 0 ? 0 : 1);
