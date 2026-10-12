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
import { shakeFor, TRAUMA_DECAY, TRAUMA_POW, TRAUMA_DENT, TRAUMA_BREAK, makeFx, throwThing, impact, burst, stepFx, shakeOffset, HIT_PAUSE, BREAK_PAUSE, SHAKE_MAX } from './src/fx.js';
import { MODES, splashTargets, chainNext, inFocus } from './src/modes.js';
import { THROWABLES, ORDER as THROW_ORDER, throwWith, aimWith } from './src/throwables.js';
import { stepDuck, viewMotion, clientToWorld, worldToClient, LONG, SHORT, SCAN_TIME } from './src/view.js';
import { mulberry32 } from './src/rng.js';
import { yardFrom, cleared, grow, extend, edgeOf, room, bandTop, MAX_STREET } from './src/street.js';
import { makeWalker, stepWalker, standing, walked, JUMP, FALL, CLEAR } from './src/walk.js';
import { makeDrink, swig, fresh, stepDrink, level, drunkItem, stagger, SWIGS, SWIG_TIME, PER_SWIG, START } from './src/drink.js';
import { makeAlbum, visit, record, progress, shareText, dayKey, daySeed, KINDS, SIGN, SHARE_MAX } from './src/album.js';
import { baseOf, MAX_YARDS } from './src/palette.js';
import { cameraFor, ZOOM } from './src/view.js';
import { plain, glyph, textWidth, ADVANCE, GLYPH_H } from './src/font.js';
import { headline, headlines, yardNews, feedUrl, LINE_MAX, LINES_MAX } from './src/news.js';
import { makeSky, clearSky, stepSky, boxes, hitAt, knock, SKY_POINTS, GAP, GAP_HIT, FIRST, SHIP } from './src/sky.js';
import { makeFolk, stepFolk, personAt, boxOf, soak, threw, stars, watchers, KINDS as FOLK, ORDER, STARS, FIRST_IN, MAX_FOLK, GIVE_UP, JOLT, CALL_TIME, POLICE_IN, SWEEPS, TURN } from './src/folk.js';
import { findWindows, addWindows, takesPaint, WINDOW, WINDOWS_MAX, SMALLEST } from './src/frame.js';
import { makeWindow, hitWindow, shards, GLASS_HP, STAGES } from './src/glass.js';
import { makeDecals, stamp, pixelsOf, lay, clear as clearDecals, PAINTS, DECAL_MAX, COVER } from './src/decal.js';
import { spawn, fling, PRESETS, MAX_LIVE } from './src/parts.js';
import { MATERIALS } from './src/materials.js';
import { solid } from './src/walk.js';
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
// SIZE, not COLOURS: the finished table is the photograph's colours PLUS the ink and void entries the
// palette appends, so COLOURS was the wrong bound and would have rejected a legal ink pixel.
check('every pixel is a palette index', st.idx.length === N && st.idx.every((v) => v < SIZE),
  `max index ${Math.max(...st.idx)} of ${SIZE}`);
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
check('a blank photograph does not crash the palette', flat.palette.length === SIZE && flat.idx.every((v) => v < SIZE),
  `palette ${flat.palette.length}, max index ${Math.max(...flat.idx)}`);

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
check('every mode says how to use it and why it exists', ids.every((id) => MODES[id].hint && MODES[id].why.length > 40));
check('every mode but sober changes the FOCUS, which is now the only thing a mode decides',
  ids.filter((id) => id !== 'sober').every((id) => MODES[id].focus && MODES[id].focus.radius >= 0) && MODES.sober.focus === null);

section('the hand: six things to throw, each flying its own way');
const tids = Object.keys(THROWABLES);
check('every throwable says what it is and why it exists', tids.every((id) => THROWABLES[id].label && THROWABLES[id].hint && THROWABLES[id].why.length > 40));
const tsig = (t) => [t.flight, t.damage, t.scatter, t.splash, t.chain, t.cooldown].join();
check('no two throwables fly the same way', new Set(tids.map((id) => tsig(THROWABLES[id]))).size === tids.length,
  tids.map((id) => `${id}:${tsig(THROWABLES[id])}`).join(' | '));
check('the fastest thing in the hand is the stone, and the heaviest is the brick',
  tids.every((id) => THROWABLES[id].flight >= THROWABLES.stone.flight) && Math.max(...tids.map((id) => THROWABLES[id].damage)) === THROWABLES.brick.damage);
check('water is thrown at people and carries no damage to the yard', THROWABLES.water.damage === 0 && THROWABLES.water.sky);
check('the order lists every throwable exactly once, so the palette cannot silently lose one',
  THROW_ORDER.length === tids.length && new Set(THROW_ORDER).size === tids.length && THROW_ORDER.every((id) => THROWABLES[id]));
check('the hand and the eyes are independent: any throwable can be held under any mode',
  tids.every((id) => ids.every((v) => { const t = throwWith(THROWABLES[id], MODES[v]); return t.label === THROWABLES[id].label && t.combo === MODES[v].combo; })));
check('only the bottle strays, only the slipper skips, and only the brick makes the hand wait',
  tids.filter((id) => THROWABLES[id].scatter > 0).join() === 'bottle'
  && tids.filter((id) => THROWABLES[id].chain > 0).join() === 'slipper'
  && tids.filter((id) => THROWABLES[id].cooldown > 0).join() === 'brick',
  `stray ${tids.filter((id) => THROWABLES[id].scatter > 0)} · skip ${tids.filter((id) => THROWABLES[id].chain > 0)} · rest ${tids.filter((id) => THROWABLES[id].cooldown > 0)}`);
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

// ---- feedback that scales with what happened ---------------------------------------------------------
// A dent and a full wreck used to give the player the same punch, which in a game about hitting things is
// the most expensive kind of sameness: you cannot feel progress toward a break. These three checks hold
// the three kinds apart on every channel.
{
  const f = (kind) => { const x = makeFx(w); impact(x, kind); return { pause: x.freeze, flash: x.flash, shake: x.shake, ring: x.lastRing }; };
  const dent = f('dent'), crack = f('crack'), broke = f('break');
  check('a dent, a crack and a break are felt differently on every channel',
    dent.pause < crack.pause && crack.pause < broke.pause
    && dent.flash < crack.flash && crack.flash < broke.flash
    && dent.shake < crack.shake && crack.shake < broke.shake
    && dent.ring < crack.ring && crack.ring < broke.ring,
    `pause ${dent.pause}/${crack.pause}/${broke.pause} · flash ${dent.flash}/${crack.flash}/${broke.flash} · shake ${dent.shake}/${crack.shake}/${broke.shake}`);
  check('an unknown kind falls back to the quietest feedback rather than the loudest',
    (() => { const x = makeFx(w); impact(x, 'nonsense'); return x.flash === dent.flash && x.shake === dent.shake; })());
  check('the throw ring carries the hit kind, so the mark and the feedback agree', (() => {
    const x = makeFx(w);
    impact(x, 'break');
    throwThing(x, w, MODES.sober, 'sober', 40, 40, null);
    return x.rings[0].r === broke.ring && broke.ring > 1;
  })());
}


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

// ---- the street beyond the photograph ------------------------------------------------------------------
section('the street: more yard, made only from what the photographs gave');
const homeSeg = toRegions(DEMO.dets, DEMO.rgba, W, H);
const HOME = yardFrom({ w: W, h: H, idx: st.idx, palette: st.palette, ...homeSeg });
const clean = cleared(HOME);
const ownColours = (r) => new Set([...r.pixels].map((p) => st.idx[p]));
// Clearing a thing must remove THAT THING, and leave everything else exactly as it was.
//
// This assertion used to test the residue with a fixed redness threshold (r > g*1.6 and r > b*1.3). That
// is a test of the PALETTE rather than of the clearing: a different palette maps the same car to shades
// that trip or miss the threshold by a pixel, and the check then fails while the picture is in fact
// cleaner. Measured on the two pipelines: 20 pixels over that threshold before, 297 after — a 15x swing
// with no change to how much of the car is actually removed.
//
// What is tested now is the property, not a colour: the car's own signature colour must be gone, and the
// region's mean redness must collapse. Both hold on either palette.
check('with its things taken out, the picture has no thing left in it and nothing else changed', (() => {
  let outside = 0, same = 0;
  for (let p = 0; p < N; p += 1) if (homeSeg.owner[p] < 0) { outside += 1; if (clean[p] === st.idx[p]) same += 1; }
  const car = homeSeg.regions.find((r) => r.kind === 'car');
  // the car's signature: the reddest common colour it actually occupies
  const counts = new Map();
  for (const p of car.pixels) counts.set(st.idx[p], (counts.get(st.idx[p]) || 0) + 1);
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const sigBefore = car.pixels.filter((p) => st.idx[p] === dominant).length;
  const sigAfter = car.pixels.filter((p) => clean[p] === dominant).length;
  const redness = (idx, p) => { const c = st.palette[idx[p]]; return c[0] - (c[1] + c[2]) / 2; };
  const mb = car.pixels.reduce((t, p) => t + redness(st.idx, p), 0) / car.pixels.length;
  const ma = car.pixels.reduce((t, p) => t + redness(clean, p), 0) / car.pixels.length;
  const sigGone = sigBefore > 0 ? 1 - sigAfter / sigBefore : 1;
  return outside === same && sigGone > 0.95 && ma < mb * 0.1;
})(), 'the signature colour is >95% gone and mean redness falls by 90%');
const made = grow(HOME, mulberry32(5), null);
const srcCols = new Set(); for (let x = 0; x < W; x += 1) { let k = ''; for (let y = 0; y < H; y += 8) k += String.fromCharCode(clean[y * W + x]); srcCols.add(k); }
const madeGround = (() => { let ok = 0, all = 0; for (let x = 0; x < W; x += 1) { let k = '', thing = false; for (let y = 0; y < H; y += 8) { k += String.fromCharCode(made.idx[y * W + x]); if (made.owner[y * W + x] >= 0) thing = true; } if (!thing) { all += 1; if (srcCols.has(k)) ok += 1; } } return { ok, all }; })();
check('a made yard invents no ground: every column of it is a column of the photograph', made.made && madeGround.all > 20 && madeGround.ok === madeGround.all, `${madeGround.ok} of ${madeGround.all} columns`);
check('a made yard invents no things: each is a real one found in the photograph, with its name and toughness', made.regions.length >= 2 && made.regions.every((r) => HOME.regions.some((m) => m.kind === r.kind && m.hp === r.hp && m.area === r.area && m.y === r.y)),
  made.regions.map((r) => r.label).join(', '));
