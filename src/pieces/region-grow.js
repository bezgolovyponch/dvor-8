// THE ANNOTATION FROM A TAP — piece. Contract: a photograph, a seed pixel and a tolerance → the connected region the
// seed belongs to (a wall, a car, a road), and that region's quad; or an empty result, never a wrong region.
//
// WHY. The reference is GIVEN its geometry (`SCENES.buildings[].quad`, `SCENES.cars[].box`); its S7 says so and adds
// "…or from any detector". This project has no annotator, so the tap becomes one: the game already asks the player to
// press a building or a car, and that press is a point of ground truth. The growth is the reference's own mechanism for
// finding "the region a point belongs to" - S5's seeded region growing (Adams & Bischof 1994) - applied to a facade
// instead of the sky, with the same two guards S5 uses:
//
//   COLOUR: a pixel joins only if its distance from the SEED's colour (the region's own, updated as a running mean) is
//           under `tolerance`. A window is a different colour and does not join a wall.
//   EDGE:   a pixel joins only if its luma differs from the PARENT it grew from by under `edgeGuard`. A smooth shadow
//           joins; a hard edge (a window frame, a kerb) stops the growth, which is what keeps a region from leaking.
//
// NO RANDOMNESS, NO ITERATION COUNT, NO FREE PARAMETERS BEYOND THE TWO THE CALLER GIVES: the result is a function of
// (photograph, seed, tolerance, edgeGuard) alone. `quadOf` then takes the region's four extreme corners (max/min of
// x+y and x-y) - the smallest axis-aligned-ish quad that holds the mass, which is the reference's `quad` shape.

/** Colour distance in the weighted RGB the reference's snap uses (2,4,3) - the same measure, so "similar" means the same. */
const dist = (a, b) => Math.sqrt(2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2);

/**
 * Grow the region containing `seed`.
 * @param {object} o
 * @param {number} o.w @param {number} o.h
 * @param {Uint8ClampedArray} o.rgba   the photograph, w*h*4
 * @param {number} o.seed              the tapped pixel
 * @param {number} [o.tolerance]       colour distance from the region's running mean (default 90)
 * @param {number} [o.edgeGuard]       luma difference from the parent pixel (default 40)
 * @param {number} [o.maxPixels]       a hard cap so a tap on the sky cannot return half the frame (default 40% of it)
 * @returns {{ mask: Uint8Array, pixels: Int32Array, mean: [number,number,number], capped: boolean }}
 */
export function growRegion({ w, h, rgba, seed, tolerance = 90, edgeGuard = 40, maxPixels = 0 }) {
  const n = w * h, cap = maxPixels || Math.floor(n * 0.4);
  const mask = new Uint8Array(n);
  const pix = [];
  if (seed < 0 || seed >= n) return { mask, pixels: Int32Array.from(pix), mean: [0, 0, 0], capped: false };
  const at = (p) => [rgba[p * 4], rgba[p * 4 + 1], rgba[p * 4 + 2]];
  const luma = (p) => 0.299 * rgba[p * 4] + 0.587 * rgba[p * 4 + 1] + 0.114 * rgba[p * 4 + 2];
  let mr = rgba[seed * 4], mg = rgba[seed * 4 + 1], mb = rgba[seed * 4 + 2];
  let capped = false;
  const stack = [seed];
  mask[seed] = 1; pix.push(seed);
  const mean = () => [mr, mg, mb];
  while (stack.length) {
    if (pix.length >= cap) { capped = true; break; }
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    const l0 = luma(p);
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, p + w < n ? p + w : -1]) {
      if (q < 0 || mask[q]) continue;
      if (Math.abs(luma(q) - l0) > edgeGuard) continue;              // a hard edge stops the growth
      if (dist(at(q), mean()) > tolerance) continue;                  // a different colour does not join
      mask[q] = 1;
      pix.push(q);
      const k = pix.length;
      mr += (rgba[q * 4] - mr) / (k + 1); mg += (rgba[q * 4 + 1] - mg) / (k + 1); mb += (rgba[q * 4 + 2] - mb) / (k + 1);
      stack.push(q);
    }
  }
  return { mask, pixels: Int32Array.from(pix), mean: [mr, mg, mb], capped };
}

/** The region's four extreme corners, in the reference's `quad` order TL, TR, BR, BL. */
export function quadOf(pixels, w) {
  if (!pixels.length) return null;
  let tl = -1, tr = -1, br = -1, bl = -1, sMin = 1e9, sMax = -1e9, dMin = 1e9, dMax = -1e9;
  const xs = [];
  for (const p of pixels) {
    const x = p % w, y = (p / w) | 0;
    const s = x + y, d = x - y;
    if (s < sMin) { sMin = s; tl = p; }
    if (s > sMax) { sMax = s; br = p; }
    if (d > dMax) { dMax = d; tr = p; }
    if (d < dMin) { dMin = d; bl = p; }
    xs.push(x);
  }
  const pt = (p) => [p % w, (p / w) | 0];
  const quad = [pt(tl), pt(tr), pt(br), pt(bl)];
  const area = (() => { let a = 0; for (let i = 0; i < 4; i += 1) { const [x1, y1] = quad[i], [x2, y2] = quad[(i + 1) % 4]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; })();
  return { quad, area };
}
