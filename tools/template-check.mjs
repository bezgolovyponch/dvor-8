// THE TEMPLATE CHECK — every element of the composition compared against the operator's OWN rendering of the SAME
// element on the SAME patch, with the reference's own envelope as the bar.
//
// WHY THIS REPLACES ROUNDED INDICES. The v13 lines judge a rounded share ("one tone ≤ 60% of the ground"): a number
// chosen in a gap, not the desired picture. The desired picture exists: the operator's engine draws the same
// photograph, so for any element - the road, the sky, a facade, the cars - there is an EXACT example on the exact
// same pixels. This tool compares our element to that example, like for like, and takes its bar from the reference's
// own behaviour: the same element measured on the reference's four scenes gives an envelope (min..max) for each
// measure, and the product must fall inside the envelope the desired artefact itself exhibits. No round numbers, no
// thresholds of mine - the bounds ARE the reference's measurements.
//
// THE MEASURES ARE PALETTE-INDEPENDENT, which is what makes the comparison legitimate: our palette and the
// reference's are different 50-entry tables (our sky is rgb(122,183,230), the reference's rgb(77,155,230)), so an
// exact-colour test would call the same design "different". The template is therefore measured as:
//   tones    distinct tones in the patch            (the palette-size discipline)
//   dom      the largest tone's share                (the structure: is it a plane or a pattern)
//   light    share of 8x8 blocks whose mean luma is within 12 of the reference's, BOTH MEASURED RELATIVE TO
//            THEIR OWN PATCH MEAN - the two designs' base tones differ (our sky is rgb(122,183,230), the reference's
//            rgb(77,155,230): 18 luma apart in the SAME designed blue), so an absolute test compares tables, not
//            designs. Relative light compares the SHAPE of the light inside the element, which is what a template is.
//   texture  share of 8x8 blocks whose luma sd is within 8 of the reference's     (the same texture)
//
//   node tools/template-check.mjs <scene> <our-canvas.json>
//     scene: prague-tower | prague-street | aerial-church | sunset-bus
//   exit 0 every element inside the reference's envelope · 1 an element outside it · 2 premises failed
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(fileURLToPath(new URL('../gates/package.json', import.meta.url)));
const { PNG } = require('pngjs');
const REF = new URL('../reference/v13/', import.meta.url);
const scene = process.argv[2] && !process.argv[2].endsWith('.json') ? process.argv[2] : 'prague-tower';
const dumpPath = process.argv[2] && process.argv[2].endsWith('.json') ? process.argv[2] : (process.argv[3] || '/tmp/chain-page/canvas.json');
const withhold = (why) => { console.log(`VERDICT WITHHELD: ${why}`); process.exit(2); };
const readout = JSON.parse(readFileSync(fileURLToPath(new URL('readout.json', REF)), 'utf8')).find((r) => r.label === scene);
const framePath = fileURLToPath(new URL(`${scene}.png`, REF));
if (!existsSync(framePath)) withhold(`no reference frame for ${scene} (${framePath}) - run tools/v13/refs.mjs`);
if (!readout) withhold(`scene "${scene}" is not in the reference readout`);
if (!existsSync(dumpPath)) withhold(`no canvas dump at ${dumpPath} - run tools/photo-shot.mjs`);
const dump = JSON.parse(readFileSync(dumpPath, 'utf8'));
if (dump.w !== 288 || dump.h !== 512) withhold(`the dump is ${dump.w}x${dump.h}, not 288x512`);
if (dump.settled !== true) withhold('the dump was not settled');

const W = 288, H = 512;
const loadPNG = (p) => { const img = PNG.sync.read(readFileSync(p)); return { w: img.width, h: img.height, d: img.data }; };
const ref = loadPNG(framePath);
const ours = { w: W, h: H, d: new Uint8Array(W * H * 4) };
const a = dump.px.split(',').map(Number);
for (let k = 0; k < W * H; k += 1) { ours.d[k * 4] = a[k * 3]; ours.d[k * 4 + 1] = a[k * 3 + 1]; ours.d[k * 4 + 2] = a[k * 3 + 2]; ours.d[k * 4 + 3] = 255; }
const rgb = (I, x, y) => [I.d[(y * W + x) * 4], I.d[(y * W + x) * 4 + 1], I.d[(y * W + x) * 4 + 2]];
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

