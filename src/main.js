// The flow: a photograph, a scan, a yard to take apart, a score, again.
//
// Nothing here decides anything. stylise.js turns the photograph into the picture, segment.js finds the
// things in it, world.js says what a hit does, fx.js makes it felt, render.js shows it. This file wires
// them to the page and the finger.

import { stylise } from './stylise.js';
import { segment } from './segment.js';
import { demoPhoto } from './demo.js';
import { makeWorld, pick, strike, tick, left, COMBO_WINDOW } from './world.js';
import { makeFx, throwRock, impact, burst, stepFx, shakeOffset } from './fx.js';
import { viewMotion, clientToWorld, LONG, SHORT, SCAN_TIME } from './view.js';
import { makeBuffer, draw } from './render.js';
import { FILTERS } from './palette.js';
import { mulberry32 } from './rng.js';
import { sfx, unlock, setMuted } from './audio.js';
import { makeRecogniser } from './recognise.js';
import { PROVIDERS } from './llm.js';

const $ = (id) => document.getElementById(id);
const canvas = $('yard'), ctx = canvas.getContext('2d');
const frameEl = $('frame'), tiltEl = $('tilt'), pops = $('pops');
const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
const rnd = mulberry32(8);

let yard = null;        // the photograph and what was found in it: kept, so «ЕЩЁ РАЗ» costs nothing
let world = null, fx = null, buf = null;
let mode = 'title';     // title → scan → play → done
let filter = 'sober';
let clock = 0, scanT = 0, endIn = 0, last = performance.now();
let motion = viewMotion(filter, 0, calm), shake = { x: 0, y: 0 };
let shown = { score: -1, combo: -1, left: -1 };

// ---- keys and the model ---------------------------------------------------------------------------
const KEYS_AT = 'dvor8.keys';
let keys = {};
try { keys = JSON.parse(localStorage.getItem(KEYS_AT) || '{}') || {}; } catch { /* no storage: no keys */ }
let recogniser = makeRecogniser(keys);
function paintSource(text) {
  $('hudSource').textContent = text || (recogniser
    ? `ключи: ${recogniser.router.providers.join(', ')} · один запрос на двор`
    : 'без ключа: двор разбирается на самом телефоне, сеть не нужна');
  $('privacy').textContent = recogniser
    ? 'Введён ключ модели: снимок будет отправлен этому сервису, чтобы назвать найденное.'
    : 'Снимок остаётся в телефоне.';
}

// ---- small pieces of feedback ---------------------------------------------------------------------
function pop(text, x, y, kind = '') {
  while (pops.children.length > 12) pops.firstChild.remove();
  const el = document.createElement('div');
  el.className = `pop ${kind}`;
  el.textContent = text;
  el.style.left = `${((x + motion.x) / world.w) * 100}%`;
  el.style.top = `${((y + motion.y) / world.h) * 100}%`;
  el.addEventListener('animationend', () => el.remove());
  pops.append(el);
}
function banner(text) {
  const el = $('banner');
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;   // restart the animation
  el.classList.add('show');
}
function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function paintHud() {
  if (!world) return;
  if (world.score !== shown.score) { $('score').textContent = world.score; if (shown.score >= 0) bump($('score')); shown.score = world.score; }
  if (world.combo !== shown.combo) { $('combo').textContent = world.combo > 1 ? `x${world.combo}` : '—'; if (world.combo > 1) bump($('combo')); shown.combo = world.combo; }
  if (left(world) !== shown.left) { $('left').textContent = left(world); shown.left = left(world); }
  $('comboBar').style.width = `${(world.comboLeft / COMBO_WINDOW) * 100}%`;
}

