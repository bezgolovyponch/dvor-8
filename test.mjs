// DVOR-8 tests. They assert BEHAVIOUR: that the yard stays the yard, that real things become targets and
// people never do, that a tap hits what was under it, that every mode plays differently and says why,
// and that every interaction is answered.
//
// Two things are NOT here. The detector itself needs a browser: `node --experimental-websocket
// tools/check.mjs` runs it on real photographs. And whether any of it is fun needs a person.
//
// Usage:  node test.mjs

import { buildPalette, grade, lookThrough, scorchMap, nearest, luma, toHsl, LOOKS, COLOURS, OUTLINE, VOID, SIZE } from './src/palette.js';
import { stylise } from './src/stylise.js';
import { TARGETS, tilesFor, merge, toRegions, MAX_TARGETS, MIN_SCORE } from './src/objects.js';
import { demoYard } from './src/demo.js';
import { makeWorld, pick, strike, tick, left, DEBRIS_MAX } from './src/world.js';
import { makeFx, throwThing, impact, burst, stepFx, shakeOffset, HIT_PAUSE, BREAK_PAUSE, SHAKE_MAX } from './src/fx.js';
import { MODES, aimWith, splashTargets, chainNext, inFocus } from './src/modes.js';
import { viewMotion, clientToWorld, worldToClient, LONG, SHORT, SCAN_TIME } from './src/view.js';
import { mulberry32 } from './src/rng.js';
import { readFileSync, readdirSync } from 'node:fs';

let pass = 0, fail = 0;
const rows = [];
const section = (name) => rows.push({ name });
const check = (what, ok, detail = '') => { rows.push({ what, ok: Boolean(ok), detail: String(detail) }); if (ok) pass += 1; else fail += 1; };
const W = SHORT, H = LONG, N = W * H;
const DEMO = demoYard(W, H, 8);
const yard = () => { const st = stylise(DEMO.rgba, W, H); const seg = toRegions(DEMO.dets, DEMO.rgba, W, H); return makeWorld({ w: W, h: H, photo: DEMO.rgba, idx: st.idx, palette: st.palette, ...seg, seed: 8 }); };
const byKind = (w, kind, n = 0) => w.regions.filter((r) => r.kind === kind)[n];

// ---- the yard stays the yard -------------------------------------------------------------------------
section('the picture: the yard stays the yard');
const st = stylise(DEMO.rgba, W, H);
check('the picture is the size of an 8-bit console screen', W === 192 && H === 256, `${W} x ${H}`);
check('the palette is made from the photograph: 28 colours, an outline, a void', st.palette.length === SIZE && SIZE === COLOURS + 2);
check('every pixel is a palette index', st.idx.length === N && st.idx.every((v) => v < COLOURS));
check('the same photograph gives the same picture', stylise(DEMO.rgba, W, H).idx.join() === st.idx.join(), 'deterministic');
const at = (x, y) => st.palette[st.idx[Math.round((y / 192) * H) * W + Math.round((x / 144) * W)]];
const red = at(30, 134), blue = at(100, 150), green = at(124, 94), sky = at(70, 10);
check('a red car is red in the picture', red[0] > red[1] * 1.6 && red[0] > red[2] * 1.3, `rgb ${red}`);
check('a blue car is blue', blue[2] > blue[0] * 1.4 && blue[2] > blue[1] * 1.1, `rgb ${blue}`);
check('a green tree is green', green[1] > green[0] * 1.2 && green[1] > green[2] * 1.2, `rgb ${green}`);
check('the sky is light and bluish, not white-hot', sky[2] >= sky[0] && luma(sky) > 0.5, `rgb ${sky}`);
check('detail survives: most of the palette is in use', new Set(st.idx).size >= 22, `${new Set(st.idx).size} of ${COLOURS} colours used`);
const tones = st.palette.slice(0, COLOURS).map(luma);
check('the look: deep shadows and bright lights, with the shadows pulled toward purple',
  Math.min(...tones) < 0.16 && Math.max(...tones) > 0.8 && (() => { const d = st.palette[0]; return d[2] > d[1]; })(), `darkest rgb ${st.palette[0]}`);
const dull = grade(120, 110, 100), g0 = toHsl([120, 110, 100]);
check('the grade adds colour: a dull pixel comes out more saturated', toHsl(dull)[1] > g0[1], `${g0[1].toFixed(2)} → ${toHsl(dull)[1].toFixed(2)}`);
const flat = stylise(new Uint8ClampedArray(N * 4).fill(128), W, H);
check('a blank photograph does not crash the palette', flat.palette.length === SIZE && flat.idx.every((v) => v < COLOURS));

