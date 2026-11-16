import { rgbToOklab } from './oklab.js';
import { mulberry32 } from '../rng.js';

const dist2 = (c, L, a, b) => (c[0] - L) ** 2 + (c[1] - a) ** 2 + (c[2] - b) ** 2;

export function nearest(centroids, L, a, b) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < centroids.length; i += 1) {
    const d = dist2(centroids[i], L, a, b);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

export function kmeans(samples, k, { iterations = 10, seed = 1 } = {}) {
  const n = samples.length / 3;
  if (!n) return [];
  const rng = mulberry32(seed);
  const at = (i) => [samples[i * 3], samples[i * 3 + 1], samples[i * 3 + 2]];
  const centroids = [at(Math.floor(rng() * n))];
  const d = new Float64Array(n).fill(Infinity);
  while (centroids.length < Math.min(k, n)) {
    const last = centroids[centroids.length - 1];
    let total = 0;
    for (let i = 0; i < n; i += 1) {
      d[i] = Math.min(d[i], dist2(last, samples[i * 3], samples[i * 3 + 1], samples[i * 3 + 2]));
      total += d[i];
    }
    if (total === 0) break;
    let r = rng() * total, pick = n - 1;
    for (let i = 0; i < n; i += 1) { r -= d[i]; if (r <= 0) { pick = i; break; } }
    centroids.push(at(pick));
  }
  for (let it = 0; it < iterations; it += 1) {
    const sum = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i += 1) {
      const L = samples[i * 3], a = samples[i * 3 + 1], b = samples[i * 3 + 2], s = sum[nearest(centroids, L, a, b)];
      s[0] += L; s[1] += a; s[2] += b; s[3] += 1;
    }
    sum.forEach((s, j) => { if (s[3]) centroids[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return centroids;
}

export function modeFilter(labels, inside, W, H, radius = 1, passes = 1) {
  let cur = labels;
  for (let p = 0; p < passes; p += 1) {
    const next = cur.slice();
    const votes = new Map();
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const k = y * W + x;
      if (!inside(k)) continue;
      votes.clear();
      for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const n = yy * W + xx;
        if (!inside(n)) continue;
        votes.set(cur[n], (votes.get(cur[n]) || 0) + 1);
      }
      let best = cur[k], bv = votes.get(cur[k]) || 0;
      for (const [v, c] of votes) if (c > bv) { bv = c; best = v; }
      next[k] = best;
    }
    cur = next;
  }
  return cur;
}

const DARKEN = 0.78;

const hexToRgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));

export class Palette {
  constructor(rgb, standard) {
    this.standard = standard.map(hexToRgb);
    this.standardLab = this.standard.map((c) => rgbToOklab(...c));
    this.rgb = [];
    this.keys = new Map();
    for (const c of rgb) this.rgb.push(this.standard[this.snap(rgbToOklab(...c))]);
    this.fixed = this.rgb.length;
  }

  snap([L, a, b]) {
    return nearest(this.standardLab, L, a, b);
  }

  addLab(lab) {
    const s = this.snap(lab);
    if (this.keys.has(s)) return this.keys.get(s);
    this.rgb.push(this.standard[s]);
    this.keys.set(s, this.rgb.length - 1);
    return this.rgb.length - 1;
  }

  darker(engineDarker, floor) {
    const own = this.rgb.length;
    const table = new Array(own);
    for (let i = 0; i < own; i += 1) {
      if (i < this.fixed) { table[i] = engineDarker[i]; continue; }
      const [L, a, b] = rgbToOklab(...this.rgb[i]);
      const j = L * DARKEN < 0.2 ? floor : this.addLab([L * DARKEN, a, b]);
      table[i] = j === i ? floor : j;
    }
    for (let i = own; i < this.rgb.length; i += 1) table[i] = floor;
    return table;
  }
}
