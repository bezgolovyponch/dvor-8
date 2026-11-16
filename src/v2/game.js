import { detectAll } from '../detect.js';
import { sceneParse } from '../scene-parse.js';
import { mulberry32 } from '../rng.js';
import { oklabToRgb } from './oklab.js';
import { CLASS, classMap, downsample } from './classes.js';
import { carInstances } from './instances.js';
import { WEAPONS, createWorld, strike, step, compose } from './destruct.js';
import { createRuin } from './ruin.js';
import { autoScene, skyTheme } from './scene.js';
import { EMPTY } from './sprites.js';
import { AIM_COLOUR, silhouette, targetAt } from './aim.js';
import { collectAt, dropLoot, drawLoot, stepLoot } from './loot.js';
import { addLoot, checkOver, createRound, registerStrike, spendThrow, tick } from './round.js';
import { calm, muteTable, simplifyCar } from './roles.js';
import { drawFacade } from './facade.js';
import { CLASS_TINT, CSS_ROLES, PAL, ROLE } from './theme.js';
import { backdrop } from './backdrop.js';
import { projectileCells } from './projectile.js';

const DETECT_LONG = 1600;
const FLIGHT_FRAMES = 16;
const AIM_FRAMES = 45;
const DROPS = { wreck: { coins: 3, gems: 1 }, piece: { coins: 1, gems: 0 } };
const PIECE_GEM_CHANCE = 0.1;
const SPRITE_CAR_H = 26;
const GROUND_CALM = { radius: 2, passes: 2 };
const FACADE = { pane: 0, paneRim: 2, paneLit: 4 };
const PANE_BLUE = 10;
for (const [name, i] of Object.entries(CSS_ROLES)) document.documentElement.style.setProperty(`--${name}`, PAL[i]);

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const rng = mulberry32(8);
const state = { world: null, canvas: $('screen'), ctx: null, image: null, flights: [], weapon: 'stone', view: params.get('view') || 'game', cls: null, pops: [], aim: null, round: createRound() };

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

function engineCars(comp, bg, cls) {
  const W = FRAME_W, S = comp.S, sprites = [];
  for (const id of comp.CARIDS) {
    const box = S.bb[id];
    if (!box) continue;
    const [x0, y0, x1, y1] = box, w = x1 - x0 + 1, h = y1 - y0 + 1;
    const px = new Int32Array(w * h).fill(EMPTY), glass = new Uint8Array(w * h), panes = new Set(comp.carGlass[id] || []);
    let n = 0;
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const k = y * W + x;
      if (S.ID[k] !== id) continue;
      const j = (y - y0) * w + x - x0;
      px[j] = S.base[k] === CRACK || panes.has(k) ? S.base[k] : snap(comp, k);
      if (panes.has(k)) glass[j] = 1;
      bg[k] = S.back[k];
      cls[k] = S.backID[k] >= 1 && S.backID[k] < 10 ? CLASS.BUILDING : CLASS.ROAD;
      n += 1;
    }
    if (h < SPRITE_CAR_H) simplifyCar({ px, glass, w, h, darker: comp.RGB.map((_, i) => comp.scrape(i)), outline: CRACK });
    sprites.push({ id, label: 'car', x0, y0, w, h, px, glass, n0: n, n, state: 'whole', heat: 0, flash: 0 });
  }
  return sprites;
}

const snap = (comp, k) => comp.quant(comp.R[k], comp.G[k], comp.B[k]);

function paneBlue(comp, id) {
  const S = comp.S, pix = [];
  for (let k = 0; k < S.ID.length; k += 1) if (S.ID[k] === id) pix.push(k);
  const L = pix.map((k) => comp.Lp[k]).sort((a, b) => a - b), cut = L[L.length >> 1];
  let light = 0, nl = 0, dark = 0, nd = 0;
  for (const k of pix) { const d = comp.B[k] - comp.R[k]; if (comp.Lp[k] > cut) { light += d; nl += 1; } else { dark += d; nd += 1; } }
  return light / Math.max(1, nl) - dark / Math.max(1, nd);
}

