import { rgbToOklab, oklabToRgb } from './oklab.js';

export const CLASS = { SKY: 0, BUILDING: 1, GREEN: 2, TERRAIN: 3, ROAD: 4, CAR: 5, THING: 6, PERSON: 7 };

const SEG_CLASS = {
  sky: CLASS.SKY, building: CLASS.BUILDING, wall: CLASS.BUILDING, vegetation: CLASS.GREEN, terrain: CLASS.TERRAIN,
  road: CLASS.ROAD, sidewalk: CLASS.ROAD, car: CLASS.CAR, truck: CLASS.CAR, bus: CLASS.CAR, train: CLASS.CAR,
  motorcycle: CLASS.CAR, fence: CLASS.THING, pole: CLASS.THING, 'traffic light': CLASS.THING, 'traffic sign': CLASS.THING,
  bicycle: CLASS.THING, person: CLASS.PERSON, rider: CLASS.PERSON,
};

const COLOURS_PER_CAR = 4;
const SCENE_COLOURS = 36;
const HUE_WEIGHT = 2.2;
const SCENE_SAMPLES = 12000;
const MAX_SAMPLES_PER_SIDE = 8;
const CONTRAST = 1.18;
const CHROMA = [1.12, 1.25, 1.35, 1.3, 1.15, 1.3, 1.2, 1.2];
const SCENE_CHROMA = 1.2;
const SHADOW_COOL = 0.02;
const ACCENT_GAP = 0.09;
const ACCENT_COLOURS = 8;

export function classMap(masks, n) {
  const cls = new Uint8Array(n).fill(255);
  for (const [label, mask] of Object.entries(masks || {})) {
    const c = SEG_CLASS[label];
    if (c === undefined) continue;
    for (let i = 0; i < n; i += 1) if (mask[i]) cls[i] = c;
  }
  return fillUnknown(cls);
}

function fillUnknown(cls) {
  let last = CLASS.THING;
  for (let i = 0; i < cls.length; i += 1) {
    if (cls[i] === 255) cls[i] = last;
    else last = cls[i];
  }
  return cls;
}

const median = (values, count) => {
  const v = values.subarray(0, count).sort();
  return v[count >> 1];
};

export function downsample(rgba, sw, sh, W, H) {
  const lab = new Float32Array(W * H * 3);
  const r = new Uint8Array(MAX_SAMPLES_PER_SIDE ** 2), g = new Uint8Array(r.length), b = new Uint8Array(r.length);
  for (let y = 0; y < H; y += 1) {
    const y0 = Math.floor((y * sh) / H), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / H));
    const sy = Math.max(1, Math.floor((y1 - y0) / MAX_SAMPLES_PER_SIDE));
    for (let x = 0; x < W; x += 1) {
      const x0 = Math.floor((x * sw) / W), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / W));
      const sx = Math.max(1, Math.floor((x1 - x0) / MAX_SAMPLES_PER_SIDE));
      let k = 0;
      for (let yy = y0; yy < y1 && k < r.length; yy += sy) {
        for (let xx = x0; xx < x1 && k < r.length; xx += sx) {
          const p = (yy * sw + xx) * 4;
          r[k] = rgba[p]; g[k] = rgba[p + 1]; b[k] = rgba[p + 2]; k += 1;
        }
      }
      const o = rgbToOklab(median(r, k), median(g, k), median(b, k));
      const i = (y * W + x) * 3;
      lab[i] = o[0]; lab[i + 1] = o[1]; lab[i + 2] = o[2];
    }
  }
  return lab;
}

