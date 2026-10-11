// The flow: a photograph, a search for the real things in it, a scan, a yard to take apart, a score, again.
//
// Nothing here decides anything. detect.js says what is in the photograph, objects.js turns that into
// targets, stylise.js makes the picture, modes.js says what is in the hand, world.js says what a hit does,
// fx.js makes it felt, render.js shows it. street.js makes more yard beyond the photograph, walk.js is
// whoever goes down into it, drink.js is the bottle. This file wires them to the page and the finger.

import { stylise } from './stylise.js';
import { toRegions, TARGETS } from './objects.js';
import { loadDetector, detectAll, DETECT_LONG } from './detect.js';
import { demoYard } from './demo.js';
import { makeWorld, pick, strike, tick, left } from './world.js';
import { makeFx, throwThing, impact, burst, stepFx, shakeOffset } from './fx.js';
import { MODES, aimWith, splashTargets, chainNext } from './modes.js';
import { viewMotion, clientToWorld, cameraFor, LONG, SHORT, SCAN_TIME } from './view.js';
import { yardFrom, grow, extend, edgeOf, room, bandTop } from './street.js';
import { makeWalker, stepWalker, walked } from './walk.js';
import { makeDrink, swig, fresh, stepDrink, level, drunkMode, stagger, SWIG_TIME } from './drink.js';
import { MAX_YARDS } from './palette.js';
import { makeAlbum, visit, record, progress, shareText, dayKey, dayLabel, daySeed, KINDS, SIGN } from './album.js';
import { makeBuffer, draw, postcard } from './render.js';
import { mulberry32 } from './rng.js';
import { sfx, unlock, setMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('yard'), ctx = canvas.getContext('2d');
const frameEl = $('frame'), tiltEl = $('tilt'), pops = $('pops');
const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
const rnd = mulberry32(8);
const BEST_AT = 'dvor8.best', ALBUM_AT = 'dvor8.album';
const today = dayKey(new Date());
// What is kept between visits. Without storage the game still plays; it only forgets.
const album = (() => { try { return makeAlbum(JSON.parse(localStorage.getItem(ALBUM_AT))); } catch { return makeAlbum(); } })();
try { album.best = Math.max(album.best, Number(localStorage.getItem(BEST_AT)) || 0); } catch { /* as above */ }
const keep = () => { try { localStorage.setItem(ALBUM_AT, JSON.stringify(album)); } catch { /* as above */ } };
let result = null, nudged = 0;   // the last finished run, for sharing; and when the walker was last told to jump

let yard = null;        // the photograph, its picture and its things: kept, so «ЕЩЁ РАЗ» costs nothing
let world = null, fx = null, buf = null;
let stage = 'title';    // title → detect → scan → play → done   (or → empty)
let filter = 'sober', mode = MODES.sober;
let clock = 0, scanT = 0, endIn = 0, last = performance.now();
let motion = viewMotion(filter, 0, calm), shake = { x: 0, y: 0 };
let shown = {}, press = null;
let me = null;                              // whoever walks the yard; nobody until the player first goes down
let cam = { x: 0, y: 0, w: SHORT, h: LONG };   // the part of the street on screen
let drink = makeDrink();
let queue = [], like = null, grown = rnd, top = 0, ended = false, stomps = 0;   // the street still to come, and how it is made
const pad = { x: 0, y: 0, jump: false, once: false }, keys = new Set();

const note = (text) => { $('note').textContent = text; };
const cards = (which) => { for (const id of ['title', 'end', 'empty', 'album']) $(id).hidden = id !== which; };
function paintKeep() {
  const { have, of } = progress(album);
  $('keep').textContent = album.runs ? `день ${album.days.length} · альбом ${have}/${of} · рекорд ${album.best}${album.far ? ` · ушёл на ${album.far} м` : ''}` : '';
  $('albumBtn').hidden = !album.runs;
}
function paintAlbum() {
  const { have, of } = progress(album);
  $('albumCount').textContent = `${have} из ${of} · чего нет — ищи в других дворах`;
  $('albumGrid').replaceChildren(...KINDS.map((k) => {
    const el = document.createElement('span');
    el.className = album.kinds[k] ? 'got' : '';
    el.textContent = album.kinds[k] ? `${SIGN[k]} ${TARGETS[k].ru} ×${album.kinds[k]}` : `· ${TARGETS[k].ru}`;
    return el;
  }));
}

// ---- small pieces of feedback ---------------------------------------------------------------------
function pop(text, x, y, kind = '') {
  while (pops.children.length > 14) pops.firstChild.remove();
  const el = document.createElement('div');
  el.className = `pop ${kind}`;
  el.textContent = text;
  el.style.left = `${Math.max(8, Math.min(92, ((x - cam.x + motion.x) / cam.w) * 100))}%`;
  el.style.top = `${Math.max(6, Math.min(94, ((y - cam.y + motion.y) / cam.h) * 100))}%`;
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
  $('drunkBar').style.width = `${drink.drunk * 100}%`;
  if (drink.left !== shown.sips) { $('sipBtn').textContent = drink.left ? `ГЛОТОК ×${drink.left}` : 'ПУСТО — БРОСАЙ'; shown.sips = drink.left; }
}
function paintView() {
  const down = Boolean(me?.down);
  document.body.dataset.view = down ? 'walk' : 'balcony';
  $('pad').hidden = !down;
  $('viewBtn').textContent = down ? 'НА БАЛКОН' : 'ВО ДВОР';
  pad.x = pad.y = 0; pad.jump = pad.once = false; keys.clear();
  $('knob').style.transform = '';
}
function paintHand() {
  $('hand').textContent = mode.thing.toUpperCase();
  $('hint').textContent = mode.hint;
  $('sip').hidden = filter !== 'alcohol';
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
  const st = stylise(rgba, w, h);
  // `more` are the photographs added afterwards: they are the player's, so «ЕЩЁ РАЗ» keeps them
  yard = { rgba, w, h, st, regions, owner, home: yardFrom({ w, h, idx: st.idx, palette: st.palette, regions, owner }), more: [] };
  begin();
  return true;
}
function begin() {
  world = makeWorld({ w: yard.w, h: yard.h, photo: yard.rgba, idx: yard.st.idx, palette: yard.st.palette, regions: yard.regions, owner: yard.owner, seed: 8 });
  fx = makeFx(world);
  me = null; drink = makeDrink(); queue = [...yard.more]; like = yard.home; grown = mulberry32(daySeed(today));   // today's street top = bandTop(world); ended = false; stomps = 0;
  paintView();
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

// A photograph, cut to the picture's shape. `size` forces that shape (a photograph added to a street must
// match the first); without it the photograph's own orientation decides.
async function decode(file, size = null) {
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
  const [w, h] = size || (ih >= iw ? [SHORT, LONG] : [LONG, SHORT]);
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
  return { w, h, large, small, rgba: small.getContext('2d').getImageData(0, 0, w, h).data };
}

async function fromFile(file) {
  const { w, h, large, small, rgba } = await decode(file);
  stage = 'detect'; world = null; me = null; cards(null); paintView();
  cam = { x: 0, y: 0, w, h };
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

// One more photograph: the exact next stretch of street, in place of a made one. It waits at the end of
// what has been walked so far. The game goes on while the phone searches it.
async function addPhoto(file) {
  if (!yard || !world || stage !== 'play') { note('сначала сними первый двор'); return; }
  if (yard.more.length + 1 >= MAX_YARDS) { note(`на одной улице помещается ${MAX_YARDS} снимков`); return; }
  const { w, h } = yard, shot = await decode(file, [w, h]);
  note('ищу вещи на новом снимке…');
  const found = await detectAll(shot.large, (done, total) => note(`ищу вещи на новом снимке ${done}/${total}`));
  const st = stylise(shot.rgba, w, h), next = yardFrom({ w, h, idx: st.idx, palette: st.palette, ...toRegions(found.kept, shot.rgba, w, h) });
  yard.more.push(next);
  if (world) queue.push(next);
  const names = next.regions.map((r) => r.label);
  note(`снимок ${yard.more.length + 1} встал дальше по улице — иди направо · ${names.length ? names.join(', ') : 'вещей на нём не узнал, но улица твоя'}`);
}
function fromDemo() {
  const [w, h] = window.innerHeight >= window.innerWidth ? [SHORT, LONG] : [LONG, SHORT];
  const demo = demoYard(w, h, 8);
  me = null; cam = { x: 0, y: 0, w, h };
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
    if (hit(t, hx, hy, rock.damage, m.combo)) rock.touched.add(t.id);
  }
  // A thing that skips goes on to the nearest standing thing it has not touched.
  if (rock.hops > 0) {
    const from = targets[0], next = chainNext(world, from, rock.touched);
    if (next) throwThing(fx, world, m, rock.kind, next.cx, next.cy, next, { x: from.cx, y: from.cy, hops: rock.hops - 1, touched: rock.touched });
  }
  if (world.done) allClear();
}

// One impact on one thing, from a throw or from a pair of feet: the rules decide, and everything answers.
function hit(t, hx, hy, damage, comboTime) {
  const res = strike(world, t, hx, hy, { damage, combo: comboTime });
  if (!res) return null;
  const broke = res.kind === 'break';
  impact(fx, res.kind, calm);
  burst(fx, res.debris, hx, hy, rnd, broke ? 150 : 70);
  if (broke) sfx.break(res.combo); else sfx.hit(res.combo);
  navigator.vibrate?.(broke ? 35 : 12);
  pop(`+${res.points}`, hx, hy);
  if (broke) pop(t.label.toUpperCase(), t.cx, t.y - 5, 'tag');
  if (res.combo > 1) pop(`x${res.combo}`, cam.x + cam.w / 2, cam.y + cam.h * 0.18, 'big');
  return res;
}

// Nothing is left standing. From the balcony that is the end. Down in the yard there is more street.
function allClear() {
  sfx.done();
  if (me?.down && further() && !world.done) { banner('ЧИСТО · ДАЛЬШЕ ЕЩЁ'); return; }
  endIn = 0.9; banner('ЧИСТО');
}

// More street on the end: the next photograph the player added, or, when there is none, a yard made out
// of the last photograph on the street.
function further() {
  let next = queue.shift();
  if (next) like = next;
  else next = grow(like, grown, edgeOf(world, world.yards.find((y) => y.palette === like.palette).base));
  if (!room(world, next) || !extend(world, next)) {
    if (!ended) { ended = true; banner('КОНЕЦ УЛИЦЫ'); }
    return false;
  }
  top = bandTop(world);
  if (!next.made) { banner('ТВОЙ СНИМОК'); sfx.ready(); }
  return true;
}

// ---- down in the yard ------------------------------------------------------------------------------
function goDown(down) {
  if (!world || stage !== 'play') return;
  if (down && !me) me = makeWalker(world, cam.x + world.sw / 2, world.h - 8, top);
  if (me) me.down = down;
  paintView();
  banner(down ? 'ВО ДВОРЕ' : 'БАЛКОН');
  if (down) note(`улица дня ${dayLabel(today)}: направо за двором она сегодня такая, завтра будет другая`);
}
function walk(dt) {
  const input = {
    x: pad.x + (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0),
    y: pad.y + (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0),
    jump: pad.jump || pad.once || keys.has('jump'),
  };
  pad.once = false;
  const did = stepWalker(world, me, input, dt, { top, stagger: filter === 'alcohol' && !calm ? stagger(drink.drunk) : 0 });
  if (did.jumped) sfx.jump();
  if (did.landed) sfx.land();
  if (did.blocked && clock - nudged > 4) { nudged = clock; pop('ПРЫГАЙ', me.x, me.y - 20, 'tag'); }   // a thing in the way is jumped, and nobody was told
  if (did.stomped) { stomps += 1; hit(did.stomped, me.x, me.y, 1, mode.combo); if (world.done) allClear(); }
  if (me.x > world.w - cam.w * 0.75 && !ended) further();   // before the end of the street can come into view
}
function sip() {
  if (filter !== 'alcohol' || stage !== 'play' || !world) return;
  if (swig(drink)) { sfx.gulp(); navigator.vibrate?.([20, 150, 20]); pop('ГЛОТОК', cam.x + cam.w / 2, cam.y + cam.h * 0.7, 'tag'); }
  else if (drink.left === 0) { sfx.empty(); pop('ПУСТО — БРОСАЙ', cam.x + cam.w / 2, cam.y + cam.h * 0.7, 'tag'); }
}

function finish() {
  stage = 'done';
  const best = album.best, metres = me ? walked(me) : 0;
  const news = record(album, { wrecked: world.regions.filter((r) => r.gone).map((r) => r.kind), score: world.score, metres });
  keep();
  result = { things: world.regions.slice(0, yard.regions.length).map((r) => ({ kind: r.kind, gone: r.gone })), score: world.score, combo: world.maxCombo, metres, day: today };
  const { have, of } = progress(album);
  $('endNews').textContent = `альбом ${have}/${of}${news.kinds.length ? ` · впервые: ${news.kinds.map((k) => `${SIGN[k]} ${TARGETS[k].ru}`).join(', ')}` : ''}${news.far && metres ? ' · так далеко ещё не уходил' : ''}`;
  $('shared').textContent = '';
  $('endScore').textContent = world.score;
  const aim = world.throws ? Math.min(100, Math.round(((world.hits - stomps) / world.throws) * 100)) : 0;   // a burst can hit several things with one throw
  $('endTitle').textContent = world.done ? 'ДВОР РАЗНЕСЁН' : 'ХВАТИТ';
  $('endLine').textContent = `${world.time.toFixed(1)} с · комбо x${world.maxCombo} · бросков ${world.throws} · попаданий ${aim}%${me ? ` · прыжков на вещи ${stomps} · пройдено ${walked(me)} м` : ''}`;
  if (me) me.down = false;
  paintView();
  $('endBest').textContent = news.best ? 'НОВЫЙ РЕКОРД' : `рекорд ${best}`;
  cards('end');
}

// ---- the loop -------------------------------------------------------------------------------------
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  motion = viewMotion(filter, clock, calm, drink.drunk);
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
      stepDrink(drink, dt);
      if (me?.down) walk(dt);
      if (world.done && (endIn -= dt) <= 0) finish();
    }
    cam = cameraFor(world, me);
    if (canvas.width !== cam.w || canvas.height !== cam.h) setSize(cam.w, cam.h);
    // A throw leaves the hand of whoever is down in the yard, or the balcony above the yard on screen; and
    // down there, what can be seen clearly is what is near you.
    if (me?.down) { fx.hand.x = me.x; fx.hand.y = me.y - me.z - 8; fx.focus.tx = me.x; fx.focus.ty = me.y - 6; }
    else { fx.hand.x = cam.x + cam.w / 2; fx.hand.y = world.h + 4; }
    shake = shakeOffset(fx);
    draw(ctx, buf, world, fx, { filter, mode, seconds: clock, scanY, motion, shake, cam, me,
      drink: filter === 'alcohol' ? { full: level(drink), busy: drink.busy / SWIG_TIME } : null });
    paintHud();
  }
  requestAnimationFrame(frame);
}

