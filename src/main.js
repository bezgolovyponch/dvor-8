// The game loop. One canvas, one state, one job: the player scans the yard, then acts in it.
//
// Nothing here decides anything. The scan decides what is recognised, state.js decides what a hit does,
// render.js decides what it looks like. This file wires them and reads the keyboard.

import { buildYard, yardSummary } from './yard.js';
import { makeScan, startScan, stepScan } from './scan.js';
import { makeCamera, stepCamera, render, VIEW_W, VIEW_H } from './render.js';
import { makeEffect, throwAt, stepEffect } from './throw.js';
import { KINDS } from './state.js';

const canvas = document.getElementById('yard');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const hud = {
  scanned: document.getElementById('hudScanned'),
  broken: document.getElementById('hudBroken'),
  rocks: document.getElementById('hudRocks'),
  hint: document.getElementById('hudHint'),
  log: document.getElementById('log'),
};

let world = buildYard('двор-1');
let scan = makeScan(world);
let effect = makeEffect();
let camera = makeCamera(640);
let input = { left: false, right: false };
let last = performance.now();
let scanFlash = null;

function say(text) {
  const line = document.createElement('div');
  line.textContent = text;
  hud.log.prepend(line);
  while (hud.log.children.length > 6) hud.log.lastChild.remove();
}

function paintHud() {
  const s = yardSummary(world);
  hud.scanned.textContent = `${s.scanned} / ${s.total}`;
  hud.broken.textContent = String(s.broken);
  hud.rocks.textContent = String(s.rocks);
  hud.hint.textContent = s.scanned < s.total
    ? 'Нажми «Сканировать двор» — то, что распознается, станет 8-битным.'
    : s.rocks > 0
      ? 'Клик по двору — бросок камня. Стрелки — смотреть вдоль двора.'
      : 'Камни кончились. Перезапусти двор, чтобы начать заново.';
}

// The scan runs on its own timer, independent of drawing. A scan that only advanced when a frame arrived
// froze the moment frames were throttled — and froze silently, leaving the yard half-recognised forever.
let scanTimer = null;
function runScan() {
  if (scanTimer || scan.running) return;
  if (world.objects.every((o) => o.scanned)) { say('двор уже распознан'); return; }
  startScan(scan, performance.now());
  scanFlash = 1;
  say('сканирую…');
  scanTimer = setInterval(() => {
    const r = stepScan(scan, performance.now(), (obj) => say(`распознано: ${KINDS[obj.kind]?.label || obj.kind}`));
    if (r && r.done) {
      clearInterval(scanTimer);
      scanTimer = null;
      effect.scanY = null;
      say('двор распознан');
      paintHud();
    }
  }, 60);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stepCamera(camera, input, dt);

  effect.scanY = scan.running ? scan.y : null;

  const hits = stepEffect(effect, world, dt, () => {});
  for (const h of hits) {
    if (h.hit && h.broke) { say(`разбито: ${KINDS[h.target.kind]?.label || h.target.kind}`); paintHud(); }
    else if (h.hit) say(`попадание: ${KINDS[h.target.kind]?.label || h.target.kind}`);
  }

  if (scanFlash) { scanFlash -= dt; if (scanFlash <= 0) scanFlash = null; }
  render(ctx, world, camera, effect);
  requestAnimationFrame(frame);
}

// Controls. Arrow keys or A/D to look along the yard; a click throws a rock at what is under the pointer.
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ф') input.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'в') input.right = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ф') input.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'в') input.right = false;
});

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const vx = ((e.clientX - rect.left) / rect.width) * VIEW_W;
  const vy = ((e.clientY - rect.top) / rect.height) * VIEW_H;
  // The click names a place in the VIEW. Throwing resolves against world objects, so the camera offset is
  // added back here — the one place the view and the world are converted.
  const wx = vx + camera.x;
  const t = throwAt(effect, world, wx, vy);
  if (!t.thrown) say(t.reason);
  else say('бросок');
  paintHud();
});

document.getElementById('scanBtn').addEventListener('click', runScan);

document.getElementById('resetBtn').addEventListener('click', () => {
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  world = buildYard('двор-1');
  scan = makeScan(world);
  effect = makeEffect();
  camera = makeCamera(640);
  hud.log.replaceChildren();
  say('двор заново');
  paintHud();
});

paintHud();
requestAnimationFrame(frame);
