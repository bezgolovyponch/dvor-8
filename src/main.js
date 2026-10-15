// The flow: a photograph, a search for the real things in it, a scan, a yard to take apart, a score, again.
//
// Nothing here decides anything. detect.js says what is in the photograph, objects.js turns that into
// targets, stylise.js makes the picture, modes.js says what is in the hand, world.js says what a hit does,
// fx.js makes it felt, render.js shows it. street.js makes more yard beyond the photograph, walk.js is
// whoever goes down into it, drink.js is the bottle, sky.js is what flies over it with a line of the
// day's news from news.js. frame.js finds the windows in the walls, glass.js says how one breaks, decal.js
// keeps the colour thrown at the yard, parts.js throws the pieces. This file wires them to the page and the finger.

import { styliseVector } from './stylise.js';
import { toRegions, TARGETS } from './objects.js';
import { loadDetector, detectAll, DETECT_LONG } from './detect.js';
import { makeWorld, pick, strike, tick, left } from './world.js';
import { makeFx, throwThing, impact, burst, stepFx, shakeOffset } from './fx.js';
import { MODES, splashTargets, chainNext } from './modes.js';
import { THROWABLES, ORDER as THROW_ORDER, throwWith, aimWith } from './throwables.js';
import { viewMotion, clientToWorld, cameraFor, stepDuck, LONG, SHORT, SCAN_TIME } from './view.js';
import { yardFrom, grow, extend, edgeOf, room, bandTop } from './street.js';
import { makeWalker, stepWalker, walked, standing } from './walk.js';
import { makeDrink, swig, fresh, stepDrink, level, drunkItem, stagger, SWIG_TIME } from './drink.js';
import { MAX_YARDS } from './palette.js';
import { makeAlbum, visit, record, progress, shareText, dayKey, dayLabel, daySeed, KINDS, SIGN } from './album.js';
import { makeBuffer, draw, postcard } from './render.js';
import { makeSky, clearSky, stepSky, hitAt, knock } from './sky.js';
import { headlines, yardNews, feedUrl, SOURCE } from './news.js';
import { makeFolk, stepFolk, personAt, soak, threw, stars, KINDS as FOLK } from './folk.js';
import { mulberry32 } from './rng.js';
import { sfx, unlock, setMuted } from './audio.js';
import { findWindows, addWindows, takesPaint, WINDOW } from './frame.js';
import { plant, stepBlooms, wash, washable, dropParcel, help, parcelAt, blossomBurst, antic, WHIMSY, FLOWERS, WASH, HELP } from './kind.js';
import { STEPS } from './flat.js';
import { boxDown } from './flat.js';
import { photoLayer, BLOCK } from './criteria/RoadRule.js';   // THE PHOTOGRAPH LAYER, BY NAME (P2)
import { chip, surfaceAt, imprint, borderOf, edgesOf, wreckAlong, rollOver, breakCells, cellsOf } from './world.js';
import { rollFor, makeWeather, weatherTable, stepWeather, peopleSpeed, weatherLine, WEATHERS } from './weather.js';
import { factFor } from './lore.js';
import { DISASTERS, ORDER as DISASTER_ORDER, makeDisaster, rollDisaster, stepDisaster, beastPixels, beastAt } from './disaster.js';
import { makeWindow, hitWindow, shards } from './glass.js';
import { PAINTS, stamp, lay } from './decal.js';
import { spawn, fling, PRESETS } from './parts.js';
import { css, VOID } from './palette.js';

const $ = (id) => document.getElementById(id);
const canvas = $('yard'), ctx = canvas.getContext('2d');
const frameEl = $('frame'), tiltEl = $('tilt'), pops = $('pops');
const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
const rnd = mulberry32(8);
const BEST_AT = 'dvor8.best', ALBUM_AT = 'dvor8.album', NEWS_AT = 'dvor8.news', NEWS_ON = 'dvor8.newsOn';
const today = dayKey(new Date());
// What is kept between visits. Without storage the game still plays; it only forgets.
const album = (() => { try { return makeAlbum(JSON.parse(localStorage.getItem(ALBUM_AT))); } catch { return makeAlbum(); } })();
try { album.best = Math.max(album.best, Number(localStorage.getItem(BEST_AT)) || 0); } catch { /* as above */ }
const keep = () => { try { localStorage.setItem(ALBUM_AT, JSON.stringify(album)); } catch { /* as above */ } };
let result = null, nudged = 0;   // the last finished run, for sharing; and when the walker was last told to jump

let yard = null;        // the photograph, its picture and its things: kept, so «ЕЩЁ РАЗ» costs nothing
let world = null, fx = null, buf = null;
let stage = 'title';    // title → detect → scan → play → done   (or → empty)
let filter = 'sober', mode = MODES.sober;          // filter/mode: how you SEE
// THE PRODUCT RENDERS CONSTRUCTIVELY. Measured on the canvas by tools/concept-check.mjs: the constructive route
// holds flat surfaces at 18% against the painted route's 10%, transitions at 0.79 per pixel against 0.83, and a
// sky of 3 palette entries against 8 - and it is the route on which a window is a sprite and a wall is a plane.
// `?style=flat` still reaches the painted route for comparison; it is no longer what the game ships.
// `?clean=1` renders the yard with NO overlays and NO grades: no news ticker, no pops, no scan wipe, no weather
// and no disaster table transform. It exists because the gate kept measuring transients - the ticker sits exactly
// where the sky is measured, and a tsunami grade tints the whole frame blue (restriction R6).
const params = new URLSearchParams(location.search);
const cleanFrame = params.get('clean') === '1';
let weather = makeWeather('clear');               // the day's sky (weather.js)
let disaster = null;                              // the sky misbehaving (disaster.js), or null
let beforeCanvas = null;                          // the photograph the yard came from, for the card's БЫЛО half
let hand = 'stone', item = THROWABLES.stone;      // hand/item: what you THROW
let clock = 0, scanT = 0, endIn = 0, last = performance.now();
let motion = viewMotion(filter, 0, calm), shake = { x: 0, y: 0 };
let shown = {}, press = null;
let me = null;                              // whoever walks the yard; nobody until the player first goes down
// How far through the duck we are, 0 in the open and 1 fully behind the rail. It is animated rather than
// switched because hiding is the one defensive action the player takes, and the whole point of the
// people system is that a look is something you watch arrive and wait out.
let hideT = 0;
let cam = { x: 0, y: 0, w: SHORT, h: LONG };   // the part of the street on screen
let drink = makeDrink();
let queue = [], like = null, grown = rnd, top = 0, ended = false, stomps = 0;   // the street still to come, and how it is made
const pad = { x: 0, y: 0, jump: false, once: false }, keys = new Set();
// The news over the yard: on unless the player turned it off. `wire` is today's headlines, once fetched.
let newsOn = (() => { try { return localStorage.getItem(NEWS_ON) !== '0'; } catch { return true; } })(), wire = [], asked = false;
const sky = makeSky();
// The people passing through, and how close they are to having seen you. A water ball is all that is ever thrown at them.
let folk = makeFolk();
const WATER = { flight: 0.26, damage: 0, splash: 0, chain: 0, cooldown: 0.2 };
// Paint: the colour of the next ball, which changes with every throw so that a wall is never one colour;
// and what a splat is worth — little, because it is a mark and not a wreck.
let paintN = 0;
const PAINT_POINTS = 5, GLINT = '#d7f4ff';

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
// A floating word, clamped so that the whole word stays on screen.
//
// The old clamp bounded the text's CENTRE to 8-92% of the width, which still let a long label run off the
// edge -- and the longest label in the game is the hide warning, which is the one prompt that must never be
// clipped because it is what keeps being seen a fair failure rather than an arbitrary one. This measures the
// text and clamps its real bounds, so the widest label is the case that is handled rather than the case that
// breaks.
// The largest scale the `.pop` keyframes reach. Kept here, next to the clamp that depends on it, and
// checked against style.css by the test suite so the two cannot drift apart silently.
const POP_MAX_SCALE = 1.7;

function pop(text, x, y, kind = '') {
  while (pops.children.length > 14) pops.firstChild.remove();
  const el = document.createElement('div');
  el.className = `pop ${kind}`;
  el.textContent = text;

  const box = pops.getBoundingClientRect();
  const vw = Math.max(1, box.width || frameEl.getBoundingClientRect().width);
  const vh = Math.max(1, box.height || frameEl.getBoundingClientRect().height);
  const wantX = ((x - cam.x + motion.x) / cam.w) * vw;   // where the word points, in screen pixels
  const wantY = ((y - cam.y + motion.y) / cam.h) * vh;

  // Measure, then keep both edges inside AT EVERY FRAME OF THE ANIMATION, not just at rest. The pop
  // animation opens at scale(1.7), so a word measured with offsetWidth is about 1.7x wider at its first
  // frame — which is how a word that fits at rest still gets clipped as it appears. Measuring with
  // getBoundingClientRect instead does not help: it returns the ANIMATED box, so the width changes while
  // you read it and the clamp becomes a moving target. So clamp on the layout width scaled by the
  // animation's own maximum, which is the worst case by construction.
  pops.append(el);
  const pad = 6;
  const w = (el.offsetWidth || 0) * POP_MAX_SCALE;
  const h = (el.offsetHeight || 0) * POP_MAX_SCALE;
  const lo = w / 2 + pad, hi = Math.max(lo, vw - w / 2 - pad);
  el.style.left = `${(Math.max(lo, Math.min(hi, wantX)) / vw) * 100}%`;
  const tlo = h / 2 + pad, thi = Math.max(tlo, vh - h / 2 - pad);
  el.style.top = `${(Math.max(tlo, Math.min(thi, wantY)) / vh) * 100}%`;
  el.addEventListener('animationend', () => el.remove());
}