// ---- real things -----------------------------------------------------------------------------------
section('real things become targets');
const D = (label, score, x, y, w, h) => ({ label, score, x, y, w, h });
check('people and animals are never targets', ['person', 'dog', 'cat', 'bird', 'horse'].every((k) => !TARGETS[k]) && merge([D('person', 0.99, 0.1, 0.1, 0.2, 0.4), D('dog', 0.9, 0.5, 0.5, 0.1, 0.1)]).length === 0);
check('a car, a bench, a bicycle are', ['car', 'bench', 'bicycle', 'truck'].every((k) => TARGETS[k]?.ru && TARGETS[k].hp >= 1));
check('a guess is not a target', merge([D('car', MIN_SCORE - 0.05, 0.1, 0.1, 0.2, 0.2)]).length === 0, `below ${MIN_SCORE}`);
check('a thing too small for a finger is not a target', merge([D('car', 0.9, 0.1, 0.1, 0.01, 0.01)]).length === 0);
const twice = merge([D('car', 0.7, 0.2, 0.2, 0.2, 0.15), D('car', 0.8, 0.22, 0.21, 0.12, 0.14), D('car', 0.6, 0.7, 0.7, 0.15, 0.1)]);
check('one car seen in two slices is one car, and the whole box is kept, not the cut-off one', twice.length === 2 && twice.some((d) => d.w === 0.2), `${twice.length} cars`);
check('never more targets than a thumb can clear', merge(Array.from({ length: 40 }, (_, i) => D('car', 0.9, (i % 8) * 0.12, Math.floor(i / 8) * 0.18, 0.08, 0.1))).length === MAX_TARGETS);
const tiles = tilesFor(1600, 1200);
const covered = (x, y) => tiles.some((t) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h && t.w < 1600);
check('the photograph is searched whole and in overlapping slices that cover all of it', tiles.length === 14 && tiles[0].w === 1600 && covered(0, 0) && covered(1599, 1199) && covered(800, 600)
  && tiles.every((t) => t.x >= 0 && t.y >= 0 && t.x + t.w <= 1600 && t.y + t.h <= 1200), `${tiles.length} slices`);
const seg = toRegions(DEMO.dets, DEMO.rgba, W, H);
check('every found thing becomes a target with a name, a place and pixels of its own', seg.regions.length === DEMO.dets.length && seg.regions.every((r) => r.label && r.area > 12 && r.pixels.every((p) => seg.owner[p] === r.id)),
  seg.regions.map((r) => r.label).join(', '));
const car = seg.regions.find((r) => r.kind === 'car');
const carRed = [...car.pixels].filter((p) => DEMO.rgba[p * 4] > 140 && DEMO.rgba[p * 4 + 2] < 110).length;
check('a target\'s pixels are the thing, not the asphalt in its box', car.area < car.w * car.h && carRed / car.area > 0.45, `${Math.round((car.area / (car.w * car.h)) * 100)}% of its box`);
check('a box with no contrast still becomes a target where the box is', toRegions([D('car', 0.9, 0.3, 0.3, 0.2, 0.2)], new Uint8ClampedArray(N * 4).fill(128), W, H).regions.length === 1);
check('a tougher thing takes more hits', TARGETS.car.hp > TARGETS['potted plant'].hp);

// ---- hitting -----------------------------------------------------------------------------------------
section('hitting');
let w = yard();
check('a tap on a thing picks THAT thing', w.regions.every((r) => { const p = r.pixels[r.pixels.length >> 1]; return pick(w, p % W, (p / W) | 0) === r; }), `${w.regions.length} of ${w.regions.length}`);
check('a tap on nothing picks nothing', pick(w, 10, 10) === null);
const bench = byKind(w, 'bench');
check('a near miss still counts: a finger is not a pixel', pick(w, bench.x - 4, bench.cy) === bench);
check('each thing has a dark line round it, like a sprite', w.regions.every((r) => [...r.pixels].some((p) => w.idx[p] === OUTLINE)));
const c1 = byKind(w, 'car');
const before = w.idx.join();
let res = strike(w, c1, c1.cx, c1.cy);
check('a first hit on a car dents and cracks it: the picture changes, the car stands', res.kind === 'crack' && !c1.gone && w.idx.join() !== before);
while (!c1.gone) res = strike(w, c1, c1.cx, c1.cy);
const wreck = [...c1.pixels].map((p) => w.palette[w.idx[p]]);
check('enough hits wreck it: what is left is dark, but it is still where the car was', res.kind === 'break' && c1.hits === 3
  && wreck.reduce((n, c) => n + luma(c), 0) / wreck.length < 0.2 && [...c1.pixels].some((p) => w.idx[p] === VOID), `mean brightness ${(wreck.reduce((n, c) => n + luma(c), 0) / wreck.length).toFixed(2)}`);
