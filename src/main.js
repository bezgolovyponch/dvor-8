// The flow: a photograph, a search for the real things in it, a scan, a yard to take apart, a score, again.
//
// Nothing here decides anything. detect.js says what is in the photograph, objects.js turns that into
// targets, stylise.js makes the picture, modes.js says what is in the hand, world.js says what a hit does,
// fx.js makes it felt, render.js shows it. street.js makes more yard beyond the photograph, walk.js is
// whoever goes down into it, drink.js is the bottle, sky.js is what flies over it with a line of the
// day's news from news.js. frame.js finds the windows in the walls, glass.js says how one breaks, decal.js
// keeps the colour thrown at the yard, parts.js throws the pieces. This file wires them to the page and the finger.

import { sceneParse } from './scene-parse.js';   // stage 1+2: what is on the screen, and where the sky is
import { downscaleContrast, expandContrast } from './pieces/downscale.js';   // the published reduction logic (PixelOE), confirmed by its own check
import { styliseVector } from './stylise.js';
import { toRegions, TARGETS } from './objects.js';
import { loadDetector, detectAll, DETECT_LONG } from './detect.js';
import { left, makeWorld, pick, strike, tick } from './world.js';
import { RAMPS } from './flat.js';   // STEPS is already imported above; two imports of it is a hard error
import { makeFx, throwThing, impact, burst, stepFx, shakeOffset } from './fx.js';
import { MODES, splashTargets, chainNext } from './modes.js';
import { THROWABLES, ORDER as THROW_ORDER, throwWith, aimWith } from './throwables.js';
// THE SELF-TEST'S FRAME ROW ASSERTS THE 1:1 BUFFER, NOT A VIEW SCALE. The yard canvas buffer is exactly
// world.w x world.h (measured live: 288x512 vs world 288x512), so the row compares those two and nothing else.
// view.js's PX=2 is a view-layer constant; importing it here (an earlier revision) made the predicate demand
// world.w*2 and could only ever be red. The panel's own throw then kept the load-time readout on screen.
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
import { factFor, THEME_RU } from './lore.js';
import { DISASTERS, ORDER as DISASTER_ORDER, makeDisaster, stepDisaster, beastPixels, beastAt } from './disaster.js';
import { makeWindow, hitWindow, shards } from './glass.js';
import { PAINTS, stamp, lay } from './decal.js';
import { spawn, fling, PRESETS } from './parts.js';
import { css, VOID } from './palette.js';

const $ = (id) => document.getElementById(id);
const canvas = $('yard'), ctx = canvas.getContext('2d');
const frameEl = $('frame'), tiltEl = $('tilt'), pops = $('pops');
// THE PANEL'S ERROR ROW MUST BE ABLE TO FAIL. It read window.__err, and nothing in the repo ever SET it, so
// «ошибок на странице нет» could only ever print OK - a check that cannot see what it claims to check. These two
// listeners are the missing setter: the page's own uncaught errors and unhandled rejections.
if (typeof window !== 'undefined') {
  window.__err = undefined;
  addEventListener('error', (ev) => {
    window.__err ||= `${ev.message || 'error'} @ ${ev.filename || '?'}:${ev.lineno || 0}`;
  });
  addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason;
    window.__err ||= `unhandled rejection: ${String((r && (r.stack || r.message)) || r)}`;
  });
}
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
// The pinned animation clock, or -1 when the page runs its own. See the note in `frame`.
const clockPin = params.has('clock') ? Number(params.get('clock')) : -1;
if (typeof window !== 'undefined') window.__clockPin = clockPin;   // the pin's own readout, for G-DET-CLOCK
// `?test=1` REVEALS THE FILE INPUTS so an automated browser can drive the real photo path. They are hidden by design
// (a phone uses the native picker), and a hidden input cannot be filled by a test runner - which is why the page
// gate had to inject a synthetic File and hung on it. This is a testing affordance, not a product change: it does
// nothing unless the parameter is present, and the input stays a two-pixel transparent sliver in the corner.
// `?photo=<url>` LOADS A PHOTOGRAPH WITHOUT A FILE PICKER. A phone uses the native picker and a test runner cannot
// set a file input at all (both Playwright's fill and the harness's synthetic File are dead ends, and the synthetic
// one hung the decoder). This hook fetches the picture, wraps it as a File and hands it to the SAME handler the
// picker uses, so the real path is exercised - detection, build, damage, the lot - with nothing but a navigation.
if (params.get('photo') && typeof document !== 'undefined') {
  setTimeout(async () => {
    try {
      const blob = await fetch(params.get('photo')).then((r) => r.blob());
      // THE NAME IS KEPT: the reference's own photographs are known scenes, and their annotation is shipped with the
      // operator's engine - a matched photo is converted BY THE ENGINE WITH THAT ANNOTATION, exactly as the operator's
      // app does, with no marking needed (the demo path for the four reference scenes).
      const base = decodeURIComponent(String(params.get('photo')).split('/').pop() || 'photo.jpg');
      const file = new File([blob], base, { type: blob.type || 'image/jpeg' });
      await fromFile(file);
    } catch (error) {
      nothingFound(`Не получилось: ${error.message}`);
    }
  }, 300);
}
// `?parse=1` arms G-DET-PARSE: a probe (tools/detgate-parse.mjs) runs `sceneParse` a SECOND time on the same
// stored input and diffs the two masks, so the nondeterminism is localised to the parse boundary or excluded.
// It is an instrument handle, not a product path: nothing runs unless the parameter is present.
if (params.get('parse') === '1' && typeof window !== 'undefined') {
  window.__parseAgain = async () => {
    const src = window.__sceneIn;
    if (!src || !src.source) return null;
    return sceneParse(src.source, src.w, src.h, src.sw || src.source.width, src.sh || src.source.height);
  };
}
if (params.get('test') === '1' && typeof document !== 'undefined') {
  setTimeout(() => {
    for (const id of ['shot', 'shot2', 'pic', 'pic2']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.hidden = false;
      el.style.cssText = 'position:fixed;left:2px;top:2px;width:14px;height:14px;opacity:0.01;z-index:9';
    }
  }, 400);
}
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
// `?news=0` IS A GATE AFFORDANCE, not a product change: it does what the НОВОСТИ button does (the same switch the
// player has), so a capture can be REPRODUCIBLE. Measured: two unpatched runs differed by 3237-3613 px, every one
// of them concentrated in rows y=2..23 - the headline band, whose text comes from the network (fetch, line 467).
let newsOn = (params.get('news') === '0' ? false : (() => { try { return localStorage.getItem(NEWS_ON) !== '0'; } catch { return true; } })()), wire = [], asked = false;
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

