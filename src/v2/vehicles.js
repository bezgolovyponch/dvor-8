import { oklabToRgb, rgbToOklab } from './oklab.js';

const SIDE_ASPECT = 1.6;
const PAINT_CHROMA = 0.06;
const NEUTRAL_CHROMA = 0.035;
const GLASS = { minL: 0.72, maxB: -0.025 };
const URBAN_TILE = 16, URBAN_STEP = 17;

export const FRONT_TILES = [
  [[17, 15]], [[20, 15]], [[15, 15], [16, 15]], [[18, 15], [19, 15]], [[21, 15]], [[22, 15]],
  [[17, 16], [17, 17]], [[20, 16], [20, 17]],
];
export const SIDE_FILES = ['sedan', 'sedan_blue', 'station', 'suv', 'suv_closed', 'van', 'van_small', 'taxi', 'convertible', 'vintage', 'truckdelivery', 'bus'];

export function trim({ w, h, rgba }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (rgba[(y * w + x) * 4 + 3] > 127) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < 0) return { w: 0, h: 0, rgba: new Uint8ClampedArray(0) };
  const tw = x1 - x0 + 1, th = y1 - y0 + 1, out = new Uint8ClampedArray(tw * th * 4);
  for (let y = 0; y < th; y += 1) for (let x = 0; x < tw; x += 1) out.set(rgba.subarray(((y + y0) * w + x + x0) * 4, ((y + y0) * w + x + x0) * 4 + 4), (y * tw + x) * 4);
  return { w: tw, h: th, rgba: out };
}

export function cropTiles(sheet, tiles) {
  const cols = Math.max(...tiles.map(([c]) => c)) - Math.min(...tiles.map(([c]) => c)) + 1;
  const rows = Math.max(...tiles.map(([, r]) => r)) - Math.min(...tiles.map(([, r]) => r)) + 1;
  const c0 = Math.min(...tiles.map(([c]) => c)), r0 = Math.min(...tiles.map(([, r]) => r));
  const w = cols * URBAN_TILE, h = rows * URBAN_TILE, rgba = new Uint8ClampedArray(w * h * 4);
  for (const [c, r] of tiles) for (let y = 0; y < URBAN_TILE; y += 1) for (let x = 0; x < URBAN_TILE; x += 1) {
    const sx = c * URBAN_STEP + x, sy = r * URBAN_STEP + y, si = (sy * sheet.w + sx) * 4;
    const dx = (c - c0) * URBAN_TILE + x, dy = (r - r0) * URBAN_TILE + y;
    rgba.set(sheet.rgba.subarray(si, si + 4), (dy * w + dx) * 4);
  }
  return trim({ w, h, rgba });
}

export function pickSprite(catalog, boxW, boxH) {
  const view = boxW / boxH >= SIDE_ASPECT ? 'side' : 'front';
  const pool = catalog.filter((s) => s.view === view);
  const want = boxW / boxH;
  return pool.reduce((best, s) => (Math.abs(s.w / s.h - want) < Math.abs(best.w / best.h - want) ? s : best), pool[0]);
}

export function carColour(pixels) {
  const lab = pixels.map(([r, g, b]) => rgbToOklab(r, g, b));
  const chroma = (p) => Math.hypot(p[1], p[2]);
  const vivid = lab.slice().sort((p, q) => chroma(q) - chroma(p)).slice(0, Math.max(1, Math.round(lab.length * 0.4)));
  const med = (arr, i) => arr.map((p) => p[i]).sort((a, b) => a - b)[arr.length >> 1];
  const a = med(vivid, 1), b = med(vivid, 2), L = med(lab, 0);
  return Math.hypot(a, b) < NEUTRAL_CHROMA ? [L, 0, 0] : [L, a, b];
}

export function isGlass([r, g, b]) {
  const [L, , bb] = rgbToOklab(r, g, b);
  return L >= GLASS.minL && bb <= GLASS.maxB;
}

export function recolour(sprite, target) {
  const out = new Uint8ClampedArray(sprite.rgba);
  const paint = [];
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 128) continue;
    const lab = rgbToOklab(out[i], out[i + 1], out[i + 2]);
    if (Math.hypot(lab[1], lab[2]) >= PAINT_CHROMA && !isGlass([out[i], out[i + 1], out[i + 2]])) paint.push([i, lab]);
  }
  if (!paint.length) return { ...sprite, rgba: out };
  const meanL = paint.reduce((t, [, l]) => t + l[0], 0) / paint.length;
  for (const [i, [L]] of paint) {
    const nl = Math.max(0.12, Math.min(0.97, L - meanL + target[0]));
    out.set(oklabToRgb(nl, target[1], target[2]), i);
  }
  return { ...sprite, rgba: out };
}

export function scaleFor(sprite, boxW, boxH) {
  return Math.max(1, Math.min(Math.round(boxW / sprite.w), Math.floor((boxH * 1.25) / sprite.h) || 1));
}

export function upscale(sprite, s) {
  const w = sprite.w * s, h = sprite.h * s, rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const si = (Math.floor(y / s) * sprite.w + Math.floor(x / s)) * 4;
    rgba.set(sprite.rgba.subarray(si, si + 4), (y * w + x) * 4);
  }
  return { w, h, rgba };
}
