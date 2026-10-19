// THE GROUND PIECE'S OWN CHECK — the contract, on a synthetic pad where the right answer is known.
//
//   1. DETERMINISM     two calls are identical
//   2. THE SPLIT IS THE SHARE   a pad whose luma spans a range gives the darker plane the stated share of the asphalt
//                               (the reference's ground carries its dark plane on 40% of its asphalt - D26)
//   3. THE PAINT IS A SHAPE     a bright stripe is painted; a one-pixel gap in it is FILLED (the closing), and no
//                               painted pixel is isolated (the project's "a surface is a field" rule)
//   4. THE PAD IS THE PAD       nothing outside the pad is touched, and no pad pixel is left unpainted
//   5. THE TONES ARE THE GIVEN ONES   only the three entries the caller resolved appear, and the returned tone map
//                               agrees with what was written
//
//   node tools/piece-ground-check.mjs   ->  exit 0 only when every promise holds.
import { paintGroundPlanes } from '../src/pieces/ground-planes.js';

let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(56)} ${detail}`); if (cond) pass += 1; else fail += 1; };
const pad = (s, n) => String(s).padEnd(n);

const W = 160, H = 96, n = W * H;
// a synthetic pad: rows 20..80, columns 10..150, an asphalt gradient 60..140 luma with a bright stripe (260) three
// rows tall - the width a real crossing stripe has; a ONE-PIXEL GAP (x = 61) cuts it, which is the case the closing
// exists for. (A 1-px stripe cannot survive the 3x3 surface mean BY CONSTRUCTION, and that is the piece's rule: the
// tone is the surface's, so the test uses a surface-sized mark.)
const pixels = [];
const rgb = new Float32Array(n * 3);
for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
  const p = y * W + x;
  const onPad = y >= 20 && y < 80 && x >= 10 && x < 150;
  const stripe = y >= 40 && y <= 42 && x >= 20 && x < 140 && x !== 61;
  const L = stripe ? 260 : 60 + (x / W) * 80;
  rgb[p * 3] = L; rgb[p * 3 + 1] = L; rgb[p * 3 + 2] = L;
  if (onPad) pixels.push(p);
}
const padPixels = Int32Array.from(pixels);
const DARK = 38, LIGHT = 39, MARK = 45;
const run = () => {
  const idx = new Uint8Array(n).fill(7);
  const r = paintGroundPlanes({ w: W, h: H, idx, padPixels, rgb, marking: MARK, dark: DARK, light: LIGHT, split: true });
  return { idx, r };
};
const a = run(), b = run();

ok('1 DETERMINISM: two calls are identical', a.idx.join() === b.idx.join(), `first differing index ${a.idx.findIndex((v, i) => v !== b.idx[i])}`);

const asphalt = padPixels.length - a.r.paint;
const darkShare = a.r.dark / Math.max(1, asphalt);
ok('2 THE SPLIT IS THE SHARE: the darker plane is ~40% of the asphalt', Math.abs(darkShare - 0.40) <= 0.06, `${(100 * darkShare).toFixed(1)}% dark (split at luma ${a.r.splitAt.toFixed(1)})`);

let stripePainted = 0, stripeN = 0, gapFilled = 0, belowPainted = 0;
for (let x = 20; x < 140; x += 1) {
  stripeN += 2;
  if (a.idx[41 * W + x] === MARK) stripePainted += 1;       // the stripe's two inner rows
  if (a.idx[42 * W + x] === MARK) stripePainted += 1;
  if (a.idx[40 * W + x] === MARK) belowPainted += 1;        // the row above: the dilation's own row
}
if (a.idx[41 * W + 61] === MARK) gapFilled = 1;              // the one-pixel gap the closing must fill
const isolated = (() => {
  let k = 0;
  for (const p of padPixels) {
    if (a.idx[p] !== MARK) continue;
    const x = p % W, y = (p / W) | 0;
    const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < W && ny < H && a.idx[ny * W + nx] === MARK);
    if (!nb.length) k += 1;
  }
  return k;
})();
ok('3 THE PAINT IS A SHAPE: stripe painted, gap filled, nothing isolated', stripePainted === stripeN && gapFilled === 1 && belowPainted === 120 && isolated === 0, `${stripePainted}/${stripeN} inner px, gap ${gapFilled}, ${belowPainted} dilated above, ${isolated} isolated`);

let outside = 0, bare = 0;
for (let p = 0; p < n; p += 1) {
  const inPad = padPixels.includes(p);
  if (!inPad && a.idx[p] !== 7) outside += 1;
  if (inPad && a.idx[p] === 7) bare += 1;
}
ok('4 THE PAD IS THE PAD: nothing outside, nothing left bare', outside === 0 && bare === 0, `${outside} outside, ${bare} bare`);

const used = new Set();
for (const p of padPixels) used.add(a.idx[p]);
const onlyGiven = [...used].every((v) => v === DARK || v === LIGHT || v === MARK);
let toneAgrees = 0, toneN = 0;
for (const p of padPixels) { if (a.r.tone[p] < 0) continue; toneN += 1; if (a.r.tone[p] === a.idx[p]) toneAgrees += 1; }
ok('5 THE TONES ARE THE GIVEN ONES', onlyGiven && toneAgrees === toneN, `${[...used].sort((x, y) => x - y).join('/')} used, tone map agrees on ${toneAgrees}/${toneN}`);

console.log(`\n${fail ? 'PIECE CHECK FAILED' : 'PIECE CONFIRMED'}: the ground is ${pass} of ${pass + fail} promises - a deterministic two-plane surface with a closed, shape-preserving paint mask.`);
process.exit(fail ? 1 : 0);