function pieceWalls(comp) {
  const S = comp.S, panes = new Set(), counts = comp.CH.map(() => new Map());
  for (const w of comp.WN) for (const k of w.pix) panes.add(k);
  for (let k = 0; k < S.ID.length; k += 1) {
    const c = comp.chunkOf[k];
    if (c < 0 || panes.has(k)) continue;
    const v = snap(comp, k);
    counts[c].set(v, (counts[c].get(v) || 0) + 1);
  }
  const near = (a, b) => a.bid === b.bid && b.x0 <= a.x1 + 2 && b.x1 >= a.x0 - 2 && b.y0 <= a.y1 + 2 && b.y1 >= a.y0 - 2;
  return comp.CH.map((a, i) => {
    const vote = new Map();
    comp.CH.forEach((b, j) => {
      if (i !== j && !near(a, b)) return;
      const best = [...counts[j]].sort((x, y) => y[1] - x[1])[0];
      if (best) vote.set(best[0], (vote.get(best[0]) || 0) + (i === j ? 2 : 1));
    });
    return vote.size ? [...vote].sort((x, y) => y[1] - x[1])[0][0] : -1;
  });
}

function fromEngine(comp, seg, scene) {
  const W = FRAME_W, H = FRAME_H, N = W * H, S = comp.S;
  const palette = comp.RGB.map((c) => [c[0], c[1], c[2]]);
  const darker = palette.map((_, i) => comp.scrape(i));
  const facadeWins = new Map(), walls = pieceWalls(comp);
  const wallAt = (k, fallback) => (comp.chunkOf[k] >= 0 && walls[comp.chunkOf[k]] >= 0 ? walls[comp.chunkOf[k]] : fallback);
  for (const rep of comp.REP || []) {
    const bd = scene.buildings.find((b) => b.id === rep.id);
    if (!bd || rep.kind !== 'facade' || (rep.glassDom && paneBlue(comp, rep.id) > PANE_BLUE)) continue;
    const colours = { ...FACADE, outline: CRACK, wall: (k) => wallAt(k, rep.wall), slab: (k) => comp.scrape(wallAt(k, rep.wall)) };
    facadeWins.set(rep.id, drawFacade({ W, H, ID: S.ID, base: S.base, id: rep.id, quad: bd.quad, rows: rep.rows, cols: rep.cols, colours }));
  }
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
    if (cls[k] !== CLASS.SKY) { const v = snap(comp, k); S.base[k] = v; bg[k] = v; }
  }
  const sprites = engineCars(comp, bg, cls);
  const mute = muteTable(palette, (r, g, b) => comp.lab(r, g, b));
  const isGround = (k) => cls[k] !== CLASS.SKY && cls[k] !== CLASS.BUILDING;
  for (let k = 0; k < N; k += 1) if (isGround(k)) bg[k] = mute[bg[k]];
  bg.set(calm(bg, (k) => isGround(k) && S.ID[k] === 0, W, H, GROUND_CALM.radius, GROUND_CALM.passes));
  const wallPieces = comp.CH.map((c, i) => ({ c, i })).filter(({ c }) => isWall(c.bid));
  const indexOf = new Map(wallPieces.map(({ i }, j) => [i, j]));
  const chunkOf = new Int32Array(N).fill(-1);
  wallPieces.forEach(({ c }, j) => { for (const k of c.pix) chunkOf[k] = j; });
  const byChunk = new Map();
  for (const wins of facadeWins.values()) for (const win of wins) {
    const parts = new Map();
    for (const k of win) if (chunkOf[k] >= 0) (parts.get(chunkOf[k]) || parts.set(chunkOf[k], []).get(chunkOf[k])).push(k);
    for (const [j, px] of parts) (byChunk.get(j) || byChunk.set(j, []).get(j)).push(px);
  }
  const winsOf = (c, j) => (facadeWins.has(c.bid) ? byChunk.get(j) || [] : c.wins.map((w) => comp.WN[w].pix));
  const chunks = wallPieces.map(({ c }, j) => {
    return {
      index: j, pix: c.pix, wins: winsOf(c, j), sup: c.sup.map((i) => indexOf.get(i)).filter((i) => i !== undefined),
      bid: c.bid, gy: groundOf(scene, c.bid, c.gy), x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, near: [],
    };
  });
  for (const a of chunks) {
    a.near = chunks.filter((b) => b !== a && b.x0 <= a.x1 + 2 && b.x1 >= a.x0 - 2 && b.y0 <= a.y1 + 2 && b.y1 >= a.y0 - 2).map((b) => b.index);
  }
  const ruin = createRuin({ W, chunks, chunkOf, crackColour: CRACK });
  const behind = backdrop({
    W, H, isBuilding: (k) => isWall(S.ID[k]), isGround: (k) => cls[k] !== CLASS.SKY && cls[k] !== CLASS.BUILDING && S.ID[k] === 0,
    ground: bg, sky: comp.skyL, horizon: comp.SKY ? comp.SKY.h0 : H / 2,
  });
  return createWorld({ W, H, background: bg, palette, darker, cls, sprites, ruin, behind });
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
  const { GameEngine } = await import('./engine.js');
  const comp = new GameEngine();
  const hand = label && params.get('scene') === 'hand' ? (comp.SCENES || []).find((s) => s.id === label) : null;
  const scene = hand ? JSON.parse(JSON.stringify(hand)) : autoScene({ cls, cars: cars.list, W, H });
  if (!hand) scene.sky = skyTheme(skyPixels(lab, cls));
  $('note').textContent = 'рисую…';
  const cropImg = await loadImage(crop.toDataURL('image/jpeg', 0.95));
  comp.tok += 1; comp.S = null;
  comp.build(cropImg, scene, 8);
  state.world = fromEngine(comp, cls, scene);
  state.cls = state.world.cls;
  state.photo = labToRgba(lab, W * H);
  window.__v2dump = () => ({ W, H, lab: Array.from(lab), cls: Array.from(cls), detections: found.all, carMask: Array.from(carMask), scene });
  state.canvas.width = W; state.canvas.height = H;
  state.ctx = state.canvas.getContext('2d');
  state.image = state.ctx.createImageData(W, H);
  window.__v2 = {
    ready: true, W, H, ms: Math.round(performance.now() - t0), segmenter: Boolean(parse), scene: hand ? 'hand' : 'auto',
    buildings: scene.buildings.length, pieces: state.world.ruin.pieces.length, windows: comp.WN.length, theme: comp.SKY && comp.SKY.theme,
    rep: (comp.REP || []).map((r) => ({ id: r.id, kind: r.kind, glass: r.glassDom, nw: r.nw, bf: +r.bf.toFixed(2), cover: +r.cover.toFixed(2), fcls: r.fcls, pb: Math.round(r.paneBlue) })),
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
  const w = state.world, r = state.round;
  if (!w) return;
  const left = w.sprites.filter((s) => s.state !== 'wreck').length;
  $('score').textContent = String(r.score).padStart(6, '0');
  $('throws').textContent = String(r.throws);
  $('combo').textContent = r.mult > 1 ? `x${r.mult}` : '–';
  $('left').textContent = `${left}/${w.sprites.length}`;
}