check('a wrecked thing throws pieces, but never more than the cap', res.debris.length > 0 && res.debris.length <= DEBRIS_MAX + 1, `${res.debris.length} pieces`);
check('a wrecked thing cannot be picked or hit again', pick(w, c1.cx, c1.cy) !== c1 && strike(w, c1, c1.cx, c1.cy) === null);
w = yard();
const a1 = strike(w, w.regions[0], w.regions[0].cx, w.regions[0].cy), a2 = strike(w, w.regions[1], w.regions[1].cx, w.regions[1].cy);
check('hits in quick succession build a combo, and a combo multiplies the points', a1.combo === 1 && a2.combo === 2, `x${a1.combo} → x${a2.combo}`);
tick(w, 2.51);
check('a combo runs out on its own; nothing is taken away when it does', w.combo === 0 && w.score === a1.points + a2.points, `score kept: ${w.score}`);
w = yard();
for (const r of w.regions) while (!r.gone) strike(w, r, r.cx, r.cy);
check('wrecking everything ends the yard', w.done && left(w) === 0 && w.score > 0, `score ${w.score}`);
check('«ещё раз» is a clean yard: same things, nothing broken, no score', (() => { const n = yard(); return n.regions.length === w.regions.length && n.regions.every((r) => !r.gone && r.hits === 0) && n.score === 0; })());

// ---- modes -------------------------------------------------------------------------------------------
section('modes: every filter is a different way to play, and says why');
const ids = Object.keys(MODES);
check('every mode has a look to go with it', ids.every((id) => LOOKS[id]) && Object.keys(LOOKS).every((id) => MODES[id]));
check('every mode says what is in the hand, how to use it, and why it exists', ids.every((id) => MODES[id].thing && MODES[id].hint && MODES[id].why.length > 40));
check('no two modes put the same thing in the hand', new Set(ids.map((id) => MODES[id].thing)).size === ids.length, ids.map((id) => MODES[id].thing).join(', '));
const sig = (m) => [m.flight, m.damage, m.scatter, m.splash, m.chain, m.cooldown].join();
check('every mode but sober changes BOTH the throw and the focus', ids.filter((id) => id !== 'sober').every((id) => sig(MODES[id]) !== sig(MODES.sober) && MODES[id].focus) && MODES.sober.focus === null);
const R = () => mulberry32(4);
check('sober: the throw lands exactly where it was aimed', (() => { const a = aimWith(MODES.sober, 50, 60, R()); return a.x === 50 && a.y === 60; })());
const strays = (() => { const r = R(); return Array.from({ length: 200 }, () => { const a = aimWith(MODES.alcohol, 50, 60, r); return Math.hypot(a.x - 50, a.y - 60); }); })();
check('alcohol: the hand strays, but never further than the stated scatter', Math.max(...strays) <= MODES.alcohol.scatter && Math.max(...strays) > 3, `up to ${Math.max(...strays).toFixed(1)} of ${MODES.alcohol.scatter} px`);
w = yard();
const plant = byKind(w, 'potted plant'), chair = byKind(w, 'chair');
const mx = (plant.cx + chair.cx) / 2, my = (plant.cy + chair.cy) / 2;
check('alcohol: a bottle bursts over everything near where it lands', splashTargets(w, mx, my, MODES.alcohol.splash).length >= 2 && splashTargets(w, 5, 5, MODES.alcohol.splash).length === 0,
  splashTargets(w, mx, my, MODES.alcohol.splash).map((r) => r.label).join(' + '));