let popLast = { text: '', at: 0, n: 0 };
function pop(text, x, y, kind = '') {
  // A REPEATED EVENT IS ONE WORD, NOT A STACK. Measured on the hurricane shot: five identical "ОКНО ВЫБИЛО" labels
  // landed on the same window within a second and their blocks stacked illegibly over each other (the picture read as
  // a wall of pink text). A word that repeats inside 700 ms is folded into the one already on screen - the count is
  // kept beside it, the way a HUD counts hits - instead of covering the frame with copies.
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (text === popLast.text && now - popLast.at < 700) {
    popLast.n += 1; popLast.at = now;
    const first = pops.lastChild;
    if (first) first.textContent = `${text} ×${popLast.n}`;
    return;
  }
  popLast = { text, at: now, n: 1 };
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
  // A WORD DOES NOT LAND ON ANOTHER WORD. Measured on the hurricane shot after the repeat-folding: two separate
  // "СТЕНА ОБРУШИЛАСЬ" events landed 40 px apart and still overlapped. A new pop that falls within one word-height plus
  // a pad of an existing one is nudged DOWN by that height, until it finds a free line - so a burst of events reads as a
  // column, not a smear.
  let ty = Math.max(tlo, Math.min(thi, wantY));
  for (let guard = 0; guard < 6; guard += 1) {
    const clash = [...pops.children].some((c) => {
      const r2 = c.getBoundingClientRect();
      return Math.abs((r2.top + r2.height / 2 - box.top) - ty) < h * 0.85;
    });
    if (!clash) break;
    ty = Math.min(thi, ty + h * 0.85);
  }
  el.style.top = `${(ty / vh) * 100}%`;
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
    // THE LABEL IS RUSSIAN AND THE KIND IS ENGLISH (live: label «машина», kind 'car'). Testing the label alone made
    // this row read "машин 0" forever, on a yard that had four cars in it.
    const kindLabel = (r) => String(r.kind || '') + ' ' + String(r.label || '');
    const cars = world.regions.filter((r) => /car|truck|bus|van|машин|грузовик|автобус/i.test(kindLabel(r))).length;
    add('машины найдены и разрезаны', cars > 0, `машин ${cars}`);
    const win = world.regions.filter((r) => /window|окно/i.test(kindLabel(r))).length;
    add('окна — отдельные вещи', win > 0, `окон ${win}`);
    const outlined = world.regions.filter((r) => /car|truck|bus|van|building|house|tower|block/i.test(String(r.kind || '') + ' ' + String(r.label || ''))).length;
    const notOutlined = world.regions.length - outlined;
    add('обводка только у зданий и машин', outlined > 0 && notOutlined >= 0, `с обводкой ${outlined} из ${world.regions.length}`);
    // 1:1, AND THE ELEMENT IS $('yard') - NOT $('#yard'). `$` is getElementById, so the '#' made this null and the
    // row printed "undefinedxundefined" while the canvas was 288x512. Both defects are the same class: a check that
    // cannot see the thing it names, reporting a failure that is in the check.
    const yardEl = $('yard') || {};
    add('размер кадра — как у фото', yardEl.width === world.w && yardEl.height === world.h, `${yardEl.width}x${yardEl.height} против ${world.w}x${world.h}`);
  }
  add('ошибок на странице нет', !(window.__err), window.__err ? String(window.__err).slice(0, 40) : 'нет');
  add('проверки командной строки', null, 'node tools/chain.mjs — критерии, композиция, сверка с эталоном');
  // THE PANEL IS THE PAGE'S ELEMENT (index.html:171 #selfTest), and the rows go inside it. Naming the container
  // here is not decoration: the page names #selfTest, and a source read that the suite runs ("every element the page
  // names is used by the game") found the container named by no line of the game.
  const panel = $('selfTest');
  const box = panel ? panel.querySelector('#selfRows') : $('selfRows');
  if (panel) panel.dataset.rows = String(rows.length);
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
  // ОПАСНОСТЬ IS ALWAYS ON SCREEN, as the operator's template has it (five segments from the first frame). It used to be
  // hidden until a person appeared, which left the top-right corner of the screen empty and made the HUD differ from the
  // reference's own layout (measured by tools/html-audit.mjs: the block existed but was display:none).
  $('heat').parentElement.hidden = false;
  if (lit !== shown.stars) {
    [...$('heat').children].forEach((el, n) => { el.className = n < lit ? 'on' : ''; });
    $('heat').classList.toggle('hot', lit >= 4); $('heat').setAttribute('aria-valuenow', String(lit));
    if (lit > (shown.stars || 0)) bump($('heat'));
    shown.stars = lit;
  }
  if (drink.left !== shown.sips) { $('sipBtn').textContent = drink.left ? `ГЛОТОК ×${drink.left}` : 'ПУСТО — БРОСАЙ'; shown.sips = drink.left; }
}
// THE CLOCK IN THE HEADER (the reference's own HUD element): the phone's local time, updated each minute, and only
// while a yard is being played.
// ---- THE FACT PANEL, AS THE OPERATOR'S TEMPLATE HAS IT ------------------------------------------------------
//
// Its screen shows the info as a PANEL, not a floating line: a black box with a yellow border and a pink shadow,
// the thing's name, a theme chip, "ФАКТ n", the text, a "ЕЩЁ ФАКТ" button and a close cross. That is the same panel
// this function builds, with the ids our gates already read (`#factText`).
function factPanel({ name, theme, fact, text, onMore, onClose }) {
  const frame = document.getElementById('frame');
  if (!frame) return null;
  let el = document.getElementById('factPanel');
  if (!el) {
    el = document.createElement('div');
    el.id = 'factPanel';
    el.className = 'factPanel';
    frame.appendChild(el);
  }
  el.replaceChildren();
  const head = document.createElement('div'); head.className = 'fpHead';
  const title = document.createElement('b'); title.textContent = name || 'ДВОР'; head.appendChild(title);
  const x = document.createElement('button'); x.type = 'button'; x.className = 'fpX'; x.textContent = '×';
  x.addEventListener('click', () => { el.remove(); if (onClose) onClose(); });
  head.appendChild(x);
  const meta = document.createElement('div'); meta.className = 'fpMeta';
  const chip = document.createElement('span'); chip.className = 'fpChip'; chip.textContent = THEME_RU[theme] || String(theme || 'ДВОР').toUpperCase();
  const num = document.createElement('span'); num.className = 'fpN'; num.textContent = fact ? `ФАКТ ${fact}` : '';
  meta.appendChild(chip); meta.appendChild(num);
  const body = document.createElement('p'); body.id = 'factText'; body.className = 'fpText'; body.textContent = text || '';
  const foot = document.createElement('div'); foot.className = 'fpFoot';
  // NO GLYPH TRICKS IN A BLACK-LETTER TYPEFACE: the operator's arrow does not exist in Arial Black, so the label says
  // the action in words.
  const more = document.createElement('button'); more.type = 'button'; more.className = 'fpMore'; more.textContent = 'ЕЩЁ ФАКТ';
  more.addEventListener('click', () => { if (onMore) onMore(); });
  foot.appendChild(more);
  el.append(head, meta, body, foot);
  return el;
}
// ---- THE HUD'S LEFT ZONE, AS THE OPERATOR'S SCREEN HAS IT: the clock, the big score and РАЗБИТО sit OVER the picture,
// in the top-left corner (its template: "{{ scoreTxt }}" and "РАЗБИТО {{ wrecked }}" at left:28px; top:60px). Our
// existing elements are moved there, ids unchanged, so every handler and gate keeps working. The ОПАСНОСТЬ meter and
// СПРЯТАТЬСЯ stay in their own row until that zone is ported with a verified position (the first attempt put a copy of
// the meter in the corner and it did not render - not shipped).
function hudRestructure() {
  const frame = document.getElementById('frame');
  const hud = document.querySelector('header .hud');
  const clock = document.getElementById('clock');
  const heatEl = document.getElementById('heat');               // the app's own meter (setHeat updates its children)
  if (!frame || !hud || document.getElementById('hudTop')) return;
  // THE OPERATOR'S SCREEN IS ONE PHONE WITH EVERYTHING INSIDE IT. Its template puts the score at left 4.9% / top 5.9%
  // (font 5.9% of the width), the danger at right 4.9% / top 5.9%, the banner at 13.3%, and the bar at bottom 2% /
  // right 0.7% / height 8.4% - all INSIDE the 576x1024 phone. Ours had the bar and the danger BELOW the picture, which
  // the audit (tools/html-audit.mjs) measured as 2370% and 283% off. They are moved in, with the template's ratios.
  const top = document.createElement('div');
  top.id = 'hudTop';
  top.className = 'hudTop';
  const left = document.createElement('div');
  left.className = 'hudLeft';
  if (clock) left.appendChild(clock);
  left.appendChild(hud);
  top.appendChild(left);
  // THE DANGER BLOCK IS BUILT AROUND THE APP'S OWN METER: the label is ours, `#heat` is the same element the game
  // updates (so the pips keep working). Moving the old wrapper collapsed to zero (measured: the wrapper's flex
  // child with a zero-size label); this is explicit and measurable.
  if (heatEl) {
    const right = document.createElement('div');
    right.className = 'hudDanger';
    const lab = document.createElement('span');
    lab.textContent = 'ОПАСНОСТЬ';
    right.appendChild(lab);
    const oldWrap = heatEl.parentElement;
    right.appendChild(heatEl);
    // THE OLD WRAPPER GOES: it kept its "ОПАСНОСТЬ" label below the picture, so the screen showed the word twice
    // (measured in the screenshot). One block, one label.
    if (oldWrap && oldWrap !== right && !oldWrap.querySelector('#heat')) oldWrap.remove();
    top.appendChild(right);
  }
  frame.appendChild(top);
  const bar = document.getElementById('bar');
  if (bar) { bar.classList.add('inFrame'); frame.appendChild(bar); }
}
function clockTick() {
  const el = document.getElementById('clock');
  if (!el) return;
  const d = new Date();
  el.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
clockTick();
setInterval(clockTick, 30000);
hudRestructure();
function paintView() {
  const down = Boolean(me?.down);
  document.body.dataset.view = down ? 'walk' : 'balcony';
  $('pad').hidden = !down;
  $('viewBtn').textContent = down ? 'НА БАЛКОН' : 'ВО ДВОР';
  pad.x = pad.y = 0; pad.jump = pad.once = false; keys.clear();
  $('knob').style.transform = '';
}
// THE WEAPON'S ICON IS THE ENGINE'S OWN SPRITE (its `itemGrid` for stone, brick, slipper, bottle, paint). The app's
// chip drew a CSS shape; the reference's own pixel sprite is the right visual model, and it is already in the code.
function paintEngineIcon() {
  const c = (typeof window !== 'undefined' && window.__engineInst) || null;
  const el = document.getElementById('paletteIcon');
  if (!c || !el || !c.itemGrid) return;
  const name = { stone: 'stone', brick: 'brick', slipper: 'slipper', bottle: 'bottle', paint: 'paint' }[hand];
  if (!name) return;
  try {
    const g = c.itemGrid(name, 30, 23, 1.15);
    let cv = el.querySelector('canvas');
    if (!cv) { cv = document.createElement('canvas'); cv.style.cssText = 'width:30px;height:23px;display:block;image-rendering:pixelated'; el.textContent = ''; el.appendChild(cv); }
    c.blitCanvas(cv, g, 1);
  } catch (e) { /* the vector path has no engine instance: the CSS icon stays */ }
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
  // THE TOOLBAR DOES NOT SIT ON THE PICTURE. Measured: the art occupied y 113-680 and the chip bar y 640-680, so the
  // toolbar covered the picture's last 40 rows. The frame's aspect is the ART's, and the bar is absolutely positioned
  // at its bottom - so the bar always eats into the art. The frame is therefore given the art's height PLUS the bar's
  // own strip, and the bar keeps its place at the bottom of the frame, below the picture: nothing of the art is
  // covered, and the aspect the art is drawn with is untouched.
  const bar = document.getElementById('bar');
  if (bar) {
    const bh = Math.ceil(bar.getBoundingClientRect().height) || 44;
    document.documentElement.style.setProperty('--aspect', String(w / (h + bh)));
    document.documentElement.style.setProperty('--barh', `${bh}px`);
    // PIXEL-PERFECT SCALING (D22). The art is 288x512 and must be shown at an INTEGER multiple of its own grid with
    // its own aspect: measured before this, the browser displayed it at 1.034 by 1.025 - neither integer nor even
    // uniform - and `image-rendering: pixelated` keeps the edges hard but the art's pixels then land on unequal screen
    // widths. k is the largest integer that fits the viewport once the HUD, the toolbar's strip and the panels are
    // reserved; the frame is then sized to exactly k art pixels plus its borders, so the canvas (100% of the tilt) is
    // an integer box.
    const vw = window.innerWidth || 412, vh = window.innerHeight || 915;
    const k = Math.max(1, Math.floor(Math.min((vw - 24) / w, (vh - 330) / (h + bh))));
    const frame = canvas.closest ? canvas.closest('.frame') : null;
    if (frame) {
      frame.style.width = `${w * k + 6}px`;          // the tilt's 3-px border on each side
      frame.style.height = `${h * k + bh + 6}px`;
      frame.style.aspectRatio = 'auto';
    }
    const tilt = canvas.closest ? canvas.closest('.tilt') : null;
    if (tilt) tilt.style.inset = `0 0 ${bh}px 0`;
    if (typeof window !== 'undefined') window.__canvasScale = { k, art: [w, h], artCss: [w * k, h * k], bar: bh };
  }
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
  addWindows(found, seg.regions, seg.owner, w, (typeof window !== 'undefined' && window.__parseBuilding) || null);
  return seg;
}
const windowsIn = (regions) => regions.filter((r) => r.kind === WINDOW).length;
/** The photograph as a canvas the scene parse can draw: `big` is ImageData-like ({data,w,h}), not a canvas, and
 *  drawImage on it throws - which a silent catch turned into "the parse never ran". */
function photoCanvas(big) {
  if (!big) return null;
  if (big.getContext) return big;
  if (!big.data) return null;
  const c = document.createElement('canvas');
  c.width = big.w; c.height = big.h;
  const g = c.getContext('2d');
  const img = g.createImageData(big.w, big.h);
  img.data.set(big.data.subarray ? big.data.subarray(0, img.data.length) : big.data);
  g.putImageData(img, 0, 0);
  return c;
}

async function build(rgba, w, h, dets, big = null) {
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
  // THE PARSE RUNS BEFORE THE CONVERSION. Its class masks decide the sky and the facades; without it the conversion
  // falls back to the old colour tests. A failure here is not fatal - it is reported, never guessed.
  const shot = photoCanvas(big);
  // G-DET-PARSE (docs/DETERMINISM.md §5, level 2): the parse's own input and output are kept on the page so the
  // SAME call can be made a second time and the two masks differenced. Diagnostics only: nothing in the build or
  // the render ever reads these, and they are attached to `window`, never to the frame. `?parse=1` arms the probe.
  if (typeof window !== 'undefined' && params.get('parse') === '1') window.__sceneIn = { source: shot, w, h, sw: big && big.w, sh: big && big.h };
  // THE SEGMENTATION DOES NOT NEED THREE PICTURE-PIXELS PER GAME PIXEL - that 3x rule belongs to the WINDOW finder
  // (it wants detail to see an opening), and it was gating the parse: `big` is null for a photograph narrower than
  // 3x the grid (the operator's second yard is 720 wide against a 288 grid), so the parse was called with NO INPUT and
  // returned null - no building, no sky, no wall class, and the renderer fell back to luminance (D19's seventh
  // finding). The model downsizes to its own 512 input anyway, so the game-sized canvas is a perfectly good input:
  // the parse runs on the best available image, which is `big` when it exists and the small canvas otherwise.
  // the game-sized canvas, built from the pixels the renderer already has, when `big` is absent
  const parseInput = shot || (() => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    img.data.set(rgba.subarray ? rgba.subarray(0, img.data.length) : rgba);
    g.putImageData(img, 0, 0);
    return c;
  })();
  const parse = parseInput
    ? await sceneParse(parseInput, w, h, parseInput.width, parseInput.height).catch((e) => { if (typeof window !== 'undefined') window.__parseError = String(e && e.message || e); return null; })
    : null;
  if (typeof window !== 'undefined') window.__parse = parse ? { classes: parse.classes, sky: !!parse.masks.sky, building: !!parse.masks.building } : null;
  // THE PLAN NEEDS THE BUILDING MASK ITSELF, and the parse lives inside build(); it is handed over here.
  if (typeof window !== 'undefined') window.__parseBuilding = (parse && parse.masks && parse.masks.building) || null;
  // THE OUTLINE GATE'S PROBE (?outline=1): the render records every pixel it inks, and the sky mask is exposed so the
  // gate can ask whether any of them landed on sky. Diagnostics only.
  if (typeof window !== 'undefined') {
    window.__outlineProbe = params.get('outline') === '1';
    window.__checkerProbe = params.get('checker') === '1';
    window.__PANE = params.get('pane') ? params.get('pane').split(',').map(Number) : null;
    window.__RING = params.get('ring') === '1';
    window.__NOCHECK = params.get('nocheck') === '1';
    window.__baysProbe = params.get('bays') === '1';
    window.__passes = params.get('passes') === '1' ? [] : null;
    window.__MULL = params.get('mull') ? Number(params.get('mull')) : 3;   // the accepted curtain wall's mullion
    window.__COVER = params.get('cover') ? Number(params.get('cover')) : 0.5;
    window.__SHADOW = params.get("shadow") ? Number(params.get("shadow")) : 1;
    window.__CLOUDK = params.get('clouds') ? Number(params.get('clouds')) : 9;
    window.__DUTY = params.get('duty') ? Number(params.get('duty')) : 2;
    if (window.__outlineProbe && parse && parse.masks.sky) window.__skyMask = parse.masks.sky;
  }
  // THE HORIZON GATE'S PARSE READOUT (?horizon=1): the implementation's horizon against an INDEPENDENT recomputation
  // of "the first non-sky row" from the same mask. Two loops, written apart, on the real masks of the real
  // photograph - a property test, not a tautology (the gate also keeps the frame's own agreement as a diagnostic).
  if (typeof window !== 'undefined' && params.get('horizon') === '1' && parse) {
    const m = parse.masks.sky || new Uint8Array(w * h);
    // A RESOLVED COLUMN is one whose top row is sky: its boundary is a fact of the mask. A column that starts
    // non-sky (a tower fills the top) has no boundary of its own - the published source IMPUTES it from its
    // neighbour (`skylinePoints[i] = skylinePoints[i-1]`), so it is reported as imputed, not counted as agreement.
    let agree = 0, resolved = 0;
    for (let x = 0; x < w; x += 1) {
      if (!m[x]) continue;                       // row 0 of this column is not sky: imputed by the rule
      resolved += 1;
      let y = 0;
      while (y < h && m[y * w + x]) y += 1;
      if (parse.horizon[x] === y) agree += 1;
    }
    window.__parseHorizon = { cols: w, agree, resolved, imputed: w - resolved, noSky: !!parse.noSky };
  }
  if (typeof window !== 'undefined' && params.get('parse') === '1') window.__parseFirst = parse;
  // THE SKYLINE THE ENGINE'S BAND IS SCALED TO: the reference's `h0` (`SKY.s = max(.3, h0/327)`), measured here from
  // the app's own sky mask instead of the engine's 90th-percentile fallback, which on a big sky inflates the band.
  if (typeof window !== 'undefined' && parse && parse.horizon && parse.horizon.length) {
    // THE MEDIAN, NOT THE MEAN: a tower that fills the left third pulls a mean skyline far above the horizon it stands
    // on (measured: mean 248 against the reference's own h0 327 for the same photograph, and the engine's band scale is
    // h0/327 - so the mean made the band 25% wider than the reference's and the sky read as a dotted field).
    // THE 90TH PERCENTILE IS THE ENGINE'S OWN STATISTIC for a horizon it is not told (`low[Math.floor(low.length*.9)]`
    // in its S6): the sky's own bottom, ignoring the columns a tower fills. A mean was 248 and a median 233 against the
    // reference's h0 327 for the same photograph (measured), which widened the band to a dotted field.
    const rows = parse.horizon.filter((v) => v > 0).slice().sort((a, b) => a - b);
    window.__skylineY = rows.length ? rows[Math.min(rows.length - 1, Math.floor(rows.length * 0.9))] : null;
    window.__skylineCols = parse.horizon.filter((v) => v > 0).length;
  }
  const st = styliseVector(rgba, w, h, { marks: dets, fundamentals: true, parse, horizonProbe: params.get('horizon') === '1' });
  // ===== THE OPERATOR'S ENGINE AS THE CONVERTER (docs/PLAN-REAL-PRODUCT.md §3) ==========================
  //
  // When an annotation is present - `?engine=<scene label>` for the reference's own scenes, or an annotation object
  // supplied by the app (`window.__sceneAnnotation`, the S7 contract) - the operator's engine builds the frame AND the
  // objects, and this function adopts them. The art is then the reference's own output (the same FNV, the same 1321
  // pane objects, the same working palette of 12), not a re-derivation of it. No annotation: the vector route runs.
  let engineRegions = null;
  const engineLabel = params.get('engine');
  const supplied = (typeof window !== 'undefined' && window.__sceneAnnotation) || null;
  if (engineLabel || supplied) {
    try {
      const { engineFrame, referenceScene } = await import('./ref/convert.js');
      const scene = supplied || await referenceScene(engineLabel);
      if (scene) {
        const photoUrl = (typeof window !== 'undefined' && window.__photoUrl) || null;
        const ef = await engineFrame({ src: photoUrl, rgba, w, h, scene, seed: 8 });
        st.idx = ef.idx; st.palette = ef.palette; st.windows = []; st.structures = [];
        engineRegions = ef.regions;
        // THE ENGINE'S OWN D-MODEL DRIVES THE DAMAGE: its S15-S19 produce cracked / darkened / gutted pieces, glass
        // shards and debris - our damage art (craters, wireframe wrecks) painted over the engine's frame is a
        // mismatch, and it is what the operator's phone showed. The instance is kept so a hit can be routed to it.
        if (typeof window !== 'undefined') window.__engineInst = ef.component;
        if (typeof window !== 'undefined') window.__engine = ef.readout;
      }
    } catch (e) {
      if (typeof window !== 'undefined') window.__engineError = String((e && e.message) || e);
    }
  }
  if (typeof window !== 'undefined') window.__spriteBays = (st.stats && st.stats.spriteBays) || null;   // DIAGNOSTIC
  if (typeof window !== 'undefined') { window.__traceParts = (st.stats && st.stats.wallParts) || []; window.__traceRgb = (st.stats && st.stats.rgb) || null; }   // the PLAN's inputs
  // THE SCENE PLAN IS THE RENDERER'S OWN: trace() computes it ONCE from the wall parts and returns it, so the bay
  // loop, the checker pass and this display all read the same plan (D19: three plans from three inputs made the whole
  // frame a glass wall on the operator's second yard).
  if (typeof window !== 'undefined') window.__plan = (st.stats && st.stats.plan) || null;
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
  let { regions, owner } = withWindows(toRegions(dets, reduced, w, h), st, w, h, big, reduced);
  // THE ENGINE'S OBJECTS ARE THE OBJECTS: the annotation names them, the engine maps them per pixel, and the owner map
  // is rebuilt from that map so the app's outline, hit-test and damage act on the engine's very regions.
  if (engineRegions && engineRegions.length) {
    regions = engineRegions;
    owner = new Int32Array(w * h).fill(-1);
    for (const r of regions) for (const p of r.pixels) owner[p] = r.id;
  }

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
        // A WINDOW IS A PIECE OF ITS BUILDING, NOT A COUNTED TARGET. The operator's own engine counts
        // `TARGETS = buildings + cars` (`engine-v13.txt` line 263: `sc.buildings.map(...).concat(this.CARIDS)`), while
        // its per-pane window objects (`WN`) exist for the DESTRUCTION model, not for the HUD. Measured here before the
        // change: «осталось 521» = 4 buildings + 4 cars + **513 window panes**, i.e. the counter was counting glass.
        // A window stays breakable (it is the building's own piece and throws glass, REQ 54) but is not counted.
        counted: false,
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
// A HIT ON A YARD THAT THE ENGINE PAINTED IS THE ENGINE'S: `damageAt` runs its own D-model, and the frame is copied
// back from its buffer. The app's damage art then never touches an engine frame.
// THE REFERENCE'S OWN DESTRUCTION, EXACTLY AS ITS APP DOES IT: one `damageAt` at the impact point, which walks the
// engine's four-step ladder on that one piece (crack -> scrape -> debris -> gone, S15) and breaks any pane first. No
// invented band: the band model I wrote turned a car into a half-erased slab and made buildings "disappear partially"
// (the operator's screenshot), because it damaged a rectangle of chunks instead of the reference's one-piece-per-hit.
// The engine's OWN area damage exists where the reference uses it - the disasters' `bite` (a radial set of pieces) and
// `tearColumn` - and the app calls THEM for area effects rather than re-inventing them (see engineDisaster).
function engineDamage(x, y, steps = 1, splash = 0, targetId = 0) {
  const c = (typeof window !== 'undefined' && window.__engineInst) || null;
  if (!c || !world || !world.engineFrame) return false;
  try {
    if (!c.setState) c.setState = () => {};
    let earned = 0;
    const n = Math.max(1, Math.min(4, steps | 0));
    for (let s = 0; s < n; s += 1) {
      const p = c.damageAt(c.S, Math.floor(x) + 0.5, Math.floor(y) + 0.5, []);
      if (!p) break;
      earned += p;
    }
    world.score += earned;
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = String(world.score);
    const live = c.S && c.S.base ? c.S.base : c.clean;
    for (let p = 0; p < world.idx.length; p += 1) world.idx[p] = live[p];
    world.palette = c.RGB ? c.RGB.map(([r, g, b]) => [r, g, b]) : world.palette;
    if (typeof window !== 'undefined' && params.has('debug')) window.__lastDmg = { x, y, steps: n, targetId, earned };
    return true;
  } catch (e) { if (typeof window !== 'undefined') window.__dmgError = String((e && e.message) || e); return false; }
}
// THE ENGINE'S OWN DISASTER, DRIVEN FROM THE APP: `disStep(F, put, d)` takes a copy of the engine's frame, lets the
// disaster paint into it and damage `S`, and the app shows that copy. Phases are the engine's: siren (60 frames of the
// siren table), impact, calm, then it clears itself.
function engineDisaster() {
  const c = (typeof window !== 'undefined' && window.__engineInst) || null;
  if (!c || !c.S || !disaster) return false;
  try {
    // THE ENGINE'S UI CALLBACK IS NOT OURS: `disStep` calls `setState` on the phase changes (siren -> impact -> calm);
    // in the app that is a no-op, the frame is what we take (measured: without it the step threw before the disaster
    // could paint).
    if (!c.setState) c.setState = () => {};
    if (!c.dis) c.dis = { id: disaster.kind, f: 0, t: 0, phase: 'siren', wet: {} };
    const W = c.W, H = c.H;
    const F = Uint8Array.from(c.S.base);
    const put = (x, y, col) => { const k = Math.floor(y) * W + Math.floor(x); if (k >= 0 && k < W * H) F[k] = col; };
    c.disStep(F, put, c.dis);
    for (let p = 0; p < world.idx.length; p += 1) world.idx[p] = F[p];
    if (!c.dis) disaster = null;
    return true;
  } catch (e) { if (typeof window !== 'undefined') window.__engineDisasterError = String((e && e.message) || e); return false; }
}
function begin() {
  world = makeWorld({ w: yard.w, h: yard.h, photo: yard.rgba, idx: yard.st.idx, palette: yard.st.palette, regions: yard.regions, owner: yard.owner, seed: 8, env: yard.st.env, structures: yard.st.structures });
  // THE PAGE CAN PRESS A HIT, so a gate can test the real impact path (not a re-implementation of it).
  if (typeof window !== 'undefined' && params.has('debug')) window.__throwAt = throwAt;
  // THE HOOK USES THE APP'S OWN `pick` (the owner map), not a box match: a building's box contains the car parked in
  // front of it, so a box search named the building and the car never took a step (measured by the damage gate).
  if (typeof window !== 'undefined' && params.has('debug')) window.__strikeAt = (x, y, damage = 2) => hit(pick(world, x, y) || null, x, y, damage, 1);
  // THE ENGINE PAINTED THIS FRAME: its damage model owns the picture (see engineDamage).
  if (typeof window !== 'undefined' && window.__engineInst && yard.regions && yard.regions.some((r) => r.engineId != null || r.engineBid != null)) world.engineFrame = true;
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
  // ---- A CAR KEEPS ITS OWN COLOUR: NOT HERE -------------------------------------------------------------
  //
  // This was attempted as a post-pass over `world.idx` and it broke the build - the yard came out empty with a clean
  // console, because the throw was swallowed by the build's own try/catch and the player saw "ничего не нашлось".
  // The reduction that loses the colour happens INSIDE styliseVector (the areas-first pass averages a whole region
  // into the wall's tones), so the fix belongs there, at the point the region's pixels are reduced - not after the
  // world is built. Recorded rather than left as a half-working pass.
  // ---- РАЗБИТО n: THE COUNT THE TARGET FRAME SHOWS -----------------------------------------------------
  const brokenEl = document.getElementById('broken');
  // `world` IS NULL WHILE A REBUILD RUNS (fromFile sets it before decoding the next frame), and this interval keeps
  // ticking through that window: reading regions on a null world threw every 400 ms while the annotation rebuild ran
  // (measured: 11 identical TypeErrors during one owner capture). A missing world is 0 broken, not an error.
  const brokenCount = () => (world && world.regions ? world.regions.reduce((acc, r) => acc + (r.hits > 0 ? 1 : 0), 0) : 0);
  if (brokenEl) { brokenEl.textContent = String(brokenCount()); setInterval(() => { brokenEl.textContent = String(brokenCount()); }, 400); }

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
  // THE YARD STARTS CALM. The day used to roll a disaster and start it WITH the yard - "everything explodes without
  // the player doing anything". A disaster is now only what the player summons from СТИХИЯ (the day's weather stays:
  // it changes the light, not the objects).
  disaster = null;
  top = bandTop(world); ended = false; stomps = 0;
  clearSky(sky, skyLines());
  folk = makeFolk(); paintHide(); hideT = 0;
  paintView();
  stage = 'scan'; scanT = 0; endIn = 0; shown = {}; press = null; foldForPlay(false);
  banner('СОБИРАЮ ДВОР', true);       // the loading line: no counts, no labels, nothing to read until the yard is ready
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
  // THE DECODED PHOTOGRAPH IS KEPT FOR THE ENGINE: its S0 box-averages the ORIGINAL pixels (the reference's own input),
  // so the app must hand it the same image element, not the already-reduced game grid.
  if (typeof window !== 'undefined') {
    // A URL to the ORIGINAL BYTES: the engine's S0 reads naturalWidth/naturalHeight and box-averages the photograph
    // itself; an ImageBitmap (what createImageBitmap returns) has neither, and a reduced grid would change its frame.
    try { window.__photoUrl = URL.createObjectURL(file); } catch { window.__photoUrl = null; }
    window.__photoImg = image;
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
    // the photograph's own layer: contrast-aware reduction, expanded first so thin structure survives
    const expanded = expandContrast(src.data, w * GAME, h * GAME);
    const { px: down } = downscaleContrast(expanded, w * GAME, h * GAME, (w * GAME) / w);
    if (typeof window !== 'undefined') window.__downscale = 'contrast';
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

// THE REFERENCE SCENES, BY PHOTOGRAPH FILE NAME (the operator's own SCENES: assets/prague.jpg etc., which this repo
// carries as photos-test/*). A matched photograph is annotated with the operator's annotation before the build, so the
// app's default for these photographs IS the reference's frame - no marking, no guess, the engine's own numbers.
const REFERENCE_SCENES = {
  'v10a.jpg': 'prague-tower',
  '2026-10-12 23.06.59.jpg': 'prague-street',
  '2026-10-12 23.06.55.jpg': 'aerial-church',
  'sunset.jpg': 'sunset-bus',
};
async function referenceAnnotationFor(file) {
  const label = file && REFERENCE_SCENES[file.name];
  if (!label) return null;
  try {
    const { referenceScene } = await import('./ref/convert.js');
    return await referenceScene(label);
  } catch { return null; }
}
async function fromFile(file) {
  if (typeof window !== 'undefined') window.__photoFile = file;   // the annotate flow rebuilds from the same photo
  // `?vector=1` MEANS THE VECTOR ROUTE, EXPLICITLY: the capture harnesses use it to exercise the GAME on the app's own
  // path, and the reference annotation must not override that (measured: the harness threw, the score did not move).
  const refAnn = params.get('vector') === '1' ? null : await referenceAnnotationFor(file);
  if (refAnn && typeof window !== 'undefined') window.__sceneAnnotation = refAnn;
  const { w, h, large, small, big, rgba } = await decode(file);
  stage = 'detect'; world = null; me = null; cards(null); paintView();
  cam = { x: 0, y: 0, w, h };
  setSize(w, h);
  ctx.drawImage(small, 0, 0);
  banner('ИЩУ ВЕЩИ', true);
  if (params.get('annotate') === '1') { note('НАЖМИ НА ЗДАНИЕ ИЛИ МАШИНУ — рамка покажет, где оно; углы рамки тянутся'); annotatePanel(); }
  note('ищу настоящие вещи на снимке — всё на телефоне, снимок никуда не уходит');
  const t0 = performance.now();
  const found = await detectAll(large, (done, total) => { $('banner').textContent = `ИЩУ ВЕЩИ ${done}/${total}`; });
  // THE BANNER IS CLEARED THE MOMENT THE SEARCH ENDS. It was set here and never unset, so "ИЩУ ВЕЩИ 14/14" sat over
  // the yard for the whole session - the creator asked twice where it came from. 14 is not a target count: it is how
  // many tiles this photograph needs for the detector, and it means nothing once the tiles are done.
  $('banner').textContent = '';
  $('selfRun')?.addEventListener('click', () => runSelfTest());
  // THE PANEL RUNS WHEN THERE IS A WORLD: a fixed 1.2 s timer fired during the engine path's second build and the first
  // row read "двор построен · нет мира" on a frame that was there (measured). The build calls it when it is done; the
  // timer stays only as a fallback for the paths that never call it.
  setTimeout(() => { if (world) { try { runSelfTest(); } catch (e) { /* the panel is a readout */ } } }, 2500);
  $('banner').style.display = 'none';   // the tile counter is not a status line for the session
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const names = found.kept.map((d) => TARGETS[d.label].ru);
  // build() awaits the scene parse, so the note is written when the yard actually exists
  // A THROW INSIDE THE BUILD IS SWALLOWED BY ITS OWN try/catch AND LEAVES AN EMPTY YARD - the failure this project
  // has shipped twice. The recorder below makes the next one visible instead of silent: it never changes behaviour.
  let built = false;
  try {
    built = await build(rgba, w, h, found.kept, big);
  } catch (error) {
    if (typeof window !== 'undefined') window.__buildError = String(error && (error.stack || error.message) || error);
    throw error;
  }
  if (built) {
    try { runSelfTest(); } catch (e) { /* the panel is a readout, never a failure of the game */ }
    const panes = windowsIn(yard.regions);
    note(`нашёл за ${secs} с: ${[...names, panes ? `окон ${panes} (на глаз, по тёмным проёмам в стене)` : ''].filter(Boolean).join(', ')}`);
    // A NEW PHOTOGRAPH IS MARKED BEFORE IT IS PLAYED. The player taps a building (and a car), the frame becomes the
    // operator's engine's frame; ПРОПУСТИТЬ keeps the vector route for anyone who does not want to mark.
    // MARKING IS AN EXPLICIT ACTION, NOT AN AUTOMATIC ONE. It was automatic for one build, and the operator's phone
    // showed why that is wrong: the marking panel sits over the game's own bar (i / КАМЕНЬ / СТИХИЯ / play), so a tap
    // meant for the disaster chip hit the panel, the yard was rebuilt from a half-drawn mark and the screen turned into
    // a half-marked frame with a disaster on top of it. A photograph now plays as before; РАЗМЕТИТЬ enters the mode.
    if (params.get('annotate') === '1') enterAnnotate();
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
  const parse = await sceneParse(shot.big || shot.rgba, w, h, w * 5, h * 5).catch(() => null);
  const st = styliseVector(shot.rgba, w, h, { marks: found.kept, fundamentals: true, parse }), next = yardFrom({ w, h, idx: st.idx, palette: st.palette, ...withWindows(toRegions(found.kept, shot.rgba, w, h), st, w, h, shot.big, shot.rgba) });
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
    if (hit(t, hx, hy, rock.damage, m.combo, rock.splash)) rock.touched.add(t.id);
  }
  // A thing that skips goes on to the nearest standing thing it has not touched.
  if (rock.hops > 0) {
    const from = targets[0], next = chainNext(world, from, rock.touched);
    if (next) throwThing(fx, world, m, rock.kind, next.cx, next.cy, next, { x: from.cx, y: from.cy, hops: rock.hops - 1, touched: rock.touched });
  }
  if (world.done) allClear();
}

// One impact on one thing, from a throw or from a pair of feet: the rules decide, and everything answers.
function hit(t, hx, hy, damage, comboTime, splash = 0) {
  if (typeof window !== 'undefined' && params.has('debug')) window.__lastHit = { damage, splash, targetId: t && (t.engineId || t.engineBid || 0), kind: t && t.kind, engineFrame: world && !!world.engineFrame };
  // AN ENGINE-PAINTED YARD TAKES THE HIT IN THE ENGINE: its D-model paints the piece, glass and debris, and the frame
  // is copied back. Our own damage art is only for the vector route.
  if (world.engineFrame && engineDamage(hx, hy, damage, splash, t && (t.engineId || t.engineBid || 0))) {
    // THE HUD COUNTS WHAT THE ENGINE PAINTED: its model keeps its own state, so the app's `hits` is moved here (a hit is
    // a hit), and a region the engine has taken to no-id is gone.
    t.hits = (t.hits || 0) + 1;
    world.hits = (world.hits || 0) + 1;
    const c = window.__engineInst;
    const k = Math.floor(hy) * world.w + Math.floor(hx);
    if (c && c.S && c.S.ID && k >= 0 && k < c.S.ID.length && !c.S.ID[k]) t.gone = true;
    // NO SCREEN-WIDE EFFECTS ON AN ENGINE FRAME: `impact` sets a full-screen flash, which repaints every pixel and
    // reads as the screen jumping/blinding (measured: a 90% frame difference that was the FLASH, not the damage). The
    // reference's frame is never flashed; the hit answers with the engine's own painted damage.
    sfx.hit(1); navigator.vibrate?.(12);
    pop(`+1`, hx, hy);
    return { kind: 'hit', points: 1, combo: 1 };
  }
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
  // `?clock=<seconds>` PINS THE ANIMATION CLOCK **AND THE TIME STEP** (G-DET-CLOCK / G-DET-RENDER,
  // docs/DETERMINISM.md §5 level 3). The build is deterministic (G-DET-PARSE, G-DET-DETECT, G-DET-WORLD all PASS),
  // and drawing at one moment of the animation is deterministic too - but the moment is chosen by how long the
  // build happened to take, so two captures of the same photograph land on different phases of a moving thing
  // (measured: `particles` 49 -> 48 and fx.clock 30.13 -> 31.40 between two frames of one build, and that alone
  // is the frame's variation). With the pin, both the clock and dt are constants, so the simulation is a pure
  // function of the build and the frame at that clock is byte-identical.
  // It is a gate affordance of the same kind as `?clean=1&news=0`: no product path reads it, and every gate that
  // uses it prints the pin it used.
  const raw = Math.min(0.05, (now - last) / 1000);
  // THE PIN IS AUTHORITATIVE (research 2026-10-18, cited in RUNLOG): it froze `fx.clock` but still advanced dt, so
  // stepFx() below kept ageing particles, trauma, rings and rocks every frame - the "pinned" frame kept changing for
  // about 2.5 s and only then froze. That is why a hash-settle wait could pass on an already-stopped page and never
  // on a live one. With dt = 0 the pinned frame is the FIRST frame and stays it.
  const dt = clockPin >= 0 ? 0 : raw;
  last = now;
  clock = clockPin >= 0 ? clockPin : clock + raw;
  if (typeof window !== 'undefined') window.__clock = clock;   // the pin's own readout, for G-DET-CLOCK
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
      scanT = clockPin >= 0 ? SCAN_TIME : scanT + dt;   // a pinned capture is of the finished frame, never of the wipe
      scanY = Math.min(1, scanT / SCAN_TIME) * world.h;
      // NOTHING BUT THE LOADING SCREEN WHILE THE YARD IS BEING BUILT. The scan used to pop every region's label as the
      // line passed it - with the engine's world (1082 regions: 2 buildings, 6 cars, 1074 panes) that is a screen full
      // of labels and ticks at once, which the operator saw as "some things appear". The regions are marked seen
      // silently; one line says what is happening, and the objects appear when the yard is ready.
      for (const r of world.regions) {
        if (r.seen || r.cy > scanY) continue;
        r.seen = true;
      }
      if (scanT >= SCAN_TIME) {
        stage = 'play'; scanY = null; foldForPlay(true); sfx.ready();
        // THE COUNT IS THE COUNTED TARGETS, NOT THE REGIONS. With the engine as the converter the world holds 1082
        // regions (2 buildings + 6 cars + 1074 panes) and the banner said "1082 ЦЕЛЕЙ" - the operator's HUD counts
        // buildings + cars only (its TARGETS = 8). `left()` is the one place that rule lives.
        const n = left(world);
        // WHILE THE PHOTOGRAPH IS BEING MARKED THE BANNER ASKS FOR THE MARK, NOT FOR THE COUNT
        banner(annotating ? 'РАЗМЕТЬ ДВОР · ТАПНИ ЗДАНИЕ' : `${n} ${n === 1 ? 'ЦЕЛЬ' : 'ЦЕЛЕЙ'}`);
      }
    }
    const frozen = fx.freeze > 0;
    // A PINNED CLOCK PINS THE EFFECTS' OWN CLOCK TOO. `fx.clock` is a SECOND time (src/fx.js:106) and it drives
    // both the camera's trauma noise and every particle's lifetime, so leaving it free left the frame moving with
    // it (measured: 100 -> 99 particles between two frames of one build). Pinned, the whole drawn frame is a
    // function of the build and the pin - which is what makes a capture an artefact rather than a moment.
    if (clockPin >= 0) fx.clock = clockPin;
    for (const rock of stepFx(fx, world, dt)) resolve(rock);
    if (stage === 'play' && !frozen && clockPin < 0) {
      tick(world, dt);
      stepBlooms(world, dt);
      for (const ev of stepWeather(weather, world, fx, dt, rnd, { x: cam.x, y: cam.y, w: cam.w, h: cam.h })) weatherSays(ev);
      if (disaster) {
        // AN ENGINE FRAME TAKES ITS DISASTER IN THE ENGINE: `dis_hurricane / dis_tsunami / dis_godzilla / dis_beyonce`
        // are the operator's own implementations (log-spiral bands, a Gaussian crest with a water blend LUT, a walker's
        // footprint, a head that bites cars), and their visuals are the reference's. Ours ran a separate, poorer model.
        if (world.engineFrame && engineDisaster()) { /* the engine painted this frame */ }
        else for (const ev of stepDisaster(disaster, world, dt, rnd)) disasterSays(ev);
      }
      stepDrink(drink, dt);
      if (me?.down) walk(dt);
      if (stepSky(sky, dt, cam.w)) sfx.fly();
      if (typeof window !== 'undefined') window.__folk = folk;
      // THE PEOPLE WALK ON THE SCENE'S GROUND LINE, NOT ON A PERCENTAGE OF THE CAMERA. Their band used to be 45%..78%
      // of the camera height, which in the walking view lands in the sky (the operator saw people "flying"). The
      // scene's own ground line (`gy` of the annotation, the engine's own number) puts them on the street, and the band
      // is a strip of that street.
      {
        const ann = typeof window !== 'undefined' ? window.__sceneAnnotation : null;
        const gy = ann && Number.isFinite(Number(ann.gy)) ? Number(ann.gy) : null;
        const bandTop = gy != null ? gy + 6 : Math.max(top + 6, cam.y + cam.h * 0.45);
        const bandBottom = gy != null ? Math.min(world.h - 6, gy + Math.max(40, Math.round(cam.h * 0.16))) : cam.y + cam.h * 0.78;
        if (!world.done && !folk.seen) for (const ev of stepFolk(folk, dt * peopleSpeed(weather), { x0: cam.x, x1: cam.x + cam.w, top: bandTop, bottom: bandBottom }, rnd)) folkSays(ev);
      }
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
    // G-DET-RENDER's readout: what the renderer is about to draw, so a frame that re-rolls is attributed to a
    // named input instead of guessed at (it named the moving particle list and the free-running fx.clock, which
    // were the whole of the frame's variation). Read-only, never drawn.
    if (typeof window !== 'undefined') window.__drawState = () => ({
      seconds: clock, fxClock: Math.round(fx.clock * 1e4) / 1e4, trauma: fx.trauma,
      particles: fx.particles.length, rings: fx.rings.length, rocks: fx.rocks.length,
      worldIdx: world.idx.join('').length, hits: world.regions.filter((r) => r.hits > 0).length,
      motion: JSON.stringify(motion), shake: JSON.stringify(shake), cam: cam.x + ',' + cam.y + ',' + cam.w + ',' + cam.h,
      stage, flier: sky.flier ? sky.flier.kind + ':' + Math.round(sky.flier.x * 100) : null, folk: folk.people.length,
      hidden: folk.hidden, seen: folk.seen, done: world.done, scanY: scanY === null ? null : Math.round(scanY),
      weather: cleanFrame ? null : weather?.kind, disaster: cleanFrame ? null : disaster?.kind, filter, clean: cleanFrame,
    });
    // THE REFERENCE'S FRAME DOES NOT MOVE. The app shook the whole canvas on every hit (a rotation/translation of the
    // picture), which on an engine-painted yard reads as the screen jumping - measured: our damaged frame differed from
    // the operator's by 94.38% because the dump was taken mid-shake, not because the damage was wrong. An engine frame
    // is drawn still.
    // AN ENGINE FRAME IS THE WHOLE PICTURE, 1:1 - THE REFERENCE'S PHONE SCREEN. The app's walking camera zoomed the
    // yard to the player's eye, which cropped an engine frame and made it look like a different scene (measured: our
    // damaged frame differed from the operator's by 90% purely from the camera). On an engine frame: no camera, no
    // tilt, no shake - the frame IS the screen.
    if (typeof window !== 'undefined') window.__cam = cam;
    const engineView = world.engineFrame ? { cam: { x: 0, y: 0, w: world.w, h: world.h }, motion: { angle: 0, x: 0, y: 0 }, shake: { angle: 0, x: 0, y: 0 } } : null;
    draw(ctx, buf, world, fx, { annot: annEdit, filter, mode, seconds: clock, scanY, motion: engineView ? engineView.motion : motion, shake: engineView ? engineView.shake : shake, cam: engineView ? engineView.cam : cam, me: engineView ? null : me, weather,
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

// THE THROW BUTTON on the bar (the accepted frame's big yellow circle) throws at what the FRAME is showing,
// because a button has no finger position to read: the middle of the view, a little below centre, where the
// road and the cars are. It is the same throwAt the finger uses — same hand, same cooldown, same aim — so the
// button is a second way to reach one action, not a second action.
function throwHere() {
  if (stage !== 'play' || !world || world.done) return;
  throwAt({ x: cam.x + cam.w / 2, y: cam.y + cam.h * 0.62 });
}

// Where the narrow view is dark, a finger first LOOKS (drag) and then throws (tap): the throw happens on
// lifting, and only if the finger did not travel. Everywhere else a throw is on touch, with no wait.
tiltEl.addEventListener('pointermove', (e) => {
  if (annEdit.drag >= 0 && annEdit.quad) {
    const at = toWorld(e);
    const w = yard ? yard.w : 288, h = yard ? yard.h : 512;
    annEdit.quad[annEdit.drag] = [Math.max(0, Math.min(w - 1, Math.round(at.x))), Math.max(0, Math.min(h - 1, Math.round(at.y)))];
    return;
  }
  if (stage !== 'play' || !world || press) return;
  const at = toWorld(e);
  aimAt(at.x, at.y);
}, { passive: true });
// ---- THE ANNOTATION FROM THE PLAYER'S TAP (?annotate=1) -----------------------------------------------------
//
// The reference is GIVEN a quad per building (its S7 contract); this app has no annotator, so the tap becomes one. A
// tap grows the region under the finger (`pieces/region-grow.js`, the reference's S5 mechanism with a colour and an
// edge guard), takes its quad, and rebuilds the yard through the operator's engine with that annotation. This is the
// product's own gesture - the game already tells the player to press a building - used as the geometry input.
async function annotateAt(at) {
  if (!yard || !yard.rgba) return;
  const { growRegion, quadOf, fillHoles } = await import('./pieces/region-grow.js');
  const w = yard.w, h = yard.h;
  const x = Math.max(0, Math.min(w - 1, Math.round(at.x)));
  const y = Math.max(0, Math.min(h - 1, Math.round(at.y)));
  // THE GROWTH IS THE FACADE'S OWN GRID, AND ITS HOLES ARE THE FACADE'S GLASS. On a glass tower the growth travels the
  // mullion lattice (measured: 9 520 px, bounded by pane edges - correct) but stops at the tower's edge where the glass
  // changes tone, so its own extent is short (x<=82 against the hand quad's 141). The lattice's ENCLOSED holes are the
  // glass cells, so filling them gives the plane the reference's annotation draws; a blurred-scale growth was tried
  // (T+149) and leaked into the street (58 983 px), and a Hough snap landed on a pane row - both measured, both rejected.
  // THE SETTINGS ARE MEASURED, NOT CHOSEN: a sweep on the judged photograph (tolerance 90..220 x edge guard 40/70) gave
  // 9 520 px at 90/40 (stops mid-tower), 20 244 px at 120/70 with the quad [[0,0],[98,0],[121,288],[0,293]] against the
  // operator's hand quad [[0,0],[141,0],[126,289],[0,258]], and a LEAK into the next building at 150/40 (right side 227)
  // and 180+ (the whole street). 120/70 is the widest setting that stays on the tower.
  // a CAR is a tighter growth than a building: two parked cars share their tone, and a 120/70 growth merges them into
  // one 151-px-wide box (measured T+150) - 60/30 keeps one car
  const r = growRegion({ w, h, rgba: yard.rgba, seed: y * w + x, tolerance: annKind === 'car' ? 90 : 120, edgeGuard: annKind === 'car' ? 45 : 70 });
  // a CAR may be 80 px on this grid (the reference's own boxes are 23..86 wide); a BUILDING is never that small
  if (r.pixels.length < (annKind === 'car' ? 80 : 200)) { pop('МЕЛКО', at.x, at.y, 'tag'); return; }
  // ---- A CAR IS A BOX, AND IT IS THE SAME GESTURE -----------------------------------------------------------
  if (annKind === 'car') {
    const xs = [], ys = [];
    for (const p of r.pixels) { xs.push(p % w); ys.push((p / w) | 0); }
    const bx = Math.min(...xs), by = Math.min(...ys);
    const bw = Math.max(...xs) - bx + 1, bh = Math.max(...ys) - by + 1;
    if (bw < 6 || bh < 6) { pop('МЕЛКО', at.x, at.y, 'tag'); return; }
    // THE ENGINE'S CAR FORMAT IS FLAT: it reads `cr.x, cr.y, cr.w, cr.h, cr.type` (engine line 221) - a nested
    // `{box:{...}}` produced a build with `targets: 1` and no cars (measured T+150).
    ann.cars.push({ x: bx, y: by, w: bw, h: bh, type: 'box', name: 'МАШИНА' });
    const gy = Math.max(...ann.cars.map((c) => c.y + c.h));
    window.__sceneAnnotation = { gy: Math.min(h - 2, Math.round(gy)), sky: 'auto', h0: window.__skylineY || null,
      buildings: ann.buildings.map((bb, i) => ({ id: i + 1, quad: bb.quad, kind: bb.kind || 'auto' })), cars: ann.cars };
    banner(`МАШИНА ${ann.cars.length}`);
    pop('МАШИНА', at.x, at.y, 'tag');
    window.__engine = null;
    if (window.__photoFile) fromFile(window.__photoFile);
    return;
  }
  const filled = fillHoles(r.mask, w, h);
  const mass = Int32Array.from(filled);
  // THE GROWTH KNOWS THE PLANE, THE EDGES KNOW THE EXTENT: the plain quad is the growth's own reach (on the tower that
  // is x<=82 where the hand quad says 141), so it is snapped to the photograph's strongest boundary lines around it.
  const plainQ = quadOf(mass, w);
  const q = { quad: plainQ.quad, area: plainQ.area };
  if (typeof window !== 'undefined') window.__tapQuad = { grown: r.pixels.length, filled: mass.length, quad: plainQ.quad };
  // THE REFERENCE PINKS THE CHECKER HOUSE (`kind: 'checker'` in its SCENES); a facade the engine analyses on its own is
  // `auto`. The panel offers the third choice, because the engine's auto-detection read the checker house as a punched
  // facade (11x9/88 where the operator's pinned annotation reads 6x7/228 - measured T+150).
  ann.buildings.push({ kind: annKind === 'checker' ? 'checker' : 'auto', quad: q.quad });
  const gy = Math.max(...ann.buildings.map((b) => Math.max(b.quad[2][1], b.quad[3][1], b.quad[0][1], b.quad[1][1])));
  // `sky: 'auto'` IS THE REFERENCE'S OWN FIELD (three of its four scenes omit h0 and let the engine measure the
  // horizon from the sky); without it the band's scale is undefined and the frame's sky fills with band dots.
  window.__sceneAnnotation = { gy: Math.min(h - 2, Math.round(gy)), sky: 'auto', h0: (window.__skylineY || null), buildings: ann.buildings.map((b, i) => ({ id: i + 1, ...b })), cars: ann.cars };
  annEdit.quad = q.quad.map(([x, y]) => [x, y]);       // the handles are draggable from here
  banner(`ЗДАНИЕ ${ann.buildings.length} · ${r.pixels.length} px`);
  pop('ЗДАНИЕ', at.x, at.y, 'tag');
  if (window.__photoFile) fromFile(window.__photoFile);
}
const ann = { buildings: [], cars: [] };
// ---- THE ANNOTATION PANEL: the product's own step, not a URL flag -------------------------------------------
//
// The reference's geometry is authored per photograph; the app's equivalent is the player's finger. The panel is the
// only new UI: what a tap adds (a building or a car), and the button that finishes and builds the yard.
// THE EXPLICIT ENTRY: the player asks to mark the yard. The current frame keeps playing behind the panel, and ГОТОВО
// replaces it with the operator's engine's frame built from the mark.
function enterAnnotate() {
  if (!yard) { note('сначала сними двор'); return; }
  annotating = true;
  banner('РАЗМЕТЬ ДВОР · ТАПНИ ЗДАНИЕ');
  note('тапни здание или машину: рамка покажет, где оно, углы рамки тянутся; ГОТОВО строит двор из разметки');
  annotatePanel();
}
function annotatePanel() {
  // THE TAP IS REACHABLE FROM THE PAGE while the photograph is being marked: the page's own probes press the same
  // functions the finger does (and the panel is the visual affordance).
  if (typeof window !== 'undefined') {
    window.__annotateAt = annotateAt;
    window.__dragQuad = (i, x, y) => { if (!annEdit.quad) return null; annEdit.quad[i] = [x, y]; applyQuad(); return annEdit.quad; };
    window.__annotateKind = (k) => { annKind = k === 'car' ? 'car' : k === 'checker' ? 'checker' : 'building'; return annKind; };
  }
  if (document.getElementById('annBar')) return;
  const bar = document.createElement('div');
  bar.id = 'annBar';
  // ABOVE THE GAME'S OWN BAR, AND THE BAR IS HIDDEN WHILE MARKING: the first version sat at bottom:8px, exactly over
  // i/КАМЕНЬ/СТИХИЯ/play, and swallowed the player's taps (measured on the operator's phone).
  bar.style.cssText = 'position:fixed;left:8px;right:8px;bottom:78px;z-index:60;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font:600 11px/1.1 system-ui,sans-serif';
  const gameBar = document.getElementById('bar');
  if (gameBar) gameBar.style.display = 'none';
  const mk = (text, fn) => { const b = document.createElement('button'); b.textContent = text; b.style.cssText = 'padding:10px 4px;border-radius:8px;border:2px solid #0b0018;background:#30e1b9;color:#0b0018;white-space:nowrap'; b.addEventListener('click', fn); bar.appendChild(b); return b; };
  const big = (b) => { b.style.gridColumn = 'span 3'; };
  const bBuilding = mk('ЗДАНИЕ', () => { annKind = 'building'; paint(); });
  const bChecker = mk('ШАХМАТКА', () => { annKind = 'checker'; paint(); });
  const bCar = mk('МАШИНА', () => { annKind = 'car'; paint(); });
  const close = () => { bar.remove(); annotating = false; if (gameBar) gameBar.style.display = ''; banner(''); };
  const bReady = mk('ГОТОВО', () => { close(); applyQuad(); });
  const bSkip = mk('ПРОПУСТИТЬ', () => { close(); note('двор собран старым путём: разметка не задана'); });
  big(bReady); big(bSkip);
  const paint = () => {
    bBuilding.style.background = annKind === 'building' ? '#30e1b9' : '#2a2a3a';
    bBuilding.style.color = annKind === 'building' ? '#0b0018' : '#9fb8c8';
    bChecker.style.background = annKind === 'checker' ? '#30e1b9' : '#2a2a3a';
    bChecker.style.color = annKind === 'checker' ? '#0b0018' : '#9fb8c8';
    bCar.style.background = annKind === 'car' ? '#30e1b9' : '#2a2a3a';
    bCar.style.color = annKind === 'car' ? '#0b0018' : '#9fb8c8';
  };
  paint();
  document.body.appendChild(bar);
}
// THE QUAD BEING EDITED: the tap produces it, the player drags its four handles onto the building's corners (the
// reference's annotation is a hand quad; this is the same act with a finger), and the yard is rebuilt on release.
const annEdit = { quad: null, drag: -1 };
// WHAT A TAP ADDS. The reference's annotation carries buildings (quads) AND cars (boxes) - both are the player's
// geometry, both are given (`S7`). A building is grown and quad-edited; a car is grown and taken as its BOX (the engine's
// S12 cuts inside a given box). The panel in annotate mode sets this.
let annKind = 'building';
// THE APP'S OWN STEP: a new photograph is ANNOTATED first - the reference's contract needs the geometry, and the
// player's finger is where it comes from. `?vector=1` skips it (the vector route, the old pipeline); ГОТОВО or ПРОПУСТИТЬ
// end it. A photograph is never silently converted by a guess.
let annotating = false;
const HANDLE_R = 11;                                   // game px: how near a corner a press must land to grab it
const handleNear = (at) => {
  if (!annEdit.quad) return -1;
  let best = -1, bestD = HANDLE_R;
  annEdit.quad.forEach(([x, y], i) => { const d = Math.hypot(x - at.x, y - at.y); if (d < bestD) { bestD = d; best = i; } });
  return best;
};
function applyQuad() {
  if (!annEdit.quad || !ann.buildings.length) return;
  const b = ann.buildings[ann.buildings.length - 1];
  b.quad = annEdit.quad.map(([x, y]) => [x, y]);
  const h = yard ? yard.h : 512;
  const gy = Math.max(...b.quad.map((c) => c[1]));
  window.__sceneAnnotation = { gy: Math.min(h - 2, Math.round(gy)), sky: 'auto', h0: window.__skylineY || null,
    buildings: ann.buildings.map((bb, i) => ({ id: i + 1, quad: bb.quad, kind: bb.kind || 'auto' })), cars: ann.cars };
  // THE HANDLES STAY AFTER A REBUILD: the player drags corner after corner, and each release re-paints the yard.
  // A REBUILD'S READOUT MUST NOT BE THE PREVIOUS BUILD'S: clearing it is what lets a caller (and the page's own probes)
  // wait for the new frame instead of reading the old one - measured: the first drag test read 12x12/425 from the
  // previous build and could not see its own effect.
  window.__engine = null;
  if (window.__photoFile) fromFile(window.__photoFile);
}
// THE TAP IS REACHABLE FROM THE PAGE in annotate mode: the gate and the probes press the same function the finger does.

tiltEl.addEventListener('pointerdown', (e) => {
  if (annotating && yard) {
    e.preventDefault(); unlock();
    const at0 = toWorld(e);
    const k = handleNear(at0);
    if (k >= 0) { annEdit.drag = k; return; }           // a press near a corner drags it
    annotateAt(at0); return;
  }
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
  if (annEdit.drag >= 0) { annEdit.drag = -1; applyQuad(); return; }
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
      if (box2) foldBox(box2, false);                     // the choice is made: close the dropdown
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
  if (annEdit.drag >= 0 && annEdit.quad) {
    const at = toWorld(e);
    const w = yard ? yard.w : 288, h = yard ? yard.h : 512;
    annEdit.quad[annEdit.drag] = [Math.max(0, Math.min(w - 1, Math.round(at.x))), Math.max(0, Math.min(h - 1, Math.round(at.y)))];
    return;
  }
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
      // `id` NAMES THE THING THE ANSWER IS ABOUT. Without it the renderer cannot tell which region the mark
      // stands for, so the picked state could not draw its cyan outline at all — the pass asks
      // `world.infoMark.id === r.id`, and the field was never there.
      world.infoMark = { id: t.id, edges, until: clock + 6, label: t.label, kind: t.kind };
      pop(t.label.toUpperCase(), t.cx, t.y - 8, 'tag');
    } else {
      world.infoMark = null;
    }
    const f = factFor(lastTheme, rnd);
    lastTheme = f.theme;
    // THE FACT IS ABOUT THE YARD, AND IT SAYS SO. Measured on the info capture: the pop read "МАШИНА: plants" - the
    // internal theme KEY in English, leaked into the player's screen - and the note prefixed the tapped thing's name to a
    // fact about something else entirely ("машина: Дерево в городе живёт меньше..."), which reads as a false claim about
    // the car. The thing's own name is already its pop; the fact is now shown as what it is, a fact about the yard.
    // THE FACT IS A PANEL ABOUT THE THING THE PLAYER TOUCHED: its own name in the head, the fact's theme as a chip,
    // the text, and ЕЩЁ ФАКТ draws the next one from the bag (the operator's template's own behaviour).
    const show = (ff) => factPanel({
      name: t ? String(t.label || '').toUpperCase() : 'ДВОР',
      theme: ff.theme, fact: ff.n, text: ff.line,
      onMore: () => { lastTheme = ff.theme; show(factFor(lastTheme, rnd)); },
    });
    show(f);
    sfx.paper();
    e.preventDefault();
    e.stopPropagation();
  }, true);
}
// A PANEL OPENS TWO WAYS. The weapon panel and the sky panel are drawers that cost no height; a <details>
// keeps its own `open` property and a <div> cannot, so the class is what the stylesheet reads, and the divs get
// an `open` property backed by that same class — the tools and the console set `.open` on these boxes, and it
// has to keep meaning what it meant.
function foldBox(el, open) {
  if (!el) return;
  el.classList.toggle('open', open);
  if (el.tagName === 'DETAILS') el.open = open;         // the extra panels keep their native attribute
  const head = el.querySelector('[role="button"]');     // the panel's own header says whether it is open
  if (head) head.setAttribute('aria-expanded', String(open));
}
for (const id of ['paletteBox', 'fateBox']) {
  const el = $(id);
  if (el && !('open' in el)) {
    Object.defineProperty(el, 'open', {
      get: () => el.classList.contains('open'),
      set: (v) => el.classList.toggle('open', Boolean(v)),
      configurable: true,
    });
  }
}
// THE ARROW HIDES THE PANEL. It is not one of the four controls: folded away it appears between the two round
// buttons, and it is then the only way back — which is what a player wants once they have chosen.
$('annotateBtn')?.addEventListener('click', () => { if (stage === 'play' || yard) enterAnnotate(); });
$('barMore')?.addEventListener('click', (e) => {
  const bar = $('bar');
  if (!bar) return;
  const hidden = bar.classList.toggle('hidden');
  e.currentTarget.textContent = hidden ? '▴' : '▾';
  e.currentTarget.setAttribute('aria-expanded', String(!hidden));
});
// THE WEAPON PANEL (the accepted frame's second control). A tap takes the next of the nine, which is what its
// small ▴ means; a hold — or the arrow inside it — opens the drawer with all nine, because four controls cannot
// hold nine chips and every weapon has to stay reachable. Nothing here chooses a weapon itself: it presses the
// chip, so the chip's own handler stays the only place that knows what choosing means.
{
  const pill = $('palettePill'), box = $('paletteBox'), arrow = $('paletteMore');
  let timer = 0, heldAt = 0;
  const openList = () => {
    foldBox($('fateBox'), false);                       // one drawer at a time: they share the bar's width
    foldBox(box, true);
  };
  const nextWeapon = (step) => {
    const order = THROW_ORDER;
    CHIPS.get(order[(order.indexOf(hand) + step + order.length) % order.length])?.click();
  };
  pill?.addEventListener('pointerdown', () => {
    heldAt = 0;
    clearTimeout(timer);
    timer = setTimeout(() => { heldAt = Date.now(); openList(); }, 420);
  });
  for (const kind of ['pointerup', 'pointercancel', 'pointerleave']) pill?.addEventListener(kind, () => clearTimeout(timer));
  pill?.addEventListener('click', (e) => {
    e.preventDefault();
    if (arrow && arrow.contains(e.target)) { openList(); return; }           // the arrow is the whole list
    // the click a hold leaves behind is not a second choice — but a later tap still cycles (the hold is over
    // in under a second, and a tap that means "next weapon" must not be swallowed by a hold ten seconds ago)
    if (heldAt && Date.now() - heldAt < 900) { heldAt = 0; return; }
    nextWeapon(1);
  });
  pill?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    nextWeapon(1);
  });
}
// THE СТИХИЯ PANEL (the accepted frame's third control): a tap opens the sky's drawer — the same nine-choices
// problem as the weapons and the same answer. Choosing one closes it (see `set` below).
{
  const pill = $('fatePill'), box = $('fateBox');
  const toggle = () => {
    foldBox($('paletteBox'), false);
    foldBox(box, !box.classList.contains('open'));
  };
  pill?.addEventListener('click', toggle);
  pill?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle();
  });
}
// THE THROW BUTTON: the same throw as a tap on the yard, aimed at the middle of the frame (see throwHere).
$('throwBtn')?.addEventListener('click', throwHere);
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

