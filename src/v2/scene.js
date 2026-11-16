import { CLASS } from './classes.js';
import { components } from './instances.js';

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

export function facadeOf(cols) {
  const xa = cols[0].x, xb = cols[cols.length - 1].x + 1;
  const top = fitLine(cols.map((c) => [c.x, c.top])), bottom = fitLine(cols.map((c) => [c.x, c.bottom + 1]));
  const quad = [[xa, top(xa)], [xb, top(xb)], [xb, bottom(xb)], [xa, bottom(xa)]].map(([x, y]) => [Math.round(x), Math.round(y)]);
  const upper = cols.filter((_, i) => i % CLIP_STEP === 0 || i === cols.length - 1);
  const clip = [
    ...upper.map((c) => [c.x, c.top]), [xb, upper[upper.length - 1].top],
    [xb, Math.round(bottom(xb))], [xa, Math.round(bottom(xa))],
  ];
  return { quad, clip, bottom: Math.round(Math.max(bottom(xa), bottom(xb))) };
}

export function autoScene({ cls, cars = [], W, H }) {
  const isWall = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i += 1) if (cls[i] === CLASS.BUILDING) isWall[i] = 1;
  const buildings = [];
  for (const px of components(isWall, W, H).list) {
    if (px.length < BUILDING_MIN_AREA) continue;
    for (const part of splitAtSteps(columnProfile(px, W))) {
      if (part.length < BUILDING_MIN_WIDTH) continue;
      const f = facadeOf(part);
      buildings.push({ id: buildings.length + 1, name: 'ДОМ', kind: 'auto', quad: f.quad, clip: f.clip, bottom: f.bottom });
    }
  }
  const kept = buildings.slice(0, 9);
  return {
    id: 'auto', label: 'ДВОР', gy: horizonRow(cls, W, H), sky: 'auto',
    buildings: kept.map(({ bottom, ...b }) => ({ ...b, ground: bottom })),
    cars: cars.slice(0, MAX_CARS).map((c) => ({ x: c.x0, y: c.y0, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1, type: 'box', name: 'МАШИНА' })),
  };
}

const HORIZON_SHARE = 0.9;

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
