import { rgbToOklab, oklabToRgb } from './oklab.js';
import { mulberry32 } from '../rng.js';

export const SCENE_COLOURS = 14;
export const ACCENT_COLOURS = 4;
const KUWAHARA_RADIUS = 3;
const PALETTE_SAMPLES = 20000;
const KMEANS_ROUNDS = 12;
const ORPHAN_PASSES = 2;
export const SATURATION = 1.25;
export const CONTRAST = 1.1;

function integral(src, w, h) {
  const out = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y += 1) {
    let row = 0;
    for (let x = 0; x < w; x += 1) {
      row += src[y * w + x];
      out[(y + 1) * (w + 1) + x + 1] = out[y * (w + 1) + x + 1] + row;
    }
  }
  return out;
}

const boxSum = (I, w, x0, y0, x1, y1) => I[(y1 + 1) * (w + 1) + x1 + 1] - I[y0 * (w + 1) + x1 + 1] - I[(y1 + 1) * (w + 1) + x0] + I[y0 * (w + 1) + x0];

export function kuwahara(rgba, w, h, r = KUWAHARA_RADIUS) {
  const n = w * h, R = new Float64Array(n), G = new Float64Array(n), B = new Float64Array(n), L = new Float64Array(n), L2 = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    R[i] = rgba[i * 4]; G[i] = rgba[i * 4 + 1]; B[i] = rgba[i * 4 + 2];
    L[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i]; L2[i] = L[i] * L[i];
  }
  const IR = integral(R, w, h), IG = integral(G, w, h), IB = integral(B, w, h), IL = integral(L, w, h), IL2 = integral(L2, w, h);
  const out = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    let best = Infinity, br = 0, bg = 0, bb = 0;
    for (const [qx, qy] of [[-r, -r], [0, -r], [-r, 0], [0, 0]]) {
      const x0 = Math.max(0, x + qx), y0 = Math.max(0, y + qy), x1 = Math.min(w - 1, x + qx + r), y1 = Math.min(h - 1, y + qy + r);
      const c = (x1 - x0 + 1) * (y1 - y0 + 1);
      const m = boxSum(IL, w, x0, y0, x1, y1) / c;
      const v = boxSum(IL2, w, x0, y0, x1, y1) / c - m * m;
      if (v < best) { best = v; br = boxSum(IR, w, x0, y0, x1, y1) / c; bg = boxSum(IG, w, x0, y0, x1, y1) / c; bb = boxSum(IB, w, x0, y0, x1, y1) / c; }
    }
    const o = (y * w + x) * 4;
    out[o] = br; out[o + 1] = bg; out[o + 2] = bb; out[o + 3] = 255;
  }
  return out;
}

const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

export function kmeans(points, k, seed = 1) {
  if (!points.length) return [];
  const rnd = mulberry32(seed);
  const centres = [points[Math.floor(rnd() * points.length)]];
  const near = points.map((p) => d2(p, centres[0]));
  while (centres.length < Math.min(k, points.length)) {
    const total = near.reduce((a, b) => a + b, 0);
    if (total <= 0) break;
    let t = rnd() * total, pick = 0;
    while (t > near[pick] && pick < points.length - 1) { t -= near[pick]; pick += 1; }
    centres.push(points[pick]);
    points.forEach((p, i) => { near[i] = Math.min(near[i], d2(p, points[pick])); });
  }
  let cs = centres.map((c) => c.slice());
  for (let round = 0; round < KMEANS_ROUNDS; round += 1) {
    const sum = cs.map(() => [0, 0, 0, 0]);
    for (const p of points) {
      let bi = 0, bd = Infinity;
      cs.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; bi = j; } });
      const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3] += 1;
    }
    cs = cs.map((c, j) => (sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c));
  }
  return cs;
}

function sampleLab(rgba, n, keep, limit) {
  const chosen = [];
  for (let i = 0; i < n; i += 1) if (!keep || keep(i)) chosen.push(i);
  const stride = Math.max(1, Math.floor(chosen.length / limit));
  const out = [];
  for (let j = 0; j < chosen.length; j += stride) {
    const i = chosen[j];
    out.push(rgbToOklab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]));
  }
  return out;
}

export function grade(lab) {
  const mean = lab.reduce((t, c) => t + c[0], 0) / (lab.length || 1);
  return lab.map(([L, a, b]) => [Math.min(0.98, Math.max(0.04, mean + (L - mean) * CONTRAST)), a * SATURATION, b * SATURATION]);
}

export function buildPalette(rgba, n, accentMask = null) {
  const scene = kmeans(sampleLab(rgba, n, null, PALETTE_SAMPLES), SCENE_COLOURS);
  const accents = accentMask ? kmeans(sampleLab(rgba, n, (i) => accentMask[i], PALETTE_SAMPLES / 4), ACCENT_COLOURS, 2) : [];
  const lab = grade([...scene, ...accents]).sort((a, b) => a[0] - b[0]);
  return { lab, rgb: lab.map(([L, a, b]) => oklabToRgb(L, a, b)) };
}

export function nearestIndex(rgba, n, paletteLab) {
  const idx = new Uint8Array(n);
  const cache = new Map();
  for (let i = 0; i < n; i += 1) {
    const key = ((rgba[i * 4] >> 2) << 12) | ((rgba[i * 4 + 1] >> 2) << 6) | (rgba[i * 4 + 2] >> 2);
    let v = cache.get(key);
    if (v === undefined) {
      const p = rgbToOklab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
      let bd = Infinity; v = 0;
      paletteLab.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; v = j; } });
      cache.set(key, v);
    }
    idx[i] = v;
  }
  return idx;
}

export function modeDownsample(idx, sw, sh, W, H, colours) {
  const out = new Uint8Array(W * H);
  const count = new Uint16Array(colours);
  for (let y = 0; y < H; y += 1) {
    const y0 = Math.floor((y * sh) / H), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / H));
    for (let x = 0; x < W; x += 1) {
      const x0 = Math.floor((x * sw) / W), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / W));
      count.fill(0);
      for (let yy = y0; yy < y1; yy += 1) for (let xx = x0; xx < x1; xx += 1) count[idx[yy * sw + xx]] += 1;
      const centre = idx[((y0 + y1) >> 1) * sw + ((x0 + x1) >> 1)];
      let best = centre;
      for (let c = 0; c < colours; c += 1) if (count[c] > count[best]) best = c;
      out[y * W + x] = best;
    }
  }
  return out;
}

export function removeOrphans(idx, W, H, passes = ORPHAN_PASSES) {
  const counts = new Map();
  for (let p = 0; p < passes; p += 1) {
    const src = idx.slice();
    for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x, v = src[i];
      if (src[i - 1] === v || src[i + 1] === v || src[i - W] === v || src[i + W] === v) continue;
      counts.clear();
      for (const j of [i - 1, i + 1, i - W, i + W, i - W - 1, i - W + 1, i + W - 1, i + W + 1]) counts.set(src[j], (counts.get(src[j]) || 0) + 1);
      let best = v, bc = 0;
      for (const [u, c] of counts) if (c > bc) { bc = c; best = u; }
      idx[i] = best;
    }
  }
  return idx;
}

export function convert(rgba, sw, sh, W, H, accentMask = null) {
  const flat = kuwahara(rgba, sw, sh);
  const palette = buildPalette(flat, sw * sh, accentMask);
  const fine = nearestIndex(flat, sw * sh, palette.lab);
  const idx = removeOrphans(modeDownsample(fine, sw, sh, W, H, palette.lab.length), W, H);
  return { idx, palette };
}
