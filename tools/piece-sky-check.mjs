// THE SKY PIECE'S OWN CHECK — the contract, before the piece is used in a frame.
//
// A piece is a BRICK: it must be verifiable on its own, with its own synthetic input, the way `piece-downscale-check`
// and `piece-facade-photo-check` verify theirs. This one checks the six things the piece's contract promises, and it
// fails the piece (not the frame) when one breaks:
//   1. DETERMINISM      two calls on the same input are identical - the field is a function of the pixel, never of rng
//   2. THE MASK IS THE MASK      every sky pixel is painted, no non-sky pixel is
//   3. THE PLANE SURVIVES THE BAND   in the top 8% of the frame the plane is the most common tone, >= 35% (the
//                                delivery rule S1's premise, asserted on the piece so a frame gate cannot hide it)
//   4. THE COVER IS THE REFERENCE'S ORDER   the field covers 15-45% of the sky (the operator's engine's own cloud
//                                cover reads ~28% of its sky box; a plane is 0%, a storm is 90%)
//   5. A SURFACE IS A FIELD, A LINE IS A RUN      no isolated field pixel: every lit/shade pixel touches another field
//                                pixel, or the style has painted confetti (the project's own rule)
//   6. THE PUFFS KEEP THEIR TONES   a designed puff's pixels take exactly their recorded entry
//
//   node tools/piece-sky-check.mjs   ->  exit 0 only when every promise holds.
import { paintSkyStyle } from '../src/pieces/sky-style.js';
import { paletteOf, RAMPS, STEPS } from '../src/flat.js';

let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(58)} ${detail}`); if (cond) pass += 1; else fail += 1; };

const W = 288, H = 512;
const palette = paletteOf();
const ramp = RAMPS.findIndex((r) => r.name === 'sky') * STEPS;
const base = ramp + 4;                       // the plane, as entryFor resolves the sky's colour
const horizon = Math.round(H * 0.65);        // a synthetic sky: the top 65% of the frame
const skyMask = new Uint8Array(W * H);
const skyline = new Int32Array(W);
for (let y = 0; y < horizon; y += 1) for (let x = 0; x < W; x += 1) skyMask[y * W + x] = 1;
for (let x = 0; x < W; x += 1) skyline[x] = horizon;
const ground = ramp + 1;                     // a non-sky tone to prove the piece never paints outside

const run = () => {
  const idx = new Uint8Array(W * H).fill(ground);
  const m = paintSkyStyle({ w: W, h: H, idx, skyMask, skyline, base, ramp, steps: STEPS });
  return { idx, m };
};
const a = run(), b = run();

ok('1 DETERMINISM: two calls are identical', a.idx.join() === b.idx.join(), `first differing index ${a.idx.findIndex((v, i) => v !== b.idx[i])}`);
let outside = 0, unpainted = 0;
for (let p = 0; p < W * H; p += 1) { if (!skyMask[p] && a.idx[p] !== ground) outside += 1; if (skyMask[p] && a.idx[p] === ground) unpainted += 1; }
ok('2 THE MASK IS THE MASK: nothing outside, nothing left bare', outside === 0 && unpainted === 0, `${outside} outside, ${unpainted} unpainted`);

const bandRows = Math.max(1, Math.floor(H * 0.08));
const hist = new Map();
for (let y = 0; y < bandRows; y += 1) for (let x = 0; x < W; x += 1) { const v = a.idx[y * W + x]; hist.set(v, (hist.get(v) || 0) + 1); }
const [topTone, topN] = [...hist.entries()].sort((p, q) => q[1] - p[1])[0];
ok('3 THE PLANE SURVIVES: the top 8% band is the plane at >=35%', topTone === base && topN / (bandRows * W) >= 0.35, `${((100 * topN) / (bandRows * W)).toFixed(1)}% of the band is entry ${topTone}`);

ok('4 THE COVER IS THE REFERENCE\'S ORDER: 15-45% of the sky', a.m.cover >= 0.15 && a.m.cover <= 0.45, `${(100 * a.m.cover).toFixed(1)}% cover (lit ${a.m.field.lit}, shade ${a.m.field.shade})`);

let isolated = 0;
const isField = (v) => v === ramp + STEPS - 1 || v === ramp + Math.max(1, STEPS - 3);
for (let y = 1; y < horizon - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
  const p = y * W + x;
  if (!isField(a.idx[p])) continue;
  if (!isField(a.idx[p - 1]) && !isField(a.idx[p + 1]) && !isField(a.idx[p - W]) && !isField(a.idx[p + W])) isolated += 1;
}
ok('5 A SURFACE IS A FIELD: no isolated field pixel', isolated === 0, `${isolated} isolated`);

const cloudMask = new Int32Array(W * H).fill(-1);
const puff = ramp + STEPS - 1;
for (let y = 20; y < 40; y += 1) for (let x = 20; x < 50; x += 1) cloudMask[y * W + x] = puff;
const idx2 = new Uint8Array(W * H).fill(ground);
const m2 = paintSkyStyle({ w: W, h: H, idx: idx2, skyMask, skyline, cloudMask, base, ramp, steps: STEPS });
let puffOk = 0, puffN = 0;
for (let y = 20; y < 40; y += 1) for (let x = 20; x < 50; x += 1) { puffN += 1; if (idx2[y * W + x] === puff) puffOk += 1; }
ok('6 THE PUFFS KEEP THEIR TONES', puffOk === puffN && m2.puffs === puffN, `${puffOk}/${puffN} puff px, piece reported ${m2.puffs}`);

console.log(`\n${fail ? 'PIECE CHECK FAILED' : 'PIECE CONFIRMED'}: the sky's style is ${pass} of ${pass + fail} promises` + (fail ? '' : ' - a deterministic, masked, plane-preserving, non-confetti field in the reference\'s own cover range.'));
process.exit(fail ? 1 : 0);