// ---- the finger -----------------------------------------------------------------------------------
const toWorld = (e) => {
  const at = clientToWorld(e.clientX, e.clientY, frameEl.getBoundingClientRect(), motion.angle,
    { x: motion.x + shake.x, y: motion.y + shake.y }, cam.w, cam.h);
  return { x: at.x + cam.x, y: at.y + cam.y };
};

function throwAt(at) {
  if (fx.cool > 0 || drink.busy > 0) { sfx.miss(); pop('…', at.x, at.y, 'tag'); return; }   // the hand is not free yet
  const live = filter === 'alcohol' ? drunkMode(mode, drink.drunk) : mode;   // as drunk as the player has made it
  const landing = aimWith(live, at.x, at.y, rnd);
  world.throws += 1;
  throwThing(fx, world, live, filter, landing.x, landing.y, live.splash ? null : pick(world, landing.x, landing.y));
  if (filter === 'alcohol') fresh(drink);
  sfx.throw();
}

// Where the narrow view is dark, a finger first LOOKS (drag) and then throws (tap): the throw happens on
// lifting, and only if the finger did not travel. Everywhere else a throw is on touch, with no wait.
tiltEl.addEventListener('pointerdown', (e) => {
  if (stage !== 'play' || world.done) return;
  e.preventDefault();
  unlock();
  const at = toWorld(e);
  if (me?.down) { throwAt(at); return; }   // down in the yard the eye is where you stand, so a touch is a throw
  fx.focus.tx = at.x; fx.focus.ty = at.y;
  if (mode.focus?.out === 'dark') press = { x: e.clientX, y: e.clientY, moved: false };
  else throwAt(at);
});
tiltEl.addEventListener('pointermove', (e) => {
  if (stage !== 'play' || !world || me?.down) return;
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
const home = () => { stage = 'title'; world = null; yard = null; me = null; paintView(); paintKeep(); cards('title'); ctx.clearRect(0, 0, canvas.width, canvas.height); note(''); };
$('newBtn').addEventListener('click', home);
$('homeBtn').addEventListener('click', home);
$('soundBtn').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.textContent = on ? 'ЗВУК' : 'БЕЗ ЗВУКА';
  setMuted(!on);
});