const dist2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
const hueDist2 = (p, q) => (p[0] - q[0]) ** 2 + HUE_WEIGHT ** 2 * ((p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);

export function kmeans(points, k, iterations = 10) {
  if (points.length === 0) return [];
  const centres = [points[0].slice()];
  while (centres.length < Math.min(k, points.length)) {
    let best = null, bestD = -1;
    for (const p of points) {
      let d = Infinity;
      for (const c of centres) d = Math.min(d, dist2(p, c));
      if (d > bestD) { bestD = d; best = p; }
    }
    if (bestD <= 1e-6) break;
    centres.push(best.slice());
  }
  for (let it = 0; it < iterations; it += 1) {
    const sum = centres.map(() => [0, 0, 0, 0]);
    for (const p of points) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < centres.length; c += 1) { const d = dist2(p, centres[c]); if (d < bd) { bd = d; bi = c; } }
      const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3] += 1;
    }
    sum.forEach((s, c) => { if (s[3]) centres[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return centres;
}

export function grade(centres, cls) {
  if (!centres.length) return centres;
  const meanL = centres.reduce((s, c) => s + c[0], 0) / centres.length;
  const chroma = CHROMA[cls] ?? SCENE_CHROMA;
  return centres.map(([L, a, b]) => {
    const l = Math.max(0.05, Math.min(0.97, meanL + (L - meanL) * CONTRAST));
    const shade = Math.max(0, 0.65 - l);
    return [l, a * chroma - shade * SHADOW_COOL * 0.3, b * chroma - shade * SHADOW_COOL];
  });
}


export function pixelate({ lab, cls, inst, W, H }) {
  const n = W * H;
  const groups = new Map();
  const keyOf = (i) => (inst && inst[i] >= 0 ? `car${inst[i]}` : 'scene');
  for (let i = 0; i < n; i += 1) {
    const key = keyOf(i);
    if (!groups.has(key)) groups.set(key, { key, cls: cls[i], points: [], all: 0, seen: 0 });
    groups.get(key).all += 1;
  }
  for (let i = 0; i < n; i += 1) {
    const g = groups.get(keyOf(i));
    const stride = Math.max(1, Math.floor(g.all / SCENE_SAMPLES));
    if (g.seen++ % stride === 0) g.points.push([lab[i * 3], lab[i * 3 + 1] * HUE_WEIGHT, lab[i * 3 + 2] * HUE_WEIGHT]);
  }
  const palette = [], paletteLab = [], darker = [], groupOf = [];
  for (const g of groups.values()) {
    const k = g.key === 'scene' ? SCENE_COLOURS : COLOURS_PER_CAR;
    const centres = grade(kmeans(g.points, k).map(([L, a, b]) => [L, a / HUE_WEIGHT, b / HUE_WEIGHT]), g.key === 'scene' ? -1 : CLASS.CAR).sort((p, q) => p[0] - q[0]);
    g.first = palette.length;
    centres.forEach((c, j) => {
      paletteLab.push(c);
      palette.push(oklabToRgb(c[0], c[1], c[2]));
      darker.push(g.first + Math.max(0, j - 1));
      groupOf.push(g.key);
    });
    g.count = centres.length;
    g.centres = centres;
  }
  const idx = new Uint16Array(n);
  const residual = [];
  for (let i = 0; i < n; i += 1) {
    const g = groups.get(keyOf(i));
    const p = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
    let bi = 0, bd = Infinity;
    for (let c = 0; c < g.count; c += 1) { const d = hueDist2(p, g.centres[c]); if (d < bd) { bd = d; bi = c; } }
    idx[i] = g.first + bi;
    if (bd > (ACCENT_GAP * HUE_WEIGHT) ** 2) residual.push(i);
  }
  addAccents({ lab, idx, residual, palette, paletteLab, darker, groupOf });
  despeckle(idx, W, H, groupOf);
  ditherSky({ lab, cls, idx, paletteLab, groupOf, W, H });
  return { idx, palette, paletteLab, darker, groupOf, groups };
}

export function addAccents({ lab, idx, residual, palette, paletteLab, darker, groupOf }) {
  if (residual.length < ACCENT_COLOURS * 4) return;
  const points = residual.map((i) => [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]]);
  const accents = kmeans(points, ACCENT_COLOURS).sort((p, q) => p[0] - q[0]);
  const first = palette.length;
  accents.forEach((c, j) => {
    paletteLab.push(c);
    palette.push(oklabToRgb(c[0], c[1], c[2]));
    darker.push(first + Math.max(0, j - 1));
    groupOf.push('accent');
  });
  residual.forEach((i, r) => {
    const p = points[r];
    let bi = 0, bd = Infinity;
    accents.forEach((c, j) => { const d = hueDist2(p, c); if (d < bd) { bd = d; bi = j; } });
    if (bd < hueDist2(p, paletteLab[idx[i]])) { idx[i] = first + bi; }
  });
}

const DITHER_FROM = 0.36;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export function ditherSky({ lab, cls, idx, paletteLab, groupOf, W, H }) {
  const skyColours = [...new Set(Array.from(idx).filter((v, i) => cls[i] === CLASS.SKY))].filter((v) => groupOf[v] === 'scene');
  if (skyColours.length < 2) return;
  for (let i = 0; i < W * H; i += 1) {
    if (cls[i] !== CLASS.SKY || groupOf[idx[i]] !== 'scene') continue;
    const p = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
    let a = -1, b = -1, da = Infinity, db = Infinity;
    for (const v of skyColours) {
      const d = hueDist2(p, paletteLab[v]);
      if (d < da) { db = da; b = a; da = d; a = v; } else if (d < db) { db = d; b = v; }
    }
    if (b < 0) continue;
    const share = Math.sqrt(da) / (Math.sqrt(da) + Math.sqrt(db));
    const blend = (share - DITHER_FROM) / (0.5 - DITHER_FROM);
    if (blend > 0 && blend > BAYER4[((i / W) & 3) * 4 + ((i % W) & 3)] * 2) idx[i] = b;
  }
}

export function despeckle(idx, W, H, groupOf = null) {
  const copy = idx.slice();
  const counts = new Map();
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x, v = copy[i];
      if (copy[i - 1] === v || copy[i + 1] === v || copy[i - W] === v || copy[i + W] === v) continue;
      counts.clear();
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const u = copy[i + dy * W + dx];
        if (groupOf && groupOf[u] !== groupOf[v]) continue;
        counts.set(u, (counts.get(u) || 0) + 1);
      }
      let best = v, bc = 0;
      for (const [u, c] of counts) if (c > bc) { bc = c; best = u; }
      idx[i] = best;
    }
  }
  return idx;
}
