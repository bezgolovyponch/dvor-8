// THE ONLY HONEST WAY TO COMPARE: the same six measures, on the same kind of frame - my own canvas dump and a
// reference picture of the creator's v9 screen. No adjectives, no audit prose: the numbers that separate a clean
// 8-bit composition from a noisy one.
//
//   1 distinct colours       how wide the palette actually used is
//   2 flat share             pixels identical to their right and lower neighbour (a drawn surface, not noise)
//   3 transitions per px     colour changes along a row (dither/noise)
//   4 ISOLATED share         pixels differing from ALL FOUR neighbours - this is the crosshatch/speckle the
//                            creator's eye catches instantly and my measurements kept missing
//   5 largest colour         whether one field has swallowed the frame
//   6 sky colours            distinct colours in the top fifth
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function loadBMP(path) {
  const b = readFileSync(path);
  const off = b.readUInt32LE(10), w = b.readInt32LE(18), h = Math.abs(b.readInt32LE(22)), bpp = b.readUInt16LE(28);
  const row = Math.floor((bpp * w + 31) / 32) * 4, px = (x, y) => {
    const yy = h - 1 - y, i = off + yy * row + x * (bpp / 8);
    return [b[i + 2], b[i + 1], b[i]];
  };
  return { w, h, px };
}
function loadJSON(path) {
  const d = JSON.parse(readFileSync(path, 'utf8'));
  const a = d.px.split(',').map(Number);
  return { w: d.w, h: d.h, px: (x, y) => { const i = (y * d.w + x) * 3; return [a[i], a[i + 1], a[i + 2]]; } };
}
function measure(img, label) {
  const { w, h, px } = img, key = (x, y) => px(x, y).join(',');
  const colours = new Map(); let flat = 0, tot = 0, trans = 0, isolated = 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) { const k = key(x, y); colours.set(k, (colours.get(k) || 0) + 1); }
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const k = key(x, y);
    tot += 1;
    if (k === key(x + 1, y) && k === key(x, y + 1)) flat += 1;
    if (k !== key(x + 1, y)) trans += 1;
    if (k !== key(x - 1, y) && k !== key(x + 1, y) && k !== key(x, y - 1) && k !== key(x, y + 1)) isolated += 1;
  }
  const sky = new Set();
  for (let y = 0; y < Math.floor(h * 0.2); y += 1) for (let x = 0; x < w; x += 1) sky.add(key(x, y));
  const biggest = [...colours.values()].sort((a, b) => b - a)[0] / (w * h);
  return {
    label, size: `${w}x${h}`, colours: colours.size,
    flat: (100 * flat / tot).toFixed(0) + '%',
    trans: (trans / tot).toFixed(2),
    isolated: (100 * isolated / tot).toFixed(1) + '%',
    biggest: (100 * biggest).toFixed(0) + '%',
    sky: sky.size,
  };
}
// THE REFERENCE MUST BE PUT BACK ON ITS OWN ART GRID FIRST. A screenshot of the creator's screen carries the art
// pixel at 4-5 device pixels (107,739 distinct colours: the scaling and the capture's compression, not the
// drawing). Comparing that to a canvas dump measures the scaling. So the pitch is FOUND, not assumed: every
// candidate from 2 to 8 is tried, each frame is reduced with nearest neighbour, and the pitch whose reduction has
// the FEWEST isolated pixels is the art grid - where the picture stops being noise and becomes the tiles it was
// drawn from.
function pitchOf(img) {
  let best = { p: 1, iso: 1 };
  // FROM 1. The finder started at 2, so a canvas dump that is ALREADY one pixel per art pixel was forced into a
  // 2x reduction and every number it produced described half the drawing - including the isolated share the whole
  // comparison exists for. Pitch 1 must be a candidate.
  for (let p = 1; p <= 8; p += 1) {
    const w2 = Math.floor(img.w / p), h2 = Math.floor(img.h / p);
    let iso = 0, tot = 0;
    const key = (x, y) => img.px(x * p, y * p).join(',');
    for (let y = 1; y < h2 - 1; y += 1) for (let x = 1; x < w2 - 1; x += 1) {
      const k = key(x, y); tot += 1;
      if (k !== key(x - 1, y) && k !== key(x + 1, y) && k !== key(x, y - 1) && k !== key(x, y + 1)) iso += 1;
    }
    const share = iso / Math.max(1, tot);
    if (share < best.iso) best = { p, iso: share };
  }
  return best.p;
}
function onGrid(img) {
  const p = pitchOf(img);
  return { w: Math.floor(img.w / p), h: Math.floor(img.h / p), pitch: p, px: (x, y) => img.px(x * p, y * p) };
}
const rows = [];
if (process.argv[2]) { const g = onGrid(loadJSON(process.argv[2])); rows.push({ ...measure(g, 'MINE (own grid)'), pitch: g.pitch }); }
const refBmp = '/tmp/ref-v9.bmp';
execFileSync('sips', ['-s', 'format', 'bmp', process.argv[3], '--out', refBmp], { stdio: 'ignore' });
const g2 = onGrid(loadBMP(refBmp)); rows.push({ ...measure(g2, 'v9 (own grid)'), pitch: g2.pitch });
console.table(rows);
