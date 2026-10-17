// THE PIECE'S OWN CHECK, and it asserts what the published rule ACTUALLY does, not a hope. An area mean erases a
// 1-px dark line; so does PixelOE's selection rule alone, because the line is a minority of the patch. The pipeline
// survives thin structure only through its FIRST stage (expansion), and this check says so in both directions: the
// asymmetric patch keeps its dark MASS, a 1-px line is lost by the rule and by the mean alike, and a 3-px line
// survives expansion + rule. A gate that claimed the 1-px case would be measuring the tuned rule it replaced.
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

// THE ASYMMETRIC PATCH — PixelOE's own published decision, and the case this piece got INVERTED. A 5x5 block of 24
// dark pixels at L=18 and ONE bright pixel at L=210 must output the DARK pixel: the patch's median (18) is below its
// mean (25.7), and maxi-med (192) is greater than med-mini (0), so PixelOE's find_pixel takes the minimum. The tuned
// rule that shipped was `wantBright = span > 24 && hi - mean > (mean - lo) * 1.35`, which is true here (184 > 10),
// so it kept the single BRIGHT pixel and erased the dark mass - the exact fault the piece exists to prevent.
//
//   def find_pixel(chunks):            # PixelOE 1.0.0, src/pixeloe/legacy/downscale/contrast_based.py
//       mid = chunks[..., chunks.shape[-1] // 2][..., None]
//       med, mu = median(chunks, 1), mean(chunks, 1)
//       maxi, mini = max(chunks, 1), min(chunks, 1)
//       output = mid
//       mini_loc = (med < mu) & (maxi - med > med - mini)
//       maxi_loc = (med > mu) & (maxi - med < med - mini)
//       output[mini_loc] = mini[mini_loc]; output[maxi_loc] = maxi[maxi_loc]
const patch = (fill, one = null) => {
  const w = 5, h = 5, px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i += 1) {
    const c = one && i === 12 ? one : fill;
    px[i * 4] = c; px[i * 4 + 1] = c; px[i * 4 + 2] = c; px[i * 4 + 3] = 255;
  }
  return { px, w, h };
};
const oneBlock = (fill, one) => {
  const p = patch(fill, one);
  const r = downscaleContrast(p.px, p.w, p.h, 5);
  return luma(r.px[0], r.px[1], r.px[2]);
};
const darkMass = oneBlock(18, 210);
const brightMass = oneBlock(210, 18);
const flat = oneBlock(120, null);
say(Math.round(darkMass) === 18, `a patch of 24 dark + 1 bright keeps the DARK mass (grey ${darkMass.toFixed(1)}, published rule 18)`);
say(Math.round(brightMass) === 210, `a patch of 24 bright + 1 dark keeps the BRIGHT mass (grey ${brightMass.toFixed(1)}, published rule 210)`);
say(Math.round(flat) === 120, `a flat patch keeps its centre value (grey ${flat.toFixed(1)})`);
// CHROMA IS THE PATCH MEDIAN, NOT THE PICKED PIXEL'S. PixelOE replaces L with the selection and BOTH chroma planes
// with the patch medians; copying one pixel's whole RGB (what shipped) is a different operation. With 12 pixels of
// (200,60,60), 12 of (60,60,200) and one near-white, the selection keeps the centre pixel's L (the dark blue one)
// while the a median comes from the blue set and the b median from the white pixel - so the output colour exists in
// NO pixel of the patch. That is impossible if you copy a pixel, which is exactly what this asserts.
{
  const w = 5, h = 5, px = new Uint8ClampedArray(w * h * 4);
  const cols = [];
  const set = (i, c) => { px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = 255; cols.push(c); };
  for (let i = 0; i < w * h; i += 1) set(i, i < 12 ? [200, 60, 60] : i < 24 ? [60, 60, 200] : [250, 250, 250]);
  const r = downscaleContrast(px, w, h, 5);
  const out = [r.px[0], r.px[1], r.px[2]];
  const gap = Math.min(...cols.map((c) => Math.max(...[0, 1, 2].map((k) => Math.abs(c[k] - out[k])))));
  say(gap > 40, `chroma comes from the patch medians: rgb(${out}) is ${gap} away from the nearest pixel colour, so it was composed, not copied`);
}

// THE PIPELINE IS TWO STAGES, AND THE ORDER IS THE POINT. PixelOE expands high-contrast structure BEFORE reducing.
// MEASURED, and this is the honest cost of the published rule: it selects the patch's median side, so a 1-px line
// that expansion widens to 3 source rows is 10 of 25 (or 5 of 25) pixels in the two blocks it straddles - still a
// bright median - and it is LOST. A line 3 px thick is widened to the whole 5-row block and KEPT. The old tuned rule
// kept any thin line by picking dark almost always; that is a different rule, and it is what changed the frame.
const thickLine = (thick) => {
  const W = 40, H = 40, px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const p = (y * W + x) * 4, dark = y >= 19 && y < 19 + thick;
    const c = dark ? dark : bright;
    px[p] = c[0]; px[p + 1] = c[1]; px[p + 2] = c[2]; px[p + 3] = 255;
  }
  const ex = expandContrast(px, W, H);
  const tall = (() => { let n = 0; for (let y = 0; y < H; y += 1) { const p = (y * W + 10) * 4; if (luma(ex[p], ex[p + 1], ex[p + 2]) < 110) n += 1; } return n; })();
  return { plain: countDark(downscaleContrast(px, W, H, 5).px, W / 5), pipeline: countDark(downscaleContrast(ex, W, H, 5).px, W / 5), tall };
};
const one = thickLine(1), three = thickLine(3);
say(meanDark <= 1, `an AREA MEAN erases the 1-px line (dark cells out of ${out.w}: ${meanDark})`);
say(one.tall === 3, `expansion widens the 1-px line to 3 source rows (${one.tall})`);
say(one.plain === 0 && one.pipeline === 0, `and the published rule still loses it (${one.pipeline} dark cells): it selects, it does not expand`);
say(three.pipeline >= 6, `a 3-px line survives expansion + rule (${three.pipeline} dark cells)`);
console.log(fails ? `\nTHE PIECE IS NOT CONFIRMED: ${fails} assertion(s) failed.`
  : `\nPIECE CONFIRMED: PixelOE's published rule (L selection, chroma medians) replaces the tuned rule - it keeps a dark MASS and a 3-px line, and it loses a 1-px line exactly as an area mean does (${one.pipeline} vs ${meanDark} cells).`);
process.exit(fails ? 1 : 0);
