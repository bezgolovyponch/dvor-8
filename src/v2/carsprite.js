import { rgbToOklab, oklabToRgb } from './oklab.js';

export const EMPTY = -1;
const CORNER = 0.22;
const ROOF_END = 0.14;
const GLASS_END = 0.46;
const SHOULDER_END = 0.56;
const BUMPER_FROM = 0.84;
const WHEEL_FROM = 0.8;
const CABIN_INSET = 0.17;
const BODY_CHROMA = 1.35;
const LIGHT = [255, 236, 170];
const PLATE = [236, 236, 228];
const GLASS = [[38, 52, 78], [96, 128, 168]];
const WHEEL = [22, 20, 26];
const OUTLINE = [16, 14, 22];

export function bodyRamp([r, g, b]) {
  const [L, A, B] = rgbToOklab(r, g, b);
  const a = A * BODY_CHROMA, bb = B * BODY_CHROMA;
  return [L - 0.16, L, Math.min(0.97, L + 0.1)].map((l) => oklabToRgb(Math.max(0.08, l), a, bb));
}

export function carColours(body) {
  const [dark, base, light] = bodyRamp(body);
  return { outline: OUTLINE, dark, base, light, glass: GLASS[0], shine: GLASS[1], wheel: WHEEL, lamp: LIGHT, plate: PLATE };
}

const inRounded = (u, v, w, h) => {
  const r = Math.max(1, Math.min(w, h) * CORNER);
  const dx = Math.max(0, r - u - 0.5, u + 0.5 - (w - r)), dy = Math.max(0, r - v - 0.5, v + 0.5 - (h - r));
  return dx * dx + dy * dy <= r * r;
};

export function drawCar(w, h) {
  const part = new Array(w * h).fill(null);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const v = (y + 0.5) / h, u = (x + 0.5) / w;
    const inset = v < GLASS_END ? CABIN_INSET * (1 - v / GLASS_END) + 0.06 : 0;
    if (!inRounded(x, y, w, h) || u < inset || u > 1 - inset) continue;
    let p = 'base';
    if (v < ROOF_END) p = 'light';
    else if (v < GLASS_END) p = (x - y) % 7 === 0 && v > ROOF_END + 0.06 ? 'shine' : 'glass';
    else if (v < SHOULDER_END) p = 'light';
    else if (v >= BUMPER_FROM) p = 'dark';
    if (v >= WHEEL_FROM && (u < 0.24 || u > 0.76) && v > BUMPER_FROM - 0.02) p = 'wheel';
    if (v >= SHOULDER_END && v < SHOULDER_END + 0.14 && (u < 0.16 || u > 0.84)) p = 'lamp';
    if (v >= 0.66 && v < 0.78 && u > 0.38 && u < 0.62 && w >= 12) p = 'plate';
    part[y * w + x] = p;
  }
  const out = part.slice();
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const k = y * w + x;
    if (!part[k]) continue;
    const open = (xx, yy) => xx < 0 || yy < 0 || xx >= w || yy >= h || !part[yy * w + xx];
    if (open(x - 1, y) || open(x + 1, y) || open(x, y - 1) || open(x, y + 1)) out[k] = 'outline';
  }
  return out;
}

export function carSprite({ id, x0, y0, w, h, body, palette, darker }) {
  const colours = carColours(body);
  const order = ['outline', 'wheel', 'glass', 'dark', 'base', 'light', 'shine', 'lamp', 'plate'];
  const at = {};
  for (const name of order) { at[name] = palette.length; palette.push(colours[name]); }
  const down = { base: 'dark', light: 'base', dark: 'outline', glass: 'outline', shine: 'glass', lamp: 'dark', plate: 'dark', wheel: 'outline', outline: 'outline' };
  for (const name of order) darker[at[name]] = at[down[name]];
  const parts = drawCar(w, h);
  const px = new Int32Array(w * h).fill(EMPTY), glass = new Uint8Array(w * h);
  let n = 0;
  parts.forEach((p, k) => {
    if (!p) return;
    px[k] = at[p]; n += 1;
    if (p === 'glass' || p === 'shine') glass[k] = 1;
  });
  return { id, label: 'car', x0, y0, w, h, px, glass, n0: n, n, state: 'whole', heat: 0, flash: 0 };
}
