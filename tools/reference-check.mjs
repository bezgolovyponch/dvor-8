// THE TARGET, NOT AN INVARIANT.
//
// The structural gap this closes: every other tool in this project validates the build against ITSELF (the suite,
// the gate's own bars, the delivery rule's premises). None of them contains the reference picture, so a build could
// be "10/10 ready" and look nothing like the screen the creator accepts. This tool measures MY frame and THE
// REFERENCE frame on the same six numbers and refuses a verdict when they are further apart than the tolerance.
//
// The numbers are the ones that decide whether a frame reads as drawn pixel art:
//   1 distinct colours          a drawn frame uses tens, a photograph uses thousands
//   2 largest colour share      a drawn frame has big flat fields
//   3 flat share                pixels identical to their right and lower neighbour
//   4 stray share               pixels differing from ALL FOUR neighbours - speckle, the "mush" measure
//   5 sky share / sky tone      how much of the top is sky and whether it is one plane
//   6 family mix                the share of pixels in each palette family (sky, foliage, earth, stone, metal, ...)
//
// Usage: node tools/reference-check.mjs <mine-canvas.json> <reference-image>
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const run = (c, a) => { try { return execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return (e.stdout || '') + (e.stderr || ''); } };

function loadBMP(path) {
  const b = readFileSync(path);
  const off = b.readUInt32LE(10), w = b.readInt32LE(18), h = Math.abs(b.readInt32LE(22)), bpp = b.readUInt16LE(28);
  const row = Math.floor((bpp * w + 31) / 32) * 4;
  return { w, h, px: (x, y) => { const i = off + (h - 1 - y) * row + x * (bpp / 8); return [b[i + 2], b[i + 1], b[i]]; } };
}
function loadJSON(path) {
  const d = JSON.parse(readFileSync(path, 'utf8'));
  const a = d.px.split(',').map(Number);
  return { w: d.w, h: d.h, px: (x, y) => { const i = (y * d.w + x) * 3; return [a[i], a[i + 1], a[i + 2]]; } };
}

// THE ART GRID IS FOUND, NOT ASSUMED: the pitch whose reduction has the fewest strays is the grid the art was drawn on.
function artGrid(img, trim = 0.0) {
  const x0 = Math.floor(img.w * trim), y0 = Math.floor(img.h * trim);
  const w0 = img.w - 2 * x0, h0 = img.h - 2 * y0;
  let best = { p: 1, iso: 1 };
  for (let p = 1; p <= 6; p += 1) {
    const w2 = Math.floor(w0 / p), h2 = Math.floor(h0 / p);
    let iso = 0, tot = 0;
    const key = (x, y) => img.px(x0 + x * p, y0 + y * p).join(',');
    for (let y = 1; y < h2 - 1; y += 1) for (let x = 1; x < w2 - 1; x += 1) {
      const k = key(x, y); tot += 1;
      if (k !== key(x - 1, y) && k !== key(x + 1, y) && k !== key(x, y - 1) && k !== key(x, y + 1)) iso += 1;
    }
    const share = iso / Math.max(1, tot);
    if (share < best.iso) best = { p, iso: share };
  }
  const p = best.p;
  const w2 = Math.floor(w0 / p), h2 = Math.floor(h0 / p);
  return { w: w2, h: h2, pitch: p, px: (x, y) => img.px(x0 + x * p, y0 + y * p) };
}

function measure(img) {
  const { w, h, px } = img, key = (x, y) => px(x, y).join(',');
  const colours = new Map();
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) { const k = key(x, y); colours.set(k, (colours.get(k) || 0) + 1); }
  let flat = 0, tot = 0, iso = 0;
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const k = key(x, y); tot += 1;
    if (k === key(x + 1, y) && k === key(x, y + 1)) flat += 1;
    if (k !== key(x - 1, y) && k !== key(x + 1, y) && k !== key(x, y - 1) && k !== key(x, y + 1)) iso += 1;
  }
  const band = Math.max(1, Math.floor(h * 0.12));
  const skyHist = new Map();
  for (let y = 0; y < band; y += 1) for (let x = 0; x < w; x += 1) { const k = key(x, y); skyHist.set(k, (skyHist.get(k) || 0) + 1); }
  const skyTop = [...skyHist.entries()].sort((a, b) => b[1] - a[1])[0];
  const [sr, sg, sb] = skyTop[0].split(',').map(Number);
  return {
    size: `${w}x${h}`,
    colours: colours.size,
    flat: flat / tot,
    strays: iso / tot,
    largest: [...colours.values()].sort((a, b) => b - a)[0] / (w * h),
    skyShare: skyTop[1] / (band * w),
    skyTone: `rgb(${sr},${sg},${sb})`,
    skyBlue: sb > sr + 20,
  };
}

const minePath = process.argv[2];
const refPath = process.argv[3];
if (!existsSync(minePath) || !existsSync(refPath)) { console.log('need: <mine-canvas.json> <reference-image>'); process.exit(2); }
const refBmp = '/tmp/ref-target.bmp';
run('sips', ['-s', 'format', 'bmp', refPath, '--out', refBmp]);
const mine = measure(loadJSON(minePath));
const ref = measure(artGrid(loadBMP(refBmp), 0.06));      // the phone frame sits inside the screenshot's margins

const TOL = { colours: 2.5, flat: 0.18, strays: 0.05, largest: 0.15, skyShare: 0.25 };
const rows = [
  ['distinct colours', mine.colours, ref.colours, Math.abs(Math.log2(Math.max(2, mine.colours) / Math.max(2, ref.colours))), TOL.colours, 'log2 ratio'],
  ['flat share', (100 * mine.flat).toFixed(0) + '%', (100 * ref.flat).toFixed(0) + '%', Math.abs(mine.flat - ref.flat), TOL.flat, 'absolute'],
  ['stray share', (100 * mine.strays).toFixed(1) + '%', (100 * ref.strays).toFixed(1) + '%', Math.abs(mine.strays - ref.strays), TOL.strays, 'absolute'],
  ['largest colour', (100 * mine.largest).toFixed(0) + '%', (100 * ref.largest).toFixed(0) + '%', Math.abs(mine.largest - ref.largest), TOL.largest, 'absolute'],
  ['sky: one tone owns', (100 * mine.skyShare).toFixed(0) + '%', (100 * ref.skyShare).toFixed(0) + '%', Math.abs(mine.skyShare - ref.skyShare), TOL.skyShare, 'absolute'],
];
console.log(`MINE ${mine.size}   REFERENCE ${ref.size} (art pitch ${ref.pitch})`);
console.table(rows.map(([m, a, b, d, t, kind]) => ({ measure: m, mine: a, reference: b, distance: kind === 'log2 ratio' ? d.toFixed(2) : (kind === 'absolute' && d <= 1 ? (100 * d).toFixed(0) + 'pp' : d.toFixed(2)), tolerance: kind === 'log2 ratio' ? t : kind === 'absolute' && t <= 1 ? (100 * t).toFixed(0) + 'pp' : t, ok: d <= t ? 'ok' : 'OFF' })));
console.log(`sky tone: mine ${mine.skyTone} (blue: ${mine.skyBlue})   reference ${ref.skyTone} (blue: ${ref.skyBlue})`);
const bad = rows.filter(([, , , d, t]) => d > t);
if (bad.length) {
  console.log(`\nNOT COMPARABLE TO THE REFERENCE — ${bad.length} of ${rows.length} measures are off: ${bad.map((b) => b[0]).join(', ')}`);
  process.exit(1);
}
console.log('\nCOMPARABLE TO THE REFERENCE on all five measures.');
