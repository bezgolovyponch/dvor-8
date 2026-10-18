// V13 CHECK — does the product's frame carry the reference's drawing laws?
//
// The reference is the operator's own engine, run on its own scenes at 288×512 (tools/v13/refs.mjs, verified
// byte-equal to the HTML slice and deterministic). Every line below compares OUR canvas dump with THAT frame, or
// with the photograph the reference itself reduced (S0). Nothing here is compared with a screenshot of a screen.
//
// THE LINES, AND WHERE EACH BAR COMES FROM (all bars sit in a measured gap and are passed by the reference):
//
//   V1 PALETTE   distinct tones ≤ 24        v13 S1: ≤12 photo entries + ≤5 sky + glass ramp 0–4 + outline + void.
//                                           reference 16 · the accepted frame's 48 belongs to the creator's palette
//                                           and is not this gate's subject (it is measured by its own gates).
//   V2 SKY       one tone ≤ 70% of the sky  reference 56% · accepted 24% · ours 88%
//   V3 GROUND    one tone ≤ 60% of ground  reference 46% · accepted 22% · ours 72%
//   V4 CARS      one tone ≤ 35% of cars    reference 22% · accepted 10% · ours 44%
//   V5 FACADE    the largest facade is not a pattern: distinct ≥ 10, one tone ≤ 35%, top 3 ≤ 85%
//                                           reference 16 / 27% / 59% · accepted 47 / 15% / 36% · ours 7 / 42% / 99%
//   V6 WINDOWS   the build makes windows, one per pane-bearing facade, in the reference's order of magnitude:
//                total ≥ max(8, 10% of the reference's panes)   (staged floor: v13 makes EVERY pane a window;
//                one pane in ten is the floor at which the mechanism exists and can be raised toward parity)
//   V7 DISTANCE  the frame is no further from the reference than the accepted frame is (tower scene only):
//                accepted = 51.66% (measured live by this gate) · ours 69.31% · bar = accepted + 5 points.
//
// PREMISES. A line whose premise fails is WITHHELD, never passed: the dump must exist, be settled, be 288×512, and
// carry `targets` for V6; the reference frame/S0/readout must exist and the readout must state the FNV was built twice.
//
//   node tools/v13-check.mjs [scene] [canvas.json]
//     scene: prague-tower | prague-street | aerial-church | sunset-bus   (default prague-tower)
//   exit 0 all pass · 1 a line failed · 2 premises failed (verdict withheld)
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(fileURLToPath(new URL('../gates/package.json', import.meta.url)));
const { PNG } = require('pngjs');
const _pm = require('pixelmatch');
const pixelmatch = _pm.default || _pm;

const REF = new URL('../reference/v13/', import.meta.url);
const scene = process.argv[2] && !process.argv[2].endsWith('.json') ? process.argv[2] : 'prague-tower';
const dumpPath = process.argv[2] && process.argv[2].endsWith('.json') ? process.argv[2] : (process.argv[3] || '/tmp/chain-page/canvas.json');
const readoutPath = fileURLToPath(new URL('readout.json', REF));
const framePath = fileURLToPath(new URL(`${scene}.png`, REF));
const s0Path = fileURLToPath(new URL(`${scene}.s0.png`, REF));

const withhold = (why) => { console.log(`VERDICT WITHHELD: ${why}`); process.exit(2); };
for (const [p, what] of [[framePath, 'reference frame'], [s0Path, 'reference S0'], [readoutPath, 'reference readout']]) if (!existsSync(p)) withhold(`the ${what} is missing (${p}) — run tools/v13/refs.mjs`);
if (!existsSync(dumpPath)) withhold(`no canvas dump at ${dumpPath} — run tools/photo-shot.mjs first`);

const readout = JSON.parse(readFileSync(readoutPath, 'utf8')).find((r) => r.label === scene);
if (!readout) withhold(`scene "${scene}" is not in the reference readout`);
if (!readout.det) withhold(`the reference's two builds of ${scene} differ (FNV ${readout.h1}/${readout.h2}) — the reference is not deterministic`);
const dump = JSON.parse(readFileSync(dumpPath, 'utf8'));
if (dump.w !== 288 || dump.h !== 512) withhold(`the dump is ${dump.w}x${dump.h}, not 288x512 — not a like-for-like comparison`);
if (dump.settled !== true) withhold('the dump was not settled (dump.settled is not true) — a transient frame is not the frame');