function throwAt(x, y) {
  const w = state.world;
  if (!w) return;
  state.flights.push({ x0: w.W / 2, y0: w.H + 4, x, y, t: 0, kind: state.weapon });
}

function advance() {
  const w = state.world;
  for (const f of state.flights) f.t += 1;
  for (const f of state.flights.filter((q) => q.t >= FLIGHT_FRAMES)) {
    const res = strike(w, f.x, f.y, WEAPONS[state.weapon], rng);
    registerStrike(state.round, w.frame, (res.target === 'car' || res.target === 'building') && res.points > 0);
    if (res.points) state.pops.push({ x: f.x, y: f.y, text: res.destroyed ? `ВДРЕБЕЗГИ +${res.points}` : `+${res.points}`, t: 40 });
  }
  state.flights = state.flights.filter((q) => q.t < FLIGHT_FRAMES);
  step(w, rng);
  for (const e of w.events.splice(0)) {
    const drop = DROPS[e.type];
    if (drop) dropLoot(w, { ...e, coins: drop.coins, gems: drop.gems + (e.type === 'piece' && rng() < PIECE_GEM_CHANCE ? 1 : 0) }, rng);
  }
  stepLoot(w);
  tick(state.round, w.frame, w.score);
  const busy = state.flights.length > 0 || w.loot.length > 0 || w.sprites.some((q) => q.fuse > 0) || (w.ruin && w.ruin.blocks.length > 0);
  if (checkOver(state.round, busy)) showEnd();
  for (const p of state.pops) p.t -= 1;
  state.pops = state.pops.filter((p) => p.t > 0);
}

