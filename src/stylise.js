// A photograph in, a neon pixel picture out. Pure: arrays in, arrays out, no canvas, so it runs in a test.
//
//   1. brightness, stretched so the darkest 2% is black and the brightest 2% is white — a flat, grey,
//      overcast yard still uses the whole ramp
//   2. warm or cool, per pixel, from red against blue — this picks which of the two ramps it lands on
//   3. eight tones, ordered-dithered, so a gradient becomes a pattern instead of a band
//   4. an outline wherever brightness changes sharply, so things have edges the way drawn things do

import { TONES, COOL, WARM, OUTLINE } from './palette.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const EDGE = 0.20;     // how sharp a change in brightness becomes an outline
export const WARM_AT = 0.035; // how much redder than blue a pixel must be to count as warm

export function blur3(src, w, h) {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += src[yy * w + xx]; n += 1;
        }
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

function stretch(lum) {
  const bins = new Uint32Array(256);
  for (const v of lum) bins[Math.min(255, (v * 255) | 0)] += 1;
  const at = (share) => {
    let seen = 0;
    for (let i = 0; i < 256; i += 1) { seen += bins[i]; if (seen >= share * lum.length) return i / 255; }
    return 1;
  };
  const lo = at(0.02), hi = at(0.98);
  const span = Math.max(0.08, hi - lo);   // a truly flat picture is not stretched into noise
  const out = new Float32Array(lum.length);
  for (let i = 0; i < lum.length; i += 1) out[i] = Math.max(0, Math.min(1, (lum[i] - lo) / span));
  return out;
}

export function stylise(rgba, w, h) {
  const n = w * h;
  const raw = new Float32Array(n), heat = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    raw[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    heat[i] = (r - b) / 255;
  }
  const lum = stretch(raw);
  const soft = blur3(blur3(lum, w, h), w, h);       // for edges and for finding objects: no speckle
  const softHeat = blur3(heat, w, h);
  const warm = new Uint8Array(n), idx = new Uint8Array(n);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      warm[i] = softHeat[i] > WARM_AT ? 1 : 0;
      const xl = soft[y * w + Math.max(0, x - 1)], xr = soft[y * w + Math.min(w - 1, x + 1)];
      const yu = soft[Math.max(0, y - 1) * w + x], yd = soft[Math.min(h - 1, y + 1) * w + x];
      if (Math.hypot(xr - xl, yd - yu) > EDGE) { idx[i] = OUTLINE; continue; }
      const tone = Math.max(0, Math.min(TONES - 1, Math.floor(lum[i] * TONES + BAYER[(y & 3) * 4 + (x & 3)] - 0.5)));
      idx[i] = (warm[i] ? WARM : COOL) + tone;
    }
  }
  return { idx, soft, warm };
}