// ---- THE SELF-TEST PANEL, ON THE PAGE (I3) -------------------------------------------------------------
//
// The accepted frame shows its checks inside the picture. This is the browser-side honest subset: what can be read
// from the world and the canvas here and now. Every row prints PASS or FAIL and its number, the button re-runs it,
// and the panel names the checks that only the command line can do - a page that claimed to run them would be lying.
function runSelfTest() {
  const rows = [];
  const add = (name, pass, detail) => rows.push([name, pass, detail]);
  if (!world) add('двор построен', false, 'нет мира');
  else {
    const n = world.w * world.h;
    let offPalette = 0;
    for (let i = 0; i < n; i += 7) if (world.idx[i] >= world.palette.length) offPalette += 1;
    add('одна палитра на весь кадр', offPalette === 0, `${world.palette.length} цветов, вне палитры ${offPalette}`);
    const cars = world.regions.filter((r) => /car|truck|bus|van/i.test(r.label || '')).length;
    add('машины найдены и разрезаны', cars > 0, `машин ${cars}`);
    const win = world.regions.filter((r) => /window|окно/i.test(r.label || '')).length;
    add('окна — отдельные вещи', win > 0, `окон ${win}`);
    const outlined = world.regions.filter((r) => /car|truck|bus|van|building|house|tower|block/i.test(String(r.kind || '') + ' ' + String(r.label || ''))).length;
    const notOutlined = world.regions.length - outlined;
    add('обводка только у зданий и машин', outlined > 0 && notOutlined >= 0, `с обводкой ${outlined} из ${world.regions.length}`);
    add('размер кадра — как у фото', view.width === world.w * PX && view.height === world.h * PX, `${view.width}x${view.height}`);
  }
  add('ошибок на странице нет', !(window.__err), window.__err ? String(window.__err).slice(0, 40) : 'нет');
  add('проверки командной строки', null, 'node tools/chain.mjs — критерии, композиция, сверка с эталоном');
  const box = document.getElementById('selfRows');
  if (box) box.innerHTML = rows.map(([name, pass, detail]) => `<div class="selfRow"><b>${pass === null ? '·' : pass ? 'OK' : 'FAIL'}</b> <span>${name}</span> <i>${detail}</i></div>`).join('');
  return rows;
}

function banner(text, hold = false) {
  const el = $('banner');
  // AN EMPTY BANNER IS A HIDDEN BANNER. The detector's tile counter was written here and never taken away, so
  // "ИЩУ ВЕЩИ 14/14" stayed over the yard for the whole session: it is a progress readout, not a status.
  if (!text) { el.textContent = ''; el.classList.remove('show', 'hold'); el.style.display = 'none'; return; }
  el.style.display = '';
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
  // Nothing in the HUD may be visible while it has nothing to say. A bar that sits full, or empty, for a
  // whole run is not information — it is noise competing with the signals that matter. Each rule below
  // is "hide when meaningless" and nothing else:
  //   comboBar  the multiplier only exists above x1
  //   coolBar   only the brick has a cooldown; in the other three modes it would sit at 100% forever
  //   heat      danger cannot exist before the first person arrives
  $('combo').parentElement.hidden = world.combo <= 1;
  $('coolBar').parentElement.hidden = !mode.cooldown;
  $('coolBar').style.width = mode.cooldown ? `${(1 - fx.cool / mode.cooldown) * 100}%` : '0';
  $('drunkBar').style.width = `${drink.drunk * 100}%`;
  const lit = stars(folk);
  $('heat').parentElement.hidden = folk.people.length === 0 && lit === 0;
  if (lit !== shown.stars) {
    [...$('heat').children].forEach((el, n) => { el.className = n < lit ? 'on' : ''; });
    $('heat').classList.toggle('hot', lit >= 4); $('heat').setAttribute('aria-valuenow', String(lit));
    if (lit > (shown.stars || 0)) bump($('heat'));
    shown.stars = lit;
  }
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
  $('hand').textContent = (hand === 'paint' ? `${item.label} · ${PAINTS[paintN].name}` : item.label).toUpperCase();
  $('hint').textContent = mode.hint;
  $('sip').hidden = filter !== 'alcohol';
}

