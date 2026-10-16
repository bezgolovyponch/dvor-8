// THE PIECE'S OWN CHECK: a 1-px dark line must SURVIVE a 5x reduction. An area mean erases it - that is the fault.
import { downscaleContrast, expandContrast } from '../src/pieces/downscale.js';
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

const w = 40, h = 40, block = 5;
const bright = [214, 212, 206], dark = [40, 36, 48];
const rgba = new Uint8ClampedArray(w * h * 4);
for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
  const p = (y * w + x) * 4;
  const c = (y === 20) ? dark : bright;                 // one dark line, one pixel tall
  rgba[p] = c[0]; rgba[p + 1] = c[1]; rgba[p + 2] = c[2]; rgba[p + 3] = 255;
}
// what an AREA MEAN gives (the current build) versus what the retrieved logic gives
const mean = new Uint8Array((w / block) * (h / block) * 4);
for (let by = 0; by < h / block; by += 1) for (let bx = 0; bx < w / block; bx += 1) {
  let r = 0, g = 0, b = 0;
  for (let y = 0; y < block; y += 1) for (let x = 0; x < block; x += 1) {
    const p = ((by * block + y) * w + (bx * block + x)) * 4;
    r += rgba[p]; g += rgba[p + 1]; b += rgba[p + 2];
  }
  const o = (by * (w / block) + bx) * 4;
  mean[o] = r / (block * block); mean[o + 1] = g / (block * block); mean[o + 2] = b / (block * block);
}
const countDark = (arr, ow) => { let n = 0; for (let i = 0; i < arr.length; i += 4) if (luma(arr[i], arr[i + 1], arr[i + 2]) < 110) n += 1; return n; };
const meanDark = countDark(mean, w / block);
const expanded = expandContrast(rgba, w, h);
const out = downscaleContrast(rgba, w, h, block);
const expandedOut = downscaleContrast(expanded, w, h, block);
const pickDark = countDark(out.px, out.w);
const pickDarkExpanded = countDark(expandedOut.px, expandedOut.w);

let fails = 0;
const say = (ok, what) => { if (!ok) { fails += 1; console.log('FAIL  ' + what); } else console.log('ok    ' + what); };
say(meanDark <= 1, `an AREA MEAN erases the line (dark cells out of ${out.w}: ${meanDark})`);
say(pickDark >= 6, `the retrieved logic KEEPS it (dark cells: ${pickDark})`);
say(pickDarkExpanded >= pickDark, `pre-expansion keeps it at least as well (${pickDarkExpanded} vs ${pickDark})`);
say(out.picked.dark > 0, `skewed-dark blocks choose their darkest pixel (${out.picked.dark} blocks, bright ${out.picked.bright}, mean ${out.picked.mean})`);
console.log(fails ? `\nTHE PIECE IS NOT CONFIRMED: ${fails} assertion(s) failed.`
  : `\nPIECE CONFIRMED: contrast-aware downscale keeps a 1-px line that an area mean erases (${pickDark} vs ${meanDark} cells).`);
process.exit(fails ? 1 : 0);
