import { detectAll } from '../detect.js';
import { sceneParse } from '../scene-parse.js';
import { mulberry32 } from '../rng.js';
import { oklabToRgb } from './oklab.js';
import { CLASS, classMap, downsample, pixelate } from './pixelate.js';
import { carInstances } from './instances.js';
import { cutSprites } from './sprites.js';
import { WEAPONS, createWorld, strike, step, compose } from './destruct.js';

const W = 180;
const DETECT_LONG = 1600;
const FLIGHT_FRAMES = 16;
const CLASS_TINT = [[120, 180, 255], [200, 120, 220], [60, 200, 90], [200, 170, 90], [120, 120, 130], [255, 60, 60], [255, 220, 0], [255, 140, 200]];

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const rng = mulberry32(8);
const state = { world: null, canvas: $('screen'), ctx: null, image: null, flights: [], weapon: 'stone', view: params.get('view') || 'game', cls: null, pops: [] };

function canvasOf(img, long) {
  const s = Math.min(1, long / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export async function build(img) {
  const t0 = performance.now();
  const H = Math.round((W * img.naturalHeight) / img.naturalWidth);
  const big = canvasOf(img, DETECT_LONG);
  $('note').textContent = 'ищу машины…';
  const found = await detectAll(big);
  $('note').textContent = 'размечаю двор…';
  const parse = await sceneParse(big, W, H, big.width, big.height).catch(() => null);
  const cls = classMap(parse && parse.masks, W * H);
  const carMask = cls.map((c) => (c === CLASS.CAR ? 1 : 0));
  const rgba = big.getContext('2d').getImageData(0, 0, big.width, big.height).data;
  const lab = downsample(rgba, big.width, big.height, W, H);
  const ground = cls.map((c) => (c === CLASS.ROAD || c === CLASS.TERRAIN ? 1 : 0));
  const cars = carInstances(found.all, carMask, W, H, lab, ground);
  const pix = pixelate({ lab, cls, inst: cars.inst, W, H });
  const cut = cutSprites({ idx: pix.idx, palette: pix.palette, cls, inst: cars.inst, list: cars.list, W, H });
  state.world = createWorld({ W, H, background: cut.background, palette: pix.palette, darker: pix.darker, cls, sprites: cut.sprites });
  state.cls = cls;
  window.__v2dump = () => ({ W, H, lab: Array.from(lab), cls: Array.from(cls), detections: found.all, carMask: Array.from(carMask) });
  state.photo = labToRgba(lab, W * H);
  state.canvas.width = W; state.canvas.height = H;
  state.ctx = state.canvas.getContext('2d');
  state.image = state.ctx.createImageData(W, H);
  const classesSeen = [...new Set(cls)].sort();
  window.__v2 = {
    ready: true, W, H, ms: Math.round(performance.now() - t0), segmenter: Boolean(parse), classesSeen,
    detections: found.all.length, vehicleBoxes: cars.boxes.length, cars: cars.list.length, palette: pix.palette.length,
    sprites: cut.sprites.map((s) => ({ id: s.id, x0: s.x0, y0: s.y0, w: s.w, h: s.h, n: s.n0, label: s.label })),
  };
  $('note').textContent = parse ? `машин: ${cars.list.length}` : 'сегментатор не загрузился';
  paintHud();
}

function labToRgba(lab, n) {
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i += 1) {
    const [r, g, b] = oklabToRgb(lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]);
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
  }
  return out;
}

function paintHud() {
  const w = state.world;
  if (!w) return;
  const left = w.sprites.filter((s) => s.state !== 'wreck').length;
  $('score').textContent = String(w.score).padStart(6, '0');
  $('left').textContent = `${left}/${w.sprites.length}`;
}

function throwAt(x, y) {
  const w = state.world;
  if (!w) return;
  state.flights.push({ x0: w.W / 2, y0: w.H + 4, x, y, t: 0 });
}

