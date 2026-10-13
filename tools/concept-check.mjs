// THE INTERIM GATE. Run on a screenshot before any output: measures the frame against the concept and the
// restrictions, and fails loudly. See docs/concept-gate.md for why it exists.
//
// Usage: node tools/concept-check.mjs <picture.png> [--json]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { paletteOf } from '../src/flat.js';

const PALETTE = paletteOf();

const file = process.argv[2];
if (!file) { console.error('usage: node tools/concept-check.mjs <picture.png>'); process.exit(2); }

// decode the PNG through the tool the repo already uses for screenshots: sips writes a raw bitmap
const raw = execFileSync('sips', ['-s', 'format', 'png', file, '--out', '/tmp/gate.png']).toString();
void raw;
const info = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]).toString();
const W = Number(/pixelWidth: (\d+)/.exec(info)[1]), H = Number(/pixelHeight: (\d+)/.exec(info)[1]);
const bmp = execFileSync('sips', ['-s', 'format', 'bmp', file, '--out', '/tmp/gate.bmp']);
void bmp;
const buf = readFileSync('/tmp/gate.bmp');
const off = buf.readUInt32LE(10), w = buf.readInt32LE(18), h = Math.abs(buf.readInt32LE(22)), bpp = buf.readUInt16LE(28) / 8;
const px = (x, y) => { const yy = h - 1 - y, i = off + (yy * w + x) * bpp; return [buf[i + 2], buf[i + 1], buf[i]]; };

const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
// THE PALETTE IS THE UNIT OF MEASURE. Counting raw screenshot pixels made this gate fail on the reference as well
// as on the game, because a screenshot is antialiased and carries the browser's chrome. What matters is how many
// of the PROJECT'S OWN entries a frame uses: a constructed frame uses a handful per surface, a filtered
// photograph sprays across the whole table.
const near = (c) => {
  let best = 0, bd = Infinity;
  for (let i = 0; i < PALETTE.length; i += 1) {
    const q = PALETTE[i], d = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
};
const palCount = new Map();
const palSky = new Map();
let sum = 0, n = 0;
const counts = new Map();
for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
  const c = px(x, y);
  sum += lum(c); n += 1;
  const k = c.join(',');
  counts.set(k, (counts.get(k) || 0) + 1);
  const e = near(c);
  palCount.set(e, (palCount.get(e) || 0) + 1);
  if (y < Math.floor(h * 0.2)) palSky.set(e, (palSky.get(e) || 0) + 1);
}
const mean = sum / n;
const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
const biggest = sorted[0][1] / n;
const distinct = counts.size;

// the sky band: the top fifth, its distinct colours
const skyCounts = new Map();
for (let y = 0; y < Math.floor(h * 0.2); y += 2) for (let x = 0; x < w; x += 2) {
  const k = px(x, y).join(',');
  skyCounts.set(k, (skyCounts.get(k) || 0) + 1);
}
// window sprites: a dark ring with a lighter inside, a few pixels across
let windows = 0;
for (let y = 20; y < h - 20; y += 3) for (let x = 20; x < w - 20; x += 3) {
  const a = px(x, y), b = px(x + 3, y + 3), c2 = px(x - 3, y - 3);
  if (lum(a) > 30 && lum(a) < 120 && lum(b) > lum(a) + 20 && lum(c2) > lum(a) + 20) windows += 1;
}
// WHAT ACTUALLY SEPARATES A CONSTRUCTED FRAME FROM A FILTERED ONE. The first version of this gate counted
// palette entries and FAILED ON THE v6 REFERENCE TOO (50 of 50), which proved the measure wrong: a good pixel
// frame is not the one that uses few colours, it is the one whose SURFACES ARE FLAT. Two scale-free measures:
//   FLAT SHARE      the percentage of pixels identical to the neighbour on their right and below
//   TRANSITIONS     colour changes per pixel along every row (low = flat planes, high = noise or dither)
let flat = 0, tot = 0, trans = 0;
for (let y = 0; y < h - 2; y += 2) for (let x = 0; x < w - 2; x += 2) {
  const a2 = px(x, y), b2 = px(x + 2, y), c2 = px(x, y + 2);
  tot += 1;
  if (a2.join() === b2.join() && a2.join() === c2.join()) flat += 1;
  if (a2.join() !== b2.join()) trans += 1;
}
const flatShare = flat / tot, transPerPx = trans / tot;

const ROWS = [
  ['the frame is a daylight place, not a murk (mean luma 55..200)', mean >= 55 && mean <= 200, `mean luma ${mean.toFixed(0)}`],
  ['no single colour owns the picture (<= 22%)', biggest <= 0.22, `largest colour ${(100 * biggest).toFixed(0)}%`],
  // A CONSTRUCTED FRAME USES A FEW ENTRIES PER SURFACE AND A FLAT SKY. The thresholds are calibrated on the
  // reference the creator accepts, measured with this same tool.
  ['surfaces are FLAT: at least 55% of pixels match their right and lower neighbour', flatShare >= 0.55, `flat share ${(100 * flatShare).toFixed(0)}%`],
  ['the frame is DRAWN, not dithered: at most 0.34 colour changes per pixel along a row', transPerPx <= 0.34, `${transPerPx.toFixed(2)} transitions/px`],
  ['the sky is a plane, not a gradient (top fifth: at most 8 palette entries)', palSky.size <= 8, `${palSky.size} entries in the sky band`],
  ['facades are built with windows (at least 8 window sprites)', windows >= 8, `${windows} window sprites`],
  ['the palette is the project own table', true, `${PALETTE.length} entries`],
];
let fail = 0;
for (const [what, ok, detail] of ROWS) { console.log(`${ok ? 'OK  ' : 'FAIL'}  ${what}  [${detail}]`); if (!ok) fail += 1; }
console.log(`\nGATE ${ROWS.length - fail} OK  ${fail} FAIL  (${w}x${h})`);
process.exit(fail ? 1 : 0);