const hop = chainNext(w, plant, new Set([plant.id]));
check('weed: the slipper skips on to the nearest standing thing it has not touched', hop && hop !== plant && !chainNext(w, plant, new Set(w.regions.map((r) => r.id))), hop ? `${plant.label} → ${hop.label}` : 'nothing in reach');
check('weed: a combo forgives a pause twice as long', MODES.weed.combo >= MODES.sober.combo * 2 && (() => { strike(w, plant, plant.cx, plant.cy, { combo: MODES.weed.combo }); tick(w, 4); return w.combo === 1; })());
w = yard();
const cc = byKind(w, 'car');
check('depression: a brick wrecks a car in one throw', strike(w, cc, cc.cx, cc.cy, { damage: MODES.depression.damage }).kind === 'break');
check('depression: only what is near where you look can be seen', inFocus(MODES.depression, w, cc, cc.cx, cc.cy) && !inFocus(MODES.depression, w, cc, cc.cx + 120, cc.cy) && inFocus(MODES.sober, w, cc, 0, 0));
check('alcohol: nothing at all is in focus', MODES.alcohol.focus.radius === 0 && MODES.alcohol.focus.out === 'soft');
let fx = makeFx(w);
throwThing(fx, w, MODES.depression, 'depression', 40, 40, null);
check('depression: the brick is heavy — the hand is not free again at once', fx.cool === MODES.depression.cooldown && (() => { for (let i = 0; i < 60; i += 1) stepFx(fx, w, 1 / 60); return fx.cool === 0; })(), `${MODES.depression.cooldown} s`);
check('nothing in any mode takes anything away from the player', ids.every((id) => MODES[id].damage >= 1 && MODES[id].combo >= 2.5));
const P = (id, t = 0) => lookThrough(st.palette, id, t);
const sat = (p) => p.slice(0, COLOURS).reduce((n, c) => n + toHsl(c)[1], 0) / COLOURS;
const heat = (p) => p.slice(0, COLOURS).reduce((n, c) => n + c[0] - c[2], 0) / COLOURS;
const lum = (p) => p.slice(0, COLOURS).reduce((n, c) => n + luma(c), 0) / COLOURS;
check('sober shows the yard\'s own table, untouched', P('sober') === st.palette);
check('depression: nearly colourless, darker, colder', sat(P('depression')) < sat(P('sober')) * 0.4 && lum(P('depression')) < lum(P('sober')) && heat(P('depression')) < heat(P('sober')), `sat ${sat(P('sober')).toFixed(2)} → ${sat(P('depression')).toFixed(2)}`);
check('alcohol: warmer and less saturated', heat(P('alcohol')) > heat(P('sober')) && sat(P('alcohol')) < sat(P('sober')));
check('weed: more saturated, and the colours keep drifting', sat(P('weed')) > sat(P('sober')) && P('weed', 0).join() !== P('weed', 2.6).join());
check('no look reorders light and dark: the yard stays readable through all of them', ids.every((id) => [0, 2.6].every((t) => { const p = P(id, t).slice(0, COLOURS).map(luma); return p.every((v, i) => i === 0 || v >= p[i - 1] - 0.03); })));

// ---- feel --------------------------------------------------------------------------------------------
section('feel: answered fast, answered always');
check('the opening scan takes under two seconds', SCAN_TIME < 2, `${SCAN_TIME} s`);
check('from tap to impact is never more than 350 ms, and 110 ms when sober', ids.every((id) => MODES[id].flight <= 0.35) && MODES.sober.flight <= 0.12, ids.map((id) => MODES[id].flight * 1000).join(' / ') + ' ms');
w = yard(); fx = makeFx(w);
throwThing(fx, w, MODES.sober, 'sober', 40, 40, null);
check('a tap is answered in the same frame, before anything lands', fx.rings.length === 1 && fx.rocks.length === 1);
let landed = 0, steps = 0;
while (fx.rocks.length && steps < 100) { landed += stepFx(fx, w, 1 / 60).length; steps += 1; }
check('the throw lands once, on time', landed === 1 && steps <= Math.ceil(MODES.sober.flight * 60) + 1, `${steps} frames`);
const t1 = byKind(w, 'chair');
res = strike(w, t1, t1.cx, t1.cy);
impact(fx, res.kind);
burst(fx, res.debris, t1.cx, t1.cy, mulberry32(1), 150);
const frozenAt = fx.particles.map((p) => p.x + p.y).join();
stepFx(fx, w, BREAK_PAUSE / 2);
check('a wreck stops the game for an instant: nothing moves during the pause', res.kind === 'break' && fx.particles.map((p) => p.x + p.y).join() === frozenAt && fx.freeze > 0, `${BREAK_PAUSE * 1000} ms, a hit ${HIT_PAUSE * 1000} ms`);
check('a wreck kicks the picture, within the stated maximum', (() => { stepFx(fx, w, BREAK_PAUSE); const o = shakeOffset(fx); return fx.shake > 0 && Math.abs(o.x) <= SHAKE_MAX && Math.abs(o.y) <= SHAKE_MAX; })());
for (let i = 0; i < 300; i += 1) stepFx(fx, w, 1 / 60);
check('the kick dies away and the pieces all come to rest', fx.shake === 0 && fx.particles.length === 0 && fx.flash === 0);
const fallen = []; w.rubble.forEach((v, p) => { if (v !== 255) fallen.push((p / W) | 0); });
check('what falls STAYS, at the foot of the thing it came off — not at the bottom of the photograph', fallen.length > 0 && fallen.every((y) => y >= t1.y && y <= t1.y + t1.h + 6),
  `${fallen.length} pixels, rows ${Math.min(...fallen)}–${Math.max(...fallen)}`);