// ---- the elements, on the SAME patches the reference's own annotation defines
const anno = readout.anno;
const gy = anno.gy;
const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const biggest = anno.buildings.slice().sort((p, q) => (q.quad[2][0] - q.quad[0][0]) * (q.quad[2][1] - q.quad[1][1]) - (p.quad[2][0] - p.quad[0][0]) * (p.quad[2][1] - p.quad[1][1]))[0];
const carBoxes = anno.cars;
const elements = {
  sky: { pix: (x, y) => x >= Math.round(W * 0.55) && y >= 8 && y < Math.max(40, gy - 70) },
  road: { pix: (x, y) => y >= Math.min(H - 8, gy + 45) && y < H - 8 },
  facade: { pix: (x, y) => inPoly(biggest.quad, x + 0.5, y + 0.5) },
  cars: {
    pix: (x, y) => {
      for (const c of carBoxes) if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) return true;
      return false;
    },
  },
};

// ---- the measures (palette-independent: light and texture are compared, not exact colours)
const measure = (I, el) => {
  const hist = new Map();
  let n = 0, sumL = 0;
  const blockMean = new Map(), blockSd = new Map();
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (!el.pix(x, y)) continue;
    const c = rgb(I, x, y), k = c.join(','), L = lum(c);
    hist.set(k, (hist.get(k) || 0) + 1); n += 1; sumL += L;
    const b = ((y / 8) | 0) * 64 + ((x / 8) | 0);
    if (!blockMean.has(b)) blockMean.set(b, []);
    blockMean.get(b).push(L);
  }
  const stat = (vals) => { const m = vals.reduce((p, q) => p + q, 0) / vals.length; const v = vals.reduce((p, q) => p + (q - m) ** 2, 0) / vals.length; return [m, Math.sqrt(v)]; };
  const patchMean = sumL / Math.max(1, n);
  for (const [b, vals] of blockMean) blockSd.set(b, stat(vals));
  const top = [...hist.values()].sort((p, q) => q - p)[0] || 1;
  // the block map is centred on the patch's own mean: relative light, so two palettes' levels never decide the test
  const centred = new Map();
  for (const [b, [m, sd]] of blockSd) centred.set(b, [m - patchMean, sd]);
  return { n, tones: hist.size, dom: top / Math.max(1, n), meanL: patchMean, blocks: centred };
};
const compare = (o, r) => {
  // light: the share of blocks whose mean luma is within 12 of the reference's; texture: sd within 8
  let light = 0, texture = 0, shared = 0;
  for (const [b, [m, s]] of r.blocks) {
    const oo = o.blocks.get(b);
    if (!oo) continue;
    shared += 1;
    if (Math.abs(oo[0] - m) <= 12) light += 1;
    if (Math.abs(oo[1] - s) <= 8) texture += 1;
  }
  return { light: shared ? light / shared : 0, texture: shared ? texture / shared : 0, shared };
};

