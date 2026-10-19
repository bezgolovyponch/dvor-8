// THE WORKING PALETTE PIECE'S OWN CHECK — the contract, before it is used on a frame.
//
// The piece takes a frame's indices and the palette and collapses them onto at most `keep` tones. Its contract has
// four promises, and this check proves each on a synthetic frame where the right answer is known:
//   1. THE CAP        the result never uses more than `keep` tones
//   2. THE STRUCTURE  the outline and the void entries are PINNED: an outline is a line, never a tone to be merged
//   3. THE FAMILY LAW a tone is remapped inside its own family whenever that family kept an entry, so a green never
//                     becomes a grey (the suite's "nothing is invented" check reads family membership, and it is right)
//   4. DETERMINISM    two runs on the same input give the same frame
//
//   node tools/piece-working-palette-check.mjs   ->  exit 0 only when every promise holds.
import { reduceToWorkingPalette } from '../src/pieces/working-palette.js';
import { paletteOf, RAMPS, STEPS } from '../src/flat.js';

let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(56)} ${detail}`); if (cond) pass += 1; else fail += 1; };

const palette = paletteOf();
const n = 288 * 512;
const OUT = palette.length - 2, VOID = palette.length - 1;
const fam = (i) => Math.floor(i / STEPS);

// a synthetic frame that uses many tones from several families, plus the structural entries
const mk = () => {
  const idx = new Uint8Array(n);
  const tones = [];
  for (let f = 0; f < RAMPS.length; f += 1) for (let t = 0; t < STEPS; t += 1) tones.push(f * STEPS + t);
  for (let p = 0; p < n; p += 1) idx[p] = tones[p % tones.length];
  // the structural entries are a thin line: exactly the case the pin exists for
  for (let p = 0; p < n; p += 997) idx[p] = OUT;
  for (let p = 3; p < n; p += 1499) idx[p] = VOID;
  return idx;
};

const KEEP = 22;
const a = mk();
const r = reduceToWorkingPalette(a, palette, KEEP);
const used = new Set(a);
ok('1 THE CAP: at most `keep` tones survive', used.size <= KEEP && r.distinct <= KEEP, `${used.size} tones used, piece reported ${r.distinct}, cap ${KEEP}`);

let outlineLost = 0, voidLost = 0;
for (let p = 0; p < n; p += 997) if (a[p] !== OUT) outlineLost += 1;
for (let p = 3; p < n; p += 1499) if (a[p] !== VOID) voidLost += 1;
ok('2 THE STRUCTURE: outline and void are pinned', outlineLost === 0 && voidLost === 0, `${outlineLost} outline px moved, ${voidLost} void px moved`);

// the family law: every surviving tone must be in a family that survived, and every remapped tone's destination must
// be in its own family when its family kept at least one entry
const b = mk();
const before = Uint8Array.from(b);
reduceToWorkingPalette(b, palette, KEEP);
const keptFams = new Set([...new Set(b)].map(fam));
let crossFam = 0, checked = 0;
for (let p = 0; p < n; p += 1) {
  if (before[p] === b[p]) continue;
  checked += 1;
  if (!keptFams.has(fam(before[p]))) continue;            // its family died: a cross-family move is the only option
  if (fam(before[p]) !== fam(b[p])) crossFam += 1;
}
ok('3 THE FAMILY LAW: no remap crosses a family that survived', crossFam === 0, `${crossFam} of ${checked} remapped px crossed`);

const c = mk();
const r2 = reduceToWorkingPalette(c, palette, KEEP);
ok('4 DETERMINISM: two runs are identical', a.join() === c.join() && r.remapped === r2.remapped, `${r.remapped} and ${r2.remapped} pixels remapped`);

console.log(`\n${fail ? 'PIECE CHECK FAILED' : 'PIECE CONFIRMED'}: the working palette is ${pass} of ${pass + fail} promises - a capped, structure-preserving, family-faithful, deterministic reduction.`);
process.exit(fail ? 1 : 0);
