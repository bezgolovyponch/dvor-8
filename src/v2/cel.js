import { rgbToOklab, oklabToRgb } from './oklab.js';
import { CLASS } from './classes.js';
import { kmeans } from './convert.js';

export const TONES = 3;
const INK_DARKEN = 0.45;
const TONE_STEP = 0.09;
const CHROMA_BOOST = 1.3;
const HUE_SHIFT = 0.025;
const MIN_REGION = 30;
const TONE_BAND = 0.045;
const SPLITS = [2, 3, 2, 2, 2, 3, 2, 2];
const SPLIT_SAMPLES = 3000;
const SKY_TONE_BAND = 0.09;
export const COLOUR_BUDGET = 32;

export function regionsOf(cls, W, H) {
  const label = new Int32Array(W * H).fill(-1);
  const regions = [];
  const stack = [];
  for (let s = 0; s < W * H; s += 1) {
    if (label[s] >= 0) continue;
    const id = regions.length, c = cls[s], px = [];
    label[s] = id; stack.push(s);
    while (stack.length) {
      const i = stack.pop(); px.push(i);
      const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && label[j] < 0 && cls[j] === c) { label[j] = id; stack.push(j); }
      }
    }
    regions.push({ id, cls: c, px });
  }
  return { label, regions };
}

export function absorbSmall(cls, W, H) {
  const { label, regions } = regionsOf(cls, W, H);
  for (const r of regions) {
    if (r.px.length >= MIN_REGION) continue;
    const votes = new Map();
    for (const i of r.px) {
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= W * H || label[j] === r.id) continue;
        votes.set(cls[j], (votes.get(cls[j]) || 0) + 1);
      }
    }
    let best = r.cls, bv = 0;
    for (const [c, v] of votes) if (v > bv) { bv = v; best = c; }
    for (const i of r.px) cls[i] = best;
  }
  return cls;
}

const median = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];

export function rampFor(labs) {
  const L = median(labs.map((p) => p[0])), a = median(labs.map((p) => p[1])), b = median(labs.map((p) => p[2]));
  const ramp = [];
  for (let t = 0; t < TONES; t += 1) {
    const k = t - (TONES - 1) / 2;
    const l = Math.min(0.97, Math.max(0.06, L + k * TONE_STEP));
    ramp.push(oklabToRgb(l, a * CHROMA_BOOST + k * HUE_SHIFT * 0.4, b * CHROMA_BOOST + k * HUE_SHIFT));
  }
  return { ramp, L, cuts: [L - TONE_BAND, L + TONE_BAND] };
}


export const inkOf = ([r, g, b]) => [Math.round(r * INK_DARKEN), Math.round(g * INK_DARKEN), Math.round(b * INK_DARKEN * 1.15)];

export function splitByColour(lab, cls, W, H) {
  const key = new Uint8Array(W * H);
  for (let c = 0; c < SPLITS.length; c += 1) {
    const members = [];
    for (let i = 0; i < W * H; i += 1) if (cls[i] === c) members.push(i);
    if (!members.length) continue;
    const stride = Math.max(1, Math.floor(members.length / SPLIT_SAMPLES));
    const pts = members.filter((_, j) => j % stride === 0).map((i) => [lab[i * 3] * 0.6, lab[i * 3 + 1] * 2, lab[i * 3 + 2] * 2]);
    const centres = kmeans(pts, SPLITS[c], c + 1);
    for (const i of members) {
      const p = [lab[i * 3] * 0.6, lab[i * 3 + 1] * 2, lab[i * 3 + 2] * 2];
      let bi = 0, bd = Infinity;
      centres.forEach((q, j) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < bd) { bd = d; bi = j; } });
      key[i] = c * 8 + bi;
    }
  }
  return key;
}

export function celShade({ lab, cls, W, H }) {
  const key = absorbSmall(splitByColour(lab, cls, W, H), W, H);
  const { label, regions } = regionsOf(key, W, H);
  for (const r of regions) r.cls = r.cls >> 3;
  const palette = [], idx = new Uint16Array(W * H), regionRamp = [];
  for (const r of regions) {
    const labs = r.px.map((i) => [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]]);
    const { ramp, cuts: near } = rampFor(labs);
    const cuts = r.cls === CLASS.SKY ? [near[0] + TONE_BAND - SKY_TONE_BAND, near[1] - TONE_BAND + SKY_TONE_BAND] : near;
    const first = palette.length;
    palette.push(...ramp);
    regionRamp.push({ first, cuts, cls: r.cls, ink: palette.length });
    palette.push(inkOf(ramp[0]));
    for (const i of r.px) {
      const l = lab[i * 3];
      idx[i] = first + (l < cuts[0] ? 0 : l < cuts[1] ? 1 : 2);
    }
  }
  smoothTones(idx, label, W, H);
  for (let i = 0; i < W * H; i += 1) {
    const x = i % W, y = (i / W) | 0, me = label[i];
    const darker = (j) => j >= 0 && label[j] !== me && regionRamp[label[j]] && lumOf(palette, regionRamp[label[j]].first) >= lumOf(palette, regionRamp[me].first);
    const edge = (x < W - 1 && label[i + 1] !== me && darker(i + 1)) || (y < H - 1 && label[i + W] !== me && darker(i + W))
      || (x > 0 && label[i - 1] !== me && darker(i - 1)) || (y > 0 && label[i - W] !== me && darker(i - W));
    if (edge && regionRamp[me].cls !== CLASS.SKY) idx[i] = regionRamp[me].ink;
  }
  return { idx, palette: consolidate(palette, idx), label, regions, regionRamp };
}

export function consolidate(palette, idx, budget = COLOUR_BUDGET) {
  const used = new Map();
  for (const v of idx) used.set(v, (used.get(v) || 0) + 1);
  const pts = [];
  for (const [v, n] of used) {
    const lab = rgbToOklab(...palette[v]);
    for (let k = 0; k < Math.max(1, Math.round(Math.sqrt(n))); k += 1) pts.push(lab);
  }
  const centres = kmeans(pts, budget, 7);
  return palette.map((c) => {
    const p = rgbToOklab(...c);
    let best = centres[0], bd = Infinity;
    for (const q of centres) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < bd) { bd = d; best = q; } }
    return oklabToRgb(best[0], best[1], best[2]);
  });
}

const lumOf = (palette, k) => { const [r, g, b] = palette[k]; return 0.299 * r + 0.587 * g + 0.114 * b; };

export function smoothTones(idx, label, W, H, passes = 2) {
  for (let p = 0; p < passes; p += 1) {
    const src = idx.slice();
    for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x;
      const counts = new Map();
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const j = i + dy * W + dx;
        if (label[j] !== label[i]) continue;
        counts.set(src[j], (counts.get(src[j]) || 0) + 1);
      }
      let best = src[i], bc = counts.get(src[i]) || 0;
      for (const [v, c] of counts) if (c > bc + 1) { bc = c; best = v; }
      idx[i] = best;
    }
  }
}

export function labOf(rgba, n) {
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) lab.set(rgbToOklab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]), i * 3);
  return lab;
}
