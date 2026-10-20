// THE QUAD-SNAP PIECE'S OWN CHECK — synthetic facades whose corners are arithmetically known.
//
//   1. A STRONG RECTANGLE   a 60x80 pane of colour on a contrasting background, with the grown region 5 px INSIDE it:
//                           the quad EXPANDS to the rectangle's edges (all four within 3 px) - the growth is a lower
//                           bound, and a snap may only move a side outward, never into a window
//   2. A WEAK REGION        a flat, edgeless patch: the piece does NOT snap, and returns the plain quad unchanged
//   3. THE SEED IS INSIDE   the snapped quad contains most of the grown region (>= 80% of its pixels)
//   4. DETERMINISM          the same input gives the same quad
//   5. NO REGION, NO CLAIM  an empty region returns the plain quad (or null), never a random one
//
//   node tools/piece-quad-lines-check.mjs   ->  exit 0 only when every promise holds.
import { snapQuad } from '../src/pieces/quad-lines.js';

let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(56)} ${detail}`); if (cond) pass += 1; else fail += 1; };
const W = 160, H = 120;

const scene = (rect, noise = 0) => {
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const p = (y * W + x) * 4;
    const inRect = x >= rect[0] && x < rect[2] && y >= rect[1] && y < rect[3];
    const base = inRect ? 180 : 70;
    const n = noise ? ((x * 7 + y * 13) % 5) * noise : 0;
    rgba[p] = base + n; rgba[p + 1] = base + n; rgba[p + 2] = base + n; rgba[p + 3] = 255;
  }
  return rgba;
};
const insideRegion = (rect, pad = 0) => {
  const px = [];
  for (let y = rect[1] + pad; y < rect[3] - pad; y += 1) for (let x = rect[0] + pad; x < rect[2] - pad; x += 1) px.push(y * W + x);
  return Int32Array.from(px);
};

// 1. a strong rectangle
const rect = [40, 20, 100, 100];
const rgba = scene(rect);
const plain = { quad: [[45, 25], [95, 25], [95, 95], [45, 95]] };    // the growth's extent, 5 px inside the true edges
const s1 = snapQuad({ w: W, h: H, rgba, pixels: insideRegion(rect, 6), plain });
const near = (a, b) => Math.abs(a - b) <= 2;
const near3 = (a, b) => Math.abs(a - b) <= 3;
const onEdges = s1.quad && near3(s1.quad[0][0], rect[0]) && near3(s1.quad[1][0], rect[2] - 1) && near3(s1.quad[0][1], rect[1]) && near3(s1.quad[2][1], rect[3] - 1);
ok('1 A STRONG RECTANGLE: the quad lands on its edges', onEdges, `snapped=${s1.snapped} quad=${JSON.stringify(s1.quad)}`);

// 2. a weak, edgeless patch: no snap
const flat = new Uint8ClampedArray(W * H * 4).fill(120);
for (let p = 3; p < flat.length; p += 4) flat[p] = 255;
const s2 = snapQuad({ w: W, h: H, rgba: flat, pixels: insideRegion([40, 20, 100, 100], 6), plain });
ok('2 A WEAK REGION: no snap, the plain quad is returned', s2.snapped === false && JSON.stringify(s2.quad) === JSON.stringify(plain.quad), `snapped=${s2.snapped}`);

// 3. the seed region is inside the snapped quad
const inQ = (q, p) => { const x = p % W, y = (p / W) | 0; return x >= q[0][0] - 1 && x <= q[1][0] + 1 && y >= q[0][1] - 1 && y <= q[2][1] + 1; };
const px = insideRegion(rect, 6);
const covered = s1.quad ? px.filter((p) => inQ(s1.quad, p)).length / px.length : 0;
ok('3 THE SEED IS INSIDE: >=80% of the region in the quad', covered >= 0.8, `${(100 * covered).toFixed(0)}% of ${px.length} px`);

// 4. determinism
const s3 = snapQuad({ w: W, h: H, rgba, pixels: px, plain });
ok('4 DETERMINISM', JSON.stringify(s1.quad) === JSON.stringify(s3.quad) && s1.snapped === s3.snapped, 'same quad twice');

// 5. no region, no claim
const s4 = snapQuad({ w: W, h: H, rgba, pixels: [], plain });
ok('5 NO REGION, NO CLAIM', s4.snapped === false, `snapped=${s4.snapped}`);

console.log(`\n${fail ? 'PIECE CHECK FAILED' : 'PIECE CONFIRMED'}: the edge snap is ${pass} of ${pass + fail} promises - it lands on a real rectangle, refuses a flat patch, and never claims without a region.`);
process.exit(fail ? 1 : 0);
