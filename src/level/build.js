import { CLASS } from '../v2/classes.js';
import { EMPTY } from '../v2/sprites.js';
import { assignRamps, rampFor, shadesOf, slot, OUTLINE } from './colours.js';
import { FRAME, STREET, TILE, layoutBuildings, layoutCars, layoutTrees } from './layout.js';
import { TILES, glassRamp, neutralRamp, paint, scale, tilePixels } from './art.js';

const PIECE = 2 * TILE;
const CAR_SCALE = 2;
const DASH = { y: 440, on: 8, period: 16 };
export const VEHICLE_FILES = { car: ['sedan', 'station', 'suv', 'convertible', 'vintage', 'sedan_blue', 'suv_closed'], truck: ['truckdelivery', 'van_large', 'van'], bus: ['bus'] };

function ground(W, H, sky) {
  const bg = new Uint16Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const k = y * W + x;
    if (y < STREET.ground) bg[k] = sky(x, y);
    else if (y < STREET.walk) bg[k] = y === STREET.ground ? slot('warm', 4) : x % TILE === 0 ? slot('warm', 2) : slot('warm', 3);
    else if (y < STREET.road) bg[k] = y === STREET.walk ? slot('cool', 0) : y >= DASH.y && y < DASH.y + 2 && x % DASH.period < DASH.on ? slot('gold', 4) : slot('cool', 1);
    else bg[k] = y === STREET.road ? slot('green', 1) : slot('green', 2);
  }
  return bg;
}

function facadeTile(row, col, rows, cols) {
  if (row === 0) return 'cornice';
  if (row === rows - 1 && col === Math.floor(cols / 2)) return 'door';
  return col % 2 === 1 && row < rows - 1 ? 'window' : 'wall';
}

function drawBuilding(b, ramp, art, bg, W) {
  const cols = (b.x1 - b.x0 + 1) / TILE, rows = (b.y1 - b.y0 + 1) / TILE;
  const shades = { body: ramp, glass: glassRamp(), neutral: [ramp[0], ramp[1], ramp[2]] };
  const door = { body: shadesOf('brown', [1, 2, 3]), glass: glassRamp(), neutral: ramp };
  const glassWall = b.glass ? { body: glassRamp().concat(slot('blue', 5)), glass: glassRamp(), neutral: ramp } : null;
  const windowPx = new Set();
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
    let kind = facadeTile(r, c, rows, cols);
    if (b.glass && kind === 'wall' && r > 0) kind = 'window';
    const t = art[kind];
    const p = paint(t, kind === 'door' ? door : kind === 'window' && glassWall ? glassWall : shades);
    for (let y = 0; y < TILE; y += 1) for (let x = 0; x < TILE; x += 1) {
      const v = p.px[y * TILE + x];
      const k = (b.y0 + r * TILE + y) * W + b.x0 + c * TILE + x;
      bg[k] = v >= 0 ? v : ramp[1];
      if (p.glass[y * TILE + x]) windowPx.add(k);
    }
  }
  for (let x = b.x0; x <= b.x1; x += 1) { bg[b.y0 * W + x] = OUTLINE; }
  for (let y = b.y0; y <= b.y1; y += 1) { bg[y * W + b.x0] = OUTLINE; bg[y * W + b.x1] = OUTLINE; }
  return windowPx;
}

function piecesOf(b, windowPx, W, first) {
  const pieces = [];
  const cols = Math.ceil((b.x1 - b.x0 + 1) / PIECE), rows = Math.ceil((b.y1 - b.y0 + 1) / PIECE);
  const at = (r, c) => first + r * cols + c;
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
    const x0 = b.x0 + c * PIECE, x1 = Math.min(b.x1, x0 + PIECE - 1);
    const y1 = b.y1 - r * PIECE, y0 = Math.max(b.y0, y1 - PIECE + 1);
    const pix = [], win = [];
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) { const k = y * W + x; pix.push(k); if (windowPx.has(k)) win.push(k); }
    pieces.push({ index: at(r, c), bid: b.id, pix, wins: win.length ? [win] : [], sup: r === 0 ? [] : [at(r - 1, c)], gy: STREET.ground, x0, y0, x1, y1, near: [] });
  }
  return pieces;
}