function advance() {
  const w = state.world;
  for (const f of state.flights) f.t += 1;
  for (const f of state.flights.filter((q) => q.t >= FLIGHT_FRAMES)) {
    const res = strike(w, f.x, f.y, WEAPONS[state.weapon], rng);
    if (res.points) state.pops.push({ x: f.x, y: f.y, text: res.destroyed ? `ВДРЕБЕЗГИ +${res.points}` : `+${res.points}`, t: 40 });
  }
  state.flights = state.flights.filter((q) => q.t < FLIGHT_FRAMES);
  step(w, rng);
  for (const p of state.pops) p.t -= 1;
  state.pops = state.pops.filter((p) => p.t > 0);
}

function draw() {
  const w = state.world;
  const data = state.image.data;
  compose(w, data);
  if (state.view === 'photo') data.set(state.photo);
  if (state.view === 'class') {
    for (let i = 0; i < w.W * w.H; i += 1) {
      const t = CLASS_TINT[state.cls[i]];
      for (let c = 0; c < 3; c += 1) data[i * 4 + c] = (data[i * 4 + c] + t[c]) >> 1;
    }
  }
  for (const f of state.flights) {
    const k = f.t / FLIGHT_FRAMES;
    const x = Math.round(f.x0 + (f.x - f.x0) * k), y = Math.round(f.y0 + (f.y - f.y0) * k - Math.sin(k * Math.PI) * 30);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const i = ((y + dy) * w.W + x + dx) * 4;
      if (i >= 0 && i < data.length) { data[i] = 30; data[i + 1] = 26; data[i + 2] = 30; }
    }
  }
  state.ctx.putImageData(state.image, 0, 0);
  state.ctx.font = '7px monospace';
  state.ctx.textAlign = 'center';
  for (const p of state.pops) {
    state.ctx.fillStyle = '#000';
    state.ctx.fillText(p.text, p.x + 1, p.y - (40 - p.t) * 0.4 + 1);
    state.ctx.fillStyle = p.text.startsWith('ВДРЕБЕЗГИ') ? '#ffd23a' : '#fff';
    state.ctx.fillText(p.text, p.x, p.y - (40 - p.t) * 0.4);
  }
  const s = w.shake;
  state.canvas.style.transform = s > 0.3 ? `translate(${(rng() - 0.5) * s * 2}px, ${(rng() - 0.5) * s * 2}px)` : '';
  paintHud();
}

function loop() {
  if (state.world) { advance(); draw(); }
  requestAnimationFrame(loop);
}

function toFrame(ev) {
  const r = state.canvas.getBoundingClientRect();
  return [((ev.clientX - r.left) / r.width) * state.world.W, ((ev.clientY - r.top) / r.height) * state.world.H];
}

state.canvas.addEventListener('pointerdown', (ev) => { if (state.world) throwAt(...toFrame(ev)); });
$('weapon').addEventListener('click', () => {
  state.weapon = state.weapon === 'stone' ? 'brick' : 'stone';
  $('weapon').textContent = state.weapon === 'stone' ? 'КАМЕНЬ' : 'КИРПИЧ';
});
const VIEWS = ['game', 'class', 'photo'];
$('view').addEventListener('click', () => { state.view = VIEWS[(VIEWS.indexOf(state.view) + 1) % VIEWS.length]; });
$('file').addEventListener('change', async (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  await build(await loadImage(URL.createObjectURL(f)));
});

window.__v2tick = (n) => { for (let i = 0; i < n; i += 1) advance(); draw(); };
window.__v2throw = (x, y) => throwAt(x, y);
window.__v2world = () => state.world;

requestAnimationFrame(loop);
build(await loadImage(params.get('photo') || 'photos-test/parking.jpg')).catch((e) => {
  window.__v2 = { ready: false, error: String((e && e.stack) || e) };
  $('note').textContent = `ошибка: ${e && e.message}`;
});