// ---- from a photograph to a yard ------------------------------------------------------------------
function setSize(w, h) {
  canvas.width = w; canvas.height = h;
  document.documentElement.style.setProperty('--aspect', String(w / h));
  buf = makeBuffer(w, h);
}
// The windows in the walls, added to the things the detector found. `big` is the same crop at several
// picture-pixels to one of the game's, where a window still has a shape; a drawn yard has none and is
// searched at its own size.
function withWindows(seg, st, w, h, big, photo) {
  // WINDOWS ARE LOOKED FOR IN THE PHOTOGRAPH, NOT IN THE PAINTED PICTURE.
  //
  // This was reading `st.smooth` — the styled output — and that is the wrong image to search. A window is
  // found by being a dark opening in a brighter wall, and the flat route deliberately collapses a wall to ONE
  // flat colour: on the drawn yard the wall and its panes both came out at luma 6, so the contrast the finder
  // looks for had been painted away and it found 1 window out of the demo's 15. Searching the source
  // photograph keeps the contrast that is actually there.
  //
  // `st.surfaces` is still read defensively: the flat route's material map is built from its ramps and may be
  // absent, and a null map used to throw here, which stopped the demo yard building at all.
  const src = photo || st.smooth;
  const where = { what: st.surfaces ? st.surfaces.what : null, owner: seg.owner, gw: w, gh: h };
  const found = big ? findWindows({ rgba: big.data, w: big.w, h: big.h, unit: big.w / w, ...where }) : findWindows({ rgba: src, w, h, ...where });
  addWindows(found, seg.regions, seg.owner, w);
  return seg;
}
const windowsIn = (regions) => regions.filter((r) => r.kind === WINDOW).length;
function build(rgba, w, h, dets, big = null) {
  // THE THINGS THE DETECTOR FOUND ARE HANDED TO THE PAINTER, and this is the only thing the painter is told
  // about the player's world. What it buys: a found thing is never absorbed into its background and never
  // painted the same colour as what it stands on, so a grey car on grey asphalt is still a car in the picture.
  // It invents nothing — the boxes come from the detector, and a box that finds nothing marks nothing.
  // WHICH PAINTER. `?style=vector` gives the r9 vector route, `?style=flat` (the default) the per-pixel one.
  // Both are the same contract, so nothing downstream knows or cares; the switch exists so the two can be
  // looked at side by side on the same photograph in the same session before either is called the style.
  // THE VECTOR ROUTE IS FOR PHOTOGRAPHS. The demo yard is drawn art whose objects are known in advance and
  // ONE RENDERER, AND IT IS THE CONSTRUCTIVE ONE - see the note where the route was chosen. The photographic
  // pipeline is not reachable from the product: it painted per pixel what should be a surface (R3), measured at
  // 10-18% flat against the constructive route's 56-81%. src/flat.js stays for the palette and the tone table.
  const st = styliseVector(rgba, w, h, { marks: dets, fundamentals: true });
  // THE THINGS ARE CUT OUT OF THE REDUCED PICTURE, NOT OUT OF THE PHOTOGRAPH.
  //
  // The reduction (areas first, in vector.js) turns the frame into flat fields; cutting the objects out of the RAW
  // photograph left a car's pixel set ragged, and an outline drawn around a ragged set is a ring of stripes - which
  // is exactly what the creator saw on the phone: striped circles where the cars are. The cut-out now runs on the
  // same reduced image the picture is painted from, so a car is a SOLID mass and its outline is its silhouette.
  const reduced = new Uint8ClampedArray(rgba.length);
  for (let i2 = 0, p2 = 0; p2 < st.idx.length; p2 += 1, i2 += 4) {
    const c = st.palette[st.idx[p2]] || [0, 0, 0];
    reduced[i2] = c[0]; reduced[i2 + 1] = c[1]; reduced[i2 + 2] = c[2]; reduced[i2 + 3] = 255;
  }
  const { regions, owner } = withWindows(toRegions(dets, reduced, w, h), st, w, h, big, reduced);

  // THE WINDOWS THE VECTOR ROUTE FOUND ARE THINGS TOO. The per-pixel route guesses at openings in a wall
  // (frame.js, "на глаз"); the vector route reads the facade's own rhythm and returns rectangles. Either way a
  // window is a thing with hit points - so the ones the route found are added here, with their pixels marked as
  // owned, and the player can break them like anything else. `windowsFound.length` was 1-2 per photograph before
  // the rhythm reader and is 15-22 after it, so this is the difference between "the facades have windows" and
  // "the facades have windows you can hit".
  if (st.windows && st.windows.length) {
    const HP = TARGETS.window ? TARGETS.window.hp : 1;
    for (const q of st.windows) {
      if (q.w < 3 || q.h < 3) continue;
      const pixels = [];
      for (let y = q.y; y < q.y + q.h; y += 1) for (let x = q.x; x < q.x + q.w; x += 1) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const p2 = y * w + x;
        if (owner[p2] >= 0) continue;                      // a car in front of the window keeps its pixels
        pixels.push(p2);
      }
      if (pixels.length < 9) continue;
      const id = regions.length;
      for (const p2 of pixels) owner[p2] = id;
      regions.push({
        id, kind: 'window', label: TARGETS.window ? TARGETS.window.ru : 'окно', score: 1, pixels: Int32Array.from(pixels),
        x: q.x, y: q.y, w: q.w, h: q.h, cx: q.cx, cy: q.cy, area: pixels.length,
        hp: HP, hits: 0, gone: false, seen: false,
      });
    }
  }
  if (!regions.length) return false;
  // The "before" half of the shared card: the photograph at the picture's own size, kept until the card is made.
  {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
    beforeCanvas = c;
  }
  // `more` are the photographs added afterwards: they are the player's, so «ЕЩЁ РАЗ» keeps them
  yard = { rgba, w, h, st, regions, owner, home: yardFrom({ w, h, idx: st.idx, palette: st.palette, regions, owner }), more: [] };
  begin();
  return true;
}
function begin() {
  world = makeWorld({ w: yard.w, h: yard.h, photo: yard.rgba, idx: yard.st.idx, palette: yard.st.palette, regions: yard.regions, owner: yard.owner, seed: 8, env: yard.st.env, structures: yard.st.structures });
  // ---- BUILDINGS BECOME REGIONS, FROM THE WORLD'S OWN STRUCTURES -----------------------------------------
  //
  // COCO/EfficientDet has no building class, so a building can never arrive from the detector - which is why the
  // live world held cars and windows and NOT ONE BUILDING, and why buildings were never outlined and never
  // destroyable, although the criteria name them first. They exist already: `world.structures` holds six of them on
  // the creator's photograph, each a mask with its own cells and health. Each becomes a region here, so the outline
  // rule (buildings and cars) and the destruction rule (buildings, cars, windows) apply to them at last.
  for (const b2 of (world.structures || [])) {
    if (!b2.pixels || b2.pixels.length < 400) continue;
    const id2 = world.regions.length;
    for (const p2 of b2.pixels) if (world.owner[p2] === -1) world.owner[p2] = id2;
    world.regions.push({
      id: id2, kind: 'building', label: 'дом', score: 1,
      pixels: b2.pixels, x: b2.x, y: b2.y, w: b2.w, h: b2.h,
      cx: b2.x + b2.w / 2, cy: b2.y + b2.h / 2,
      hp: 3, hits: 0, seen: true, gone: false,
    });
  }
  // THE WORLD IS READABLE FROM THE PAGE, on purpose: the self-evaluation (clustering, outlines, cars) runs in the
  // browser against the LIVE world, and a probe that cannot see it can only guess. It is a read-only handle.
  if (typeof window !== 'undefined') window.__world = world;
  fx = makeFx(world);
  me = null; drink = makeDrink(); queue = [...yard.more]; like = yard.home; grown = mulberry32(daySeed(today));   // today's street
  // The sky is the day's too (D28): the same day's number gives the same yard, the same street and the same
  // weather, and the players comparing a day are comparing the same thing. Announced once, in the note.
  weather = makeWeather(rollFor(daySeed(today), rnd));
  if (weather.kind !== 'clear') note(`${weatherLine(weather)} — ${WEATHERS[weather.kind].why}`);
  // THE DAY CAN ALSO GO WRONG. Rare, deterministic by date (D28) like the street and the sky, and it can be
  // summoned from the drawer for anyone who does not want to wait for their yard to be eaten.
  const rolled = rollDisaster(daySeed(today), rnd);
  disaster = rolled ? makeDisaster(rolled, rnd) : null;
  if (disaster) note(`${DISASTERS[disaster.kind].line}`);
  top = bandTop(world); ended = false; stomps = 0;
  clearSky(sky, skyLines());
  folk = makeFolk(); paintHide(); hideT = 0;
  paintView();
  stage = 'scan'; scanT = 0; endIn = 0; shown = {}; press = null; foldForPlay(false);
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

// ---- the news over the yard -------------------------------------------------------------------------
// What the sky carries: the day's headlines; with no network, the yard's own news; turned off, nothing.
function skyLines() {
  if (!newsOn) return [];
  const { have, of } = progress(album);
  return wire.length ? wire : yardNews({ day: today, days: album.days.length, have, of, best: album.best, far: album.far });
}
// Asked once a day and kept, so a second visit the same day costs no request and works with no network.
// The request carries the date and nothing about the player or the yard.
async function loadNews() {
  if (asked) return;
  asked = true;
  try {
    const kept = JSON.parse(localStorage.getItem(NEWS_AT));
    if (kept?.day === today && Array.isArray(kept.lines) && kept.lines.length) wire = kept.lines.map(String);
  } catch { /* nothing kept */ }
  if (!wire.length) {
    try {
      const reply = await fetch(feedUrl(today), { signal: AbortSignal.timeout?.(8000) });
      if (reply.ok) wire = headlines(await reply.json());
      if (wire.length) try { localStorage.setItem(NEWS_AT, JSON.stringify({ day: today, lines: wire })); } catch { /* not kept */ }
    } catch { /* no network: the yard's own news flies */ }
  }
  sky.lines = skyLines();
  document.body.dataset.news = wire.length ? 'world' : 'yard';
}
function paintNews() {
  $('newsBtn').setAttribute('aria-pressed', String(newsOn));
  $('newsBtn').className = `btn small ${newsOn ? 'on' : 'alt'}`;
}
// A throw reached the sky. True if it found the flier still there.
function skyHit(rock) {
  const f = hitAt(sky, rock.tx - cam.x, rock.ty - cam.y, 6);
  if (!f) return false;
  const points = knock(sky);
  world.score += points; world.hits += 1;
  impact(fx, 'dent', calm);        // the banner comes away: the thing itself is unharmed
  burst(fx, Array.from({ length: 12 }, (_, n) => ({ x: rock.tx + (n % 4) * 3 - 5, y: rock.ty, c: 0, rgb: n % 3 ? '#fff6c2' : '#f0286e', floor: rock.ty + 60 })), rock.tx, rock.ty + 4, rnd, 55);
  sfx.paper();
  navigator.vibrate?.(18);
  pop(`+${points}`, rock.tx, rock.ty);
  pop(f.kind === 'plane' ? 'ЛЕНТА СОРВАНА' : 'ТАБЛО ПОГАСЛО', rock.tx, rock.ty + 14, 'tag');
  return true;
}

// ---- the people in the yard -----------------------------------------------------------------------
function paintHide() {
  document.body.dataset.hidden = String(folk.hidden);
  $('hideBtn').setAttribute('aria-pressed', String(folk.hidden));
  $('hideBtn').textContent = folk.hidden ? 'ВЫГЛЯНУТЬ' : 'СПРЯТАТЬСЯ';
}
function hide(on) {
  if (stage !== 'play' || !world || folk.hidden === on) return;
  folk.hidden = on; press = null;
  paintHide();
}
// What the people did in this step, answered: every change in who is looking is heard and named.
function folkSays(ev) {
  const p = ev.who;
  if (ev.type === 'look') { sfx.alarm(); pop(folk.hidden ? 'ИЩЕТ' : 'СМОТРИТ — ПРЯЧЬСЯ', p.x, p.y - 30, folk.hidden ? 'tag' : 'warn'); navigator.vibrate?.(25); }
  else if (ev.type === 'lost') { sfx.lost(); pop('НЕ ВИДИТ', p.x, p.y - 30, 'tag'); }
  else if (ev.type === 'call') { sfx.phone(); banner('ЗВОНЯТ В ПОЛИЦИЮ'); }
  else if (ev.type === 'enter' && ev.who.kind === 'courier' && world && world.parcels.filter((q) => !q.taken).length < 2) {
    // The courier is in a hurry and drops one: a small box that lies where they came in until somebody carries
    // it back. Without it there would be nothing in the yard to help, and the danger meter would only climb.
    dropParcel(world, ev.who.x, ev.who.y, rnd);
    pop('ПОСЫЛКА', ev.who.x, ev.who.y - 26, 'tag');
  }
  else if (ev.type === 'police') { sfx.siren(); banner('ПОЛИЦИЯ'); note('полиция смотрит по очереди: спрячься, пока смотрит, и действуй, пока отвернулась'); }
  else if (ev.type === 'seen') { sfx.seen(); navigator.vibrate?.([60, 40, 120]); banner('ЗАМЕТИЛИ'); endIn = 0.9; }
}
// A ball of water came down. Whoever is still under it is soaked, and looks up.
function waterLands(rock) {
  sfx.splash();
  burst(fx, Array.from({ length: 12 }, (_, n) => ({ x: rock.tx + (n % 4) * 2 - 3, y: rock.ty - 4, c: 0, rgb: n % 3 ? '#3f8cf0' : '#d7f4ff', floor: rock.ty + 2 })), rock.tx, rock.ty, rnd, 60);
  const p = personAt(folk, rock.tx, rock.ty, 8);
  if (!p) return;
  const points = soak(folk, p);
  world.score += points; world.hits += 1;
  impact(fx, 'dent', calm);        // water on a person: nothing is damaged, they simply look up
  navigator.vibrate?.(15);
  pop(`+${points}`, p.x, p.y - 12);
  pop(FOLK[p.kind].ru.toUpperCase(), p.x, p.y - 26, 'tag');
}

// A photograph, cut to the picture's shape. `size` forces that shape (a photograph added to a street must
// match the first); without it the photograph's own orientation decides.
async function decode(file, size = null) {
  // Decoded through an <img>: every phone browser does that, and it turns the photograph the right way
  // up from its EXIF orientation without being asked.
  // TWO WAYS TO DECODE, BECAUSE ONE OF THEM CAN HANG. This waited on an <img> load of a blob URL, and with a File
  // built inside the page - which is exactly how a harness injects a photograph - that load never fires: no error,
  // no timeout, the promise simply never settles, and the game sat on its first screen. The browser's own decoder
  // takes the File directly and resolves for both a real camera file and a synthetic one, so it is tried first and
  // the image element stays as the fallback for browsers without it.
  let image = null;
  try {
    if (typeof createImageBitmap === 'function') image = await createImageBitmap(file);
  } catch (error) {
    image = null;
  }
  if (!image) {
    const url = URL.createObjectURL(file);
    image = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('снимок не читается'));
      el.src = url;
    }).finally(() => setTimeout(() => URL.revokeObjectURL(url), 1000));
  }
  const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
  // THE PHOTOGRAPH DECIDES THE SHAPE OF THE LEVEL.
  //
  // This used to force every photograph into one of two frames (SHORT x LONG or LONG x SHORT) and COVER-crop
  // it to fit, which threw away the edges of anything that was not that shape: a 9:16 phone photo lost its
  // sides, a 16:9 photo lost its top and bottom. The creator asked for the level to keep the photograph's own
  // aspect ratio, so the game's buffer is now derived from the image, at the same pixel budget as before.
  // The rule is `object-fit: contain` against a SHORT x LONG frame, stated once so it cannot drift:
  //   scale so that the LONGER side is LONG — unless that would make the shorter side smaller than SHORT,
  //   in which case scale so the SHORTER side is SHORT instead.
  // The canvas then has exactly the photograph's aspect ratio and never exceeds the frame in either
  // direction. My first version derived the size from a fixed pixel BUDGET with two ad-hoc clamps; on a 3:2
  // photograph it produced 272x181, which is 51% more pixels than intended and would have made the flat
  // pipeline 1.5x slower for no reason. Measured, not guessed: 1920x1280 -> 256x171, and
  // 1600x1200 -> 256x192.
  const [w, h] = size || (() => {
    const k = Math.min(LONG / Math.max(iw, ih), SHORT / Math.min(iw, ih));
    return [Math.max(32, Math.round(iw * k)), Math.max(32, Math.round(ih * k))];
  })();
  // One crop, two sizes: the detector searches the large one, the game shows the small one, and because
  // they are the same crop a box found in one is the same box in the other.
  const fit = (cw, ch) => {
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const x = c.getContext('2d');
    // COVER when the target is a different shape (the detector wants a square-ish search image), but the
    // game's own buffer is the photograph's aspect ratio now, so this is a no-op there and nothing is cropped.
    const s = Math.max(cw / iw, ch / ih);
    x.imageSmoothingQuality = 'high';
    x.drawImage(image, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
    return c;
  };
  const k = Math.min(DETECT_LONG / Math.max(w, h), Math.max(iw / w, ih / h));
  const large = fit(Math.round(w * k), Math.round(h * k));
  // ---- P2 OF THE CREATOR'S CRITERIA: EVERY BLOCK OF 5x5 PHOTO PIXELS BECOMES ONE GAME PIXEL -------------
  //
  // "Every block of 5x5 photo pixels becomes one game pixel at the same position, so the game frame lines up with
  // the photo exactly." The photograph was instead drawn straight down to 288x512 with the browser's own
  // interpolation, which smears edges and keeps high-frequency detail that no 1-px art can hold - the mush. The
  // picture is now drawn at 5x the game grid and REDUCED BY A BOX AVERAGE: five by five source pixels become one
  // game pixel, at the same position, exactly as the criteria say. It is the same box average the flat route
  // already uses internally (flat.js boxDown), so the two paths agree on what a game pixel is.
  const GAME = BLOCK;                                 // the block is the rule's, not a number written here
  const small = (() => {
    // FAIL-SAFE: the 5x5 block average is the rule (P2), but a photo must ALWAYS load. If the big-canvas path throws
    // or is unavailable, the picture is taken the direct way and the rule reports itself as unmet rather than
    // leaving the game on a screen that says nothing. A hang here is what the page gate caught: the note after
    // decode() never printed, so the whole photo path was dead in the browser.
    try {
    const big5 = fit(w * GAME, h * GAME);
    const g5 = big5.getContext('2d');
    const src = g5.getImageData(0, 0, w * GAME, h * GAME);
    const down = photoLayer(boxDown, src.data, w * GAME, h * GAME, w, h);   // src/criteria/RoadRule.js
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const octx = out.getContext('2d');
    const img = octx.createImageData(w, h);
    for (let i2 = 0; i2 < w * h * 4; i2 += 1) img.data[i2] = down[i2];
    octx.putImageData(img, 0, 0);
    return out;
    } catch (error) {
      window.__blockFallback = String(error && error.message || error);
      return fit(w, h);
    }
  })();
  // A third size, between the two, for the windows: three picture-pixels to one of the game's, when the
  // photograph has that much in it.
  const unit = large.width >= w * 3 ? 3 : 1, mid = unit > 1 ? fit(w * unit, h * unit) : null;
  const big = mid ? { data: mid.getContext('2d').getImageData(0, 0, mid.width, mid.height).data, w: mid.width, h: mid.height } : null;
  return { w, h, large, small, big, rgba: small.getContext('2d').getImageData(0, 0, w, h).data };
}

