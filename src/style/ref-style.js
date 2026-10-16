// THE REFERENCE'S OWN STYLE ENGINE, COPIED VERBATIM.
//
// Provenance: /Users/m/Documents/DVOR-8 Street v10.dc.html (the creator's accepted frame), extracted from
//   initPal()   lines 169-180   -> PAL, RGB, LUM, NEU, CHR, WATER, SIREN
//   quant()     lines 181-187   -> quant(r,g,b)
//   bayer()     line 188        -> bayer(x,y)
//   skyStyle()  line 189        -> skyStyle(x,y)
//   outline()   line 198        -> OUTLINE index 48, VOID index 49
// Nothing here is invented: the numbers, the neutral/chromatic split and the sky's own noise are the reference's.
// The reference's virtual grid is 448 wide at a 1.557 scale (288 x 1.557 = 448), so a caller on the game's 288x512
// grid passes x*1.557 and y*1.557 - the same scale the reference itself uses.
//
// WHY THIS FILE EXISTS: the project spent weeks deriving palette rules by hand (hue cascades, grey rules, saturation
// clamps) and measuring invented percentages, while the accepted frame already ships a complete, tested mapping whose
// own palette holds the example's exact colours - #4d9be6 = rgb(77,155,230) is the example's sky blue, and
// #625e68 = rgb(98,94,104) is the example's road grey.

export const PAL = ['#1d2b53', '#323f7a', '#4d65b4', '#4d9be6', '#8fd3ff', '#d6f1ff', '#0e3b30', '#165a4c', '#239063', '#1ebc73', '#30e1b9', '#91db69', '#2e1f1a', '#4c2f22', '#6e4a36', '#9e6b47', '#bf8f63', '#e3bd8f', '#1f1d22', '#34313a', '#4a4650', '#625e68', '#7e7a84', '#a39fa8', '#1e2230', '#323a4c', '#56627a', '#8a98ad', '#c4d0dc', '#ffffff', '#4a1414', '#6e2727', '#b33831', '#e83b3b', '#e6904e', '#fbb954', '#2e1a3a', '#5a2a5e', '#a24b6f', '#c32454', '#f04f78', '#fca790', '#5e4a22', '#8a6f30', '#c09a3e', '#f9c22b', '#fbe17a', '#fff6c2', '#1a1220', '#0b0018'];

// indices that mean something in the reference (initPal)
export const OUTLINE = 48;          // the one outline rule, the darkest entry
export const VOID = 49;             // a hole through the world
export const NEU = [48, 18, 19, 20, 21, 22, 23, 28, 29];
export const CHR = Array.from({ length: 48 }, (_, i) => i).filter((i) => i < 18 || i > 27);

export const RGB = PAL.map((h) => [1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16)));
export const LUM = RGB.map(([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b);

/** quant(): the reference's own colour mapping. Desaturated or very dark -> nearest NEUTRAL by luminance;
 *  otherwise the nearest CHROMATIC entry with its weighted distance. Copied verbatim from lines 181-187. */
export function quant(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = mx > 0 ? (mx - mn) / mx : 0;
  let best = 0, bd = 1e9;
  if (sat < 0.26 || mx < 45) {
    for (const i of NEU) { const d = Math.abs(LUM[i] - L); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  for (const i of CHR) {
    const p = RGB[i], dr = p[0] - r, dg = p[1] - g, db = p[2] - b;
    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

/** bayer(): the reference's 4x4 ordered dither, line 188. */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

/** hash/vn: the reference's value noise, lines 165-166 - the sky's own texture. */
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function vn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** skyStyle(): the designed sky, copied verbatim from line 189. Returns a PALETTE INDEX. */
export function skyStyle(x, y) {
  const xs = x / 1.557, ys = y / 1.557, b = bayer(x, y), g = ys / 210;
  const col = g < 0.45 ? 3 : b < (g - 0.45) * 1.6 ? 4 : 3;
  const n = vn(xs / 20 + 3, ys / 7) * 0.65 + vn(xs / 7 + 9, ys / 3 + 2) * 0.35;
  const v = n - 0.5 - (ys > 150 ? ((ys - 150) / 60) * 0.2 : 0);
  const vb = vn(xs / 20 + 3, (ys - 2.5) / 7) * 0.65 + vn(xs / 7 + 9, (ys - 2.5) / 3 + 2) * 0.35 - 0.5;
  if (v > 0.03) return vb > 0.03 ? 29 : 28;
  return col;
}
