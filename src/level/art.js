import { rgbToOklab } from '../v2/oklab.js';
import { OUTLINE, slot } from './colours.js';

export const URBAN = { tile: 16, step: 17 };
export const TILES = { wall: [18, 0], window: [13, 13], door: [14, 10], cornice: [18, 1], treeTop: [16, 8], treeMid: [16, 9], treeFoot: [16, 10] };
const NIGHT = 49;
const PAINT_CHROMA = 0.06;
const DARK_L = 0.3;

const labOf = (rgba, i) => rgbToOklab(rgba[i], rgba[i + 1], rgba[i + 2]);
export const isGlassLab = ([L, , b]) => L >= 0.7 && b <= -0.025;

export function tilePixels(sheet, [c, r]) {
  const { tile, step } = URBAN, rgba = new Uint8ClampedArray(tile * tile * 4);
  for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
    const si = ((r * step + y) * sheet.w + c * step + x) * 4;
    rgba.set(sheet.rgba.subarray(si, si + 4), (y * tile + x) * 4);
  }
  return { w: tile, h: tile, rgba };
}

function cuts(values) {
  const s = values.slice().sort((a, b) => a - b);
  return s.length ? [s[Math.floor(s.length / 3)], s[Math.floor((s.length * 2) / 3)]] : [0.5, 0.5];
}

export function paint(art, { body, glass, neutral }) {
  const n = art.w * art.h, out = new Int32Array(n).fill(-1), win = new Uint8Array(n), labs = [];
  for (let k = 0; k < n; k += 1) labs.push(art.rgba[k * 4 + 3] < 128 ? null : labOf(art.rgba, k * 4));
  const bodyL = labs.filter((l) => l && Math.hypot(l[1], l[2]) >= PAINT_CHROMA && !isGlassLab(l)).map((l) => l[0]);
  const [b1, b2] = cuts(bodyL);
  labs.forEach((l, k) => {
    if (!l) return;
    if (l[0] < DARK_L) { out[k] = l[0] < DARK_L * 0.6 ? OUTLINE : NIGHT; return; }
    if (isGlassLab(l)) { out[k] = glass[l[0] > 0.85 ? 1 : 0]; win[k] = 1; return; }
    if (Math.hypot(l[1], l[2]) >= PAINT_CHROMA) { out[k] = body[l[0] < b1 ? 0 : l[0] < b2 ? 1 : 2]; return; }
    out[k] = neutral[l[0] < 0.55 ? 0 : l[0] < 0.8 ? 1 : 2];
  });
  return { w: art.w, h: art.h, px: out, glass: win };
}

export function scale(sprite, s) {
  const w = sprite.w * s, h = sprite.h * s, px = new Int32Array(w * h), glass = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const j = Math.floor(y / s) * sprite.w + Math.floor(x / s);
    px[y * w + x] = sprite.px[j]; glass[y * w + x] = sprite.glass[j];
  }
  return { w, h, px, glass };
}

export const glassRamp = () => [slot('blue', 3), slot('blue', 4)];
export const neutralRamp = () => [slot('cool', 2), slot('cool', 4), slot('cool', 5)];