async function fromFile(file) {
  const { w, h, large, small, big, rgba } = await decode(file);
  stage = 'detect'; world = null; me = null; cards(null); paintView();
  cam = { x: 0, y: 0, w, h };
  setSize(w, h);
  ctx.drawImage(small, 0, 0);
  banner('ИЩУ ВЕЩИ', true);
  note('ищу настоящие вещи на снимке — всё на телефоне, снимок никуда не уходит');
  const t0 = performance.now();
  const found = await detectAll(large, (done, total) => { $('banner').textContent = `ИЩУ ВЕЩИ ${done}/${total}`; });
  // THE BANNER IS CLEARED THE MOMENT THE SEARCH ENDS. It was set here and never unset, so "ИЩУ ВЕЩИ 14/14" sat over
  // the yard for the whole session - the creator asked twice where it came from. 14 is not a target count: it is how
  // many tiles this photograph needs for the detector, and it means nothing once the tiles are done.
  $('banner').textContent = '';
  $('selfRun')?.addEventListener('click', () => runSelfTest());
  setTimeout(() => { try { runSelfTest(); } catch (e) { /* the panel is a readout, never a failure of the game */ } }, 1200);
  $('banner').style.display = 'none';   // the tile counter is not a status line for the session
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const names = found.kept.map((d) => TARGETS[d.label].ru);
  if (build(rgba, w, h, found.kept, big)) {
    const panes = windowsIn(yard.regions);
    note(`нашёл за ${secs} с: ${[...names, panes ? `окон ${panes} (на глаз, по тёмным проёмам в стене)` : ''].filter(Boolean).join(', ')}`);
  } else nothingFound(`Искал ${secs} с и не узнал на снимке ничего, что умею узнавать.`);
}

// One more photograph: the exact next stretch of street, in place of a made one. It waits at the end of
// what has been walked so far. The game goes on while the phone searches it.
async function addPhoto(file) {
  if (!yard || !world || stage !== 'play') { note('сначала сними первый двор'); return; }
  if (yard.more.length + 1 >= MAX_YARDS) { note(`на одной улице помещается ${MAX_YARDS} снимков`); return; }
  const { w, h } = yard, shot = await decode(file, [w, h]);
  note('ищу вещи на новом снимке…');
  const found = await detectAll(shot.large, (done, total) => note(`ищу вещи на новом снимке ${done}/${total}`));
  // THE TILE COUNTER IS NOT A STATUS LINE. "ищу вещи 14/14" sat over the yard for the whole session because nothing
  // ever cleared it: 14 is simply how many tiles this photograph needs, and it stayed on screen after the search it
  // describes had finished. The note is cleared the moment the search returns.
  note('');
  note('');   // THE SEARCH LINE IS CLEARED WHEN THE SEARCH ENDS. It sat over the yard for ever
  const st = styliseVector(shot.rgba, w, h, { marks: found.kept, fundamentals: true }), next = yardFrom({ w, h, idx: st.idx, palette: st.palette, ...withWindows(toRegions(found.kept, shot.rgba, w, h), st, w, h, shot.big, shot.rgba) });
  yard.more.push(next);
  if (world) queue.push(next);
  const names = next.regions.map((r) => r.label);
  note(`снимок ${yard.more.length + 1} встал дальше по улице — иди направо · ${names.length ? names.join(', ') : 'вещей на нём не узнал, но улица твоя'}`);
}

