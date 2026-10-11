// The flow: a photograph, a search for the real things in it, a scan, a yard to take apart, a score, again.
//
// Nothing here decides anything. detect.js says what is in the photograph, objects.js turns that into
// targets, stylise.js makes the picture, modes.js says what is in the hand, world.js says what a hit does,
// fx.js makes it felt, render.js shows it. This file wires them to the page and the finger.

import { stylise } from './stylise.js';
import { toRegions, TARGETS } from './objects.js';
import { loadDetector, detectAll, DETECT_LONG } from './detect.js';
import { demoYard } from './demo.js';
import { makeWorld, pick, strike, tick, left } from './world.js';
import { makeFx, throwThing, impact, burst, stepFx, shakeOffset } from './fx.js';
import { MODES, aimWith, splashTargets, chainNext } from './modes.js';
import { viewMotion, clientToWorld, LONG, SHORT, SCAN_TIME } from './view.js';
import { makeBuffer, draw } from './render.js';
import { mulberry32 } from './rng.js';
import { sfx, unlock, setMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('yard'), ctx = canvas.getContext('2d');
const frameEl = $('frame'), tiltEl = $('tilt'), pops = $('pops');
const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
const rnd = mulberry32(8);
const BEST_AT = 'dvor8.best';

let yard = null;        // the photograph, its picture and its things: kept, so «ЕЩЁ РАЗ» costs nothing
let world = null, fx = null, buf = null;
let stage = 'title';    // title → detect → scan → play → done   (or → empty)
let filter = 'sober', mode = MODES.sober;
let clock = 0, scanT = 0, endIn = 0, last = performance.now();
let motion = viewMotion(filter, 0, calm), shake = { x: 0, y: 0 };
let shown = {}, press = null;

const note = (text) => { $('note').textContent = text; };
const cards = (which) => { for (const id of ['title', 'end', 'empty']) $(id).hidden = id !== which; };

// ---- small pieces of feedback ---------------------------------------------------------------------
function pop(text, x, y, kind = '') {
  while (pops.children.length > 14) pops.firstChild.remove();
  const el = document.createElement('div');
  el.className = `pop ${kind}`;
  el.textContent = text;
  el.style.left = `${Math.max(8, Math.min(92, ((x + motion.x) / world.w) * 100))}%`;
  el.style.top = `${Math.max(6, Math.min(94, ((y + motion.y) / world.h) * 100))}%`;
  el.addEventListener('animationend', () => el.remove());
  pops.append(el);
}
function banner(text, hold = false) {
  const el = $('banner');
  el.textContent = text;
  el.classList.remove('show', 'hold');
  void el.offsetWidth;   // restart the animation
  el.classList.add(hold ? 'hold' : 'show');
}
function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function paintHud() {
  if (!world) return;
  if (world.score !== shown.score) { $('score').textContent = world.score; if (shown.score !== undefined) bump($('score')); shown.score = world.score; }
  if (world.combo !== shown.combo) { $('combo').textContent = world.combo > 1 ? `x${world.combo}` : '—'; if (world.combo > 1) bump($('combo')); shown.combo = world.combo; }
  if (left(world) !== shown.left) { $('left').textContent = left(world); shown.left = left(world); }
  $('comboBar').style.width = `${(world.comboLeft / world.comboWindow) * 100}%`;
  $('coolBar').style.width = mode.cooldown ? `${(1 - fx.cool / mode.cooldown) * 100}%` : '100%';
}
function paintHand() {
  $('hand').textContent = mode.thing.toUpperCase();
  $('hint').textContent = mode.hint;
}

// ---- from a photograph to a yard ------------------------------------------------------------------
function setSize(w, h) {
  canvas.width = w; canvas.height = h;
  document.documentElement.style.setProperty('--aspect', String(w / h));
  buf = makeBuffer(w, h);
}
function build(rgba, w, h, dets) {
  const { regions, owner } = toRegions(dets, rgba, w, h);
  if (!regions.length) return false;
  yard = { rgba, w, h, st: stylise(rgba, w, h), regions, owner };
  begin();
  return true;
}
function begin() {
  world = makeWorld({ w: yard.w, h: yard.h, photo: yard.rgba, idx: yard.st.idx, palette: yard.st.palette, regions: yard.regions, owner: yard.owner, seed: 8 });
  fx = makeFx(world);
  stage = 'scan'; scanT = 0; endIn = 0; shown = {}; press = null;
  pops.replaceChildren();
  $('banner').classList.remove('hold', 'show');
  cards(null);
  paintHud();
}
function nothingFound(why) {
  stage = 'empty'; world = null;
  $('banner').classList.remove('hold', 'show');
  $('emptyWhy').textContent = why;
  cards('empty');
}

async function fromFile(file) {
  // Decoded through an <img>: every phone browser does that, and it turns the photograph the right way
  // up from its EXIF orientation without being asked.
  const url = URL.createObjectURL(file);
  const image = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('снимок не читается'));
    el.src = url;
  }).finally(() => setTimeout(() => URL.revokeObjectURL(url), 1000));
  const iw = image.naturalWidth, ih = image.naturalHeight;
  const [w, h] = ih >= iw ? [SHORT, LONG] : [LONG, SHORT];
  // One crop, two sizes: the detector searches the large one, the game shows the small one, and because
  // they are the same crop a box found in one is the same box in the other.
  const fit = (cw, ch) => {
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const x = c.getContext('2d'), s = Math.max(cw / iw, ch / ih);
    x.imageSmoothingQuality = 'high';
    x.drawImage(image, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
    return c;
  };
  const k = Math.min(DETECT_LONG / Math.max(w, h), Math.max(iw / w, ih / h));
  const large = fit(Math.round(w * k), Math.round(h * k)), small = fit(w, h);
  const rgba = small.getContext('2d').getImageData(0, 0, w, h).data;

  stage = 'detect'; world = null; cards(null);
  setSize(w, h);
  ctx.drawImage(small, 0, 0);
  banner('ИЩУ ВЕЩИ', true);
  note('ищу настоящие вещи на снимке — всё на телефоне, снимок никуда не уходит');
  const t0 = performance.now();
  const found = await detectAll(large, (done, total) => { $('banner').textContent = `ИЩУ ВЕЩИ ${done}/${total}`; });
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const names = found.kept.map((d) => TARGETS[d.label].ru);
  if (build(rgba, w, h, found.kept)) note(`нашёл за ${secs} с: ${names.join(', ')}`);
  else nothingFound(`Искал ${secs} с и не узнал на снимке ничего, что умею узнавать.`);
}
function fromDemo() {
  const [w, h] = window.innerHeight >= window.innerWidth ? [SHORT, LONG] : [LONG, SHORT];
  const demo = demoYard(w, h, 8);
  setSize(w, h);
  build(demo.rgba, w, h, demo.dets);
  note('демо: нарисованный двор, вещи в нём известны заранее');
}

