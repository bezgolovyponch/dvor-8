import { CLASS } from './classes.js';
import { components } from './instances.js';
import { strips, dominantVanishing, planes, perspectiveQuad } from './perspective.js';

const BUILDING_MIN_AREA = 525;
const BUILDING_MIN_WIDTH = 20;
const ROOF_STEP = 18;
const CLIP_STEP = 3;
const SKY_MARGIN = 6;
const MAX_CARS = 29;

export function columnProfile(px, W) {
  const top = new Map(), bottom = new Map();
  for (const i of px) {
    const x = i % W, y = (i / W) | 0;
    if (!top.has(x) || y < top.get(x)) top.set(x, y);
    if (!bottom.has(x) || y > bottom.get(x)) bottom.set(x, y);
  }
  return [...top.keys()].sort((a, b) => a - b).map((x) => ({ x, top: top.get(x), bottom: bottom.get(x) }));
}

export function splitAtSteps(cols) {
  const parts = [];
  let cur = [];
  for (const c of cols) {
    const prev = cur[cur.length - 1];
    if (prev && (c.x - prev.x > 1 || Math.abs(c.top - prev.top) > ROOF_STEP)) { parts.push(cur); cur = []; }
    cur.push(c);
  }
  if (cur.length) parts.push(cur);
  return parts;
}

export function fitLine(points) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n, my = points.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0;
  for (const [x, y] of points) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
  const slope = sxx ? sxy / sxx : 0;
  return (x) => my + slope * (x - mx);
}

const EDGE_MIN = 0.04;
const EDGE_RATIO = 2;
const MAX_SLOPE = 0.6;

export function edgeSlopes(cols, L, W, H) {
  const half = (cols.reduce((t, c) => t + c.top + c.bottom, 0) / cols.length) / 2;
  const upper = [], lower = [];
  for (const c of cols) for (let y = c.top + 1; y < c.bottom; y += 1) {
    const x = c.x;
    if (x < 1 || x >= W - 1 || y < 1 || y >= H - 1) continue;
    const at = (dx, dy) => L[(y + dy) * W + x + dx];
    const gx = at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1);
    const gy = at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1);
    const m = Math.hypot(gx, gy);
    if (m < EDGE_MIN || Math.abs(gy) < EDGE_RATIO * Math.abs(gx)) continue;
    const slope = -gx / gy;
    if (Math.abs(slope) > MAX_SLOPE) continue;
    (y < half ? upper : lower).push([slope, m]);
  }
  const wmedian = (arr) => {
    if (!arr.length) return null;
    arr.sort((a, b) => a[0] - b[0]);
    const total = arr.reduce((t, a) => t + a[1], 0);
    let acc = 0;
    for (const [v, w] of arr) { acc += w; if (acc >= total / 2) return v; }
    return arr[arr.length - 1][0];
  };
  return { top: wmedian(upper), bottom: wmedian(lower) };
}

const ROOF_SHARE = 0.1;
const BASE_SHARE = 0.5;

const support = (cols, slope, key, share) => {
  const v = cols.map((c) => c[key] - slope * c.x).sort((a, b) => a - b);
  const b = v[Math.floor((v.length - 1) * share)];
  return (x) => b + slope * x;
};

export function facadeOf(cols, L = null, W = 0, H = 0, vp = null) {
  const xa = cols[0].x, xb = cols[cols.length - 1].x + 1;
  const persp = vp ? perspectiveQuad(cols, vp) : null;
  const slopes = L && !persp ? edgeSlopes(cols, L, W, H) : { top: null, bottom: null };
  const top = slopes.top === null ? fitLine(cols.map((c) => [c.x, c.top])) : support(cols, slopes.top, 'top', ROOF_SHARE);
  const bottom = persp ? persp.bottom : slopes.bottom === null ? fitLine(cols.map((c) => [c.x, c.bottom + 1])) : support(cols.map((c) => ({ ...c, bottom: c.bottom + 1 })), slopes.bottom, 'bottom', BASE_SHARE);
  const quad = persp ? persp.quad : [[xa, top(xa)], [xb, top(xb)], [xb, bottom(xb)], [xa, bottom(xa)]].map(([x, y]) => [Math.round(x), Math.round(y)]);
  const upper = cols.filter((_, i) => i % CLIP_STEP === 0 || i === cols.length - 1);
  const clip = [
    ...upper.map((c) => [c.x, c.top]), [xb, upper[upper.length - 1].top],
    [xb, Math.round(bottom(xb))], [xa, Math.round(bottom(xa))],
  ];
  return { quad, clip, bottom: Math.round(Math.max(bottom(xa), bottom(xb))) };
}