// ---- a landing ------------------------------------------------------------------------------------
function resolve(rock) {
  if (rock.kind === 'water') { waterLands(rock); return; }
  const m = THROWABLES[rock.kind] || THROWABLES.stone;
  if (rock.sky && skyHit(rock)) return;
  if (rock.kind === 'paint') { paintLands(rock); return; }
  if (rock.kind === 'flowers') { flowersLand(rock); return; }
  if (rock.kind === 'whimsy') { whimsyLands(rock); return; }
  if (rock.kind === 'sponge') { spongeLands(rock); return; }
  // What it lands on: everything near, for a thing that bursts; otherwise the one thing it was thrown at.
  const targets = rock.splash ? splashTargets(world, rock.tx, rock.ty, rock.splash) : rock.region && !rock.region.gone ? [rock.region] : [];
  if (rock.splash) {
    sfx.glass();
    burst(fx, Array.from({ length: 10 }, () => ({ x: rock.tx, y: rock.ty, c: 0, rgb: '#35d07f', floor: rock.ty + 8 })), rock.tx, rock.ty + 3, rnd, 60);
  }
  if (!targets.length) {
    // NOTHING STANDING THERE — but the YARD is there. The surface under the throw takes the hit: it chips,
    // enough chips break it open, and the hole stays. This is what makes the environment destructible rather
    // than a backdrop, and it is the same rule the things obey (hits counted, break permanent, D8).
    const hitGround = rock.damage > 0 ? chip(world, rock.tx, rock.ty, rock.damage, rnd) : null;
    if (hitGround) {
      if (hitGround.broke) { sfx.break(1); impact(fx, 'crack', calm); navigator.vibrate?.(22); }
      else { sfx.hit(1); impact(fx, 'dent', calm); navigator.vibrate?.(10); }
      burst(fx, hitGround.debris, rock.tx, rock.ty, rnd, hitGround.broke ? 90 : 40);
      // THE YARD GIVES POINTS BUT NOT COMBO. Chewing a hole in a wall is worth doing for the hole: if scenery
      // fed the combo, the cheapest way to a big multiplier would be to stand still and hammer the ground, and
      // the things the detector found — the actual game — would be worth less than the backdrop.
      world.score += hitGround.points; world.hits += 1;
      pop(`+${hitGround.points}`, rock.tx, rock.ty);
      pop(hitGround.broke ? `${(hitGround.name || 'СТЕНА').toUpperCase()} ПРОБИТА` : (hitGround.name || 'СТЕНА').toUpperCase(), rock.tx, rock.ty - 12, hitGround.broke ? 'tag' : '');
      return;
    }
    // And with nothing under it either — the sky, or a hole already cut — a puff and a low note. It costs
    // nothing and it does not end a combo.
    if (!rock.splash) { sfx.miss(); spawn(fx, rock.tx, rock.ty, PRESETS.puff, rnd); }
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
  const pane = t.kind === WINDOW && !t.gone ? struckGlass(t, hx, hy, damage) : null;
  const res = strike(world, t, hx, hy, { damage, combo: comboTime });
  if (!res) return null;
  const broke = res.kind === 'break';
  impact(fx, res.kind, calm);
  if (pane) glassAnswers(t, pane, hx, hy); else burst(fx, res.debris, hx, hy, rnd, broke ? 150 : 70);
  if (pane) sfx.glass();
  if (broke) sfx.break(res.combo); else sfx.hit(res.combo);
  navigator.vibrate?.(broke ? 35 : 12);
  pop(`+${res.points}`, hx, hy);
  if (broke) pop(t.label.toUpperCase(), t.cx, t.y - 5, 'tag');
  if (res.combo > 1) pop(`x${res.combo}`, cam.x + cam.w / 2, cam.y + cam.h * 0.18, 'big');
  return res;
}

// WHAT THE DISASTER DID, answered. Spectacle, permanent damage, and not one point taken from the player: a
// stomp that breaks a thing is worth points while it lasts, because the yard is being destroyed either way and
// the player may as well be paid for the show.
function summonDisaster() {
  const kind = DISASTER_ORDER[Math.floor(rnd() * DISASTER_ORDER.length) % DISASTER_ORDER.length];
  disaster = makeDisaster(kind, rnd);
  note(`${DISASTERS[kind].line}`);
  pop(DISASTERS[kind].ru, world.w / 2, world.h * 0.3, 'warn');
  fx.flash = 0.8;
  sfx.thunder();
}

function disasterSays(ev) {
  const spec = disaster ? DISASTERS[disaster.kind] : null;
  if (ev.type === 'over') { pop('КОНЕЦ', world.w / 2, world.h * 0.4, 'tag'); disaster = null; return; }
  if (ev.type === 'siren') { sfx.siren(); note(`${DISASTERS[disaster.kind].ru}: сирена — сейчас придёт`); return; }
  if (ev.type === 'impact') { fx.flash = 0.7; sfx.thunder(); pop(DISASTERS[disaster.kind].ru, world.w / 2, world.h * 0.25, 'warn'); return; }
  if (ev.type === 'calm') { note(`${DISASTERS[disaster.kind].ru}: прошло. что сломано — осталось сломанным`); return; }
  if (ev.type === 'drain') {
    // the second pass: debris and stains, nothing deleted
    for (let n = 0; n < 40; n += 1) {
      const x = Math.floor(rnd() * world.w), y = Math.floor(world.h * (0.72 + rnd() * 0.26));
      spawn(fx, x, y, { ...PRESETS.paint, rgb: rnd() < 0.5 ? '#cfe9ff' : '#9fd8ff', settle: true }, rnd);
    }
    note('вода ушла: осталась грязь, мусор и то, что она забрала');
    return;
  }
  if (ev.type === 'front') {
    // AND THE THINGS IN THE WAY. A front that only scraped cells would leave every car and every window standing
    // in a wrecked yard, which is not what a hurricane does. Each thing the line reaches takes ONE hit in its own
    // border the first time the front touches it, and a vehicle is ROLLED OVER - water and wind put a car on its
    // roof, and that is the picture everyone has of a street after a storm.
    // ...AND THE BUILDINGS. A facade is a structure with hit points: the front takes a bite out of its own
    // border each time it passes, and after enough of them the wall is a ruin rather than a wall. This is the
    // half of "building destruction" that was in the list and never built - windows popped, walls did not.
    for (const b2 of world.structures || []) {
      if (b2.gone) continue;
      if (ev.x < b2.x - 2 || ev.x > b2.x + b2.w + 2) continue;
      b2.hits += 1;
      const at2 = { x: Math.max(b2.x, Math.min(b2.x + b2.w, ev.x)), y: Math.max(b2.y, Math.min(b2.y + b2.h, world.h * (1 - ev.top * 0.5))) };
      // L8 + L9: the blow takes CELLS out of the wall, and a cell that carried a window throws GLASS
      cellsOf(world, b2);
      const broke = breakCells(world, b2, at2, 2, rnd);
      if (broke.windows) {
        for (let g2 = 0; g2 < 6 + broke.windows * 4; g2 += 1) {
          spawn(fx, at2.x + (rnd() - 0.5) * 30, at2.y + (rnd() - 0.5) * 20,
            { ...PRESETS.glass || PRESETS.dust, rgb: rnd() < 0.5 ? '#cfe9ff' : '#9fd8ff' }, rnd);
        }
        pop('СТЕКЛО', at2.x, at2.y - 8, 'tag');
        sfx.glass?.();
      }
      wreckAlong(world, b2, at2, 1.4);
      if (b2.hits >= b2.hp) { b2.gone = true; pop('СТЕНА ОБРУШИЛАСЬ', b2.cx, b2.cy, 'warn'); world.score += 60; }
      else pop(`СТЕНА ${b2.hits}/${b2.hp}`, at2.x, at2.y - 4, 'tag');
    }
    for (const r of world.regions) {
      if (r.gone || r.hurled) continue;
      if (ev.x < r.x - 2 || ev.x > r.x + r.w + 2) continue;
      r.hurled = true;
      const at = { x: Math.max(r.x, Math.min(r.x + r.w, ev.x)), y: r.cy };
      if (/car|truck|bus|van|motorcycle/.test(r.kind)) {
        wreckAlong(world, r, at, 1.2);
        const rolled = rollOver(world, r, 3 + Math.round(rnd() * 3), rnd);
        pop('ПЕРЕВЕРНУЛО', r.cx, r.y - 6, 'warn');
        world.score += (rolled ? 30 : 0) + 20;
        navigator.vibrate?.(16);
      } else {
        wreckAlong(world, r, at, r.kind === 'window' ? 1.6 : 1);
        pop(r.kind === 'window' ? 'ОКНО ВЫБИЛО' : 'СЛОМАЛО', r.cx, r.y - 4, 'warn');
        world.score += 15;
      }
      // windows and structures are hit for real: the hit is counted, so the thing ends up GONE like any other
      r.hits += 1;
      if (r.hits >= r.hp) { r.gone = true; r.hits = r.hp; }
    }
    // THE FRONT ITSELF. Every cell the line covers takes one step down the ladder the whole game uses:
    // intact -> scraped one tone -> torn -> void. High first, ground last, which is what wind does.
    const x = ev.x, top = Math.floor(world.h * (1 - ev.top * 0.85));
    for (let y = 0; y < world.h; y += 1) {
      if (y < top) continue;
      const p2 = y * world.w + x;
      if (world.rubble[p2] !== 255) continue;
      const deep = y > world.h * 0.55;
      if (rnd() < (deep ? 0.10 : 0.22)) world.rubble[p2] = world.dent[world.idx[p2]] ?? world.palette.length - 1;
      else if (rnd() < 0.35) world.idx[p2] = world.dent[world.idx[p2]] ?? world.idx[p2];
    }
    if (rnd() < 0.25) spawn(fx, x, top, { ...PRESETS.dust, rgb: rnd() < 0.5 ? '#d8cba8' : '#8a7f63' }, rnd);
    return;
  }
  if (ev.type === 'gust') {
    fx.shake = Math.max(fx.shake, 1.5);
    spawn(fx, cam.x + rnd() * cam.w, cam.y + cam.h * (0.3 + rnd() * 0.5), { ...PRESETS.dust, rgb: rnd() < 0.5 ? '#d8cba8' : '#8a7f63' }, rnd);
    return;
  }
  if (ev.type === 'foam') {
    spawn(fx, cam.x + rnd() * cam.w, ev.line, { ...PRESETS.paint, rgb: '#eaf6ff', settle: false }, rnd);
    return;
  }
  if (ev.type === 'drown') {
    burst(fx, ev.target.pixels.slice(0, 40).map((p) => ({ x: p % world.w, y: (p / world.w) | 0, c: world.palette.length - 1, floor: world.h })), ev.target.cx, ev.target.cy, rnd, 60);
    pop('СМЫЛО', ev.target.cx, ev.target.cy, 'warn');
    world.score += spec ? spec.points : 0;
    return;
  }
  if (ev.type === 'stomp') {
    fx.shake = 7; fx.trauma = 1; fx.flash = 0.5;
    sfx.thunder();
    for (let n = 0; n < 10; n += 1) world.rubble[Math.min(world.rubble.length - 1, Math.round(ev.at.y + n * 2) * world.w + Math.round(ev.at.x + (rnd() - 0.5) * 24))] = world.palette.length - 1;
    if (ev.target) { pop('РАЗДАВИЛ', ev.target.cx, ev.target.cy, 'warn'); world.score += (spec ? spec.points : 0) * 2; }
    navigator.vibrate?.(40);
    return;
  }
  if (ev.type === 'chomp') {
    sfx.break(3); fx.shake = 5; navigator.vibrate?.(30);
    burst(fx, Array.from({ length: 16 }, (_, n) => ({ x: ev.at.x, y: ev.at.y, c: 0, rgb: n % 3 ? '#ffd23f' : '#ff6fa8', floor: world.h })), ev.at.x, ev.at.y, rnd, 70);
    pop(ev.target ? `СЪЕЛА ${(ev.target.label || '').toUpperCase()}` : 'АМ!', ev.at.x, ev.at.y, 'warn');
    pop('АМ!', ev.at.x + 10, ev.at.y - 10);
    world.score += spec ? spec.points : 0;
    world.antics = (world.antics || 0) + 1;
    return;
  }
  if (ev.type === 'chew') { sfx.gulp(); return; }
  if (ev.type === 'beam') {
    fx.flash = 1; fx.shake = 6; sfx.siren();
    // the breath burns a line across the yard: everything the line crosses is scorched, permanently
    const y0 = Math.round(ev.at.y);
    for (let x = 0; x < world.w; x += 1) {
      const y = Math.round(y0 + Math.sin(x / 40) * 3);
      for (let d2 = 0; d2 < 3; d2 += 1) {
        const p = Math.min(world.idx.length - 1, Math.max(0, (y + d2) * world.w + x));
        world.rubble[p] = world.palette.length - 1;
      }
    }
    pop('ЛУЧ', ev.at.x, ev.at.y, 'warn');
    note('годзилла дыхнул: полоса выжжена поперёк двора, и она останется');
  }
}

// What the weather did, answered: a flash, thunder, and one standing thing left blackened. There is no path
// from here to a person — a strike is chosen from the world's things — and nothing is taken from the player.
function weatherSays(ev) {
  if (ev.type !== 'lightning') return;
  fx.flash = 1;
  sfx.thunder();
  navigator.vibrate?.(28);
  const t = ev.target;
  if (t) {
    const scorch = world.scorch;
    for (const p of t.pixels) world.idx[p] = scorch[world.idx[p]];
    burst(fx, Array.from({ length: 16 }, (_, n) => ({ x: t.cx, y: t.cy, c: world.idx[t.pixels[0]], rgb: n % 2 ? '#fff6c2' : '#5c4969', floor: t.y + t.h })), t.cx, t.cy, rnd, 120);
    pop('МОЛНИЯ', t.cx, t.y - 6, 'warn');
    note('молния выжгла то, что стояло: оно потемнело, но осталось на месте');
  } else {
    pop('МОЛНИЯ', cam.x + cam.w / 2, cam.y + cam.h * 0.3, 'warn');
  }
}

// A window was struck. glass.js keeps where, and says whether it broke; if it did, the pane is cut into
// shards round the strikes BEFORE the rules repaint it, so each shard still has the glass's own colours.
function struckGlass(t, hx, hy, damage) {
  t.glass ||= makeWindow(t, world.w, mulberry32(world.seed + t.id * 131));
  t.glass.worldW = world.w;   // the street may have grown since: a pixel's column depends on the width
  const W = world.w, { broke } = hitWindow(t.glass, hx, hy, damage);
  const cells = broke ? shards(t.glass).map((cell) => ({ seed: cell.seed, pixels: Array.from(cell.pixels, (p) => ({ x: p % W, y: (p / W) | 0, rgb: css(world.palette[world.idx[p]]) })) })) : [];
  return { broke, cells };
}
// And how it looks. Broken, the pane is a hole with a ragged edge and every shard leaves as one piece,
// away from where the stone landed; only cracked, a few chips come off.
function glassAnswers(t, pane, hx, hy) {
  if (!pane.broke) { spawn(fx, hx, hy, { ...PRESETS.chip, rgb: GLINT, settle: false }, rnd); return; }
  const W = world.w;
  for (const p of t.pixels) {
    const x = p % W, y = (p / W) | 0;
    if (x > t.x && x < t.x + t.w - 1 && y > t.y && y < t.y + t.h - 1) world.idx[p] = world.palette.length - 1;
  }
  for (const cell of pane.cells) {
    const dx = cell.seed.x - hx, dy = cell.seed.y - hy, far = Math.hypot(dx, dy) || 1, v = 38 + rnd() * 46;
    fling(fx, cell.pixels, (dx / far) * v, (dy / far) * v - 34, 0.7 + rnd() * 0.4);
  }
  spawn(fx, hx, hy, { ...PRESETS.shard, rgb: GLINT, settle: false }, rnd);
}

// A ball of paint came down. Where the yard takes paint it leaves a splat that stays; the sky takes none.
function paintLands(rock) {
  const home = rock.tx < yard.w;   // only the first yard's sky is known; a made yard is all wall and ground
  if (!takesPaint(home ? yard.st.surfaces.what : null, home ? yard.w : world.w, world.h, rock.tx, rock.ty)) {
    sfx.miss(); spawn(fx, rock.tx, rock.ty, PRESETS.puff, rnd);
    pop('НЕБО НЕ КРАСИТСЯ', rock.tx, rock.ty, 'tag');
    return;
  }
  const colour = PAINTS[rock.paint];
  stamp(world.decals, Math.round(rock.tx), Math.round(rock.ty), { paint: rock.paint, power: 1, rnd });
  lay(world.decals, world.paint, world.w, world.h);
  spawn(fx, rock.tx, rock.ty, { ...PRESETS.paint, rgb: css(colour.rgb), settle: false }, rnd);
  sfx.splash();
  impact(fx, 'dent', calm);        // a mark, not damage: the lightest answer there is
  navigator.vibrate?.(10);
  world.score += PAINT_POINTS; world.hits += 1; world.splats = (world.splats || 0) + 1;
  pop(`+${PAINT_POINTS}`, rock.tx, rock.ty);
  pop(colour.name.toUpperCase(), rock.tx, rock.ty - 12, 'tag');
}

// A bunch of flowers came down on bare ground. It plants where it lands and the flower is still there when the
// run ends: the one thing in the game that adds to the yard and keeps it. A miss costs nothing at all.
function flowersLand(rock) {
  const home = rock.tx < yard.w;
  const holds = (what, w, h, x, y) => takesPaint(home ? yard.st.surfaces.what : null, home ? yard.w : world.w, h, x, y);
  const bloom = plant(world, rock.tx, rock.ty, rnd, holds);
  if (!bloom) { sfx.miss(); spawn(fx, rock.tx, rock.ty, PRESETS.puff, rnd); pop('ТУТ НЕ РАСТЁТ', rock.tx, rock.ty, 'tag'); return; }
  sfx.ready();
  burst(fx, Array.from({ length: 8 }, (_, n) => ({ x: rock.tx, y: rock.ty, c: 0, rgb: n % 2 ? '#8bd46a' : '#ffd23f', floor: rock.ty + 6 })), rock.tx, rock.ty, rnd, 40);
  impact(fx, 'dent', calm);
  navigator.vibrate?.(8);
  world.score += FLOWERS.points; world.hits += 1; world.planted = (world.planted || 0) + 1;
  pop(`+${FLOWERS.points}`, rock.tx, rock.ty);
  pop('ЦВЕТОК', rock.tx, rock.ty - 12, 'tag');
}

// A throw of pure whimsy: something absurd, specific to the thing it landed on, and harmless. The table is
// keyed by what the detector named, so the joke is always about a REAL thing in the player's own photograph —
// eat the car, sit on the bench, water the plant pot — and a thing nobody named is not a candidate.
function whimsyLands(rock) {
  const t = rock.region && !rock.region.gone ? rock.region : splashTargets(world, rock.tx, rock.ty, 12).find((r) => !r.gone) || null;
  const done = t ? antic(t.kind, rnd()) : null;
  if (!done) {
    sfx.miss(); spawn(fx, rock.tx, rock.ty, PRESETS.puff, rnd);
    pop('НЕ С ЧЕМ ЗАБАВЛЯТЬСЯ', rock.tx, rock.ty, 'tag');
    return;
  }
  const hx = Math.max(t.x, Math.min(t.x + t.w, rock.tx)), hy = Math.max(t.y, Math.min(t.y + t.h, rock.ty));
  burst(fx, Array.from({ length: 8 }, (_, n) => ({ x: hx, y: hy, c: 0, rgb: n % 2 ? '#ffd23f' : '#ff6fa8', floor: t.y + t.h + 4 })), hx, hy, rnd, 26);
  impact(fx, 'dent', calm);
  sfx.ready();
  navigator.vibrate?.(12);
  world.score += done.points; world.hits += 1; world.antics = (world.antics || 0) + 1;
  pop(`+${done.points}`, hx, hy);
  pop(done.line, t.cx, t.y - 8, 'tag');
  note(`${done.line.toLowerCase()} — ${t.label} цел и невредим`);
}

// A sponge came down on something standing. It is washed: every pixel one tone up its own ramp, once, with
// foam, and it is the only thing in the game that gets lighter instead of darker.
function spongeLands(rock) {
  const t = rock.region && !rock.region.gone ? rock.region
    : splashTargets(world, rock.tx, rock.ty, 14).find((r) => !r.gone) || null;
  if (!washable(world, t)) {
    sfx.miss(); spawn(fx, rock.tx, rock.ty, PRESETS.puff, rnd);
    pop(t ? 'УЖЕ ЧИСТО' : 'НЕЧЕГО МЫТЬ', rock.tx, rock.ty, 'tag');
    return;
  }
  const done = wash(world, t, STEPS);
  const hx = Math.max(t.x, Math.min(t.x + t.w, rock.tx)), hy = Math.max(t.y, Math.min(t.y + t.h, rock.ty));
  burst(fx, Array.from({ length: WASH.foam }, () => ({ x: hx, y: hy, c: 0, rgb: rnd() < 0.5 ? '#ffffff' : '#8fe6ff', floor: t.y + t.h })), hx, hy, rnd, 34);
  spawn(fx, hx, hy, { ...PRESETS.paint, rgb: '#ffffff', settle: true }, rnd);
  sfx.splash();
  impact(fx, 'crack', calm);
  navigator.vibrate?.(14);
  world.score += WASH.points; world.hits += 1; world.washed = (world.washed || 0) + 1;
  pop(`+${WASH.points}`, hx, hy);
  pop('ЧИСТО', t.cx, t.y - 6, 'tag');
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
  // crouched behind something: nobody walks hidden
  const input = folk.hidden ? { x: 0, y: 0, jump: false } : {
    x: pad.x + (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0),
    y: pad.y + (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0),
    jump: pad.jump || pad.once || keys.has('jump'),
  };
  pad.once = false;
  const did = stepWalker(world, me, input, dt, { top, stagger: filter === 'alcohol' && !calm ? stagger(drink.drunk) : 0 });
  if (did.jumped) sfx.jump();
  if (did.landed) { sfx.land(); dust(5); }
  if (did.blocked && clock - nudged > 4) { nudged = clock; pop('ПРЫГАЙ', me.x, me.y - 20, 'tag'); }   // a thing in the way is jumped, and nobody was told
  if (did.stomped) { stomps += 1; hit(did.stomped, me.x, me.y, 1, mode.combo); if (world.done) allClear(); }
  if (me.x > world.w - cam.w * 0.75 && !ended) further();   // before the end of the street can come into view
}
// Dust from under the feet: a landing is seen as well as heard.
function dust(n) {
  burst(fx, Array.from({ length: n }, (_, i) => ({ x: me.x + (i - n / 2) * 2, y: me.y, c: 0, rgb: i % 2 ? '#fff6c2' : '#b9a9d6', floor: me.y + 1 })), me.x, me.y + 5, rnd, 26);
}
function sip() {
  if (filter !== 'alcohol' || stage !== 'play' || !world) return;
  if (swig(drink)) { sfx.gulp(); navigator.vibrate?.([20, 150, 20]); pop('ГЛОТОК', cam.x + cam.w / 2, cam.y + cam.h * 0.7, 'tag'); }
  else if (drink.left === 0) { sfx.empty(); pop('ПУСТО — БРОСАЙ', cam.x + cam.w / 2, cam.y + cam.h * 0.7, 'tag'); }
}

function finish() {
  stage = 'done';
  folk.hidden = false; paintHide();
  const best = album.best, metres = me ? walked(me) : 0;
  const news = record(album, { wrecked: world.regions.filter((r) => r.gone).map((r) => r.kind), score: world.score, metres });
  keep();
  // WHAT THE YARD BECAME, computed first because the result, the title, the line and the card all quote it.
  const mark = imprint(world);
  result = { things: world.regions.slice(0, yard.regions.length).map((r) => ({ kind: r.kind, gone: r.gone })), score: world.score, combo: world.maxCombo, metres, day: today, mark };
  const { have, of } = progress(album);
  $('endNews').textContent = `альбом ${have}/${of}${news.kinds.length ? ` · впервые: ${news.kinds.map((k) => `${SIGN[k]} ${TARGETS[k].ru}`).join(', ')}` : ''}${news.far && metres ? ' · так далеко ещё не уходил' : ''}`;
  $('shared').textContent = '';
  $('endScore').textContent = world.score;
  const aim = world.throws ? Math.min(100, Math.round(((world.hits - stomps) / world.throws) * 100)) : 0;   // a burst can hit several things with one throw
  // THE TITLE SAYS WHAT THE YARD BECAME, not only whether it is finished: a yard in flowers and a yard in
  // ruins are two different things to have done, and the card that goes out should say which one it was.
  $('endTitle').textContent = folk.seen ? 'ЗАМЕТИЛИ' : world.done ? 'ДВОР РАЗНЕСЁН' : mark.kind === 'quiet' ? 'ХВАТИТ' : `ДВОР: ${mark.words}`;
  $('endLine').textContent = `${world.time.toFixed(1)} с · комбо x${world.maxCombo} · бросков ${world.throws} · попаданий ${aim}%${me ? ` · прыжков на вещи ${stomps} · пройдено ${walked(me)} м` : ''}${folk.soaked ? ` · облито ${folk.soaked}` : ''}${folk.calls ? ` · звонков в полицию ${folk.calls}` : ''}${world.splats ? ` · пятен краски ${world.splats}` : ''}${mark.flowers ? ` · цветов ${mark.flowers}` : ''}${mark.washed ? ` · вымыто ${mark.washed}` : ''}${mark.antics ? ` · забав ${mark.antics}` : ''}${mark.holes ? ` · проломов ${mark.holes}` : ''}`;
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
  hideT = stepDuck(hideT, folk.hidden, dt);
  motion = viewMotion(filter, clock, calm, drink.drunk);
  // The lean and the jolt ride the same transform: the camera's trauma contributes a rotation as well as
  // an offset, so a break tips the picture rather than only sliding it. The pointer mapping below must use
  // the SAME total angle, or aim drifts during a shake.
  const totalAngle = motion.angle + (shake.angle || 0);
  tiltEl.style.transform = `rotate(${totalAngle}rad)`;
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
      if (scanT >= SCAN_TIME) { stage = 'play'; scanY = null; foldForPlay(true); sfx.ready(); banner(`${world.regions.length} ${world.regions.length === 1 ? 'ЦЕЛЬ' : 'ЦЕЛЕЙ'}`); }
    }
    const frozen = fx.freeze > 0;
    for (const rock of stepFx(fx, world, dt)) resolve(rock);
    if (stage === 'play' && !frozen) {
      tick(world, dt);
      stepBlooms(world, dt);
      for (const ev of stepWeather(weather, world, fx, dt, rnd, { x: cam.x, y: cam.y, w: cam.w, h: cam.h })) weatherSays(ev);
      if (disaster) for (const ev of stepDisaster(disaster, world, dt, rnd)) disasterSays(ev);
      stepDrink(drink, dt);
      if (me?.down) walk(dt);
      if (stepSky(sky, dt, cam.w)) sfx.fly();
      if (!world.done && !folk.seen) for (const ev of stepFolk(folk, dt * peopleSpeed(weather), { x0: cam.x, x1: cam.x + cam.w, top: Math.max(top + 6, cam.y + cam.h * 0.45), bottom: cam.y + cam.h * 0.78 }, rnd)) folkSays(ev);
      if (folk.seen && (endIn -= dt) <= 0) finish();
      if (world.done && (endIn -= dt) <= 0) finish();
    }
    cam = cameraFor(world, me, hideT);
    if (canvas.width !== cam.w || canvas.height !== cam.h) setSize(cam.w, cam.h);
    // A throw leaves the hand of whoever is down in the yard, or the balcony above the yard on screen; and
    // down there, what can be seen clearly is what is near you.
    if (me?.down) { fx.hand.x = me.x; fx.hand.y = me.y - me.z - 8; fx.focus.tx = me.x; fx.focus.ty = me.y - 6; }
    else { fx.hand.x = cam.x + cam.w / 2; fx.hand.y = world.h + 4; }
    shake = shakeOffset(fx);
    draw(ctx, buf, world, fx, { filter, mode, seconds: clock, scanY, motion, shake, cam, me, weather,
      drink: filter === 'alcohol' ? { full: level(drink), busy: drink.busy / SWIG_TIME } : null, flier: stage === 'play' ? sky.flier : null, folk,
      hideT, land: me?.land ?? 0, disaster: cleanFrame ? null : disaster, weather: cleanFrame ? null : weather,
      clean: cleanFrame, scanY: cleanFrame ? null : scanY });
    paintHud();
  }
  requestAnimationFrame(frame);
}