export function buildLevel({ inv, palette, sky, art, vehicles }) {
  const { W, H } = FRAME;
  const bg = ground(W, H, sky);
  const cls = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k += 1) cls[k] = ((k / W) | 0) < STREET.ground ? CLASS.SKY : CLASS.ROAD;
  const blds = layoutBuildings(inv.buildings);
  const trees = layoutTrees(inv.trees, blds);
  const skyAt = (x, y) => bg[Math.min(STREET.ground - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  const objects = [
    ...blds.map((b, i) => ({ id: `b${b.id}`, role: b.glass ? 'glass' : 'building', seed: i, near: [`b${b.id - 1}`, `b${b.id + 1}`], at: [(b.x0 + b.x1) >> 1, (b.y0 + b.y1) >> 1] })),
  ];
  const carPicks = inv.cars.map((c, i) => {
    const files = VEHICLE_FILES[c.type];
    const name = files[i % files.length];
    return vehicles[name] || vehicles[VEHICLE_FILES.car[0]];
  });
  const placed = layoutCars(inv.cars, carPicks.map((v) => ({ w: v.w * CAR_SCALE, h: v.h * CAR_SCALE })));
  placed.forEach((p, i) => objects.push({ id: `c${i}`, role: 'car', seed: i, near: placed.filter((q) => q !== p && Math.abs(q.x0 - p.x0) < 90).map((q) => `c${placed.indexOf(q)}`), at: [p.x0, (STREET.walk + STREET.road) >> 1] }));
  const picks = assignRamps(objects, palette, (o) => (o.role === 'car' ? bg[o.at[1] * W + 2] : skyAt(o.at[0], o.at[1])));
  const pieces = [];
  for (const b of blds) {
    const ramp = rampFor(picks.get(`b${b.id}`));
    const windowPx = drawBuilding(b, ramp, art, bg, W);
    for (let y = b.y0; y <= b.y1; y += 1) for (let x = b.x0; x <= b.x1; x += 1) cls[y * W + x] = CLASS.BUILDING;
    pieces.push(...piecesOf(b, windowPx, W, pieces.length));
  }
  for (const t of trees) {
    const leaf = { body: shadesOf('green', [1, 3, 4]), glass: glassRamp(), neutral: shadesOf('warm', [2, 3, 4]) };
    ['treeTop', 'treeMid', 'treeFoot'].forEach((part, j) => {
      const p = paint(art[part], part === 'treeFoot' ? { ...leaf, body: shadesOf('brown', [1, 2, 3]) } : leaf);
      for (let y = 0; y < TILE; y += 1) for (let x = 0; x < TILE; x += 1) {
        const v = p.px[y * TILE + x], k = (t.base - 3 * TILE + j * TILE + y) * W + t.x + x;
        if (v >= 0 && k >= 0) bg[k] = v;
      }
    });
  }
  const chunkOf = new Int32Array(W * H).fill(-1);
  for (const p of pieces) for (const k of p.pix) chunkOf[k] = p.index;
  for (const a of pieces) a.near = pieces.filter((b) => b !== a && b.bid === a.bid && b.x0 <= a.x1 + 2 && b.x1 >= a.x0 - 2 && b.y0 <= a.y1 + 2 && b.y1 >= a.y0 - 2).map((b) => b.index);
  const sprites = placed.map((p, i) => {
    const ramp = rampFor(picks.get(`c${i}`));
    const art1 = scale(paint(carPicks[p.index], { body: ramp, glass: glassRamp(), neutral: neutralRamp() }), CAR_SCALE);
    const flip = p.lane === 1;
    const px = new Int32Array(art1.w * art1.h).fill(EMPTY), glass = new Uint8Array(art1.w * art1.h);
    let n = 0;
    for (let y = 0; y < art1.h; y += 1) for (let x = 0; x < art1.w; x += 1) {
      const sx = flip ? art1.w - 1 - x : x, v = art1.px[y * art1.w + sx];
      if (v < 0) continue;
      px[y * art1.w + x] = v; glass[y * art1.w + x] = art1.glass[y * art1.w + sx]; n += 1;
    }
    return { id: 10 + i, label: 'car', x0: p.x0, y0: p.y0, w: art1.w, h: art1.h, px, glass, n0: n, n, state: 'whole', heat: 0, flash: 0 };
  });
  const behind = Uint16Array.from(bg);
  for (const p of pieces) for (const k of p.pix) behind[k] = sky(k % W, (k / W) | 0);
  return { W, H, bg, cls, sprites, pieces, chunkOf, behind, buildings: blds, picks };
}