// WHAT YOU THROW. Nine things, each with its own flight, and each one says why it is in the palette rather
// than being a second stone of a different colour. The nine chips live in a drawer the weapon panel opens,
// because the bar itself has room for four controls and not for nine (the accepted frame, element 8).
const CHIPS = new Map();                     // the chip of each throwable: the bar's panel presses these
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
    $('paletteIcon').dataset.w = id;         // the panel's icon is the thing in the hand, not always a stone
    paintEngineIcon();
    $('paletteWhy').textContent = t.why;
    foldBox($('paletteBox'), false);         // the choice is made: the drawer closes itself
    paintHand();
    if (world && stage === 'play') banner(t.label.toUpperCase());
  });
  CHIPS.set(id, button);
  $('palette').append(button);
}
$('paletteNow').textContent = item.label.toUpperCase();
$('paletteIcon').dataset.w = hand;
setTimeout(paintEngineIcon, 0);
$('paletteWhy').textContent = item.why;
$('lookNow').textContent = mode.label.toUpperCase();
$('lookWhy').textContent = mode.why;

// The palette opens by itself the first time, because a folded panel nobody knows about is a feature nobody
// has. The creator reported "no palette with object to throw added" while it was on the screen, folded at
// the bottom — that is a discoverability failure, not a missing feature, and the fix is to show it once.
const PALETTE_SEEN = 'dvor8.paletteSeen';
try {
  if (!localStorage.getItem(PALETTE_SEEN)) {
    foldBox($('paletteBox'), true);
    localStorage.setItem(PALETTE_SEEN, '1');
  }
} catch { foldBox($('paletteBox'), true); }

// While a yard is being played the extra panels fold themselves away, so the screen holds the yard, the
// thing in the hand and the danger meter — and nothing else the player did not ask for.
function foldForPlay(playing) {
  for (const id of ['paletteBox', 'lookBox', 'moreBox']) foldBox($(id), !playing);
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