// THE AIM HIGHLIGHT, ported from the v6 screen: v6 outlines the thing under the pointer in pink while aiming
// and in cyan in info mode, and blinks the SELECTED one yellow. Here the border is traced once per region and
// kept, because tracing it on every move would cost more than the frame can spare.
function aimAt(x, y) {
  if (!world || world.done) return;
  const t = pick(world, x, y);
  if (!t) { world.aim = null; return; }
  world.polyCache = world.polyCache || new Map();
  let edges = world.polyCache.get(t.id);
  if (!edges) { edges = edgesOf(world, t); world.polyCache.set(t.id, edges); }   // v6's edges map
  world.aim = { edges, id: t.id, label: t.label };
}

// ---- the finger -----------------------------------------------------------------------------------
const toWorld = (e) => {
  const at = clientToWorld(e.clientX, e.clientY, frameEl.getBoundingClientRect(), motion.angle + (shake.angle || 0),
    { x: motion.x + shake.x, y: motion.y + shake.y }, cam.w, cam.h);
  return { x: at.x + cam.x, y: at.y + cam.y };
};

function throwAt(at) {
  if (folk.hidden) { sfx.miss(); pop('СПРЯТАН — ВЫГЛЯНИ', at.x, at.y, 'tag'); return; }
  if (fx.cool > 0 || drink.busy > 0) { sfx.miss(); pop('…', at.x, at.y, 'tag'); return; }   // the hand is not free yet
  threw(folk);
  // A touch on a person is a ball of water, whatever is in the hand: nothing else is ever thrown at one.
  // A thing under the finger comes first, so nobody is soaked by a throw meant for the car behind them.
  // A parcel lying in the yard is CARRIED BACK, not hit: the tap is answered at once and nothing is thrown.
  // It is the one action aimed at somebody without being aimed AT them, and the only one that lowers danger.
  const parcel = parcelAt(world, at.x, at.y);
  if (parcel) {
    const done = help(world, parcel, folk);
    if (done) {
      world.score += done.points; world.hits += 1;
      burst(fx, blossomBurst(parcel.cx, parcel.cy, rnd), parcel.cx, parcel.cy, rnd, 46);
      sfx.ready();
      impact(fx, 'dent', calm);
      navigator.vibrate?.(18);
      pop(`+${done.points}`, parcel.cx, parcel.cy);
      pop(done.line, parcel.cx, parcel.cy - 12, 'tag');
      pop(`−${Math.round(done.heat * 5)} ОПАСНОСТЬ`, parcel.cx, parcel.cy + 14, 'good');
      note('посылка вернулась к курьеру: он кивнул, и опасность стала меньше');
      return;
    }
  }
  const who = standing(world, at.x, at.y) ? null : personAt(folk, at.x, at.y, 3, WATER.flight);
  if (who && !hitAt(sky, at.x - cam.x, at.y - cam.y)) {
    world.throws += 1;
    throwThing(fx, world, WATER, 'water', at.x, at.y, null);
    sfx.throw();
    return;
  }
  // What is in the hand now scatters, not how the player is looking; drinking makes the HAND wander.
  const live = filter === 'alcohol' ? drunkItem(item, drink.drunk) : item;
  const landing = aimWith(live, at.x, at.y, rnd);
  world.throws += 1;
  // a touch on what is flying is a throw at the sky: it goes where the hand sends it, and the things under it are left alone
  const up = Boolean(hitAt(sky, at.x - cam.x, at.y - cam.y));
  throwThing(fx, world, live, hand, landing.x, landing.y, up || live.splash || hand === 'paint' ? null : pick(world, landing.x, landing.y));
  if (up) fx.rocks[fx.rocks.length - 1].sky = true;
  if (hand === 'paint') { fx.rocks[fx.rocks.length - 1].paint = paintN; paintN = (paintN + 1) % PAINTS.length; paintHand(); }
  if (filter === 'alcohol') fresh(drink);
  sfx.throw();
}

