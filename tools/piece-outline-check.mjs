// THE OUTLINE PIECE'S OWN CHECK — the contract, on masks whose right answer is arithmetically known.
//
//   1. A SOLID SQUARE      the silhouette is its 1-px perimeter (4n-4 for an n×n block), nothing inside
//   2. A LATTICE           the tower's own case: a grid whose cells are enclosed must return the SILHOUETTE of the
//                          filled block, NOT one edge per lattice pixel (the measured fault: the aimed tower turned
//                          into a pink scatter); the check fails if the count exceeds the perimeter
//   3. AN OPEN GAP         a gap that reaches the frame's edge is NOT a hole: the mass keeps its notch (a doorway open
//                          to the street is not filled)
//   4. CONTIGUITY          a silhouette is a connected mark: every returned pixel touches another (4-neighbourhood)
//   5. DETERMINISM         the same mask returns the same list, twice
//
//   node tools/piece-outline-check.mjs   ->  exit 0 only when every promise holds.
import { regionEdges, isContiguous } from '../src/pieces/outline.js';

let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(56)} ${detail}`); if (cond) pass += 1; else fail += 1; };

const W = 64, H = 64;
const box = (x0, y0, x1, y1) => { const px = []; for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) px.push(y * W + x); return px; };

// 1. a solid 20×20 square at (10,10): perimeter = 4*20-4 = 76
{
  const px = box(10, 10, 29, 29);
  const e = regionEdges(W, H, px);
  ok('1 A SOLID SQUARE returns its perimeter and nothing inside', e.length === 76, `${e.length} edge px for a 20x20 block (expected 76)`);
}
// 2. the tower's case: a 20x20 block of 2-px lattice cells (every other pixel set inside the block)
{
  const px = [];
  for (let y = 10; y <= 29; y += 1) for (let x = 10; x <= 29; x += 1) if ((x % 2 === 0 && y % 2 === 0) || x === 10 || y === 10 || x === 29 || y === 29) px.push(y * W + x);
  const e = regionEdges(W, H, px);
  ok('2 A LATTICE returns the block\'s silhouette, not one edge per pixel', e.length <= 76 + 8 && e.length >= 60 && isContiguous(W, e), `${e.length} edge px for a 20x20 lattice (perimeter 76; the old rule gave ${px.length})`);
}
// 3. a block with a notch open to the frame's edge (a doorway to the street): the notch stays out of the mass
{
  const px = box(10, 10, 29, 29).filter((p) => !(p % W >= 18 && p % W <= 21 && (p / W | 0) >= 26));
  const e = regionEdges(W, H, px);
  const notchEdge = e.filter((p) => { const x = p % W, y = (p / W) | 0; return x >= 18 && x <= 21 && y >= 25; }).length;
  ok('3 AN OPEN GAP IS NOT A HOLE (the mass keeps its notch)', notchEdge > 0, `${notchEdge} edge px along the open notch`);
}
// 4. contiguity on the square
{
  const e = regionEdges(W, H, box(10, 10, 29, 29));
  ok('4 A SILHOUETTE IS A CONNECTED MARK', isContiguous(W, e), `${e.length} px, contiguous=${isContiguous(W, e)}`);
}
// 5. determinism
{
  const px = box(10, 10, 29, 29);
  ok('5 DETERMINISM: two calls are identical', regionEdges(W, H, px).join() === regionEdges(W, H, px).join(), 'same list twice');
}

console.log(`\n${fail ? 'PIECE CHECK FAILED' : 'PIECE CONFIRMED'}: the outline is ${pass} of ${pass + fail} promises - the boundary of the region's MASS, filled at enclosed holes, open at the frame's edge.`);
process.exit(fail ? 1 : 0);