for (let i = 0; i < 6; i += 1) impact(fx, 'break');
check('many wrecks at once do not shake the picture off the screen', fx.shake <= SHAKE_MAX);
fx = makeFx(w); impact(fx, 'break', true);
check('with reduced motion asked for, nothing shakes and nothing tilts', fx.shake === 0 && viewMotion('alcohol', 3, true).angle === 0);

// ---- the view ----------------------------------------------------------------------------------------
section('the view');
const rect = { left: 30, top: 80, width: 300, height: 400 };
let worst = 0;
for (const id of ids) for (let t = 0; t < 20; t += 0.37) {
  const m = viewMotion(id, t), shift = { x: m.x + 3, y: m.y - 2 };
  for (const [x, y] of [[10, 12], [96, 128], [188, 250]]) {
    const c = worldToClient(x, y, rect, m.angle, shift, W, H), back = clientToWorld(c.x, c.y, rect, m.angle, shift, W, H);
    worst = Math.max(worst, Math.abs(back.x - x), Math.abs(back.y - y));
  }
}
check('a tap lands on the pixel that was DRAWN under the finger, whatever the tilt, sway and shake', worst < 1e-6, `worst error ${worst.toExponential(1)} px`);
check('the frame always leans a little; depression holds it still', viewMotion('sober', 1).angle !== 0 && viewMotion('depression', 1).angle === 0);
check('alcohol leans furthest and sees double', Math.abs(viewMotion('alcohol', 1.7).angle) > Math.abs(viewMotion('sober', 1.7).angle) && viewMotion('alcohol', 1.7).ghost);

// ---- nothing in vain ---------------------------------------------------------------------------------
section('nothing in vain');
const files = readdirSync(new URL('./src/', import.meta.url)).filter((f) => f.endsWith('.js'));
const sources = Object.fromEntries(files.map((f) => [f, readFileSync(new URL(`./src/${f}`, import.meta.url), 'utf8')]));
const imported = (f) => Object.entries(sources).some(([g, text]) => g !== f && text.includes(`'./${f}'`));
check('every module is used by another, or is the entry point', files.every((f) => f === 'main.js' || imported(f)), files.filter((f) => f !== 'main.js' && !imported(f)).join(' ') || `${files.length} modules`);
const concept = readFileSync(new URL('./docs/concept.md', import.meta.url), 'utf8');
check('every module has its reason written down in docs/concept.md', files.every((f) => concept.includes(`\`${f}\``)), files.filter((f) => !concept.includes(`\`${f}\``)).join(' ') || 'all listed');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8'), mainJs = sources['main.js'];
const controls = [...html.matchAll(/id="([a-zA-Z0-9]+)"/g)].map((m) => m[1]);
check('every element the page names is used by the game', controls.every((id) => mainJs.includes(`'${id}'`)), controls.filter((id) => !mainJs.includes(`'${id}'`)).join(' ') || `${controls.length} elements`);

// ---- report ------------------------------------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n);
console.log('DVOR-8 — the tests');
for (const r of rows) {
  if (r.name) { console.log(`\n  ${r.name}`); continue; }
  console.log(`    ${pad(r.ok ? 'PASS' : 'FAIL', 5)} ${pad(r.what.slice(0, 92), 94)} ${r.detail.slice(0, 34)}`);
}
console.log(`\nPASS ${pass}   FAIL ${fail}   of ${pass + fail} checks`);
process.exit(fail === 0 ? 0 : 1);
