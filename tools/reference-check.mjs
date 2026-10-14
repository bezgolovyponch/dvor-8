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
  const off = b.readUInt32LE(10), w = b.readInt32LE(18), hRaw = b.readInt32LE(22), bpp = b.readUInt16LE(28);
  const h = Math.abs(hRaw);
  // A NEGATIVE HEIGHT IS A TOP-DOWN BITMAP, and every reference measurement in this project was read UPSIDE DOWN
  // because this loader flipped unconditionally: sips writes -710 for a 710-pixel image, so "the top" of my loaded
  // frame was the page background at the bottom. That is why the reference's sky kept measuring rgb(7,0,16).
  const topDown = hRaw < 0;
  const row = Math.floor((bpp * w + 31) / 32) * 4;
  return { w, h, px: (x, y) => { const i = off + (topDown ? y : h - 1 - y) * row + x * (bpp / 8); return [b[i + 2], b[i + 1], b[i]]; } };
}
function loadJSON(path) {
  const d = JSON.parse(readFileSync(path, 'utf8'));
  const a = d.px.split(',').map(Number);
  return { w: d.w, h: d.h, px: (x, y) => { const i = (y * d.w + x) * 3; return [a[i], a[i + 1], a[i + 2]]; } };
}

// THE ART GRID IS FOUND, NOT ASSUMED: the pitch whose reduction has the fewest strays is the grid the art was drawn on.
function medianOfBlock(img, x0, y0, p, size) {
  const rs = [], gs = [], bs = [];
  for (let dy = 0; dy < p; dy += 1) for (let dx = 0; dx < p; dx += 1) {
    const c = img.px(x0 + dx, y0 + dy);
    rs.push(c[0]); gs.push(c[1]); bs.push(c[2]);
  }
  const mid = (a) => a.sort((u, v) => u - v)[a.length >> 1];
  return [mid(rs), mid(gs), mid(bs)];
}

/** The art frame inside a screenshot: the crop with the FEWEST distinct colours after a median reduction. */
function findArt(img) {
  let best = null;
  for (const m of [0.02, 0.04, 0.06, 0.09, 0.12]) {
    for (const p of [3, 4, 5, 6]) {
      const x0 = Math.floor(img.w * m), y0 = Math.floor(img.h * m);
      const w2 = Math.floor((img.w - 2 * x0) / p), h2 = Math.floor((img.h - 2 * y0) / p);
      if (w2 < 64 || h2 < 64) continue;
      // ART IS FLAT *AND* STRUCTURED. Scoring by "fewest colours" chose the black page background - a solid field,
      // which is the one thing art never is. The score is the FLAT SHARE of the reduction, and a candidate must
      // carry real structure: at least 6 distinct colours and no single colour owning more than 80% of it.
      const grid = [];
      for (let y = 0; y < h2; y += 1) for (let x = 0; x < w2; x += 1) grid.push(medianOfBlock(img, x0 + x * p, y0 + y * p, p).join(','));
      const cols = new Map();
      for (const k of grid) cols.set(k, (cols.get(k) || 0) + 1);
      const top = Math.max(...cols.values()) / grid.length;
      if (cols.size < 6 || top > 0.8) continue;
      let flat = 0, tot = 0;
      for (let y = 0; y < h2 - 1; y += 1) for (let x = 0; x < w2 - 1; x += 1) {
        const k = grid[y * w2 + x];
        tot += 1;
        if (k === grid[y * w2 + x + 1] && k === grid[(y + 1) * w2 + x]) flat += 1;
      }
      const score = flat / Math.max(1, tot);
      if (!best || score > best.score) best = { score, m, p, x0, y0, w: w2, h: h2 };
    }
  }
  return best;
}

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

// ART-TO-ART: a screenshot of the frame that is scaled (v10a's is 1.25x) is put back on the 288x512 grid by
// AREA-MEDIAN resampling - for each of the 288x512 cells, the median colour of the source rectangle it covers.
// Integer pitch searching could never find a 1.25 scale, which is why every earlier attempt measured the page
// background or a mixture. This is the same lesson as R17: put the instrument's input on the grid the numbers mean.
function areaMedian(img, x0, y0, cw, ch, dw, dh) {
  const px = (x, y) => img.px(Math.min(img.w - 1, Math.max(0, Math.round(x0 + x))), Math.min(img.h - 1, Math.max(0, Math.round(y0 + y))));
  const out = { w: dw, h: dh, px: (x, y) => out._cache[y * dw + x] };
  out._cache = [];
  const sx = cw / dw, sy = ch / dh;
  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      const rs = [], gs = [], bs = [];
      for (let dy = 0; dy < sy; dy += 1) for (let dx = 0; dx < sx; dx += 1) {
        const c = px(x * sx + dx, y * sy + dy);
        rs.push(c[0]); gs.push(c[1]); bs.push(c[2]);
      }
      const mid = (a2) => a2.sort((u, v) => u - v)[a2.length >> 1];
      out._cache.push([mid(rs), mid(gs), mid(bs)]);
    }
  }
  return out;
}

const minePath = process.argv[2];
const refPath = process.argv[3];
if (!existsSync(minePath) || !existsSync(refPath)) { console.log('need: <mine-canvas.json> <reference-image>'); process.exit(2); }
const refBmp = '/tmp/ref-target.bmp';
run('sips', ['-s', 'format', 'bmp', refPath, '--out', refBmp]);
const mine = measure(loadJSON(minePath));
// THE REFERENCE IS MEASURED THROUGH ITS OWN ART FRAME, FOUND AND MEDIAN-SAMPLED. A screenshot cannot be compared
// pixel by pixel - it carries resampling and compression - so each art cell is the MEDIAN of its block and the frame
// is the crop with the fewest distinct colours, which is what art is.
const refImg = loadBMP(refBmp);
const cropArg = process.argv.slice(4).map(Number);
let ref;
if (cropArg.length === 4 && cropArg.every((v) => Number.isFinite(v))) {
  const [x0, y0, cw, ch] = cropArg;
  ref = measure(areaMedian(refImg, x0, y0, cw, ch, 288, 512));
  console.log(`reference: crop ${cw}x${ch} at ${x0},${y0} resampled to 288x512 by area median`);
} else {
const found = findArt(refImg);
ref = measure({
  w: found.w, h: found.h, pitch: found.p,
  px: (x, y) => medianOfBlock(refImg, found.x0 + x * found.p, found.y0 + y * found.p, found.p),
});
console.log(`reference frame found: margin ${(100 * found.m).toFixed(0)}% · pitch ${found.p} · ${found.w}x${found.h}`);
}

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
