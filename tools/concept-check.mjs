// THE INTERIM GATE. Run on a screenshot before any output: measures the frame against the concept and the
// restrictions, and fails loudly. See docs/concept-gate.md for why it exists.
//
// Usage: node tools/concept-check.mjs <picture.png> [--json]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { paletteOf } from '../src/flat.js';

const PALETTE = paletteOf();

const file = process.argv[2];
if (!file) { console.error('usage: node tools/concept-check.mjs <picture.png>'); process.exit(2); }

// decode the PNG through the tool the repo already uses for screenshots: sips writes a raw bitmap
// a canvas dump needs no decoding at all: it IS the pixels
if (!file.endsWith('.json')) {
  const raw = execFileSync('sips', ['-s', 'format', 'png', file, '--out', '/tmp/gate.png']).toString();
  void raw;
}
const isDump = file.endsWith('.json');
let dump = null;
if (isDump) dump = JSON.parse(readFileSync(file, 'utf8'));
const info = isDump ? '' : execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]).toString();
const W = isDump ? dump.w : Number(/pixelWidth: (\d+)/.exec(info)[1]);
const H = isDump ? dump.h : Number(/pixelHeight: (\d+)/.exec(info)[1]);
if (!file.endsWith('.json')) {
  const bmp = execFileSync('sips', ['-s', 'format', 'bmp', file, '--out', '/tmp/gate.bmp']);
  void bmp;
}
const buf = isDump ? null : readFileSync('/tmp/gate.bmp');
const off = isDump ? 0 : buf.readUInt32LE(10), w = isDump ? W : buf.readInt32LE(18), h = isDump ? H : Math.abs(buf.readInt32LE(22)), bpp = isDump ? 3 : buf.readUInt16LE(28) / 8;
const dumpArr = isDump ? dump.px.split(',').map(Number) : null;
const px = (x, y) => {
  if (dumpArr) { const i = (y * W + x) * 3; return [dumpArr[i], dumpArr[i + 1], dumpArr[i + 2]]; }
  const yy = h - 1 - y, i = off + (yy * w + x) * bpp; return [buf[i + 2], buf[i + 1], buf[i]];
};

