import { outlineOf } from './outline.js';

const FLOOR_PX = [9, 16];
const COLUMN_PX = [7, 14];
const WINDOW = { u: [0.22, 0.78], v: [0.3, 0.78] };
const LIT_SHARE = 0.2;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hash = (a, b) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

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

export function gridSize(span, detected, [lo, hi], fallbackPx) {
  const n = detected >= 2 ? detected : Math.round(span / fallbackPx);
  return Math.max(1, clamp(n, Math.ceil(span / hi), Math.max(1, Math.floor(span / lo))));
}

export function drawFacade({ W, H, ID, base, id, quad, rows, cols, colours }) {
  const has = (k) => k >= 0 && k < W * H && ID[k] === id;
  const Hi = invert3(squareToQuad(quad));
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const RU = (d(quad[0], quad[1]) + d(quad[3], quad[2])) / 2, RV = (d(quad[0], quad[3]) + d(quad[1], quad[2])) / 2;
  const nc = gridSize(RU, cols, COLUMN_PX, 9), nr = gridSize(RV, rows, FLOOR_PX, 12);
  const floorPx = RV / nr;
  const cellOf = new Map(), pix = [];
  for (let k = 0; k < W * H; k += 1) {
    if (ID[k] !== id) continue;
    pix.push(k);
    const [u, v] = apply(Hi, (k % W) + 0.5, ((k / W) | 0) + 0.5);
    const cu = clamp(u, 0, 0.9999) * nc, cv = clamp(v, 0, 0.9999) * nr;
    const fu = cu - Math.floor(cu), fv = cv - Math.floor(cv);
    if (fv * floorPx < 1) cellOf.set(k, -1);
    else if (fu >= WINDOW.u[0] && fu < WINDOW.u[1] && fv >= WINDOW.v[0] && fv < WINDOW.v[1]) cellOf.set(k, Math.floor(cu) * 1000 + Math.floor(cv));
  }
  const windows = new Map();
  for (const k of pix) {
    if (outlineOf(has, W, H, k)) { base[k] = colours.outline; continue; }
    const cell = cellOf.get(k);
    if (cell === undefined) { base[k] = colours.wall(k); continue; }
    if (cell === -1) { base[k] = colours.slab(k); continue; }
    const lit = hash(Math.floor(cell / 1000) + id * 31, cell % 1000) < LIT_SHARE;
    const rim = cellOf.get(k - W) !== cell || cellOf.get(k - 1) !== cell;
    base[k] = rim ? colours.paneRim : lit ? colours.paneLit : colours.pane;
    (windows.get(cell) || windows.set(cell, []).get(cell)).push(k);
  }
  return [...windows.values()].filter((w) => w.length >= 2);
}