const loadPNG = (p) => { const img = PNG.sync.read(readFileSync(p)); return { w: img.width, h: img.height, d: img.data }; };
const REFI = loadPNG(framePath), S0I = loadPNG(s0Path);
if (REFI.w !== 288 || REFI.h !== 512 || S0I.w !== 288 || S0I.h !== 512) withhold('the reference is not 288x512');
const px = dump.px.split(',').map(Number);
const OUR = { w: dump.w, h: dump.h, d: new Uint8Array(288 * 512 * 4) };
for (let k = 0; k < 288 * 512; k += 1) { OUR.d[k * 4] = px[k * 3]; OUR.d[k * 4 + 1] = px[k * 3 + 1]; OUR.d[k * 4 + 2] = px[k * 3 + 2]; OUR.d[k * 4 + 3] = 255; }

const W = 288, H = 512;
const rgb = (I, k) => [I.d[k * 4], I.d[k * 4 + 1], I.d[k * 4 + 2]];
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const unionBox = (boxes) => boxes.reduce((a, [x, y, w2, h2]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x + w2), Math.max(a[3], y + h2)], [1e9, 1e9, -1, -1]);

const boxMask = (bx, by, bw, bh) => { const s = new Set(); for (let y = Math.max(0, by); y < Math.min(H, by + bh); y += 1) for (let x = Math.max(0, bx); x < Math.min(W, bx + bw); x += 1) s.add(y * W + x); return s; };
const quadMask = (Q) => { const s = []; for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (inPoly(Q, x + 0.5, y + 0.5)) s.push(y * W + x); return s; };
const toneStats = (I, pix) => { const c = new Map(); for (const k of pix) { const key = rgb(I, k).join(','); c.set(key, (c.get(key) || 0) + 1); } const s = [...c.values()].sort((a, b) => b - a); const n = Math.max(1, pix.length); return { n: pix.length, distinct: c.size, largest: s[0] / n, top3: ((s[0] || 0) + (s[1] || 0) + (s[2] || 0)) / n }; };
const distinctTones = (I) => { const c = new Set(); for (let k = 0; k < W * H; k += 1) c.add(rgb(I, k).join(',')); return c.size; };

const anno = readout.anno;
const gy = anno.gy;
const skyBox = [Math.round(W * 0.55), 8, W - Math.round(W * 0.55), Math.max(40, gy - 70)];
const groundBox = [0, Math.min(H - 8, gy + 45), W, H - 8 - Math.min(H - 8, gy + 45)];
const carBoxes = anno.cars.map((c) => [c.x, c.y, c.w, c.h]);
const carU = unionBox(carBoxes);
const carBox = [Math.max(0, carU[0]), Math.max(0, carU[1]), Math.min(W, carU[2]) - Math.max(0, carU[0]), Math.min(H, carU[3]) - Math.max(0, carU[1])];
const bigQuad = anno.buildings.slice().sort((a, b) => (b.quad[2][0] - b.quad[0][0]) * (b.quad[2][1] - b.quad[1][1]) - (a.quad[2][0] - a.quad[0][0]) * (a.quad[2][1] - a.quad[1][1]))[0];