function draw() {
  const w = state.world;
  const data = state.image.data;
  compose(w, data);
  drawLoot(w, (i, r, g, b) => { data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; });
  if (state.view === 'photo') data.set(state.photo);
  if (state.view === 'class') {
    for (let i = 0; i < w.W * w.H; i += 1) {
      const t = CLASS_TINT[state.cls[i]];
      for (let c = 0; c < 3; c += 1) data[i * 4 + c] = (data[i * 4 + c] + t[c]) >> 1;
    }
  }
  if (state.aim && state.aim.t > 0) {
    state.aim.t -= 1;
    for (const k of silhouette(w, state.aim.target)) data.set(AIM_COLOUR, k * 4);
  }
  for (const f of state.flights) {
    const k = f.t / FLIGHT_FRAMES;
    const x = Math.round(f.x0 + (f.x - f.x0) * k), y = Math.round(f.y0 + (f.y - f.y0) * k - Math.sin(k * Math.PI) * 30);
    for (const { dx, dy, c } of projectileCells(f.kind, k, w.frame)) {
      const px = x + dx, py = y + dy;
      if (px < 0 || py < 0 || px >= w.W || py >= w.H) continue;
      const i = (py * w.W + px) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
    }
  }
state.ctx.putImageData(state.image, 0, 0);
  state.ctx.font = '7px monospace';
  state.ctx.textAlign = 'center';
  for (const p of state.pops) {
    state.ctx.fillStyle = PAL[ROLE.outline];
    state.ctx.fillText(p.text, p.x + 1, p.y - (40 - p.t) * 0.4 + 1);
    state.ctx.fillStyle = PAL[p.text.startsWith('ВДРЕБЕЗГИ') ? ROLE.gold : ROLE.paper];
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

function aimAt(x, y, frames) {
  const target = targetAt(state.world, x, y);
  state.aim = target ? { target, t: frames } : null;
}
function tap(x, y) {
  if (!state.world || state.round.over) return;
  const got = collectAt(state.world, x, y);
  if (got.n) {
    addLoot(state.round, got);
    state.pops.push({ x, y, text: got.throws ? `+${got.throws} КАМНЯ` : `+${got.value * state.round.mult}`, t: 40 });
    return;
  }
  if (!spendThrow(state.round)) return;
  aimAt(x, y, AIM_FRAMES);
  throwAt(x, y);
}

function showEnd() {
  const r = state.round, w = state.world;
  if (!$('end').hidden) return;
  $('endscore').textContent = String(r.score);
  $('endstats').textContent = `машин разбито ${w.wrecked}/${w.sprites.length} · лучшее комбо x${r.best} · трофеев ${r.loot}`;
  $('end').hidden = false;
}
$('again').addEventListener('click', () => location.reload());
state.canvas.addEventListener('pointerdown', (ev) => tap(...toFrame(ev)));
state.canvas.addEventListener('pointermove', (ev) => { if (state.world && ev.pointerType === 'mouse') aimAt(...toFrame(ev), Infinity); });
state.canvas.addEventListener('pointerleave', () => { state.aim = null; });
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
window.__v2throw = (x, y) => tap(x, y);
window.__v2round = () => ({ ...state.round, loot: state.round.loot, onGround: state.world.loot.map((p) => ({ x: p.x, y: p.y, kind: p.kind, rest: p.rest })) });
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
