import { detectAll } from '../detect.js';
import { sceneParse } from '../scene-parse.js';
import { mulberry32 } from '../rng.js';
import { oklabToRgb } from './oklab.js';
import { CLASS, classMap, downsample } from './classes.js';
import { carInstances } from './instances.js';
import { WEAPONS, createWorld, strike, step, compose } from './destruct.js';
import { createRuin } from './ruin.js';
import { autoScene, skyTheme } from './scene.js';
import { cutSprites } from './sprites.js';

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

const FRAME_W = 288, FRAME_H = 512;
const CRACK = 48;

function cropTo916(img) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  let sw = iw, sh = ih;
  if (iw / ih > 9 / 16) sw = ih * 9 / 16; else sh = iw * 16 / 9;
  const s = Math.min(1, DETECT_LONG / sh);
  const c = document.createElement('canvas');
  c.width = Math.round(sw * s); c.height = Math.round(sh * s);
  c.getContext('2d').drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, c.width, c.height);
  return c;
}

const groundOf = (scene, id, fallback) => {
  const b = (scene.buildings || []).find((q) => q.id === id);
  return b && b.ground ? b.ground : fallback;
};

function skyPixels(lab, cls) {
  const out = [];
  for (let i = 0; i < cls.length; i += 3) if (cls[i] === CLASS.SKY) out.push(oklabToRgb(lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]));
  return out;
}

function fromEngine(comp, seg, cars, scene) {
  const W = FRAME_W, H = FRAME_H, N = W * H, S = comp.S;
  const palette = comp.RGB.map((c) => [c[0], c[1], c[2]]);
  const darker = palette.map((_, i) => comp.scrape(i));
  const bg = Uint16Array.from(S.base);
  const cls = new Uint8Array(N).fill(CLASS.ROAD);
  const isWall = (id) => id >= 1 && id < 10;
  for (let k = 0; k < N; k += 1) {
    if (isWall(S.ID[k])) cls[k] = CLASS.BUILDING;
    else if (comp.sky[k]) cls[k] = CLASS.SKY;
  }
  for (let k = 0; k < N; k += 1) {
    if (S.ID[k]) continue;
    const segSky = seg[k] === CLASS.SKY;
    if (comp.sky[k] && !segSky) { S.base[k] = comp.q[k]; bg[k] = comp.q[k]; cls[k] = seg[k]; comp.sky[k] = 0; }
    else if (!comp.sky[k] && segSky) { bg[k] = comp.skyL[k]; cls[k] = CLASS.SKY; }
  }
  for (let k = 0; k < N; k += 1) if (cars.inst[k] >= 0) bg[k] = comp.q[k];
  const cut = cutSprites({ idx: bg, palette, cls: seg, inst: cars.inst, list: cars.list, W, H });
  bg.set(cut.background);
  const sprites = cut.sprites;
  const wallPieces = comp.CH.map((c, i) => ({ c, i })).filter(({ c }) => isWall(c.bid));
  const indexOf = new Map(wallPieces.map(({ i }, j) => [i, j]));
  const chunkOf = new Int32Array(N).fill(-1);
  const chunks = wallPieces.map(({ c }, j) => {
    for (const k of c.pix) chunkOf[k] = j;
    return {
      index: j, pix: c.pix, wins: c.wins.map((w) => comp.WN[w].pix), sup: c.sup.map((i) => indexOf.get(i)).filter((i) => i !== undefined),
      gy: groundOf(scene, c.bid, c.gy), x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, near: [],
    };
  });
  for (const a of chunks) {
    a.near = chunks.filter((b) => b !== a && b.x0 <= a.x1 + 2 && b.x1 >= a.x0 - 2 && b.y0 <= a.y1 + 2 && b.y1 >= a.y0 - 2).map((b) => b.index);
  }
  const ruin = createRuin({ W, chunks, chunkOf, crackColour: CRACK });
  return createWorld({ W, H, background: bg, palette, darker, cls, sprites, ruin });
}

