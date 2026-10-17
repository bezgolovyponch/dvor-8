// THE HORIZON FROM A SKY MASK — one pure function, one definition, two users (the parse's own horizon and the
// frame's skyline), so the two can never disagree about what a horizon IS.
//
// THE RULE IS THE PUBLISHED ONE. SkyRegionDetector (https://github.com/..., edgesToMask) walks each column from the
// top and records the row where the sky stops: the FIRST NON-SKY ROW. Searching from the bottom instead - what this
// repo did - returns the LAST sky row, which sits below any object that interrupts the sky, and the difference is
// one whole object tall.
//
// NO-SKY GUARD, also published: when no sky is found at all the source takes `skylinePoints = np.array([0]*w)` -
// every column's boundary is row 0, i.e. there is no sky. Without it the frame treated a sky-less photograph as
// "sky to the bottom" and would have painted the whole picture sky.
//
// CONVENTIONS THIS MODULE FIXES: horizon[x] is the first non-sky row (h when a column is sky to the bottom); a column
// that STARTS non-sky (a tower fills the top) is interpolated from the nearest column that has a boundary, because a
// mask cannot see through an occluder; a mask with no sky returns 0 in every column (the guard).

/** @param {Uint8Array} sky mask, w*h, non-zero = sky @returns {Int32Array} first non-sky row per column */
export function horizonFromSky(sky, w, h) {
  const horizon = new Int32Array(w).fill(-1);
  let anySky = false;
  for (let x = 0; x < w; x += 1) {
    let y = 0;
    while (y < h && sky[y * w + x]) y += 1;
    if (y > 0) { anySky = true; horizon[x] = y; }   // the column starts with sky; the boundary is its first non-sky row
  }
  if (!anySky) { horizon.fill(0); return horizon; } // the published no-sky guard
  let last = -1;
  for (let x = 0; x < w; x += 1) { if (horizon[x] >= 0) last = horizon[x]; else if (last >= 0) horizon[x] = last; }
  for (let x = w - 1; x >= 0; x -= 1) { if (horizon[x] < 0 && x + 1 < w) horizon[x] = horizon[x + 1]; }
  // a leading occluded run with no left neighbour: borrow the first resolved column
  if (horizon[0] < 0) for (let x = 1; x < w; x += 1) if (horizon[x] >= 0) { for (let k = 0; k < x; k += 1) horizon[k] = horizon[x]; break; }
  return horizon;
}