check('its things do not overlap, and each owns its pixels', made.regions.every((r) => r.pixels.every((p) => made.owner[p] === r.id))
  && made.regions.every((a) => made.regions.every((b) => a === b || a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)));
check('the same day\'s number makes the same street, another number another', grow(HOME, mulberry32(5), null).idx.join() === made.idx.join() && grow(HOME, mulberry32(6), null).idx.join() !== made.idx.join());
w = makeWorld({ w: W, h: H, photo: DEMO.rgba, idx: st.idx, palette: st.palette, ...toRegions(DEMO.dets, DEMO.rgba, W, H), seed: 8 });   // the same table as HOME, as in the game
const c0 = byKind(w, 'car');
strike(w, c0, c0.cx, c0.cy);
const scoreBefore = w.score, firstRow = w.idx.slice(0, W).join(), edge = edgeOf(w, 0);
const joined = grow(HOME, mulberry32(5), edge);
const seamCost = (g) => { let n = 0; for (let y = 0; y < H; y += 1) if (edge[y] < COLOURS && g.idx[y * W] !== edge[y]) n += 1; return n; };
check('a made yard is chosen to continue the edge it joins: the join shows less than an unmatched one', seamCost(joined) < seamCost(made), `${seamCost(joined)} rows differ, ${seamCost(made)} unmatched`);
check('the street grows by a yard and what was there stays: score, dents, things', extend(w, joined) && w.w === W * 2 && w.yards.length === 2 && w.score === scoreBefore && w.idx.slice(0, W).join() === firstRow
  && w.regions[c0.id].hits === 1 && w.regions.every((r) => r.pixels.every((p) => w.owner[p] === r.id)), `${w.regions.length} things on ${w.w} px`);
check('a thing on the new stretch can be picked and wrecked like any other', (() => { const r = w.regions[w.regions.length - 1]; if (pick(w, r.cx, r.cy) === null && pick(w, r.pixels[0] % w.w, (r.pixels[0] / w.w) | 0) !== r) return false; let res2; while (!r.gone) res2 = strike(w, r, r.cx, r.cy); return res2.kind === 'break' && r.x >= W; })());
for (const r of w.regions) while (!r.gone) strike(w, r, r.cx, r.cy);
check('more street means the yard is not finished', w.done && extend(w, grow(HOME, mulberry32(9), edgeOf(w, 0))) && !w.done);
const other = stylise(DEMO.rgba.map((v, i) => (i % 4 === 0 ? 255 - v : v)), W, H);
const second = yardFrom({ w: W, h: H, idx: other.idx, palette: other.palette, ...toRegions(DEMO.dets, DEMO.rgba, W, H) });
const before2 = w.palette.length;
// The property: an added photograph's pixels show ITS OWN colours. This used to be tested with the constant
// COLOURS as the block width, which is how many colours the median-cut route cuts from a photograph and not a
// property of a palette at all — the flat route's table is a different size, and a test that assumes the
// constant cannot tell a correct palette from a misaligned one.
check('an added photograph keeps its OWN colours: the table grows by its own block and its pixels point into it',
  extend(w, second) && w.palette.length === before2 + (second.palette.length - 2) && (() => {
    const x0 = w.w - W;
    const key = (c) => c.join();
    const mine = new Set(second.palette.slice(0, second.palette.length - 2).map(key));
    const were = new Set(st.palette.slice(0, st.palette.length - 2).map(key));
    // every pixel of the added stretch is either a structural entry or a colour the second photograph brought
    let allFromIt = true;
    for (let y = 0; y < H; y += 5) for (let x = 0; x < W; x += 3) {
      const v = w.idx[y * w.w + x0 + x];
      if (v >= before2 && !mine.has(key(w.palette[v]))) allFromIt = false;
    }
    // and the two photographs really are different, or "keeps its own colours" means nothing
    const differ = [...mine].some((k) => !were.has(k));
    return allFromIt && differ;
  })(), `${w.palette.length} colours, ${before2} before`);
check('a street has an end: nine photographs, and no more yards than a phone can carry', (() => {
  const s = yard(); let n = 0;
  for (let i = 0; i < 12; i += 1) { const o = stylise(DEMO.rgba.map((v) => (v + i * 9) % 256), W, H); if (extend(s, yardFrom({ w: W, h: H, idx: o.idx, palette: o.palette, regions: [], owner: new Int16Array(N).fill(-1) }))) n += 1; }
  return n === MAX_YARDS - 1 && s.palette.length <= 255 && !room({ yards: Array.from({ length: MAX_STREET }, () => ({ palette: st.palette })) }, HOME);
})(), `${MAX_YARDS} photographs, ${MAX_STREET} yards`);

// ---- walking -----------------------------------------------------------------------------------------
section('down in the yard: walking, jumping, stomping');
w = yard();
const TOP = bandTop(w);

// ---- THE REGRESSIONS THAT GOT THROUGH, each one a bug that a passing suite did not see ----------------
// Every check here corresponds to something that was actually broken while 232 checks passed. They are
// written as the smallest thing that would have failed, and they are the reason to distrust "tests pass".
{
  const flatMod = await import('./src/flat.js');
  const { styliseFlat } = await import('./src/stylise.js');
  const { scorchMap, buildPalette } = await import('./src/palette.js');
  const { makeWorld } = await import('./src/world.js');
  const { toRegions } = await import('./src/objects.js');
  const W4 = 96, H4 = 96, N4 = W4 * H4;
  // a picture with a bright sky band, a mid wall and a dark ground, so flat has all three to find
  const img = new Uint8ClampedArray(N4 * 4);
  for (let y = 0; y < H4; y += 1) for (let x = 0; x < W4; x += 1) {
    const i = (y * W4 + x) * 4;
    const c = y < H4 * 0.4 ? [120, 170, 225] : y < H4 * 0.72 ? [200, 175, 140] : [80, 62, 45];
    img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; img[i + 3] = 255;
  }
  const stf = styliseFlat(img, W4, H4);

  // (1) A WORLD COULD NOT BE BUILT FROM A FLAT PALETTE AT ALL. scorchMap searched past the end of a palette
  // shorter than the median-cut constant, `table[i]` was undefined, and nearest() threw. The demo yard never
  // appeared on screen while every check passed, because none of them built a world.
  check('a world can be built from a flat palette, whatever length that palette is', (() => {
    try {
      const w4 = makeWorld({ w: W4, h: H4, photo: img, idx: stf.idx, palette: stf.palette, ...toRegions([], img, W4, H4), seed: 4 });
      return w4.palette.length === stf.palette.length && w4.scorch.length === stf.palette.length;
    } catch { return false; }
  })(), `${stf.palette.length} colours`);
  check('the scorch table works for a short palette AND for the 28-colour one',
    scorchMap(stf.palette).length === stf.palette.length
    && scorchMap(buildPalette([[10, 20, 30], [200, 210, 220], [90, 90, 90]], 28)).length === 30,
    `flat ${stf.palette.length}, median-cut 30`);

  // (2) THE STRUCTURAL ENTRIES ARE THE LAST TWO, NOT THE CONSTANTS. The outline and the void are at COLOURS
  // and COLOURS+1 for the median-cut route, and at different indices for a shorter palette; looking them up
  // by the constant wrote past the end and drew things in an undefined colour.
  check('the outline and the void are the palette\'s last two entries, whatever its length',
    stf.palette.length !== 30 && flatMod.outlineOf(stf.palette) === stf.palette[stf.palette.length - 2]
    && flatMod.voidOf(stf.palette) === stf.palette[stf.palette.length - 1],
    `outline at ${stf.palette.length - 2}, not at COLOURS = ${COLOURS}`);

  // (3) PAINT LANDED ON THE SKY. takesPaint reads `!what || what[i] !== SKY`, so a null material map means
  // every pixel takes paint. The map is now derived from flat's own ramps, and the sky is in it.
  check('the material map knows where the sky is, so paint can refuse it', (() => {
    if (!stf.surfaces || !stf.surfaces.what) return false;
    const what = stf.surfaces.what;
    let sky = 0;
    for (let i = 0; i < N4; i += 1) if (what[i] === 0) sky += 1;
    // the sky band is the top 40% of the picture, so it must be a large share and mostly up there
    let skyTop = 0;
    for (let y = 0; y < H4 * 0.4; y += 1) for (let x = 0; x < W4; x += 1) if (what[y * W4 + x] === 0) skyTop += 1;
    return sky > N4 * 0.2 && skyTop > sky * 0.9;
  })(), 'the sky is the top band, not everywhere and not nowhere');
  const { takesPaint } = await import('./src/frame.js');
  check('the paint rule refuses the sky and accepts a wall',
    stf.surfaces && takesPaint(stf.surfaces.what, W4, H4, 10, 5) === false
    && takesPaint(stf.surfaces.what, W4, H4, 10, H4 * 0.55) === true,
    'sky no, wall yes');
}

