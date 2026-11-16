import { mulberry32 } from '../rng.js';

const KUWAHARA_RADIUS = 3;
const KMEANS_ROUNDS = 12;

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
