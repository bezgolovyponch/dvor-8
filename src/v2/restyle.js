import { kmeans, modeFilter, nearest, Palette } from './palette.js';
import { rgbToOklab } from './oklab.js';

const GROUND_COLOURS = 12;
const FLOOR_PX = [9, 16];
const COLUMN_PX = [7, 14];
const PUNCHED = { u: [0.22, 0.78], v: [0.28, 0.8] };
const CURTAIN = { u: [0.12, 0.88], v: [0.15, 0.85] };
const LIT_SHARE = 0.25;
const MIN_WINDOW_PX = 2;
const MIN_WINDOWS = 3;
const BUILDING_COLOURS = 3;
const WALL_SHARE = 0.25;
const SKY_COLOURS = 4;
const NEUTRAL_CHROMA = 0.03;

const median = (arr) => {
  if (!arr.length) return 0;
  const s = Float64Array.from(arr).sort();
  return s[s.length >> 1];
};
const labAt = (lab, k) => [lab[k * 3], lab[k * 3 + 1], lab[k * 3 + 2]];
const hash = (a, b) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function squareToQuad(Q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = Q;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

export function invert3([a, b, c, d, e, f, g, h, i]) {
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

const apply = (m, x, y) => {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
};

function edgeOf(k, W, H, same) {
  const x = k % W, y = (k / W) | 0;
  return x === 0 || y === 0 || x === W - 1 || y === H - 1 || !same(k - 1) || !same(k + 1) || !same(k - W) || !same(k + W);
}

function ground({ W, H, lab, isGround, palette, colours = GROUND_COLOURS }) {
  const samples = [];
  for (let k = 0; k < W * H; k += 1) if (isGround(k)) samples.push(...labAt(lab, k));
  const centroids = kmeans(Float32Array.from(samples), colours, { seed: 3 });
  const labels = new Int32Array(W * H);
  for (let k = 0; k < W * H; k += 1) if (isGround(k)) labels[k] = nearest(centroids, ...labAt(lab, k));
  const calm = modeFilter(labels, isGround, W, H, 1, 2);
  const index = centroids.map((c) => palette.addLab(c));
  return { centroids, index, labels: calm };
}

export function gridSize(span, detected, [lo, hi], fallbackPx) {
  const n = detected >= 2 ? detected : Math.round(span / fallbackPx);
  return Math.max(1, clamp(n, Math.ceil(span / hi), Math.max(1, Math.floor(span / lo))));
}

export function lattice(b, W, H, ID) {
  const pix = [];
  for (let k = 0; k < W * H; k += 1) if (ID[k] === b.id) pix.push(k);
  const Hi = invert3(squareToQuad(b.quad));
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const RU = (d(b.quad[0], b.quad[1]) + d(b.quad[3], b.quad[2])) / 2, RV = (d(b.quad[0], b.quad[3]) + d(b.quad[1], b.quad[2])) / 2;
  const cols = gridSize(RU, b.cols, COLUMN_PX, 8), rows = gridSize(RV, b.rows, FLOOR_PX, 11);
  const shape = b.glass ? CURTAIN : PUNCHED;
  const cellOf = new Map(), size = new Map();
  for (const k of pix) {
    const [u, v] = apply(Hi, (k % W) + 0.5, ((k / W) | 0) + 0.5);
    const cu = clamp(u, 0, 0.9999) * cols, cv = clamp(v, 0, 0.9999) * rows;
    const fu = cu - Math.floor(cu), fv = cv - Math.floor(cv);
    if (fu < shape.u[0] || fu >= shape.u[1] || fv < shape.v[0] || fv >= shape.v[1]) continue;
    const cell = Math.floor(cu) * 1000 + Math.floor(cv);
    cellOf.set(k, cell);
    const x = k % W, y = (k / W) | 0, r = size.get(cell) || size.set(cell, [x, y, x, y]).get(cell);
    r[0] = Math.min(r[0], x); r[1] = Math.min(r[1], y); r[2] = Math.max(r[2], x); r[3] = Math.max(r[3], y);
  }
  const windows = [...size.values()].filter((r) => r[2] > r[0] && r[3] > r[1]).length;
  return { pix, cellOf, windows };
}

function building(b, grid, ctx) {
  const { W, H, lab, ID, base, palette, outline } = ctx;
  const { pix, cellOf } = grid;
  if (!pix.length) return [];
  const has = (k) => k >= 0 && k < W * H && ID[k] === b.id;
  const samples = new Float32Array(pix.length * 3);
  pix.forEach((k, i) => samples.set(labAt(lab, k), i * 3));
  const centroids = kmeans(samples, BUILDING_COLOURS, { seed: 5 + b.id });
  const raw = new Int32Array(W * H);
  for (const k of pix) raw[k] = nearest(centroids, ...labAt(lab, k));
  const part = modeFilter(raw, has, W, H, 2, 2);
  const area = centroids.map(() => 0);
  for (const k of pix) area[part[k]] += 1;
  const fill = centroids.map((c) => palette.addLab(c));
  const darkest = centroids.reduce((m, c, i) => (c[0] < centroids[m][0] ? i : m), 0);
  const glassOf = centroids.map((c, i) => {
    const pane = i === darkest ? [c[0] - 0.15, c[1], c[2]] : centroids[darkest];
    const L = Math.max(0.16, Math.min(pane[0], c[0] - 0.12));
    return { dark: palette.addLab([L, pane[1], pane[2]]), mid: palette.addLab([L + 0.08, pane[1], pane[2]]), lit: palette.addLab([Math.min(0.95, c[0] + 0.1), pane[1], pane[2]]) };
  });
  const walled = centroids.map((_, i) => area[i] >= pix.length * WALL_SHARE);
  const windows = new Map();
  for (const k of pix) {
    if (edgeOf(k, W, H, has)) { base[k] = outline; continue; }
    const cell = cellOf.get(k);
    const own = part[k];
    if (cell === undefined || !walled[own]) { base[k] = fill[own]; continue; }
    const glass = glassOf[own];
    const ci = Math.floor(cell / 1000), ri = cell % 1000, lit = hash(ci + b.id * 31, ri) < LIT_SHARE;
    const rim = cellOf.get(k - W) !== cell || cellOf.get(k - 1) !== cell;
    base[k] = lit ? (rim ? glass.mid : glass.lit) : rim ? glass.mid : glass.dark;
    (windows.get(cell) || windows.set(cell, []).get(cell)).push(k);
  }
  return [...windows.values()].filter((w) => w.length >= MIN_WINDOW_PX);
}

function car(c, ctx) {
  const { W, H, lab, ID, base, palette, outline } = ctx;
  const pix = [];
  for (let k = 0; k < W * H; k += 1) if (ID[k] === c.id) pix.push(k);
  if (!pix.length) return;
  const has = (k) => k >= 0 && k < W * H && ID[k] === c.id;
  const body = pix.filter((k) => !c.glass.has(k));
  const chroma = (k) => Math.hypot(lab[k * 3 + 1], lab[k * 3 + 2]);
  const vivid = body.slice().sort((x, y) => chroma(y) - chroma(x)).slice(0, Math.max(1, Math.round(body.length * 0.4)));
  let a = median(vivid.map((k) => lab[k * 3 + 1])), b = median(vivid.map((k) => lab[k * 3 + 2]));
  if (Math.hypot(a, b) < NEUTRAL_CHROMA) { a *= 0.5; b *= 0.5; }
  const Ls = body.map((k) => lab[k * 3]).sort((x, y) => x - y);
  const q = (f) => Ls[Math.floor(Ls.length * f)] ?? 0.5;
  const lo = q(0.3), hi = q(0.75);
  const toneLab = [[q(0.12), a * 0.7, b * 0.7], [q(0.5), a, b], [Math.min(0.95, q(0.88)), a * 0.8, b * 0.8]];
  const idx = toneLab.map((t) => palette.addLab(t));
  const tone = new Int32Array(W * H);
  for (const k of body) tone[k] = lab[k * 3] < lo ? 0 : lab[k * 3] > hi ? 2 : 1;
  const calm = modeFilter(tone, (k) => has(k) && !c.glass.has(k), W, H, 1, 1);
  const glassPix = pix.filter((k) => c.glass.has(k));
  const gl = Math.min(0.42, median(glassPix.map((k) => lab[k * 3])) || 0.3);
  const glassDark = palette.addLab([gl, -0.01, -0.035]), glassLit = palette.addLab([gl + 0.22, -0.015, -0.04]);
  for (const k of pix) {
    if (edgeOf(k, W, H, has)) base[k] = outline;
    else if (c.glass.has(k)) base[k] = c.glass.has(k - W) ? glassDark : glassLit;
    else base[k] = idx[calm[k]];
  }
}

export function restyle({ W, H, lab, ID: engineID, sky, base, back, rgb, standard, buildings, cars, outline }) {
  const palette = new Palette(rgb, standard);
  const out = Uint16Array.from(base), under = Uint16Array.from(back);
  const grids = new Map(buildings.map((b) => [b.id, lattice(b, W, H, engineID)]));
  const dropped = new Set(buildings.filter((b) => grids.get(b.id).windows < MIN_WINDOWS).map((b) => b.id));
  const ID = engineID.map((id) => (dropped.has(id) ? 0 : id));
  const isGround = (k) => !sky[k] && (ID[k] === 0 || ID[k] >= 40);
  const g = ground({ W, H, lab, isGround, palette });
  for (let k = 0; k < W * H; k += 1) if (isGround(k)) out[k] = g.index[g.labels[k]];
  const isSky = (k) => sky[k] && ID[k] === 0;
  const s = ground({ W, H, lab, isGround: isSky, palette, colours: SKY_COLOURS });
  for (let k = 0; k < W * H; k += 1) if (isSky(k)) out[k] = s.index[s.labels[k]];
  for (let k = 0; k < W * H; k += 1) {
    if (ID[k] < 10 || ID[k] >= 40) continue;
    const [L, a, b] = rgbToOklab(...rgb[back[k]]);
    under[k] = g.index[nearest(g.centroids, L, a, b)];
  }
  const ctx = { W, H, lab, ID, base: out, palette, outline };
  const windows = new Map(buildings.filter((b) => !dropped.has(b.id)).map((b) => [b.id, building(b, grids.get(b.id), ctx)]));
  for (const c of cars) car(c, ctx);
  return { palette, base: out, back: under, windows, dropped };
}