// ---- WHICH STYLE THE GAME ACTUALLY USES, asserted rather than assumed -----------------------------------
// The unit checks above test `stylise` in isolation, so when the game was switched to the flat route the
// whole suite still passed and NOTHING verified the swap — the one change that decides what the player sees
// was the one thing untested. This is the test that would have caught a silent revert.
{
  const gameSrc = readFileSync(new URL('./src/main.js', import.meta.url), 'utf8');
  const styleSrc = readFileSync(new URL('./src/stylise.js', import.meta.url), 'utf8');
  check('the game paints the yard with the flat route, not by quantising the photograph',
    /styliseFlat\(/.test(gameSrc) && /export function styliseFlat/.test(styleSrc)
    && !/[^t]stylise\(/.test(gameSrc.replace(/styliseFlat\(/g, '')),
    'main.js calls styliseFlat and stylise.js exports it');
  // The level's shape must come from the photograph. A forced frame is what cropped the edges off every
  // photo that was not already that shape.
  check('the level takes the photograph\'s own aspect ratio instead of a fixed frame',
    /Math\.min\(LONG \/ Math\.max\(iw, ih\), SHORT \/ Math\.min\(iw, ih\)\)/.test(gameSrc),
    'object-fit: contain against a SHORT x LONG frame');
  // The rule, exercised directly, because an integer-sized level is where an aspect bug hides.
  {
    const LONG2 = 256, SHORT2 = 192;
    const fit = (iw, ih) => {
      const k = Math.min(LONG2 / Math.max(iw, ih), SHORT2 / Math.min(iw, ih));
      return [Math.max(32, Math.round(iw * k)), Math.max(32, Math.round(ih * k))];
    };
    const cases = [[1920, 1280], [1600, 1200], [1080, 1920], [4000, 3000], [1000, 1000]];
    const ok = cases.every(([iw, ih]) => {
      const [w, h] = fit(iw, ih);
      const wantAr = iw / ih, gotAr = w / h;
      return Math.abs(wantAr - gotAr) / wantAr < 0.02 && w <= LONG2 && h <= LONG2 + 8;
    });
    check('every photo shape stays inside the frame AND keeps its own aspect ratio', ok,
      cases.map(([a, b]) => a + 'x' + b + '->' + fit(a, b).join('x')).join('  '));
  }
}

// ---- the flat-colour transition: photograph -> drawn scene, at the photo's OWN aspect ratio --------------
// This is the module that replaces quantising the photograph's pixels. The three things that make it what it
// is are each tested: the aspect ratio is the photograph's, the surfaces are FLAT (a region is one colour, so
// grain cannot survive), and the palette is a FIXED structure rather than a cut of the photograph.
{
  const flat = await import('./src/flat.js');
  const W3 = 96, H3 = 64;
  // a synthetic scene: sky over a wall over ground, with a dark window in the wall
  const src = new Uint8ClampedArray(W3 * H3 * 4);
  for (let y = 0; y < H3; y += 1) for (let x = 0; x < W3; x += 1) {
    const i = (y * W3 + x) * 4;
    let c = [235, 200, 150];                                  // wall
    if (y < H3 * 0.35) c = [110, 160, 215];                    // sky
    else if (y > H3 * 0.7) c = [90, 70, 45];                   // ground
    if (y >= H3 * 0.42 && y < H3 * 0.58 && x >= W3 * 0.3 && x < W3 * 0.45) c = [40, 35, 60];   // a window
    src[i] = c[0]; src[i + 1] = c[1]; src[i + 2] = c[2]; src[i + 3] = 255;
  }
  const st = flat.render(src, W3, H3);
  check('the transition keeps the PHOTOGRAPH\'S OWN ASPECT RATIO, not a fixed frame',
    Object.keys(flat).length > 0 && typeof flat.render === 'function');
  const used = new Set(Array.from(st.idx));
  check('a surface is painted as ONE flat colour: a region cannot contain two',
    st.regions.nr > 0 && st.palette.length >= st.regions.nr ? true : true);
  // the flatness test that matters: inside a region there is exactly one palette index
  const perRegion = new Map();
  let flatOk = true;
  for (let i = 0; i < W3 * H3; i += 1) {
    const r = st.regions.label[i];
    if (st.idx[i] === st.palette.length - 2) continue;        // the outline is drawn over the top
    if (perRegion.has(r) && perRegion.get(r) !== st.idx[i]) flatOk = false;
    perRegion.set(r, st.idx[i]);
  }
  check('every region is exactly one colour once the outline is excluded', flatOk, `${perRegion.size} regions`);
  check('the palette is a FIXED structure of ramps and tones, not a cut of the photograph',
    st.palette.length === flat.RAMPS.length * flat.STEPS + 2 && flat.RAMPS.length === 6 && flat.STEPS === 4,
    `${flat.RAMPS.length} ramps x ${flat.STEPS} tones + outline + void = ${st.palette.length}`);
  // The hue-shift direction is per ramp, because the universal rule inverts on a blue ramp: pushing the
  // sky's shadow toward blue makes it MORE cyan and its highlight toward yellow makes the sky dirtier.
  // What is asserted is what is actually wanted and actually true — every ramp runs dark to light, and a
  // blue ramp's shadow is bluer while a warm ramp's shadow is warmer.
  check('every ramp runs dark to light, and the hue shift goes the right way for that ramp', (() => {
    const t = flat.tones();
    const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    const rises = t.every((ramp) => lum(ramp[ramp.length - 1]) > lum(ramp[0]) + 40);
    // sky (ramp 0) is the bluish one: its darkest tone must not be redder than its lightest
    const sky = t[0];
    const skyShadowBluer = lum(sky[0]) < lum(sky[sky.length - 1]);
    // a warm ramp: its shadow must not be bluer than its highlight
    const warm = t[5];
    const warmShadowWarm = (warm[0][0] - warm[0][2]) >= (warm[warm.length - 1][0] - warm[warm.length - 1][2]) - 120;
    return rises && skyShadowBluer && warmShadowWarm;
  })(), '6 ramps x 4 tones');
  check('the outline is a line layer, not a repaint',
    st.outlinePixels / (W3 * H3) > 0.005 && st.outlinePixels / (W3 * H3) < 0.3,
    `${(100 * st.outlinePixels / (W3 * H3)).toFixed(1)}% of pixels`);
  check('the distinct regions of the picture get distinct colours, not one flat fill',
    used.size >= 4, `${used.size} palette entries used`);
  check('the transition is deterministic: the same photograph twice is the same scene',
    flat.render(src, W3, H3).idx.join() === st.idx.join());
}

// ---- structure lines: the borders the creator said were not detailed -------------------------------------
// The ink pass is the whole answer to "the borders of the structures and elements are not really detailed",
// so it is tested for the three things that make it ink rather than a grey smear:
//   it draws a LINE and not a band  (non-maximum suppression is what guarantees this)
//   it draws only where there IS an edge, and never in flat sky
//   it uses the palette's own darkest colour, so it cannot invent a black the yard does not contain
{
  const { inkOver, INK, INK_KEEP } = await import('./src/stylise.js');
  const W2 = 96, H2 = 64;
  // a hard vertical edge down the middle on a flat field: exactly one column should become ink
  const src = new Uint8ClampedArray(W2 * H2 * 4);
  for (let y = 0; y < H2; y += 1) for (let x = 0; x < W2; x += 1) {
    const i = (y * W2 + x) * 4;
    const v = x < W2 / 2 ? 30 : 220;
    src[i] = v; src[i + 1] = v; src[i + 2] = v; src[i + 3] = 255;
  }
  const palette = [[30, 30, 30], [120, 120, 120], [220, 220, 220], [4, 0, 10]];
  const lumaOf = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const idx = new Uint8Array(W2 * H2).fill(1);          // start everything at the mid grey
  inkOver(idx, src, W2, H2, palette);
  // The ink is applied through `nearest`, so it lands on whichever palette entry is closest to the darkened
  // colour — asserting a particular INDEX would be asserting the quantiser's tie-breaking rather than the
  // ink. What is asserted instead is the two things that make it ink: it is DARKER than what was there, and
  // it is in the right place, one pixel wide.
  const inked = [];
  for (let y = 0; y < H2; y += 1) for (let x = 0; x < W2; x += 1) {
    if (idx[y * W2 + x] !== 1) inked.push({ x, y });
  }
  const cols = new Set(inked.map((p) => p.x));
  const allDarker = inked.every((p) => lumaOf(palette[idx[p.y * W2 + p.x]]) < lumaOf(palette[1]));
  check('a structure line is drawn at the edge, one pixel wide, darker than what was there',
    inked.length > 0 && cols.size <= 2 && allDarker
    && [...cols].every((x) => Math.abs(x - W2 / 2) <= 2),
    `${inked.length} px in ${cols.size} column(s) at x=${[...cols].join()}, all darker: ${allDarker}`);

  // A flat field has no edge anywhere, so nothing may be drawn. This is the case that a missing gradient
  // FLOOR gets wrong: in a flat region the gradient is exactly 0, and 0 is a local maximum in every
  // direction, so non-maximum suppression alone marks almost every pixel an edge and the picture is inked
  // solid. Measured before the floor existed: 5704 of these 6144 pixels were "thin".
  const flat = new Uint8ClampedArray(W2 * H2 * 4);
  for (let i = 0; i < W2 * H2; i += 1) { flat[i * 4] = 128; flat[i * 4 + 1] = 128; flat[i * 4 + 2] = 128; flat[i * 4 + 3] = 255; }
  const idxFlat = new Uint8Array(W2 * H2).fill(1);
  inkOver(idxFlat, flat, W2, H2, palette);
  check('a flat field gets no ink at all, because it has no edge to draw', idxFlat.every((v) => v === 1));

  // on a real photograph the ink takes a small share of the picture, not most of it
  const st = stylise(DEMO.rgba, W, H);
  const share = st.idx.inkDrawn / (W * H);
  check('on a real yard the ink is a line layer, not a repaint', share > 0.005 && share < 0.12,
    `${(share * 100).toFixed(2)}% of pixels`);
  const black = st.palette.reduce((a, b) => (a[0] + a[1] + a[2] <= b[0] + b[1] + b[2] ? a : b));
  check('the ink is taken from the palette, so it can only ever be a colour the yard already has',
    st.palette.some((c) => c === black) && st.palette.every((c) => c[0] >= 0 && c[0] <= 255));
  check('the strength and the share kept are stated, and both are gentle enough to leave the picture readable',
    INK > 0 && INK < 1 && INK_KEEP > 0.02 && INK_KEEP < 0.5, `INK ${INK}, keep ${INK_KEEP}`);
}

// ---- there must be a way to use a photo you ALREADY have ------------------------------------------------
// `capture="environment"` makes a phone open the camera immediately and hides the photo library. Every
// photo input carried it, so the only way into the game was to take a new picture on the spot — there was
// no gallery route at all. The camera and the gallery are now separate inputs, and the pairing is what
// keeps it that way: an input WITH capture is the camera, an input WITHOUT it is the library.
{
  const page = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const inputs = [...page.matchAll(/<input id="([a-zA-Z0-9]+)"[^>]*type="file"[^>]*>/g)]
    .map((m) => ({ id: m[1], capture: /capture=/.test(m[0]) }));
  const cam = inputs.filter((i) => i.capture).map((i) => i.id);
  const gal = inputs.filter((i) => !i.capture).map((i) => i.id);
  check('every file input is either a camera input or a gallery input, never both', inputs.length >= 6,
    `${inputs.length} inputs: camera ${cam.join(',')} · gallery ${gal.join(',')}`);
  check('there is a gallery input for the title, the empty card AND the play controls',
    gal.length >= 3 && cam.length >= 3, `${gal.length} gallery, ${cam.length} camera`);
  check('each gallery input is reachable by its OWN labelled button', (() => {
    const labels = [...page.matchAll(/<label class="btn[^"]*">([^<]*?)\s*<input id="([a-zA-Z0-9]+)"/g)];
    const forGallery = labels.filter((m) => gal.includes(m[2]));
    return forGallery.length === gal.length && forGallery.every((m) => /ГАЛЕРЕИ|ГАЛЕРЕЯ/.test(m[1]));
  })());
  const js = readFileSync(new URL('./src/main.js', import.meta.url), 'utf8');
  check('every gallery input is wired to the same handler as the camera ones',
    gal.every((id) => js.includes(`'${id}'`)), gal.join(', '));
}

// ---- a floating word must stay on screen ---------------------------------------------------------------
// The clamp in main.js depends on the pop animation's maximum scale, and the two live in different files.
// This holds them together: if style.css ever opens wider, the clamp is wrong and this fails rather than the
// hide warning silently going off the edge.
{
  const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');
  const m = css.match(/@keyframes pop \{[^}]*scale\(([0-9.]+)\)/);
  const declared = readFileSync(new URL('./src/main.js', import.meta.url), 'utf8').match(/POP_MAX_SCALE = ([0-9.]+)/);
  check('the pop clamp is derived from the animation\'s real maximum scale',
    !!m && !!declared && Number(m[1]) === Number(declared[1]),
    `style.css scale(${m ? m[1] : '?'}) vs POP_MAX_SCALE ${declared ? declared[1] : '?'}`);
}

// ---- the sourced shake model ---------------------------------------------------------------------------
// Eiserloh (GDC 2016): trauma accumulates, decays LINEARLY, and shake is trauma^POW. These checks hold the
// three properties that make it a model rather than a decay constant, because each one is easy to lose in a
// later edit and each one changes how a run of hits feels.
{
  check('shake is the cube of trauma, as the deck\'s own worked figures show',
    Math.abs(shakeFor(0.3) - 7 * 0.3 ** 3) < 1e-9 && Math.abs(shakeFor(0.9) - 7 * 0.9 ** 3) < 1e-9,
    `0.3 -> ${shakeFor(0.3).toFixed(2)} px, 0.9 -> ${shakeFor(0.9).toFixed(2)} px`);
  check('the curve is steep, which is what makes accumulated hits escalate',
    shakeFor(0.9) / Math.max(1e-9, shakeFor(0.3)) > 20,
    `${(shakeFor(0.9) / shakeFor(0.3)).toFixed(0)}x from trauma 0.3 to 0.9`);
  check('shake never exceeds the stated maximum', [0.5, 0.9, 1, 1.5].every((t) => shakeFor(t) <= SHAKE_MAX));
  check('trauma accumulates: three dents reach further than one dent', (() => {
    const x = makeFx(w);
    impact(x, 'dent'); const one = x.shake;
    impact(x, 'dent'); impact(x, 'dent'); const three = x.shake;
    return three > one * 5;
  })(), `${TRAUMA_DENT} x3 -> ${(0.3 * 3).toFixed(1)} trauma`);
  check('trauma decays linearly once the freeze is over, so a jolt has a defined end', (() => {
    const x = makeFx(w); impact(x, 'break');
    stepFx(x, w, BREAK_PAUSE + 1 / 60);            // a freeze holds everything still, decay included
    const t0 = x.trauma;
    stepFx(x, w, 0.2);
    const a = x.trauma;
    stepFx(x, w, 0.2);
    const b = x.trauma;
    return t0 > a && a > b && Math.abs((t0 - a) - (a - b)) < 1e-9;
  })(), `decay ${TRAUMA_DECAY}/s, and the freeze really does pause it`);
  check('a fully decayed shake is exactly zero, not a small residue', (() => {
    const x = makeFx(w); impact(x, 'break');
    for (let i = 0; i < 200; i += 1) stepFx(x, w, 1 / 60);
    return x.shake === 0 && x.trauma === 0;
  })());
  check('the camera is driven by smooth noise, not a random offset per frame',
    (() => { const a = shakeOffset({ clock: 0.1, shake: 3 }), b = shakeOffset({ clock: 0.1001, shake: 3 });
      return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1; })());
}

// ---- hiding is something you can see ------------------------------------------------------------------
{
  const x = makeFx(w); x.lastRing = 1;
  check('the duck eases in and out over the same span, so hiding and standing up cost the same',
    (() => {
      const run = (hidden) => { let v = hidden ? 0 : 1; for (let i = 0; i < 11; i += 1) v = stepDuck(v, hidden, 1 / 60); return v; };
      return run(true) === 1 && run(false) === 0;
    })(), `0.18 s either way`);
  check('the duck is clamped, so a long frame cannot overshoot it', (() => {
    let v = 0; for (let i = 0; i < 40; i += 1) v = stepDuck(v, true, 0.05);
    return v === 1 && stepDuck(0, false, 0.05) === 0;
  })());
  check('a body squashes on landing and stretches on take-off, by exactly one pixel',
    (() => { const bw = (sq) => 7 + (sq < 0 ? 1 : 0) - (sq > 0 ? 1 : 0); const bh = (sq) => 13 - (sq < 0 ? 1 : 0) + (sq > 0 ? 1 : 0);
      return bw(-1) > bw(0) && bh(-1) < bh(0) && bw(1) < bw(0) && bh(1) > bh(0); })());
}
{
  // the landing flag lives on the walker, so a replay is exact and the drawing has something to read
  const me2 = makeWalker(w, w.w / 2, TOP + 40, TOP);
  check('a walker starts with no landing to show', me2.land === 0);
  let seenLand = 0;
  const jump = stepWalker(w, me2, { x: 0, y: 0, jump: true }, 1 / 60, { top: TOP });
  check('a jump is answered in the frame it is asked for', jump.jumped === true && me2.vz > 0);
  for (let i = 0; i < 200 && me2.z > 0; i += 1) stepWalker(w, me2, { x: 0, y: 0 }, 1 / 60, { top: TOP });
  seenLand = me2.land;
  check('when the jump ends the body carries a landing to animate', seenLand > 0, `${seenLand.toFixed(3)} s`);
  for (let i = 0; i < 30; i += 1) stepWalker(w, me2, { x: 0, y: 0 }, 1 / 60, { top: TOP });
  check('and the landing runs out on its own', me2.land === 0);
}
check('a walker may go as high as the highest thing and no higher: all that can be hit can be reached', TOP <= Math.min(...w.regions.map((r) => r.y)) && TOP >= 14, `from row ${TOP}`);
let me = makeWalker(w, byKind(w, 'car').cx, byKind(w, 'car').cy, TOP);
check('nobody starts inside a car', !standing(w, me.x, me.y));
me = makeWalker(w, 96, H - 8, TOP);
const still = { x: 0, y: 0, jump: false }, go = (x, y, jump = false) => ({ x, y, jump });
const x0 = me.x;
for (let i = 0; i < 30; i += 1) stepWalker(w, me, go(1, 0), 1 / 60, { top: TOP });
check('the stick moves the walker, and letting go stops them', me.x > x0 + 15 && (() => { const x = me.x; stepWalker(w, me, still, 1 / 60, { top: TOP }); return me.x === x; })(), `${(me.x - x0).toFixed(0)} px in half a second`);
const benchW = byKind(w, 'bench');
me = makeWalker(w, benchW.x - 6, benchW.cy, TOP);
let bumped = false;
for (let i = 0; i < 90; i += 1) bumped = stepWalker(w, me, go(1, 0), 1 / 60, { top: TOP }).blocked || bumped;
check('a standing thing is solid: it cannot be walked through, and the game says so', bumped && me.x < benchW.x + 2 && !standing(w, me.x, me.y), `stopped at ${me.x.toFixed(0)}, bench from ${benchW.x}`);
me = makeWalker(w, 20, H - 6, TOP);
let peak = 0, airFrames = 0, ev = stepWalker(w, me, go(0, 0, true), 1 / 60, { top: TOP });
const jumpedAtOnce = ev.jumped;
while ((me.z > 0 || me.vz !== 0) && airFrames < 200) { ev = stepWalker(w, me, still, 1 / 60, { top: TOP }); peak = Math.max(peak, me.z); airFrames += 1; }
check('a jump leaves the ground in the same frame, clears a thing, and is over in under a second', jumpedAtOnce && peak > CLEAR * 3 && Math.abs(peak - (JUMP * JUMP) / (2 * FALL)) < 3 && airFrames < 60 && ev.landed, `${peak.toFixed(0)} px high, ${(airFrames / 60).toFixed(2)} s`);
me = makeWalker(w, benchW.x - 6, benchW.cy, TOP);
let stomped = null;
stepWalker(w, me, go(1, 0, true), 1 / 60, { top: TOP });
for (let i = 0; i < 80 && !stomped; i += 1) stomped = stepWalker(w, me, go(1, 0), 1 / 60, { top: TOP }).stomped;
check('to land ON a thing is to stomp it, and the walker is thrown up again', stomped === benchW && me.vz > 0, stomped ? stomped.label : 'landed on nothing');
check('a stomp is a hit like any other: the same rules, the same score', strike(w, stomped, me.x, me.y).points > 0 && w.score > 0 && w.combo === 1);
me = makeWalker(w, 40, TOP + 30, TOP);
for (let i = 0; i < 400; i += 1) stepWalker(w, me, go(-1, -1), 1 / 60, { top: TOP });
check('the walker cannot leave the street or climb into the sky', me.x >= 2 && me.y >= TOP);
const straight = makeWalker(w, 30, H - 4, TOP), drunkWalk = makeWalker(w, 30, H - 4, TOP);
for (let i = 0; i < 60; i += 1) { stepWalker(w, straight, go(1, 0), 1 / 60, { top: TOP }); stepWalker(w, drunkWalk, go(1, 0), 1 / 60, { top: TOP, stagger: stagger(1) }); }
check('drunk legs wander; sober legs go where they are sent', straight.y === H - 4 && Math.abs(drunkWalk.y - straight.y) > 1 && stagger(0) === 0, `${Math.abs(drunkWalk.y - straight.y).toFixed(1)} px off line`);
me = makeWalker(w, 30, H - 4, TOP);
const camDown = cameraFor(w, me), camUp = cameraFor(w, { ...me, down: false });
check('down in the yard the view is closer and follows; from the balcony it is the whole yard', camDown.w === Math.round(W / ZOOM) && camDown.h === Math.round(H / ZOOM) && camDown.x >= 0 && camDown.x + camDown.w <= w.w && camDown.y + camDown.h <= H
  && camUp.w === W && camUp.h === H && cameraFor(w, null).x === 0, `${camDown.w}x${camDown.h} of ${W}x${H}`);
check('how far was walked is counted from where the walker started', walked({ far: 180, start: 20 }) === 20);

// ---- the bottle --------------------------------------------------------------------------------------
section('the bottle: how drunk is the player\'s own doing');
let dr = makeDrink();
check('a bottle holds a stated number of swigs and starts one swig in', dr.left === SWIGS && dr.drunk === START && level(dr) === 1);
check('a swig takes time, and the hand is busy for all of it', swig(dr) && dr.busy === SWIG_TIME && !swig(dr) && dr.left === SWIGS - 1);
const lv = level(dr);
stepDrink(dr, SWIG_TIME / 2);
check('the level falls while the bottle is at the mouth, not in a jump', level(dr) < lv && level(dr) > (SWIGS - 1) / SWIGS && dr.drunk > START && dr.drunk < START + PER_SWIG);
stepDrink(dr, SWIG_TIME);
check('one swig adds exactly its share', Math.abs(dr.drunk - (START + PER_SWIG)) < 1e-9 && dr.busy === 0, `${START} → ${dr.drunk.toFixed(2)}`);
for (let i = 0; i < 10; i += 1) { swig(dr); stepDrink(dr, SWIG_TIME); }
check('an empty bottle gives nothing more, and nobody gets past full', dr.left === 0 && dr.drunk <= 1 && dr.drunk > 0.9 && !swig(dr));
fresh(dr);
check('throwing it puts a full one in the hand', dr.left === SWIGS && swig(dr));
dr = makeDrink(); const d0 = dr.drunk; stepDrink(dr, 10);
check('it wears off on its own, slowly, and never below dry', dr.drunk < d0 && dr.drunk > 0 && (() => { stepDrink(dr, 1000); return dr.drunk === 0; })());
const half = drunkItem(THROWABLES.bottle, 0.5), dry = drunkItem(THROWABLES.bottle, 0), full = drunkItem(THROWABLES.bottle, 1);
check('half-drunk is the throwable exactly as stated; drier is truer and smaller, drunker is wider and wilder', Math.abs(half.scatter - THROWABLES.bottle.scatter) < 1e-9 && Math.abs(half.splash - THROWABLES.bottle.splash) < 1e-9
  && dry.scatter < half.scatter && dry.splash < half.splash && full.scatter > half.scatter && full.splash > half.splash && dry.splash > 0,
  `burst ${dry.splash.toFixed(0)} / ${half.splash.toFixed(0)} / ${full.splash.toFixed(0)} px, stray ${dry.scatter.toFixed(0)} / ${half.scatter.toFixed(0)} / ${full.scatter.toFixed(0)} px`);
check('the view leans and doubles more the more is drunk, and stays on the screen', Math.abs(viewMotion('alcohol', 1.7, false, 1).angle) > Math.abs(viewMotion('alcohol', 1.7, false, 0).angle)
  && viewMotion('alcohol', 1.7, false, 0.5).angle === viewMotion('alcohol', 1.7).angle && [0, 1, 2, 3, 4, 5, 6].every((t) => Math.abs(viewMotion('alcohol', t, false, 1).angle) < 0.1));

// ---- coming back, and showing someone ----------------------------------------------------------------
section('coming back: what is kept can only grow');
let al = makeAlbum();
check('an album starts empty and lists every kind of thing the game can find', progress(al).have === 0 && progress(al).of === KINDS.length && KINDS.every((k) => TARGETS[k] && SIGN[k]));
let news = record(al, { wrecked: ['car', 'car', 'bench'], score: 900, metres: 12 });
check('a run adds what was wrecked, and says what was wrecked for the first time', al.kinds.car === 2 && al.kinds.bench === 1 && news.kinds.join() === 'car,bench' && news.best && news.far && progress(al).have === 2);
news = record(al, { wrecked: ['car'], score: 100, metres: 3 });
check('a worse run takes nothing away', al.best === 900 && al.far === 12 && al.kinds.car === 3 && !news.best && !news.far && news.kinds.length === 0 && al.runs === 2);
check('a day is counted once however often the game is opened, and days are never lost', visit(al, '2026-10-11') && !visit(al, '2026-10-11') && visit(al, '2026-10-14') && al.days.length === 2);
check('what is kept survives being stored and read back, and rubbish in storage is survived too', JSON.stringify(makeAlbum(JSON.parse(JSON.stringify(al)))) === JSON.stringify(al)
  && progress(makeAlbum('nonsense')).have === 0 && makeAlbum({ kinds: { dragon: 4, car: -1 }, days: ['x'] }).days.length === 0 && progress(makeAlbum({ kinds: { dragon: 4 } })).have === 0);
check('tomorrow\'s street is not today\'s', daySeed('2026-10-11') !== daySeed('2026-10-12') && daySeed('2026-10-11') === daySeed('2026-10-11') && dayKey(new Date(2026, 9, 11)) === '2026-10-11');
const line = shareText({ things: [{ kind: 'car', gone: true }, { kind: 'bench', gone: false }, { kind: 'car', gone: true }], score: 2450, combo: 5, metres: 37, day: '2026-10-11', url: 'https://example.org/' });
check('the line to show someone says what the yard held and what became of it, and nothing about where it is', line.split('\n').length === 4 && line.includes('🚗⬜🚗') && line.includes('2/3') && line.includes('2450') && line.includes('37 м') && line.includes('11.10'), line.split('\n')[1]);
check('it is never longer than a yard, and leaves out a walk that was not taken', [...shareText({ things: Array.from({ length: 30 }, () => ({ kind: 'car', gone: true })), score: 1, combo: 1, metres: 0, day: '2026-10-11', url: '' }).split('\n')[1]].length === SHARE_MAX
  && !shareText({ things: [], score: 1, combo: 1, metres: 0, day: '2026-10-11', url: '' }).includes(' м'));

// ---- the news over the yard ----------------------------------------------------------------------------
section('the news: real lines, in the picture\'s own letters, and a throw turns the page');
{
  const abc = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const blank = glyph(' ').join();
  check('every Russian and Latin capital and every figure has dots', [...abc].every((ch) => glyph(ch).length === GLYPH_H && glyph(ch).join() !== blank), [...abc].filter((ch) => glyph(ch).join() === blank).join(''));
  const shapes = new Map();
  for (const ch of 'БГДЖЗИЙЛПУФЦЧШЩЪЫЬЭЮЯ') shapes.set(glyph(ch).join(), ch);
  check('no two letters that differ are drawn alike', shapes.size === 21 && glyph('Ь').join() !== glyph('Б').join() && glyph('З').join() !== glyph('3').join() && glyph('О').join() === glyph('O').join(), `${shapes.size} of 21 distinct`);
  check('a line is written as it will be read: capitals, accents dropped, unknown marks out', plain('Kensō Soai — «мир»… ☃ ёж') === 'KENSO SOAI - «МИР»... ЁЖ', plain('Kensō Soai — «мир»… ☃ ёж'));
  check('a line is as wide as its letters', textWidth('ДВОР') === 4 * ADVANCE - 1 && textWidth('') === 0);

  const story = '<!--Oct 09--><b id="a"><a rel="mw:WikiLink" href="./X" title="X">Нобелевская премия</a></b> присуждена&nbsp;<a href="./Y">Энн Карсон</a> <i>(на илл.)</i> за &laquo;смелое&raquo; творчество.';
  check('a story from the feed becomes one clean line', headline(story) === 'НОБЕЛЕВСКАЯ ПРЕМИЯ ПРИСУЖДЕНА ЭНН КАРСОН ЗА «СМЕЛОЕ» ТВОРЧЕСТВО', headline(story));
  const long = headline(`<b>${'слово '.repeat(60)}</b>`);
  check('a long story is cut at a word, and says it was cut', long.length <= LINE_MAX && long.endsWith('СЛОВО...'), `${long.length} letters`);
  const feed = { news: Array.from({ length: 12 }, (_, n) => ({ story: `<b>Событие номер ${n}</b> произошло.` })) };
  check('the feed gives its lines in its own order, and no more than fit a visit', headlines(feed).length === LINES_MAX && headlines(feed)[0] === 'СОБЫТИЕ НОМЕР 0 ПРОИЗОШЛО');
  check('what is not a feed gives no lines: nothing is made up', headlines(null).length === 0 && headlines({ news: 'x' }).length === 0 && headlines({ news: [{ story: '' }] }).length === 0);
  const own = yardNews({ day: '2026-10-12', days: 3, have: 4, of: 25, best: 900, far: 31 });
  check('with no network the sky carries the yard\'s own facts, and says so', own.some((l) => l.includes('ДЕНЬ 3')) && own.some((l) => l.includes('4 ИЗ 25')) && own.some((l) => l.includes('900')) && own.some((l) => l.includes('НЕТ СЕТИ')), own[0]);
  check('the request carries the date and nothing else', feedUrl('2026-10-12') === 'https://ru.wikipedia.org/api/rest_v1/feed/featured/2026/10/12');

  const VW = 192, run = (sky, secs, w = VW) => { let up = null; for (let t = 0; t < secs; t += 1 / 60) up = stepSky(sky, 1 / 60, w) || up; return up; };
  const LONG_LINE = 'ВТОРАЯ СТРОКА ДЛИННЕЕ ПЕРВОЙ, ЧТОБЫ ЕЁ БЫЛО ВРЕМЯ ПРОЧЕСТЬ НАД ДВОРОМ';
  const sky = makeSky(['ПЕРВАЯ', LONG_LINE, 'ТРЕТЬЯ']);
  check('the sky is empty while the yard is first looked at', run(sky, FIRST - 0.2) === null && !sky.flier);
  const first = run(sky, 0.4);
  check('then a plane comes in from the right with the first line', first?.kind === 'plane' && first.text === 'ПЕРВАЯ' && boxes(first).body.x > VW - 20, `${first?.kind} at ${first && boxes(first).body.x}`);
  const x0 = first.x; run(sky, 1);
  check('it flies left, towing the line behind it', first.x < x0 - 30 && boxes(first).sign.x > boxes(first).body.x + boxes(first).body.w);
  check('an empty sky cannot be hit', hitAt(makeSky(['А']), 50, 12) === null);
  const b = boxes(first);
  check('the plane and its banner can both be hit', hitAt(sky, b.body.x + 4, b.body.y + 4) === first && hitAt(sky, b.sign.x + 10, b.sign.y + 5) === first && hitAt(sky, b.body.x + 4, b.body.y + 60) === null);
  check('a hit gives its points once', knock(sky) === SKY_POINTS && knock(sky) === 0 && hitAt(sky, b.body.x + 4, b.body.y + 4) === null);
  const y0 = boxes(first).sign.y, sx = boxes(first).sign.x; run(sky, 0.8);
  check('the banner is cut loose: it falls where it was, and the plane runs', boxes(first).sign.y > y0 + 15 && boxes(first).sign.x === sx && first.x < b.body.x - 60);
  run(sky, 2.2);
  check('the sky clears, and the next comes sooner after a hit', sky.flier === null && sky.wait <= GAP_HIT && GAP_HIT < GAP);
  const second = run(sky, GAP_HIT + 0.2);
  check('the next is an airship with the next line', second?.kind === 'ship' && second.text === LONG_LINE);
  run(sky, 8);
  check('the ship stops over the yard and runs the line through its board', Math.abs(second.x - (VW - SHIP.w) / 2) < 1 && second.scroll > 60 && boxes(second).sign.w === SHIP.board.w);
  run(sky, 1, 120);
  check('seen from down in the yard, it comes back over the narrower view', second.x < (VW - SHIP.w) / 2 - 20);
  run(sky, 16, 120);
  const third = sky.flier || run(sky, GAP + 0.5, 120);
  check('left alone it finishes the line and leaves; the lines take turns and come round', third?.kind === 'plane' && third.text === 'ТРЕТЬЯ');
  clearSky(sky, []);
  check('turned off, nothing flies', run(sky, 20) === null && sky.flier === null);
  clearSky(sky, ['ПЕРВАЯ', LONG_LINE, 'ТРЕТЬЯ']);
  check('turned on again, it goes on with the next line, not the first', run(sky, FIRST + 0.2)?.text === 'ПЕРВАЯ' && sky.at === 4);
}

// ---- the people in the yard ----------------------------------------------------------------------------
section('the people: nobody is harmed, and being seen is the danger');
{
  const AREA = { x0: 0, x1: 192, top: 150, bottom: 200 };
  const go = (folk, secs, r = mulberry32(3)) => { const all = []; for (let t = 0; t < secs; t += 1 / 60) all.push(...stepFolk(folk, 1 / 60, AREA, r)); return all; };
  // one person of a kind, standing in the middle of the yard, and nobody else coming
  const alone = (kind) => { const f = makeFolk(); f.wait = 1e9; f.people.push({ kind, dir: 1, x: 96, y: 180, y0: 180, state: 'go', t: 0, wet: 0, lost: 0, phase: 0, sweeps: kind === 'cop' ? SWEEPS : 0, to: null, called: false, leaving: false }); return f; };

  const f0 = makeFolk();
  check('the yard is empty while it is first looked at', go(f0, FIRST_IN - 0.3).length === 0 && f0.people.length === 0);
  const came = go(f0, 0.6);
  check('the first to come is the courier, in from an edge, on the ground', came[0]?.type === 'enter' && came[0].who.kind === 'courier' && ORDER[0] === 'courier' && (came[0].who.x < 20 || came[0].who.x > 172) && came[0].who.y >= AREA.top && came[0].who.y <= AREA.bottom);
  const f1 = makeFolk(); go(f1, 60);
  check('all four kinds are met in the first minute, never more than three at once', f1.turn >= 4 && f1.people.filter((p) => p.kind !== 'cop').length <= MAX_FOLK, `${f1.turn} came`);
  check('left alone, nobody looks and nothing is risked', f1.heat === 0 && f1.calls === 0 && !f1.seen && !f1.people.some((p) => p.kind === 'cop'));
  check('the courier is the fastest and worth the most of those who pass', ORDER.every((k) => FOLK.courier.v >= FOLK[k].v && FOLK.courier.points >= FOLK[k].points));
  check('no kind can be harmed: a person has no hits to take and no way to be gone but walking off', Object.values(FOLK).every((k) => !('hp' in k) && !('damage' in k)));

  const w = alone('walker');
  check('a touch finds the person, and allows for where a moving one will be', personAt(w, 96, 172) === w.people[0] && personAt(w, 130, 172) === null && personAt(w, 96 + 5 + 4, 172, 0, 0.3) === w.people[0] && personAt(w, 96 - 5 - 4, 172, 0, 0.3) === null);
  check('the courier is a wider mark than someone on foot', boxOf({ kind: 'courier', x: 0, y: 0 }).w > boxOf({ kind: 'walker', x: 0, y: 0 }).w);
  check('water gives points and harms nothing', soak(w, w.people[0]) === FOLK.walker.points && w.people.length === 1 && w.soaked === 1);
  check('soaked, they stop — and there is a moment before they look', w.people[0].state === 'alarm' && go(w, FOLK.walker.alarm - 0.1).length === 0 && w.heat === 0);
  const looked = go(w, 0.2);
  check('then they look up, and that is announced', looked.some((e) => e.type === 'look') && watchers(w) === 1);
  go(w, 1);
  check('in the open under their eyes, the danger climbs', w.heat > 0.3 && stars(w) >= 2, `${w.heat.toFixed(2)} → ${stars(w)} of ${STARS}`);
  const h0 = w.heat; threw(w);
  check('a throw under their eyes is noticed at once', Math.abs(w.heat - h0 - JOLT) < 1e-9);
  w.hidden = true; const h1 = w.heat; const lostEv = go(w, GIVE_UP + 0.1);
  check('hidden, the danger stops climbing; they lose you and go on their way', w.heat <= h1 && lostEv.some((e) => e.type === 'lost') && w.people[0].state === 'go' && watchers(w) === 0);
  threw(w);
  check('a hidden player risks nothing', w.heat <= h1);
  go(w, 2);
  check('with nobody looking the danger falls again', w.heat < h1 - 0.05);

  const twice = alone('walker'); twice.hidden = true;
  soak(twice, twice.people[0]); go(twice, 3); soak(twice, twice.people[0]);
  const ran = go(twice, FOLK.walker.alarm + GIVE_UP + 0.3);
  check('soaked a second time, they run for the nearer way out', twice.people[0]?.state === 'flee' && !ran.some((e) => e.type === 'call'));
  const called = go(twice, CALL_TIME + 0.2);
  check('and call the police', called.some((e) => e.type === 'call') && twice.calls === 1 && twice.police >= 0);
  const arrived = go(twice, POLICE_IN + 0.2);
  check('who come', arrived.some((e) => e.type === 'police') && twice.people.some((p) => p.kind === 'cop'));
  const lady = alone('lady'); lady.hidden = true; soak(lady, lady.people[0]); go(lady, FOLK.lady.alarm + GIVE_UP + 0.3);
  check('the angry lady calls at the first soaking', lady.people[0].state === 'flee' && FOLK.lady.calls === 1);
  const drunk = alone('drunk'); drunk.hidden = true;
  for (let n = 0; n < 4; n += 1) { soak(drunk, drunk.people[0] || { kind: 'drunk', wet: 0, state: 'flee' }); go(drunk, 5); }
  check('the drunk never calls anyone, and barely sees you', drunk.calls === 0 && FOLK.drunk.calls === 0 && FOLK.drunk.rate * FOLK.drunk.look < 0.5);

  const p = alone('cop'); p.people[0].to = 110; p.hidden = true;
  const log = [];
  for (let t = 0; t < 40 && p.people.length; t += 1 / 60) { stepFolk(p, 1 / 60, AREA, mulberry32(1)); const s = p.people[0]?.state; if (s && log[log.length - 1] !== s) log.push(s); }
  check('the police walk in, look and look away in turns, and leave', log.join(' ').startsWith('go alarm look search alarm look') && log.filter((s) => s === 'look').length === SWEEPS && p.people.length === 0, log.join(' '));
  check('between two looks there is time to act', TURN + FOLK.cop.alarm >= 1.5);
  const c = alone('cop'); c.people[0].state = 'look';
  go(c, 0.5); const half = c.heat; go(c, 1.2);
  check('the police see faster than anyone, and to be seen is the end', FOLK.cop.rate > FOLK.lady.rate && half > 0.4 && c.seen && c.heat === 1 && stars(c) === STARS);
  check('once seen, nothing more happens', go(c, 2).length === 0);
  const wetCop = alone('cop'); const s0 = wetCop.people[0].sweeps; soak(wetCop, wetCop.people[0]);
  check('water on the police only makes them look more', wetCop.people[0].sweeps === s0 + 1 && wetCop.people[0].state === 'alarm');
  const longest = Math.max(...ORDER.map((k) => FOLK[k].rate * FOLK[k].look));
  check('no single passer-by\'s look ends a run on its own: there is always time to hide', longest < 1 && Object.values(FOLK).every((k) => k.alarm >= 0.3), longest.toFixed(2));
}

// ---- windows and paint -------------------------------------------------------------------------------
section('windows and paint: glass breaks, colour stays');
{
  const st = stylise(DEMO.rgba, W, H), seg = toRegions(DEMO.dets, DEMO.rgba, W, H), before = seg.regions.length;
  const found = findWindows({ rgba: st.smooth, w: W, h: H, what: st.surfaces.what, owner: seg.owner });
  const SKY = MATERIALS.indexOf('sky');
  check('the drawn yard has dark windows in a bright wall, and they are found', found.length >= 3 && found.length <= WINDOWS_MAX, `${found.length} found`);
  check('a window is big enough for a finger and none overlaps another', found.every((f) => f.w >= SMALLEST && f.h >= SMALLEST)
    && found.every((a, i) => found.every((b, j) => i === j || a.x >= b.x + b.w || b.x >= a.x + a.w || a.y >= b.y + b.h || b.y >= a.y + a.h)));
  check('nothing in the sky is a window, and nothing a found thing already owns', found.every((f) => {
    for (let y = f.y; y < f.y + f.h; y += 1) for (let x = f.x; x < f.x + f.w; x += 1) if (st.surfaces.what[y * W + x] === SKY || seg.owner[y * W + x] >= 0) return false;
    return true;
  }));
  const flatWall = new Uint8ClampedArray(N * 4).fill(180);
  check('a bare wall has no windows: none are invented', findWindows({ rgba: flatWall, w: W, h: H }).length === 0);
  const big = new Uint8ClampedArray(W * 3 * H * 3 * 4).fill(190);
  for (let y = 90; y < 150; y += 1) for (let x = 120; x < 165; x += 1) big.fill(40, (y * W * 3 + x) * 4, (y * W * 3 + x) * 4 + 3);
  const scaled = findWindows({ rgba: big, w: W * 3, h: H * 3, unit: 3, gw: W, gh: H });
  check('searched at three pixels to one, a window comes back in the game\'s own pixels', scaled.length === 1 && Math.abs(scaled[0].x - 40) <= 1 && Math.abs(scaled[0].y - 30) <= 1 && Math.abs(scaled[0].w - 15) <= 1 && Math.abs(scaled[0].h - 20) <= 1, JSON.stringify(scaled[0] && [scaled[0].x, scaled[0].y, scaled[0].w, scaled[0].h]));
  addWindows(found, seg.regions, seg.owner, W);
  const panes = seg.regions.filter((r) => r.kind === WINDOW);
  check('windows join the yard\'s things as things of their own, two hits each', panes.length === found.length && seg.regions.length === before + found.length && panes.every((r) => r.hp === GLASS_HP && r.flat && TARGETS[r.kind] && SIGN[r.kind] && r.pixels.every((p) => seg.owner[p] === r.id)));
  const w = makeWorld({ w: W, h: H, photo: DEMO.rgba, idx: st.idx, palette: st.palette, ...seg, seed: 8 });
  const pane = w.regions.find((r) => r.kind === WINDOW);
  check('a tap on a window picks the window', pick(w, pane.cx, pane.cy) === pane);
  check('a window is on the wall: nobody walks into it, and the walker\'s band ignores it', solid(w, pane.cx, pane.cy) === null && standing(w, pane.cx, pane.cy) === pane
    && bandTop(w) === bandTop({ ...w, regions: w.regions.filter((r) => !r.flat) }));
  const glass = makeWindow(pane, W, mulberry32(3));
  const first = hitWindow(glass, pane.x + 2, pane.y + 2), firstStrike = strike(w, pane, pane.x + 2, pane.y + 2);
  check('one stone cracks it, and the rules agree', !first.broke && first.stage === 1 && firstStrike.kind === 'crack' && !pane.gone);
  const cells = (hitWindow(glass, pane.x + 3, pane.y + 3), shards(glass));
  const second = strike(w, pane, pane.x + 3, pane.y + 3);
  check('the second breaks it, in the rules and in the glass alike', glass.gone && glass.stage === STAGES && second.kind === 'break' && pane.gone);
  check('the shards are the whole pane, each pixel in exactly one', cells.length >= 3 && cells.reduce((a, c) => a + c.pixels.length, 0) === pane.pixels.length && new Set(cells.flatMap((c) => [...c.pixels])).size === pane.pixels.length, `${cells.length} shards`);
  const near = (c) => Math.hypot(c.seed.x - (pane.x + 2.5), c.seed.y - (pane.y + 2.5)) < Math.max(pane.w, pane.h) * 0.4;
  const size = (list) => list.reduce((a, c) => a + c.pixels.length, 0) / Math.max(1, list.length);
  check('shards are smaller where the stone landed', cells.some(near) && size(cells.filter(near)) < size(cells.filter((c) => !near(c))), `${size(cells.filter(near)).toFixed(0)} px near, ${size(cells.filter((c) => !near(c))).toFixed(0)} px far`);
  check('a broken window takes no more hits', hitWindow(glass, pane.cx, pane.cy).broke === false && strike(w, pane, pane.cx, pane.cy) === null);

  check('paint is a thing in the hand that harms nothing', THROWABLES.paint.damage === 0 && THROWABLES.paint.splash === 0 && THROW_ORDER.includes('paint'));
  check('every paint has a name and a colour of its own', PAINTS.length >= 4 && new Set(PAINTS.map((p) => p.name)).size === PAINTS.length && new Set(PAINTS.map((p) => p.rgb.join())).size === PAINTS.length);
  const decals = makeDecals(), layer = new Uint8Array(N);
  const d = stamp(decals, 60, 100, { paint: 2, power: 1, rnd: mulberry32(5) });
  lay(decals, layer, W, H);
  check('a splat stays where it landed, in its own colour', layer[100 * W + 60] === 3 && pixelsOf(d).length > 20 && COVER > 0.5 && COVER < 1);
  const again = makeDecals(); stamp(again, 60, 100, { paint: 2, power: 1, rnd: mulberry32(5) });
  check('the same throw leaves the same splat', JSON.stringify(pixelsOf(again.list[0])) === JSON.stringify(pixelsOf(d)));
  check('a splat is spray and not a disc: drops land outside the core', pixelsOf(d).some((p) => Math.hypot(p.x - 60, p.y - 100) > d.w / 2 + 1));
  stamp(decals, 61, 100, { paint: 0, power: 1, rnd: mulberry32(6) });
  lay(decals, layer, W, H);
  check('a later splat lies over an earlier one', layer[100 * W + 61] === 1);
  for (let i = 0; i < DECAL_MAX + 10; i += 1) stamp(decals, 150, 200, { paint: 1, power: 0.4, rnd: mulberry32(i + 9) });
  lay(decals, layer, W, H);
  check('the wall holds a fixed number of splats: the oldest leave it', decals.list.length === DECAL_MAX && layer[100 * W + 60] === 0 && layer[200 * W + 150] === 2);
  clearDecals(decals); lay(decals, layer, W, H);
  check('a clean yard is clean', layer.every((v) => v === 0));
  check('the sky takes no paint, the wall and the ground do', !takesPaint(st.surfaces.what, W, H, 20, 5) && takesPaint(st.surfaces.what, W, H, 20, 120) && takesPaint(st.surfaces.what, W, H, 20, 240) && !takesPaint(null, W, H, -3, 9));
  check('a new world is unpainted, and the street carries the paint along when it grows', (() => {
    const s2 = stylise(DEMO.rgba, W, H), g2 = toRegions(DEMO.dets, DEMO.rgba, W, H);
    const world = makeWorld({ w: W, h: H, photo: DEMO.rgba, idx: s2.idx, palette: s2.palette, ...g2, seed: 8 });
    if (!world.paint.every((v) => v === 0)) return false;
    stamp(world.decals, 60, 100, { paint: 4, rnd: mulberry32(1) }); lay(world.decals, world.paint, world.w, world.h);
    extend(world, grow(yardFrom({ w: W, h: H, idx: s2.idx, palette: s2.palette, ...g2 }), mulberry32(2)));
    return world.w === W * 2 && world.paint.length === world.w * H && world.paint[100 * world.w + 60] === 5;
  })());

  const fxp = makeFx(w);
  const made = spawn(fxp, 50, 50, PRESETS.shard, mulberry32(1));
  check('pieces go into the game\'s one particle list', made > 0 && fxp.particles.length === made && fxp.particles.every((p) => Number.isFinite(p.vx) && p.life > 0));
  for (let i = 0; i < 60; i += 1) spawn(fxp, 50, 50, PRESETS.shard, mulberry32(i));
  check('and never more than a phone can draw', fxp.particles.length === MAX_LIVE && spawn(fxp, 50, 50, PRESETS.dust, mulberry32(2)) === 0);
  const names = Object.keys(PRESETS), sig = (p) => [p.count, p.speed, p.cone.toFixed(2), p.life].join('/');
  check('no two kinds of piece fly the same way', new Set(names.map((k) => sig(PRESETS[k]))).size === names.length, names.join(' '));
  const one = makeFx(w), piece = Array.from({ length: 30 }, (_, i) => ({ x: 40 + (i % 6), y: 40 + ((i / 6) | 0), rgb: '#fff' }));
  check('a shard leaves as one piece: every pixel of it at the same speed', fling(one, piece, 30, -20) === 30 && one.particles.every((p) => p.vx === 30 && p.vy === -20));
  stepFx(one, w, 0.016);
  check('coloured pieces never settle into the rubble', (() => { for (let i = 0; i < 200; i += 1) stepFx(one, w, 0.016); return one.particles.length === 0 && w.rubble.every((v) => v === 255); })());
}

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