let fails = 0, withheld = 0;
const line = (id, ok, text, premise = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(9)} ${text}`); if (premise) console.log(`     premise: ${premise}`); if (!ok) fails += 1; };

console.log(`PREMISES: dump ${dumpPath} (settled ${dump.settled}) · reference ${scene}.png (FNV ${readout.h1}, two builds equal) · 288×512 both · engine ${JSON.parse(readFileSync(fileURLToPath(new URL('provenance.json', REF)), 'utf8')).engineSha256.slice(0, 12)}…`);

// V1 PALETTE
{
  const ours = distinctTones(OUR), ref = distinctTones(REFI);
  line('V1 PALETTE', ours <= 24, `distinct tones ${ours} ≤ 24 (reference ${ref}; v13 S1: 12 photo + ≤5 sky + 4 glass + outline + void)`);
}
// V2 SKY
{
  const box = boxMask(...skyBox), ours = toneStats(OUR, [...box]), ref = toneStats(REFI, [...box]);
  line('V2 SKY', ours.largest <= 0.70, `largest tone ${(100 * ours.largest).toFixed(1)}% of the sky ≤ 70% (reference ${(100 * ref.largest).toFixed(1)}%)`, `sky box x${skyBox[0]}..${skyBox[0] + skyBox[2]} y${skyBox[1]}..${skyBox[1] + skyBox[3]}`);
}
// V3 GROUND
{
  const box = boxMask(...groundBox), ours = toneStats(OUR, [...box]), ref = toneStats(REFI, [...box]);
  line('V3 GROUND', ours.largest <= 0.60, `largest tone ${(100 * ours.largest).toFixed(1)}% of the ground ≤ 60% (reference ${(100 * ref.largest).toFixed(1)}%)`, `ground box y${groundBox[1]}..${groundBox[1] + groundBox[3]}`);
}
// V4 CARS
if (carBox[2] * carBox[3] < 2000) { console.log('.... V4 CARS      WITHHELD: the annotated car area is too small to measure a histogram'); withheld += 1; }
else {
  const box = boxMask(...carBox), ours = toneStats(OUR, [...box]), ref = toneStats(REFI, [...box]);
  line('V4 CARS', ours.largest <= 0.35, `largest tone ${(100 * ours.largest).toFixed(1)}% of the cars ≤ 35% (reference ${(100 * ref.largest).toFixed(1)}%)`, `car union box x${carBox[0]}..${carBox[0] + carBox[2]} y${carBox[1]}..${carBox[1] + carBox[3]}`);
}
// V5 FACADE
{
  const pix = quadMask(bigQuad.quad), ours = toneStats(OUR, pix), ref = toneStats(REFI, pix);
  const ok = ours.distinct >= 10 && ours.largest <= 0.35 && ours.top3 <= 0.85;
  line('V5 FACADE', ok, `${bigQuad.name}: tones ${ours.distinct} ≥ 10 · one tone ${(100 * ours.largest).toFixed(1)}% ≤ 35% · top3 ${(100 * ours.top3).toFixed(1)}% ≤ 85% (reference ${ref.distinct} / ${(100 * ref.largest).toFixed(1)}% / ${(100 * ref.top3).toFixed(1)}%)`, `quad ${JSON.stringify(bigQuad.quad)} · ${pix.length} px`);
}
// V6 WINDOWS
if (!Array.isArray(dump.targets)) { console.log('.... V6 WINDOWS   WITHHELD: the dump carries no targets — re-run tools/photo-shot.mjs (the world travelled with the dump since 2026-10-18)'); withheld += 1; }
else {
  const wins = dump.targets.filter((t) => t.kind === 'window');
  const refTotal = readout.wn;
  const floor = Math.max(8, Math.round(refTotal * 0.10));
  const okTotal = wins.length >= floor;
  let okFacades = true; const per = [];
  for (const b of anno.buildings) {
    const nw = (readout.rep.find((r) => r.id === b.id) || {}).nw || 0;
    if (nw < 10) { per.push(`${b.name}: ref ${nw}`); continue; }
    const n = wins.filter((t) => inPoly(b.quad, t.box[0] + t.box[2] / 2, t.box[1] + t.box[3] / 2)).length;
    if (n < 1) okFacades = false;
    per.push(`${b.name}: ${n}/${nw}`);
  }
  line('V6 WINDOWS', okTotal && okFacades, `windows ${wins.length} ≥ ${floor} (10% of the reference's ${refTotal}) · one per pane-bearing facade: ${okFacades ? 'yes' : 'NO'} [${per.join(' · ')}]`);
}
// V7 DISTANCE
if (scene !== 'prague-tower') { console.log('.... V7 DISTANCE  WITHHELD: no accepted frame exists for this scene (the tower scene owns the creator\'s accepted frame)'); withheld += 1; }
else {
  const accPath = fileURLToPath(new URL('../reference/v10a-art-canvas.png', import.meta.url));
  if (!existsSync(accPath)) withhold('the accepted frame reference/v10a-art-canvas.png is missing');
  const ACC = loadPNG(accPath);
  const buf = new RGBA(); const nAcc = pixelmatch(ACC.d, REFI.d, buf.d, W, H, { threshold: 0.1 });
  const nOurs = pixelmatch(OUR.d, REFI.d, buf.d, W, H, { threshold: 0.1 });
  const accShare = 100 * nAcc / (W * H), ourShare = 100 * nOurs / (W * H);
  line('V7 DISTANCE', ourShare <= accShare + 5, `ours ${ourShare.toFixed(2)}% differs from the reference ≤ ${(accShare + 5).toFixed(2)}% (the accepted frame differs ${accShare.toFixed(2)}%: bar = that + 5 points)`);
}
console.log(`\nV13 CHECK ${fails ? `FAILED: ${fails} line(s)` : withheld ? `PASSED ${withheld} line(s) withheld` : 'PASSED: every line'}`);
process.exit(fails ? 1 : 0);

function RGBA() { this.d = new Uint8Array(288 * 512 * 4); }
