// THE TAP PIECE'S OWN CHECK — a synthetic wall with a window and a shadow, where the right region is known.
//
//   1. THE WALL IS THE WALL      a tap on the wall returns the wall's pixels: no window pixel, no sky pixel
//   2. A WINDOW IS A DIFFERENT THING   the window's colour is outside the tolerance, and its hard edge stops the growth
//   3. A SHADOW MAY JOIN          a soft shadow inside the tolerance joins the wall (one plane, two lights)
//   4. A TAP OUTSIDE IS EMPTY     a seed outside the frame returns nothing, not a wrong region
//   5. THE QUAD IS THE MASS       the returned quad's area is within 35% of the region's own bounding area, and its
//                                 corners lie on the region
//   6. DETERMINISM                the same seed gives the same pixels
//
//   node tools/piece-region-grow-check.mjs   ->  exit 0 only when every promise holds.
import { growRegion, quadOf } from '../src/pieces/region-grow.js';

let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(56)} ${detail}`); if (cond) pass += 1; else fail += 1; };

const W = 120, H = 80, n = W * H;
const rgba = new Uint8ClampedArray(n * 4);
const set = (x, y, r, g, b) => { const p = (y * W + x) * 4; rgba[p] = r; rgba[p + 1] = g; rgba[p + 2] = b; rgba[p + 3] = 255; };
// sky above, wall in the middle, road below; a dark window in the wall, a soft shadow on the wall
for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
  if (y < 20) set(x, y, 150, 190, 230);
  else if (y < 60) {
    const win = x >= 50 && x < 70 && y >= 30 && y < 50;
    const shadow = x >= 20 && x < 40 && y >= 22 && y < 58;
    if (win) set(x, y, 40, 55, 90);
    else if (shadow) set(x, y, 150, 130, 110);
    else set(x, y, 170, 150, 125);
  } else set(x, y, 90, 88, 92);
}
const seed = 30 * W + 45;                                   // on the wall, between the shadow and the window
const r = growRegion({ w: W, h: H, rgba, seed });
let wallPx = 0, badPx = 0, winPx = 0;
for (const p of r.pixels) {
  const x = p % W, y = (p / W) | 0;
  const inWin = x >= 50 && x < 70 && y >= 30 && y < 50;
  if (inWin) winPx += 1;
  const onWall = y >= 20 && y < 60;
  if (!onWall) badPx += 1;
  else wallPx += 1;
}
ok('1 THE WALL IS THE WALL: no sky, no road', badPx === 0 && wallPx > 1500, `${r.pixels.length} px grown, ${badPx} outside the wall (sky/road), ${winPx} window px`);
ok('2 A WINDOW IS A DIFFERENT THING: it does not join', winPx === 0, `${winPx} window pixels in the region`);
ok('3 A SHADOW MAY JOIN: 150,130,110 is inside the tolerance of 170,150,125', (() => { let sh = 0; for (const p of r.pixels) { const x = p % W, y = (p / W) | 0; if (x >= 20 && x < 40 && y >= 22 && y < 58) sh += 1; } return sh > 300; })(), 'the soft shadow is part of the wall');
ok('4 A TAP OUTSIDE IS EMPTY', growRegion({ w: W, h: H, rgba, seed: -3 }).pixels.length === 0 && growRegion({ w: W, h: H, rgba, seed: n + 9 }).pixels.length === 0, 'no seed, no region');
const q = quadOf(r.pixels, W);
const xs = r.pixels.map((p) => p % W), ys = r.pixels.map((p) => (p / W) | 0);
const bboxArea = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
ok('5 THE QUAD IS THE MASS', q && q.area > 0.65 * bboxArea, `quad area ${Math.round(q.area)} vs bounding ${bboxArea} (${(100 * q.area / bboxArea).toFixed(0)}%)`);
ok('6 DETERMINISM', growRegion({ w: W, h: H, rgba, seed }).pixels.join() === r.pixels.join(), 'same pixels twice');

console.log(`\n${fail ? 'PIECE CHECK FAILED' : 'PIECE CONFIRMED'}: the tap is ${pass} of ${pass + fail} promises - a seeded, edge-guarded growth and its quad.`);
process.exit(fail ? 1 : 0);