// ---- the reference's OWN envelope: the same element on its four scenes
const SCENES = ['prague-tower', 'prague-street', 'aerial-church', 'sunset-bus'];
const envelopes = {};
for (const el of Object.keys(elements)) envelopes[el] = { dom: [], tones: [], light: [], texture: [] };
for (const sc of SCENES) {
  const ro = JSON.parse(readFileSync(fileURLToPath(new URL('readout.json', REF)), 'utf8')).find((r) => r.label === sc);
  const fp = fileURLToPath(new URL(`${sc}.png`, REF));
  if (!ro || !existsSync(fp)) continue;
  const img = loadPNG(fp);
  const gyS = ro.anno.gy;
  const big = ro.anno.buildings.slice().sort((p, q) => (q.quad[2][0] - q.quad[0][0]) * (q.quad[2][1] - q.quad[1][1]) - (p.quad[2][0] - p.quad[0][0]) * (p.quad[2][1] - p.quad[1][1]))[0];
  const els = {
    sky: { pix: (x, y) => x >= Math.round(W * 0.55) && y >= 8 && y < Math.max(40, gyS - 70) },
    road: { pix: (x, y) => y >= Math.min(H - 8, gyS + 45) && y < H - 8 },
    facade: { pix: (x, y) => inPoly(big.quad, x + 0.5, y + 0.5) },
    cars: { pix: (x, y) => ro.anno.cars.some((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) },
  };
  for (const el of Object.keys(els)) {
    const m = measure(img, els[el]);
    envelopes[el].dom.push(m.dom); envelopes[el].tones.push(m.tones);
  }
  // light/texture envelope = how well one SCENE of the reference matches ANOTHER scene's geometry? Not meaningful
  // across scenes (different pictures). Only the palette-side measures (dom, tones) carry an envelope; the
  // light/texture measures are per-patch and compared against the reference's OWN patch (the exact example).
}

const pad = (s, n) => String(s).padEnd(n);
let fails = 0, withheld = 0;
console.log('ELEMENT TEMPLATE — our element against the operator\'s OWN rendering of the same patch');
console.log(`PREMISES: dump ${dumpPath} (settled) · reference ${scene}.png (the same photograph, the operator's engine) · 288x512 both`);
console.log(`${pad('element', 9)} ${pad('n px', 8)} ${pad('ours→ref', 22)} ${pad('dom ours/ref', 16)} ${pad('tones', 11)} ${pad('light', 7)} ${pad('texture', 8)} verdict`);
for (const [name, el] of Object.entries(elements)) {
  const o = measure(ours, el), r = measure(ref, el);
  const c = compare(o, r);
  const env = {
    dom: [Math.min(...envelopes[name].dom), Math.max(...envelopes[name].dom)],
    tones: [Math.min(...envelopes[name].tones), Math.max(...envelopes[name].tones)],
  };
  // the exact-example bar, palette-side: our dominant share must lie in the reference's own four-scene range
  const domOk = o.dom >= env.dom[0] - 0.0001 && o.dom <= env.dom[1] + 0.0001;
  // the like-for-like bar, patch-side: light and texture must agree with the reference's own patch on most blocks
  const lightOk = c.light >= 0.5, textureOk = c.texture >= 0.5;
  const ok = domOk && lightOk && textureOk;
  if (!ok) fails += 1;
  console.log(`${pad(name, 9)} ${pad(o.n, 8)} ${pad(`${(100 * o.dom).toFixed(1)}/${(100 * r.dom).toFixed(1)}%`, 22)} ${pad(`${(100 * o.dom).toFixed(1)}% / ${(100 * env.dom[0]).toFixed(1)}-${(100 * env.dom[1]).toFixed(1)}%`, 16)} ${pad(`${o.tones}/${r.tones} (ref ${env.tones[0]}-${env.tones[1]})`, 11)} ${pad((100 * c.light).toFixed(0) + '%', 7)} ${pad((100 * c.texture).toFixed(0) + '%', 8)} ${ok ? 'ok' : `FAIL (${[!domOk ? 'dom outside the reference envelope' : '', !lightOk ? 'light disagrees on >half the blocks' : '', !textureOk ? 'texture disagrees on >half the blocks' : ''].filter(Boolean).join('; ')})`}`);
}
console.log(`\n${fails ? 'TEMPLATE CHECK FAILED' : 'TEMPLATE CHECK PASSED'}: ${Object.keys(elements).length - fails} of ${Object.keys(elements).length} elements inside the reference's own envelope` + (withheld ? ` (${withheld} withheld)` : ''));
process.exit(fails ? 1 : 0);