// ---- a landing ------------------------------------------------------------------------------------
function resolve(rock) {
  const m = MODES[rock.kind];
  // What it lands on: everything near, for a thing that bursts; otherwise the one thing it was thrown at.
  const targets = rock.splash ? splashTargets(world, rock.tx, rock.ty, rock.splash) : rock.region && !rock.region.gone ? [rock.region] : [];
  if (rock.splash) {
    sfx.glass();
    burst(fx, Array.from({ length: 10 }, () => ({ x: rock.tx, y: rock.ty, c: 0, rgb: '#35d07f', floor: rock.ty + 8 })), rock.tx, rock.ty + 3, rnd, 60);
  }
  if (!targets.length) {
    // A miss is answered too: a puff and a low note. It costs nothing and it does not end a combo.
    if (!rock.splash) { sfx.miss(); burst(fx, Array.from({ length: 5 }, () => ({ x: rock.tx, y: rock.ty, c: 0, rgb: '#e8e4f0', floor: rock.ty + 5 })), rock.tx, rock.ty + 2, rnd, 40); }
    return;
  }
  for (const t of targets) {
    const hx = Math.max(t.x, Math.min(t.x + t.w, rock.tx)), hy = Math.max(t.y, Math.min(t.y + t.h, rock.ty));
    const res = strike(world, t, hx, hy, { damage: rock.damage, combo: m.combo });
    if (!res) continue;
    const broke = res.kind === 'break';
    impact(fx, res.kind, calm);
    burst(fx, res.debris, hx, hy, rnd, broke ? 150 : 70);
    if (broke) sfx.break(res.combo); else sfx.hit(res.combo);
    navigator.vibrate?.(broke ? 35 : 12);
    pop(`+${res.points}`, hx, hy);
    if (broke) pop(t.label.toUpperCase(), t.cx, t.y - 5, 'tag');
    if (res.combo > 1) pop(`x${res.combo}`, world.w / 2, world.h * 0.18, 'big');
    rock.touched.add(t.id);
  }
  // A thing that skips goes on to the nearest standing thing it has not touched.
  if (rock.hops > 0) {
    const from = targets[0], next = chainNext(world, from, rock.touched);
    if (next) throwThing(fx, world, m, rock.kind, next.cx, next.cy, next, { x: from.cx, y: from.cy, hops: rock.hops - 1, touched: rock.touched });
  }
  if (world.done) { endIn = 0.9; sfx.done(); banner('ЧИСТО'); }
}

function finish() {
  stage = 'done';
  let best = 0;
  try { best = Number(localStorage.getItem(BEST_AT)) || 0; } catch { /* no storage: no record */ }
  const record = world.score > best;
  if (record) { try { localStorage.setItem(BEST_AT, String(world.score)); } catch { /* as above */ } }
  $('endScore').textContent = world.score;
  const aim = world.throws ? Math.round((world.hits / world.throws) * 100) : 0;
  $('endLine').textContent = `${world.time.toFixed(1)} с · комбо x${world.maxCombo} · бросков ${world.throws} · попаданий ${aim}%`;
  $('endBest').textContent = record ? 'НОВЫЙ РЕКОРД' : `рекорд ${best}`;
  cards('end');
}