export function autoScene({ cls, cars = [], W, H, L = null }) {
  const isWall = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i += 1) if (cls[i] === CLASS.BUILDING) isWall[i] = 1;
  const buildings = [], parts = [];
  for (const px of components(isWall, W, H).list) {
    if (px.length < BUILDING_MIN_AREA) continue;
    for (const part of splitAtSteps(columnProfile(px, W))) if (part.length >= BUILDING_MIN_WIDTH) parts.push(L ? { cols: part, strips: strips(part, L, W, H) } : { cols: part });
  }
  const dominant = L ? dominantVanishing(parts.flatMap((p) => p.strips), W, H) : null;
  for (const part of parts) {
    const facets = L ? planes(part.strips, dominant, W, BUILDING_MIN_WIDTH) : [{ cols: part.cols, vp: null }];
    for (const { cols, vp } of facets) {
      const f = facadeOf(cols, L, W, H, vp);
      buildings.push({ id: buildings.length + 1, name: 'ДОМ', kind: 'auto', quad: f.quad, clip: f.clip, bottom: f.bottom });
    }
  }
  const real = cars.filter(isCarBox);
  const gy = groundRow(cls, W, H, real);
  const kept = buildings.map((b) => standOnGround(b, gy, real, H)).filter((b) => b && Math.min(...b.quad.map((p) => p[1])) < gy - RISE_MIN).slice(0, 9);
  return {
    id: 'auto', label: 'ДВОР', gy, sky: 'auto',
    buildings: kept.map(({ bottom, ...b }, i) => ({ ...b, id: i + 1, ground: bottom })),
    cars: real.slice(0, MAX_CARS).map((c) => ({ x: c.x0, y: c.y0, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1, type: 'box', name: 'МАШИНА', inst: c.id })),
  };
}

const HORIZON_SHARE = 0.9;
const RISE_MIN = 8;
const NEAR_FACADE_SHARE = 0.6;

export function standOnGround(b, gy, cars, H) {
  const ys = b.quad.map((p) => p[1]), top = Math.min(...ys), x0 = b.quad[0][0], x1 = b.quad[1][0];
  if (b.bottom - top > H * NEAR_FACADE_SHARE) return b;
  const hidden = cars.some((c) => c.x1 >= x0 && c.x0 <= x1 && c.y0 <= b.bottom + 2 && c.y1 >= b.bottom);
  if (b.bottom <= gy && !hidden) return b;
  const quad = b.quad.map((p, i) => (i >= 2 ? [p[0], gy] : p));
  const clip = b.clip.map((p) => [p[0], Math.min(p[1], gy)]).map((p, i, a) => (i >= a.length - 2 ? [p[0], gy] : p));
  return { ...b, quad, clip, bottom: gy };
}
const CAR_MIN = { w: 8, h: 5 };
const CAR_ASPECT = [0.3, 4];

export function isCarBox(c) {
  const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
  return w >= CAR_MIN.w && h >= CAR_MIN.h && w / h >= CAR_ASPECT[0] && w / h <= CAR_ASPECT[1];
}

export function groundRow(cls, W, H, cars = []) {
  const bottoms = [];
  for (let x = 0; x < W; x += 1) {
    let b = -1;
    for (let y = 0; y < H; y += 1) if (cls[y * W + x] === CLASS.BUILDING) b = y;
    if (b >= 0) bottoms.push(b + 1);
  }
  const candidates = [];
  if (bottoms.length) { bottoms.sort((a, c) => a - c); candidates.push(bottoms[bottoms.length >> 1]); }
  if (cars.length) candidates.push(Math.min(...cars.map((c) => c.y1 + 1)));
  return candidates.length ? Math.min(...candidates) : horizonRow(cls, W, H);
}

export function horizonRow(cls, W, H) {
  const lowest = [];
  for (let x = 0; x < W; x += 1) {
    let m = -1;
    for (let y = 0; y < H; y += 1) if (cls[y * W + x] === CLASS.SKY) m = y;
    if (m >= 0) lowest.push(m);
  }
  if (!lowest.length) return Math.round(H * 0.4);
  lowest.sort((a, b) => a - b);
  return Math.min(H - 1, lowest[Math.floor((lowest.length - 1) * HORIZON_SHARE)] + SKY_MARGIN);
}

const SUNSET_SHARE = 0.08;
const OVERCAST_SATURATION = 0.1;

export function skyTheme(pixels) {
  if (!pixels.length) return 'day';
  let orange = 0, sat = 0;
  for (const [r, g, b] of pixels) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sat += mx ? (mx - mn) / mx : 0;
    if (r > b + 25 && r > 120) orange += 1;
  }
  if (orange / pixels.length > SUNSET_SHARE) return 'sunset';
  return sat / pixels.length < OVERCAST_SATURATION ? 'overcast' : 'day';
}