// Where the narrow view is dark, a finger first LOOKS (drag) and then throws (tap): the throw happens on
// lifting, and only if the finger did not travel. Everywhere else a throw is on touch, with no wait.
tiltEl.addEventListener('pointermove', (e) => {
  if (stage !== 'play' || !world || press) return;
  const at = toWorld(e);
  aimAt(at.x, at.y);
}, { passive: true });
tiltEl.addEventListener('pointerdown', (e) => {
  if (stage !== 'play' || world.done || folk.seen) return;
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
  window.__shots = (window.__shots || 0) + 1;      // the page gate's instrument: did the change event arrive at all?
  unlock();
  const file = e.target.files?.[0];
  e.target.value = '';
  if (file) fromFile(file).catch((error) => nothingFound(`Не получилось: ${error.message}`));
};
$('shot').addEventListener('change', shoot);
$('shot2').addEventListener('change', shoot);
// The gallery pickers. These inputs deliberately carry NO `capture` attribute: with it, a phone opens the
// camera directly and the photo library is unreachable, which is why there was no way to add an existing
// picture. Same handler — the game does not care where the bytes came from.
for (const id of ['pic', 'pic2']) $(id).addEventListener('change', shoot);
$('picIn').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (file) addPhoto(file).catch((error) => note(`снимок не добавился: ${error.message}`));
});
$('againBtn').addEventListener('click', begin);
$('restartBtn').addEventListener('click', () => { if (yard && (stage === 'play' || stage === 'done' || stage === 'scan')) begin(); });
const home = () => {
  stage = 'title'; world = null; yard = null; me = null; shown = {};
  $('score').textContent = '0'; $('combo').textContent = '—'; $('left').textContent = '0'; $('comboBar').style.width = '0';
  paintView(); paintKeep(); cards('title'); ctx.clearRect(0, 0, canvas.width, canvas.height); note('');
};
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
  // The photograph the yard was built from, kept for the card's "before" half. It is the player's own picture and
  // it never leaves the device except inside this card.
  const beforeShot = beforeCanvas || null;
  if (!result || !world) return;
  const text = shareText({ ...result, url: /^https:/.test(location.href) ? location.href.split(/[?#]/)[0] : '' });
  try {
    // Inside the Android app the page has neither a share sheet nor a download of its own: the app is asked.
    const app = window.DvorApp;
    if (picture) {
      // THE CARD THAT GOES OUT: the tag, the photograph it came from, the yard as it was left, and the run.
      const card = postcard(world, `ДВОР-8 · ${mark.words}`, text.split('\n')[2], {
        tag: 'Я ЗДЕСЬ', tagEn: 'I AM HERE',
        before: beforeShot, footnote: `#ЯЗДЕСЬ #IAMHERE · ${mark.flowers ? `цветов ${mark.flowers} · ` : ''}${mark.holes ? `проломов ${mark.holes} · ` : ''}${world.score} очков`,
      });
      if (app?.sharePicture(card.toDataURL('image/png').split(',')[1], `dvor-8-${result.day}.png`, text)) { $('shared').textContent = 'картинка сохранена в галерею: Pictures/DVOR-8'; return; }
      const blob = await new Promise((done) => card.toBlob(done, 'image/png'));
      const file = new File([blob], `dvor-8-${result.day}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ text, files: [file] }); return; }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      $('shared').textContent = 'картинка сохранена в загрузки';
      return;
    }
    if (app?.shareText(text)) return;
    if (navigator.share) { await navigator.share({ text }); return; }
    if (navigator.clipboard) { await navigator.clipboard.writeText(text); $('shared').textContent = 'строка скопирована — вставь её куда хочешь'; return; }
    $('shared').textContent = copy(text) ? 'строка скопирована — вставь её куда хочешь' : text;
  } catch (error) {
    if (error.name !== 'AbortError') $('shared').textContent = copy(text) ? 'строка скопирована — вставь её куда хочешь' : text;
  }
}
$('fateBtn')?.addEventListener('click', () => { if (stage === 'play') summonDisaster(); });
// THE BAR: what the sky is doing, and the info button.
{
  const box = $('fates');
  if (box) {
    const set = (kind) => {
      disaster = kind ? makeDisaster(kind, rnd) : null;
      $('fateNow').textContent = kind ? DISASTERS[kind].ru : 'ЯСНО';
      $('fateWhy').textContent = kind ? DISASTERS[kind].why : 'обычный день: двор такой, каким его сфотографировали';
      if (typeof window !== 'undefined') window.__fate = { kind, beast: DISASTERS[kind] ? DISASTERS[kind].beast || null : null, stage };
      if (kind) { note(DISASTERS[kind].line); pop(DISASTERS[kind].ru, world ? world.w / 2 : 0, world ? world.h * 0.3 : 0, 'warn'); }
      const box2 = $('fateBox');
      if (box2) box2.open = false;                        // the choice is made: close the dropdown
    };
    for (const [label, kind] of [['ЯСНО', null], ...DISASTER_ORDER.map((k) => [DISASTERS[k].ru, k])]) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn small alt'; b.textContent = label;
      b.addEventListener('click', () => { if (stage === 'play') set(kind); });
      box.append(b);
    }
    $('fateWhy').textContent = 'обычный день: двор такой, каким его сфотографировали';
  }
  // INFO MODE: while it is on, a tap asks about a thing instead of throwing at it, and the answer is a true fact
  // about the world the yard stands in - random, and never the same theme twice running (src/lore.js).
  let lastTheme = null, infoOn = false;
  const btn = $('infoBtn');
  btn?.addEventListener('click', () => {
    infoOn = !infoOn;
    btn.setAttribute('aria-pressed', String(infoOn));
    note(infoOn ? 'режим справки: ткни в вещь и узнаешь про неё правду' : 'снова можно бросать');
  });
  tiltEl.addEventListener('pointermove', (e) => {
  if (stage !== 'play' || !world || press) return;
  const at = toWorld(e);
  aimAt(at.x, at.y);
}, { passive: true });
tiltEl.addEventListener('pointerdown', (e) => {
    if (!infoOn || stage !== 'play' || !world) return;
    // THE INFO TAP OWNS THE GESTURE. It used to fall through to the throw handler on the same element, so in info
    // mode a tap both described a thing and threw the stone at it - "info button doesn't work" is exactly what
    // that feels like. The event stops here, and the thing stays marked until the next tap (v9 keeps its
    // selection and blinks it, rather than flashing it away).
    e.stopPropagation();
    e.preventDefault();
    const at = toWorld(e);
    const t = pick(world, at.x, at.y);
    // THE OBJECT IS OUTLINED WHILE IT IS DESCRIBED. Info mode was returning a line of text about a thing the
    // player could not see marked - a mechanic that tells you about something without pointing at it. The border
    // is the thing's OWN border (world.borderOf), drawn as ink for a few seconds, exactly like the target
    // brackets but in the help colour.
    if (t) {
      const edges = edgesOf(world, t);                     // the thing's own silhouette, not its box
      world.infoMark = { edges, until: clock + 6, label: t.label, kind: t.kind };
      pop(t.label.toUpperCase(), t.cx, t.y - 8, 'tag');
    } else {
      world.infoMark = null;
    }
    const f = factFor(lastTheme, rnd);
    lastTheme = f.theme;
    const what = t ? t.label : 'этот двор';
    pop(`${what.toUpperCase()}: ${f.theme}`, at.x, at.y - 10, 'tag');
    pop(f.line, at.x, at.y + 6);
    note(`${what}: ${f.line}`);
    sfx.paper();
    e.preventDefault();
    e.stopPropagation();
  }, true);
}
// THE ARROW HIDES THE PANEL. It is the first control on the bar: collapsed, the toolbar is two round buttons and
// nothing else, which is what a player wants once they have chosen; expanded, it shows the name in the hand and
// the weather, each with its own dropdown.
$('barMore')?.addEventListener('click', (e) => {
  const bar = $('bar');
  if (!bar) return;
  const hidden = bar.classList.toggle('hidden');
  e.currentTarget.textContent = hidden ? '▴' : '▾';
  e.currentTarget.setAttribute('aria-expanded', String(!hidden));
});
$('shareBtn').addEventListener('click', () => share(false));
$('cardBtn').addEventListener('click', () => share(true));
$('albumBtn').addEventListener('click', () => { paintAlbum(); cards('album'); });
$('albumBack').addEventListener('click', () => cards('title'));

// ---- going down, walking, jumping, drinking ---------------------------------------------------------
$('viewBtn').addEventListener('click', () => goDown(!me?.down));
$('stopBtn').addEventListener('click', () => { if (stage === 'play' && world) finish(); });
$('sipBtn').addEventListener('click', sip);
$('hideBtn').addEventListener('click', () => { unlock(); hide(!folk.hidden); });
$('newsBtn').addEventListener('click', () => {
  newsOn = !newsOn;
  try { localStorage.setItem(NEWS_ON, newsOn ? '1' : '0'); } catch { /* not kept */ }
  paintNews();
  clearSky(sky, skyLines());
  if (newsOn) loadNews();
  note(newsOn ? `новости над двором: ${SOURCE}. Попади в самолёт или дирижабль — прилетит следующая` : 'новости выключены: в небе пусто, в сеть игра не ходит');
});
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
  if (e.code === 'KeyH' && !e.repeat) hide(!folk.hidden);
  if (KEYS[e.code] && me?.down) { keys.add(KEYS[e.code]); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => { keys.delete(KEYS[e.code]); });

// HOW YOU LOOK. A mode now decides only the focus and the lean; what you throw is a separate choice below.
for (const [id, m] of Object.entries(MODES)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = m.label.toUpperCase();
  button.className = `btn small ${id === filter ? 'on' : 'alt'}`;
  button.addEventListener('click', () => {
    filter = id; mode = m; press = null;
    document.body.dataset.filter = id;
    for (const other of $('filters').children) other.className = `btn small ${other === button ? 'on' : 'alt'}`;
    $('lookNow').textContent = m.label.toUpperCase();
    $('lookWhy').textContent = m.why;
    paintHand();
    if (world && stage === 'play') { banner(m.label.toUpperCase()); fx.cool = 0; }
  });
  $('filters').append(button);
}

// WHAT YOU THROW. Six things, each with its own flight, and each one says why it is in the palette rather
// than being a second stone of a different colour. The panel is a <details>, so it folds away and the player
// can keep the whole of the yard on a phone screen.
for (const id of THROW_ORDER) {
  const t = THROWABLES[id];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn small chip ${id === hand ? 'on' : 'alt'}`;
  button.innerHTML = `<b>${t.label.toUpperCase()}</b><i>${t.hint}</i>`;
  button.addEventListener('click', () => {
    hand = id; item = t; press = null;
    for (const other of $('palette').children) other.classList.toggle('on', other === button);
    for (const other of $('palette').children) other.classList.toggle('alt', other !== button);
    $('paletteNow').textContent = t.label.toUpperCase();
    $('paletteWhy').textContent = t.why;
    paintHand();
    if (world && stage === 'play') banner(t.label.toUpperCase());
  });
  $('palette').append(button);
}
$('paletteNow').textContent = item.label.toUpperCase();
$('paletteWhy').textContent = item.why;
$('lookNow').textContent = mode.label.toUpperCase();
$('lookWhy').textContent = mode.why;

// The palette opens by itself the first time, because a folded panel nobody knows about is a feature nobody
// has. The creator reported "no palette with object to throw added" while it was on the screen, folded at
// the bottom — that is a discoverability failure, not a missing feature, and the fix is to show it once.
const PALETTE_SEEN = 'dvor8.paletteSeen';
try {
  if (!localStorage.getItem(PALETTE_SEEN)) {
    $('paletteBox').open = true;
    localStorage.setItem(PALETTE_SEEN, '1');
  }
} catch { $('paletteBox').open = true; }

// While a yard is being played the extra panels fold themselves away, so the screen holds the yard, the
// thing in the hand and the danger meter — and nothing else the player did not ask for.
function foldForPlay(playing) {
  for (const id of ['paletteBox', 'lookBox', 'moreBox']) $(id).open = !playing;
}

paintHand();
paintView();
paintNews();
paintHide();
if (newsOn) loadNews();
if (visit(album, today)) keep();
paintKeep();
// The model is fetched while the player is still reading the title, so the first photograph does not wait for it.
// For tools/folk-check.mjs and tools/paint-check.mjs only: a script cannot see who is where, so with ?debug in the address it is told.
if (/[?&]debug\b/.test(location.search)) window.dvor8 = { folk: () => folk, cam: () => cam, world: () => world };
loadDetector().then(() => note('готов искать вещи на снимке')).catch((error) => note(`детектор не запустился (${error.message}) — работает только демо`));
requestAnimationFrame(frame);