export async function build(img, label = null) {
  const t0 = performance.now();
  const W = FRAME_W, H = FRAME_H;
  const crop = cropTo916(img);
  $('note').textContent = 'ищу машины…';
  const found = await detectAll(crop);
  $('note').textContent = 'размечаю двор…';
  const parse = await sceneParse(crop, W, H, crop.width, crop.height).catch(() => null);
  const cls = classMap(parse && parse.masks, W * H);
  const carMask = cls.map((c) => (c === CLASS.CAR ? 1 : 0));
  const rgba = crop.getContext('2d').getImageData(0, 0, crop.width, crop.height).data;
  const lab = downsample(rgba, crop.width, crop.height, W, H);
  const ground = cls.map((c) => (c === CLASS.ROAD || c === CLASS.TERRAIN ? 1 : 0));
  const cars = carInstances(found.all, carMask, W, H, lab, ground);
  const { Component } = await import('../ref/engine.js');
  const comp = new Component();
  const hand = label && params.get('scene') === 'hand' ? (comp.SCENES || []).find((s) => s.id === label) : null;
  const scene = hand ? JSON.parse(JSON.stringify(hand)) : autoScene({ cls, W, H });
  if (!hand) scene.sky = skyTheme(skyPixels(lab, cls));
  $('note').textContent = 'рисую…';
  const cropImg = await loadImage(crop.toDataURL('image/jpeg', 0.95));
  comp.tok += 1; comp.S = null;
  comp.build(cropImg, scene, 8);
  state.world = fromEngine(comp, cls, cars, scene);
  state.cls = state.world.cls;
  state.photo = labToRgba(lab, W * H);
  window.__v2dump = () => ({ W, H, lab: Array.from(lab), cls: Array.from(cls), detections: found.all, carMask: Array.from(carMask), scene });
  state.canvas.width = W; state.canvas.height = H;
  state.ctx = state.canvas.getContext('2d');
  state.image = state.ctx.createImageData(W, H);
  window.__v2 = {
    ready: true, W, H, ms: Math.round(performance.now() - t0), segmenter: Boolean(parse), scene: hand ? 'hand' : 'auto',
    buildings: scene.buildings.length, pieces: state.world.ruin.pieces.length, windows: comp.WN.length, theme: comp.SKY && comp.SKY.theme,
    detections: found.all.length, cars: state.world.sprites.length, palette: comp.SUB.length,
    sprites: state.world.sprites.map((s) => ({ id: s.id, x0: s.x0, y0: s.y0, w: s.w, h: s.h, n: s.n0 })),
    facades: state.world.ruin.pieces.slice(0, 400).filter((_, i) => i % 7 === 0).map((p) => ({ x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 })),
  };
  $('note').textContent = `машин: ${state.world.sprites.length} · домов: ${scene.buildings.length}`;
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

const PHOTOS = [
  ['parking.jpg', 'ПАРКОВКА', null], ['5.jpg', 'ПРАГА · БАШНЯ', 'prague-tower'],
  ['2026-10-12 23.06.59.jpg', 'ПРАГА · УЛИЦА', 'prague-street'], ['2026-10-12 23.06.55.jpg', 'ХРАМ · СВЕРХУ', 'aerial-church'],
  ['sunset.jpg', 'ЗАКАТ · АВТОБУС', 'sunset-bus'], ['yard2.jpg', 'ДВОР 2', null], ['a.jpg', 'СНИМОК A', null],
  ['b.jpg', 'СНИМОК B', null], ['web1.jpg', 'УЛИЦА 1', null], ['web2.jpg', 'УЛИЦА 2', null],
];
const pick = $('photo');
for (const [file, name] of PHOTOS) pick.add(new Option(name, file));
const current = params.get('photo') || 'photos-test/parking.jpg';
pick.value = current.replace('photos-test/', '');
pick.addEventListener('change', () => { location.search = `?photo=photos-test/${encodeURIComponent(pick.value)}`; });
const reference = (PHOTOS.find(([f]) => `photos-test/${f}` === current) || [])[2];
$('ref').hidden = !reference;
$('ref').addEventListener('click', () => {
  const img = $('refimg');
  img.src = `reference/v13/${reference}.png`;
  img.hidden = !img.hidden;
});

requestAnimationFrame(loop);
build(await loadImage(current), reference).catch((e) => {
  window.__v2 = { ready: false, error: String((e && e.stack) || e) };
  $('note').textContent = `ошибка: ${e && e.message}`;
});
