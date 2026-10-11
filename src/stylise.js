// A photograph in, an 8-bit picture of the same yard out. Pure: arrays in, arrays out.
//
//   1. grade     more contrast, more colour, purple shadows — the look (palette.js)
//   2. palette   the 28 colours that describe THIS yard best
//   3. dither    each pixel takes its nearest palette colour, nudged by an ordered pattern, so a smooth
//                wall becomes a texture instead of a flat stain and detail survives the small palette
//
// The yard must stay the yard. What is red in the photograph is red in the picture.

import { grade, buildPalette, nearest, luma, COLOURS } from './palette.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
export const DITHER = 26;   // how hard the pattern nudges, in colour levels

export function stylise(rgba, w, h) {
  const n = w * h;
  // the photograph's own darkest and brightest 1%
  const bins = new Uint32Array(256);
  for (let i = 0; i < n; i += 1) bins[Math.min(255, (luma([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]) * 255) | 0)] += 1;
  const at = (share) => { let seen = 0; for (let i = 0; i < 256; i += 1) { seen += bins[i]; if (seen >= share * n) return i / 255; } return 1; };
  const lo = at(0.01), hi = at(0.99);

  const graded = new Float32Array(n * 3);
  const sample = [];
  for (let i = 0; i < n; i += 1) {
    const c = grade(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], lo, hi);
    graded[i * 3] = c[0]; graded[i * 3 + 1] = c[1]; graded[i * 3 + 2] = c[2];
    if (i % 3 === 0) sample.push(c);
  }
  const palette = buildPalette(sample, COLOURS);

  const idx = new Uint8Array(n);
  const cache = new Int16Array(32768).fill(-1);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x, d = BAYER[(y & 3) * 4 + (x & 3)] * DITHER;
      const r = Math.max(0, Math.min(255, graded[i * 3] + d)), g = Math.max(0, Math.min(255, graded[i * 3 + 1] + d)), b = Math.max(0, Math.min(255, graded[i * 3 + 2] + d));
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      if (cache[key] < 0) cache[key] = nearest(palette, r, g, b);
      idx[i] = cache[key];
    }
  }
  return { idx, palette };
}