// ---- the loop -------------------------------------------------------------------------------------
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  motion = viewMotion(filter, clock, calm);
  tiltEl.style.transform = `rotate(${motion.angle}rad)`;
  if (world) {
    let scanY = null;
    if (stage === 'scan') {
      scanT += dt;
      scanY = Math.min(1, scanT / SCAN_TIME) * world.h;
      for (const r of world.regions) {
        if (r.seen || r.cy > scanY) continue;
        r.seen = true;
        sfx.tick(r.id);
        pop(r.label.toUpperCase(), r.cx, r.cy, 'tag');
      }
      if (scanT >= SCAN_TIME) { stage = 'play'; scanY = null; sfx.ready(); banner(`${world.regions.length} ${world.regions.length === 1 ? 'ЦЕЛЬ' : 'ЦЕЛЕЙ'}`); }
    }
    const frozen = fx.freeze > 0;
    for (const rock of stepFx(fx, world, dt)) resolve(rock);
    if (stage === 'play' && !frozen) {
      tick(world, dt);
      if (world.done && (endIn -= dt) <= 0) finish();
    }
    shake = shakeOffset(fx);
    draw(ctx, buf, world, fx, { filter, mode, seconds: clock, scanY, motion, shake });
    paintHud();
  }
  requestAnimationFrame(frame);
}

// ---- the finger -----------------------------------------------------------------------------------
const toWorld = (e) => clientToWorld(e.clientX, e.clientY, frameEl.getBoundingClientRect(), motion.angle,
  { x: motion.x + shake.x, y: motion.y + shake.y }, world.w, world.h);

function throwAt(at) {
  if (fx.cool > 0) { sfx.miss(); pop('…', at.x, at.y, 'tag'); return; }   // still hauling the last one back
  const landing = aimWith(mode, at.x, at.y, rnd);
  world.throws += 1;
  throwThing(fx, world, mode, filter, landing.x, landing.y, mode.splash ? null : pick(world, landing.x, landing.y));
  sfx.throw();
}

// Where the narrow view is dark, a finger first LOOKS (drag) and then throws (tap): the throw happens on
// lifting, and only if the finger did not travel. Everywhere else a throw is on touch, with no wait.
tiltEl.addEventListener('pointerdown', (e) => {
  if (stage !== 'play' || world.done) return;
  e.preventDefault();
  unlock();
  const at = toWorld(e);
  fx.focus.tx = at.x; fx.focus.ty = at.y;
  if (mode.focus?.out === 'dark') press = { x: e.clientX, y: e.clientY, moved: false };
  else throwAt(at);
});
tiltEl.addEventListener('pointermove', (e) => {
  if (stage !== 'play' || !world) return;
  const at = toWorld(e);
  fx.focus.tx = at.x; fx.focus.ty = at.y;
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) press.moved = true;
});
tiltEl.addEventListener('pointerup', (e) => {
  if (!press || stage !== 'play') { press = null; return; }
  const tap = !press.moved;
  press = null;
  if (tap) throwAt(toWorld(e));
});
tiltEl.addEventListener('pointercancel', () => { press = null; });

const shoot = (e) => {
  unlock();
  const file = e.target.files?.[0];
  e.target.value = '';
  if (file) fromFile(file).catch((error) => nothingFound(`Не получилось: ${error.message}`));
};
$('shot').addEventListener('change', shoot);
$('shot2').addEventListener('change', shoot);
for (const id of ['demoBtn', 'demoBtn2']) $(id).addEventListener('click', () => { unlock(); fromDemo(); });
$('againBtn').addEventListener('click', begin);
$('restartBtn').addEventListener('click', () => { if (yard && (stage === 'play' || stage === 'done' || stage === 'scan')) begin(); });
const home = () => { stage = 'title'; world = null; yard = null; cards('title'); ctx.clearRect(0, 0, canvas.width, canvas.height); note(''); };
$('newBtn').addEventListener('click', home);
$('homeBtn').addEventListener('click', home);
$('soundBtn').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.textContent = on ? 'ЗВУК' : 'БЕЗ ЗВУКА';
  setMuted(!on);
});

for (const [id, m] of Object.entries(MODES)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = m.label.toUpperCase();
  button.className = `btn small ${id === filter ? 'on' : 'alt'}`;
  button.addEventListener('click', () => {
    filter = id; mode = m; press = null;
    document.body.dataset.filter = id;
    for (const other of $('filters').children) other.className = `btn small ${other === button ? 'on' : 'alt'}`;
    paintHand();
    if (world && stage === 'play') { banner(m.thing.toUpperCase()); fx.cool = 0; }
  });
  $('filters').append(button);
}

paintHand();
// The model is fetched while the player is still reading the title, so the first photograph does not wait for it.
loadDetector().then(() => note('готов искать вещи на снимке')).catch((error) => note(`детектор не запустился (${error.message}) — работает только демо`));
requestAnimationFrame(frame);