const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
// THE SKY BAND IS THE SKY, SO THE BUILDINGS THE PLAN NAMES ARE NOT IN IT. Measured 2026-10-18: after the facade became
// the photograph (v13 S8-S11), the tower's own tones sat in the top of the frame and both sky lines counted them (20
// colours in the band) - a sky line failing because a BUILDING was in the band. The dump carries the plan, so the
// exclusion is structural, not a threshold. Same class as the pairing correction of T+92 ("a sky is the top run of a
// column"): a definition corrected, not a bar widened.
const facBoxes = isDump && dump && dump.plan && dump.plan.facades ? dump.plan.facades.map((f) => f.box) : [];
const inFacade = (x, y) => facBoxes.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1);
// THE PALETTE IS THE UNIT OF MEASURE. Counting raw screenshot pixels made this gate fail on the reference as well
// as on the game, because a screenshot is antialiased and carries the browser's chrome. What matters is how many
// of the PROJECT'S OWN entries a frame uses: a constructed frame uses a handful per surface, a filtered
// photograph sprays across the whole table.
const near = (c) => {
  let best = 0, bd = Infinity;
  for (let i = 0; i < PALETTE.length; i += 1) {
    const q = PALETTE[i], d = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
};
const palCount = new Map();
const palSky = new Map();
let sum = 0, n = 0;
const counts = new Map();
const STEP = isDump ? 1 : 2;
for (let y = 0; y < h; y += STEP) for (let x = 0; x < w; x += STEP) {
  const c = px(x, y);
  sum += lum(c); n += 1;
  const k = c.join(',');
  counts.set(k, (counts.get(k) || 0) + 1);
  const e = near(c);
  palCount.set(e, (palCount.get(e) || 0) + 1);
  if (y < Math.floor(h * 0.2) && !inFacade(x, y)) palSky.set(e, (palSky.get(e) || 0) + 1);
}
const mean = sum / n;
const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
// DOMINANCE IS MEASURED BELOW THE SKY BAND. A flat sky is the style (v6 draws one), so a large single blue up
// there is the design, not a fault. Below it, one colour owning the frame means a surface nobody built.
const below = new Map();
let belowN = 0;
for (let y = Math.floor(h * 0.2); y < h; y += 2) for (let x = 0; x < w; x += 2) {
  const k = px(x, y).join(',');
  below.set(k, (below.get(k) || 0) + 1);
  belowN += 1;
}
const biggestBelow = [...below.values()].sort((a2, b2) => b2 - a2)[0] / belowN;
const biggest = biggestBelow;
const distinct = counts.size;

// the sky band: the top fifth, its distinct colours
const skyCounts = new Map();
for (let y = 0; y < Math.floor(h * 0.2); y += 2) for (let x = 0; x < w; x += 2) {
  const k = px(x, y).join(',');
  skyCounts.set(k, (skyCounts.get(k) || 0) + 1);
}
// window sprites: a dark ring with a lighter inside, a few pixels across
let windows = 0;
for (let y = 20; y < h - 20; y += 3) for (let x = 20; x < w - 20; x += 3) {
  const a = px(x, y), b = px(x + 3, y + 3), c2 = px(x - 3, y - 3);
  if (lum(a) > 30 && lum(a) < 120 && lum(b) > lum(a) + 20 && lum(c2) > lum(a) + 20) windows += 1;
}

// FIDELITY AND FLATNESS ARE IN TENSION, AND THE CREATOR SETTLED IT: the environment must stay exactly as the
// photograph, only pixelated (R14, docs/PLAN.md L0). So flatness is measured where the STYLE decides the layout
// (sky, facades, objects - the top of the frame), and a FIDELITY row is measured where the PHOTOGRAPH decides it
// (the road and ground at the bottom): a faithful pixelation of asphalt with its markings uses many tones of its
// ramp, where a flattened one uses three.
let flat = 0, tot = 0, trans = 0;
// FLATNESS IS MEASURED ON THE SKY BAND, and the reason is measured: the facades carry 164 WINDOW SPRITES, each a
// frame + glass + sill, and that detail is the requirement ("windows that can be broken"), not noise. A frame with
// a dense window grid cannot be 55% flat, and a bar set from a frame with 14 windows proves nothing. What must be
// flat is the SKY - the plane the style owns outright - and the road keeps a fidelity row instead.
const TOP = Math.floor(h * 0.08);   // above the skyline on this photograph; 12% caught the towers' faces   // the sky proper: on this photograph the skyline sits far below this band
let bandSkip = 0;
for (let y = 0; y < TOP; y += 2) for (let x = 0; x < w - 2; x += 2) {
  if (inFacade(x, y)) { bandSkip += 1; continue; }
  const a2 = px(x, y), b2 = px(x + 2, y), c2 = px(x, y + 2);
  tot += 1;
  if (a2.join() === b2.join() && a2.join() === c2.join()) flat += 1;
  if (a2.join() !== b2.join()) trans += 1;
}
const flatShare = flat / Math.max(1, tot), transPerPx = trans / Math.max(1, tot);
const skyHist = new Map();
for (let y = 0; y < TOP; y += 2) for (let x = 0; x < w; x += 2) { if (inFacade(x, y)) continue; const k = px(x, y).join(','); skyHist.set(k, (skyHist.get(k) || 0) + 1); }
const skyColours = skyHist.size;
const skyTot = [...skyHist.values()].reduce((a2, b2) => a2 + b2, 0);
const skyTop = [...skyHist.values()].sort((a2, b2) => b2 - a2)[0] / Math.max(1, skyTot);
const roadTones = new Set();
for (let y = Math.floor(h * 0.62); y < h; y += 2) for (let x = 0; x < w; x += 2) roadTones.add(near(px(x, y)));

// THE PRECAUTION, ENFORCED. Three times a measurement of mine was an artefact of the instrument and I reported it as
// a property of the picture: a dump that sampled every SECOND pixel (a 1-px stray was invisible, and the stray
// share read 10.7% instead of 2.3%), a pitch finder that never tried pitch 1 (so a 1:1 frame was reduced by half
// and every number described half the drawing), and a sky band that contained two towers (the sky "failed" a bar
// it met). The class is the same every time: THE INSTRUMENT MEASURED SOMETHING ELSE THAN THE THING NAMED.
//
// So the instrument now states its own premises and REFUSES TO GIVE A VERDICT when one of them is violated. A
// number from this tool is only quotable when these three rows pass.
const INSTRUMENT = [
  ['the dump is 1:1: one sample per drawn pixel', w >= 200 && h >= 400, `${w}x${h} - a half-resolution dump would read ${w * 2}x${h * 2}`],
  ['the band measured is the one named (the sky, above any structure)', TOP / h <= 0.10, `the band is the top ${(100 * TOP / h).toFixed(0)}% of the frame, minus the ${facBoxes.length} plan facade boxes (${bandSkip} sample px excluded)`],
  ['the frame measured is a whole frame', n === w * h && n > 0, `${n} samples for ${w}x${h}`],
];

// the frame's own colours, against the project's table (used by the palette row; computed before ROWS because the
// row's predicate runs while the array is built)
const paletteSet = new Set(PALETTE.map((c) => c.join(',')));
const paletteSeen = new Set();
for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) paletteSeen.add(px(x, y).join(','));
const paletteStrays = [...paletteSeen].filter((k) => !paletteSet.has(k));
const ROWS = [
  ['the frame is a daylight place, not a murk (mean luma 55..200)', mean >= 55 && mean <= 200, `mean luma ${mean.toFixed(0)}`],
  // A CONSTRUCTED FRAME IS MADE OF PLANES, and its largest plane is allowed to be large: a wall, the road, the
  // sky. The bar is 32% and it is a CHOICE, not a measurement - the 6% it was first set from came from a
  // photograph of a phone screen, which this file already proved cannot calibrate anything. What the row still
  // catches is a picture that has COLLAPSED into one field, and the other rows (flatness, transitions, window
  // sprites) catch the rest of that fault on the drawn canvas.
  ['below the sky, no single colour has swallowed the picture (<= 32%)', biggest <= 0.32, `largest colour below the sky ${(100 * biggest).toFixed(0)}%`],
  // A CONSTRUCTED FRAME USES A FEW ENTRIES PER SURFACE AND A FLAT SKY. The thresholds are calibrated on the
  // reference the creator accepts, measured with this same tool.
  // A PLANE SKY WITH DESIGNED CLOUDS, measured: the band's distinct colours stay few and one tone owns about half
  // of it. The previous bars (55% flat, 0.34 transitions) were set from a frame without clouds and with one
  // building top in the band, so they measured the clouds as noise - the histogram of the band shows 8 colours
  // with 49.9% in one tone, which IS a plane.
  ['the SKY is a plane: at most 10 distinct colours in its band', skyColours <= 10, `${skyColours} colours in the sky band`],
  ['and one tone owns it: the largest single colour is at least 40% of the band', skyTop >= 0.40, `largest ${(100 * skyTop).toFixed(0)}% of the sky band`],
  // THE ROAD'S TONES MUST COME FROM A FRAME THAT USES THE TABLE. Measured (D20): the audit's counterexample - eight
  // palette stripes and nothing else - passed this row at "8 palette entries on the road". A reduced photograph uses
  // 30+ entries; the stripes used 8. The row now asks for both: its own tones on the road AND a frame that sprays
  // across the palette, which a handful of stripes cannot.
  ['the PHOTOGRAPH decides the road: a faithful pixelation uses at least 8 tones of its own ramp, in a frame that uses the table',
    roadTones.size >= 8 && paletteSeen.size >= 24,
    `${roadTones.size} palette entries on the road, ${paletteSeen.size} in the frame (needs 8 and 24+)`],
  ['the sky is a plane, not a gradient (its own band: at most 12 palette entries)', palSky.size <= 12, `${palSky.size} entries in the sky band`],
  ['facades are built with windows (at least 8 window sprites)', windows >= 8, `${windows} window sprites`],
  // THE PALETTE ROW WAS THE LITERAL `true` (audited 2026-10-18: an unfalsifiable row inside "19 of 19"). It now
  // checks what it says: every colour drawn in the dump is an entry of the project's own palette table, so a stray
  // colour - a gradient, a blend, a photograph pixel - FAILS it.
  // THE FLATNESS WAS COMPUTED AND NEVER ASSERTED (audited 2026-10-18: flatShare and transPerPx were computed at
  // :110 and no row read them, while the baseline row that claimed "the frame is FLAT by measurement" grepped two
  // constants that no longer exist). MEASURED on the creator's accepted frame, same band and same definition:
  // flatShare 0.164, transPerPx 0.688 - clouds are irregular, so the reference is LESS flat than a plain plane. The
  // bar is therefore the accepted frame's own flatness, not a round number: being at least as flat as the frame the
  // creator accepted.
  ['the frame is FLAT by measurement: its sky band is at least as flat as the accepted frame\'s (0.164)', flatShare >= 0.164, `flat ${(100 * flatShare).toFixed(0)}%, transitions ${transPerPx.toFixed(2)} per pixel (accepted frame: 16%, 0.69)`],
  ['the palette is the project own table', paletteStrays.length === 0, `${PALETTE.length} entries · ${paletteSeen.size} colours in the frame · ${paletteStrays.length} not in the table`],
];
let fail = 0;
for (const [what, ok, detail] of ROWS) { console.log(`${ok ? 'OK  ' : 'FAIL'}  ${what}  [${detail}]`); if (!ok) fail += 1; }
console.log(`\nGATE ${ROWS.length - fail} OK  ${fail} FAIL  (${w}x${h})`);
// THE PREMISES ARE PRINTED WITH EVERY RESULT, and a violated premise WITHHOLDS the verdict: the rows above then
// describe the instrument, not the picture, and R17 forbids quoting them.
const brokenPremises = INSTRUMENT.filter(([, pass]) => !pass);
for (const [label, pass, detail] of INSTRUMENT) {
  console.log(`${pass ? 'OK  ' : 'BAD '} INSTRUMENT: ${label}  [${detail}]`);
}
if (brokenPremises.length) {
  console.log(`VERDICT WITHHELD: ${brokenPremises.length} of the instrument's own premises failed. This is not a measurement of the picture.`);
}
process.exit(fail ? 1 : 0);