// ---- from a photograph to a yard ------------------------------------------------------------------
function load(rgba, w, h, imageUrl) {
  const st = stylise(rgba, w, h);
  yard = { rgba, w, h, st, seg: segment(st, w, h), imageUrl, labels: null };
  canvas.width = w; canvas.height = h;
  document.documentElement.style.setProperty('--aspect', String(w / h));
  buf = makeBuffer(w, h);
  begin();
  // One model call per photograph, not per attempt: the names are kept with the yard.
  if (recogniser) {
    const asked = yard;
    paintSource('спрашиваю модель…');
    recogniser.recognise(world, imageUrl).then((r) => {
      if (asked !== yard) return;
      if (r.source === 'routed') {
        yard.labels = r.labels;
        applyLabels();
        paintSource(`названия: ${r.lane} · ${r.model} · ≈${r.tokens} токенов`);
      } else {
        const trail = r.tried.map((t) => `${t.lane} ${t.status || 'нет связи'}`).join(', ');
        paintSource(`названия: нет (${trail || r.why})`);
      }
    });
  } else paintSource();
}
function applyLabels() {
  for (const { id, label } of yard.labels || []) if (world.regions[id]) world.regions[id].label = label;
}
function begin() {
  world = makeWorld({ w: yard.w, h: yard.h, photo: yard.rgba, st: yard.st, seg: yard.seg, seed: 8 });
  applyLabels();
  fx = makeFx();
  mode = 'scan'; scanT = 0; endIn = 0;
  shown = { score: -1, combo: -1, left: -1 };
  pops.replaceChildren();
  $('title').hidden = true; $('end').hidden = true;
  paintHud();
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
  // Cover the picture's shape and crop the overflow, so a 16:9 phone photo is not squashed.
  const fit = (cw, ch) => {
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const x = c.getContext('2d'), s = Math.max(cw / iw, ch / ih);
    x.imageSmoothingQuality = 'high';
    x.drawImage(image, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
    return c;
  };
  const small = fit(w, h);
  load(small.getContext('2d').getImageData(0, 0, w, h).data, w, h, fit(w * 2, h * 2).toDataURL('image/jpeg', 0.7));
}
function fromDemo() {
  const [w, h] = window.innerHeight >= window.innerWidth ? [SHORT, LONG] : [LONG, SHORT];
  const rgba = demoPhoto(w, h, 8);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
  load(rgba, w, h, c.toDataURL('image/jpeg', 0.8));
}

// ---- a hit ----------------------------------------------------------------------------------------
function resolve(rock) {
  const res = rock.region && !rock.region.gone ? strike(world, rock.region, rock.tx, rock.ty) : null;
  if (!res) {
    // A miss is answered too: a puff and a low note. It costs nothing and it does not end a combo.
    sfx.miss();
    burst(fx, Array.from({ length: 5 }, () => ({ x: rock.tx, y: rock.ty, c: 16 })), rock.tx, rock.ty + 2, rnd, 40);
    return;
  }
  const broke = res.kind === 'break';
  impact(fx, res.kind, calm);
  burst(fx, res.debris, rock.tx, rock.ty, rnd, broke ? 150 : 70);
  if (broke) sfx.break(res.combo); else sfx.hit(res.combo);
  navigator.vibrate?.(broke ? 35 : 12);
  pop(`+${res.points}`, rock.tx, rock.ty);
  if (broke) pop(res.region.label || `ЦЕЛЬ ${res.region.id + 1}`, res.region.cx, res.region.y - 4, 'tag');
  if (res.combo > 1) pop(`x${res.combo}`, world.w / 2, world.h * 0.2, 'big');
  if (world.done) { endIn = 0.9; sfx.done(); banner('ЧИСТО'); }
}

function finish() {
  mode = 'done';
  $('endScore').textContent = world.score;
  const aim = world.throws ? Math.round((world.hits / world.throws) * 100) : 0;
  $('endLine').textContent = `${world.time.toFixed(1)} с · комбо x${world.maxCombo} · точность ${aim}%`;
  $('end').hidden = false;
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
    if (mode === 'scan') {
      scanT += dt;
      scanY = Math.min(1, scanT / SCAN_TIME) * world.h;
      for (const r of world.regions) {
        if (r.seen || r.cy > scanY) continue;
        r.seen = true;
        sfx.tick(r.id);
        pop(`#${r.id + 1}`, r.cx, r.cy, 'tag');
      }
      if (scanT >= SCAN_TIME) { mode = 'play'; scanY = null; sfx.ready(); banner(`${world.regions.length} ЦЕЛЕЙ`); }
    }
    const frozen = fx.freeze > 0;
    for (const rock of stepFx(fx, world, dt)) resolve(rock);
    if (mode === 'play' && !frozen) {
      tick(world, dt);
      if (world.done && (endIn -= dt) <= 0) finish();
    }
    shake = shakeOffset(fx);
    draw(ctx, buf, world, fx, { filter, seconds: clock, scanY, motion, shake });
    paintHud();
  }
  requestAnimationFrame(frame);
}

// ---- the finger -----------------------------------------------------------------------------------
tiltEl.addEventListener('pointerdown', (e) => {
  if (mode !== 'play' || world.done) return;
  e.preventDefault();
  unlock();
  const at = clientToWorld(e.clientX, e.clientY, frameEl.getBoundingClientRect(), motion.angle,
    { x: motion.x + shake.x, y: motion.y + shake.y }, world.w, world.h);
  world.throws += 1;
  throwRock(fx, world, at.x, at.y, pick(world, at.x, at.y));   // what is under the finger NOW is what gets hit
  sfx.throw();
});

$('shot').addEventListener('change', (e) => { unlock(); const file = e.target.files?.[0]; e.target.value = ''; if (file) fromFile(file).catch((error) => paintSource(`не получилось: ${error.message}`)); });
$('demoBtn').addEventListener('click', () => { unlock(); fromDemo(); });
$('againBtn').addEventListener('click', begin);
$('restartBtn').addEventListener('click', () => { if (yard) begin(); });
const home = () => { mode = 'title'; world = null; yard = null; $('end').hidden = true; $('title').hidden = false; ctx.clearRect(0, 0, canvas.width, canvas.height); };
$('newBtn').addEventListener('click', home);
$('homeBtn').addEventListener('click', home);
$('soundBtn').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.textContent = on ? 'ЗВУК' : 'БЕЗ ЗВУКА';
  setMuted(!on);
});

for (const [id, f] of Object.entries(FILTERS)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = f.label.toUpperCase();
  button.className = `btn small ${id === filter ? 'on' : 'alt'}`;
  button.addEventListener('click', () => {
    filter = id;
    document.body.dataset.filter = id;
    for (const other of $('filters').children) other.className = `btn small ${other === button ? 'on' : 'alt'}`;
  });
  $('filters').append(button);
}

for (const [id, config] of Object.entries(PROVIDERS)) {
  const row = document.createElement('label');
  row.textContent = id;
  const field = document.createElement('input');
  field.type = 'password';
  field.autocomplete = 'off';
  field.placeholder = config.hint.split('.')[0];
  field.value = keys[id] || '';
  field.addEventListener('change', () => {
    keys = { ...keys, [id]: field.value.trim() };
    try { localStorage.setItem(KEYS_AT, JSON.stringify(keys)); } catch { /* private window: the key lasts for this page */ }
    recogniser = makeRecogniser(keys);
    paintSource();
  });
  row.append(field);
  $('keyForm').append(row);
}

paintSource();
requestAnimationFrame(frame);
