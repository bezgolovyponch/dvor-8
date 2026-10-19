// THE OUTLINE — piece. Contract: a region's PIXEL SET → the 1-px silhouette of its MASS, as a list of frame pixels.
// Nothing else: not the colour, not the state, not which kinds may be outlined (src/criteria/OutlineRule.js owns that).
//
// WHY THIS PIECE EXISTS (measured T+142). The old rule was "a region pixel whose 4-neighbour is outside the region is
// an edge". That is the silhouette only for a SOLID mask. The tower's region pixels are the photograph's WALL lattice
// (the mullions - the glass is not in the wall mask), so almost every pixel has a neighbour outside the set and the
// whole grid became "edge": the operator aimed at the tower and the frame filled with pink dots instead of a building
// outline (the screenshot of 2026-10-19). The same rule drew the info mark and the damaged wreck.
//
// THE RULE NOW: the outline is the boundary of the region's FILLED mass - every enclosed hole is part of the thing
// (a pane of glass in its wall is inside the building; the cells of a lattice are inside it), then the silhouette is
// the boundary of that mass. That is the project's own vocabulary: morphology (OpenCV, the outline pass), "one mass
// per thing", and the reference's own S13 silhouettes.
//
// A hole is filled only if it is ENCLOSED: the flood is taken from the frame's border over everything that is not the
// region, so a gap that reaches the frame's edge stays outside the thing (a doorway open to the street is not filled).

/**
 * The 1-px silhouette of a region's filled mass.
 * @param {number} w @param {number} h
 * @param {Iterable<number>} pixels   the region's own frame pixels
 * @returns {number[]} the boundary pixels, in frame order
 */
export function regionEdges(w, h, pixels) {
  const mask = new Uint8Array(w * h);
  let any = 0;
  for (const p of pixels) { if (p >= 0 && p < w * h) { mask[p] = 1; any += 1; } }
  if (!any) return [];
  // fill enclosed holes: flood the outside from the frame's border through non-mask pixels
  const outside = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const push = (p) => { if (!mask[p] && !outside[p]) { outside[p] = 1; stack[top] = p; top += 1; } };
  for (let x = 0; x < w; x += 1) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y += 1) { push(y * w); push(y * w + w - 1); }
  while (top > 0) {
    top -= 1;
    const p = stack[top], x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p + w < w * h) push(p + w);
  }
  const filled = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) filled[p] = mask[p] || !outside[p] ? 1 : 0;   // the thing and its enclosed holes
  // the silhouette: a filled pixel with a 4-neighbour that is outside the filled mass (or the frame's edge)
  const out = [];
  for (let p = 0; p < w * h; p += 1) {
    if (!filled[p]) continue;
    const x = p % w, y = (p / w) | 0;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1
      || !filled[p - 1] || !filled[p + 1] || !filled[p - w] || !filled[p + w]) out.push(p);
  }
  return out;
}

/**
 * True when a list of pixels is a CONTIGUOUS state mark rather than a scatter: every pixel touches another of the
 * list (4-neighbourhood), which is what a silhouette is and what a lattice's "every pixel is an edge" is not.
 */
export function isContiguous(w, pixels) {
  if (pixels.length < 2) return false;
  const set = new Set(pixels);
  for (const p of pixels) {
    if (set.has(p - 1) || set.has(p + 1) || set.has(p - w) || set.has(p + w)) return true;
  }
  return false;
}