// ---- showing someone ---------------------------------------------------------------------------------
// The line goes to the phone's own share sheet where there is one. A page opened over plain http has
// none, and no clipboard either, so the line is copied the old way and the picture is saved as a file.
function copy(text) {
  const box = document.createElement('textarea');
  box.value = text; box.setAttribute('readonly', ''); box.style.cssText = 'position:fixed;opacity:0';
  document.body.append(box); box.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* not allowed here */ }
  box.remove();
  return ok;
}
async function share(picture) {
  if (!result || !world) return;
  const text = shareText({ ...result, url: /^https:/.test(location.href) ? location.href.split(/[?#]/)[0] : '' });
  try {
    if (picture) {
      const card = postcard(world, 'ДВОР-8', text.split('\n')[2]);
      const blob = await new Promise((done) => card.toBlob(done, 'image/png'));
      const file = new File([blob], `dvor-8-${result.day}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ text, files: [file] }); return; }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      $('shared').textContent = 'картинка сохранена в загрузки';
      return;
    }
    if (navigator.share) { await navigator.share({ text }); return; }
    if (navigator.clipboard) { await navigator.clipboard.writeText(text); $('shared').textContent = 'строка скопирована — вставь её куда хочешь'; return; }
    $('shared').textContent = copy(text) ? 'строка скопирована — вставь её куда хочешь' : text;
  } catch (error) {
    if (error.name !== 'AbortError') $('shared').textContent = copy(text) ? 'строка скопирована — вставь её куда хочешь' : text;
  }
}
$('shareBtn').addEventListener('click', () => share(false));
$('cardBtn').addEventListener('click', () => share(true));
$('albumBtn').addEventListener('click', () => { paintAlbum(); cards('album'); });
$('albumBack').addEventListener('click', () => cards('title'));

// ---- going down, walking, jumping, drinking ---------------------------------------------------------
$('viewBtn').addEventListener('click', () => goDown(!me?.down));
$('stopBtn').addEventListener('click', () => { if (stage === 'play' && world) finish(); });
$('sipBtn').addEventListener('click', sip);
$('more').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (file) addPhoto(file).catch((error) => note(`снимок не добавился: ${error.message}`));
});
// The stick: where the thumb is, from its middle, is where the walker goes.
const stick = $('stick');
const steer = (e) => {
  const r = stick.getBoundingClientRect(), max = r.width / 2;
  let dx = e.clientX - (r.left + max), dy = e.clientY - (r.top + r.height / 2);
  const len = Math.hypot(dx, dy);
  if (len > max) { dx *= max / len; dy *= max / len; }
  pad.x = dx / max; pad.y = dy / max;
  $('knob').style.transform = `translate(${Math.round(dx * 0.6)}px, ${Math.round(dy * 0.6)}px)`;
};
const rest = () => { pad.x = pad.y = 0; $('knob').style.transform = ''; };
stick.addEventListener('pointerdown', (e) => { e.preventDefault(); unlock(); stick.setPointerCapture(e.pointerId); steer(e); });
stick.addEventListener('pointermove', (e) => { if (stick.hasPointerCapture(e.pointerId)) steer(e); });
stick.addEventListener('pointerup', rest);
stick.addEventListener('pointercancel', rest);
$('jumpBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); unlock(); pad.jump = pad.once = true; });
for (const kind of ['pointerup', 'pointercancel', 'pointerleave']) $('jumpBtn').addEventListener(kind, () => { pad.jump = false; });
// A desk has no thumbs: arrows or WASD walk, space jumps, E drinks, V goes down and comes back up.
const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'jump' };
window.addEventListener('keydown', (e) => {
  if (stage !== 'play') return;
  if (e.code === 'KeyV' && !e.repeat) goDown(!me?.down);
  if (e.code === 'KeyE' && !e.repeat) sip();
  if (KEYS[e.code] && me?.down) { keys.add(KEYS[e.code]); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => { keys.delete(KEYS[e.code]); });

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
paintView();
if (visit(album, today)) keep();
paintKeep();
// The model is fetched while the player is still reading the title, so the first photograph does not wait for it.
loadDetector().then(() => note('готов искать вещи на снимке')).catch((error) => note(`детектор не запустился (${error.message}) — работает только демо`));
requestAnimationFrame(frame);
