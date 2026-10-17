// THE ONLY QUESTION THAT MATTERS: does our frame MATCH THE EXAMPLE FRAME, region by region, within tolerance?
//
// The example (reference/TARGET.webp, extracted into reference/TARGET.json) is the standard. It is not a mood board:
// it is a set of measured colours and shares per region, and this tool diffs our frame against it and prints, for
// every region, what the example has, what we have, and whether the gap is inside tolerance. Nothing in this project
// may be called done while a line here fails.
//
// Usage: node tools/match-check.mjs <canvas.json>
import { readFileSync } from 'node:fs';

const dumpPath = process.argv[2];
if (!dumpPath) { console.log('usage: node tools/match-check.mjs <canvas.json>'); process.exit(2); }
const T = JSON.parse(readFileSync('reference/TARGET.json', 'utf8'));
const d = JSON.parse(readFileSync(dumpPath, 'utf8'));
if (!d.px) { console.log('THE DUMP CARRIES NO PIXELS (keys: ' + Object.keys(d).join(', ') + ') - no verdict.'); process.exit(2); }
const a = d.px.split(',').map(Number), W = d.w, H = d.h;

// the same regions, as fractions of the frame, for both the example and our frame
const REGIONS = {
  sky:     [0.55, 0.02, 0.99, 0.42],
  tower:   [0.20, 0.02, 0.48, 0.60],
  midrise: [0.44, 0.38, 0.72, 0.62],
  road:    [0.10, 0.62, 0.95, 0.93],
  cars:    [0.25, 0.60, 0.85, 0.78],
};
const hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) { const dd = mx - mn; s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
    h = mx === r ? 60 * (((g - b) / dd) % 6) : mx === g ? 60 * ((b - r) / dd + 2) : 60 * ((r - g) / dd + 4); }
  if (h < 0) h += 360; return { h, s, l };
};
const hueGap = (x, y) => { let d2 = Math.abs(x - y); return d2 > 180 ? 360 - d2 : d2; };
const regionStats = (name) => {
  const [x0, y0, x1, y1] = REGIONS[name];
  const hist = new Map();
  let n = 0;
  for (let y = Math.floor(H * y0); y < Math.floor(H * y1); y += 1) {
    for (let x = Math.floor(W * x0); x < Math.floor(W * x1); x += 1) {
      const p = (y * W + x) * 3;
      const k = `${a[p]},${a[p + 1]},${a[p + 2]}`;
      hist.set(k, (hist.get(k) || 0) + 1); n += 1;
    }
  }
  const rows = [...hist.entries()].sort((u, v) => v[1] - u[1]).map(([k, c]) => ({ rgb: k.split(',').map(Number), share: c / n }));
  return { rows, n };
};

let fails = 0, passes = 0;
const line = (ok, region, what, want, got) => {
  if (ok) passes += 1; else fails += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${region.padEnd(7)} ${what.padEnd(30)} example ${String(want).padEnd(22)} ours ${got}`);
};

// 1. THE SKY: the example's blue is rgb(77,156,232) at 27% of that region, plus PURE WHITE clouds at 10%.
{
  const s = regionStats('sky');
  const blue = s.rows.find((r) => { const q = hsl(...r.rgb); return q.h > 190 && q.h < 250 && q.s > 0.35; });
  const want = T.sky[0].rgb, wq = hsl(...want);
  const gq = blue ? hsl(...blue.rgb) : null;
  line(!!blue && hueGap(wq.h, gq.h) <= 6 && Math.abs(wq.s - gq.s) <= 0.12, 'sky', 'the designed blue', `rgb(${want}) hue ${wq.h.toFixed(0)} sat ${wq.s.toFixed(2)}`, blue ? `rgb(${blue.rgb}) hue ${gq.h.toFixed(0)} sat ${gq.s.toFixed(2)}` : 'ABSENT');
  const white = s.rows.find((r) => r.rgb.every((v) => v > 240));
  line(!!white && white.share >= 0.03, 'sky', 'white clouds', '≥3% of the region', white ? `${(100 * white.share).toFixed(0)}%` : 'ABSENT');
}
// 2. THE TOWER: a dark plane (the example's own dark rgb(27,18,32)) with blue-glass windows; the DARK must dominate.
{
  const s = regionStats('tower');
  const dark = s.rows.filter((r) => Math.max(...r.rgb) < 90).reduce((n, r) => n + r.share, 0);
  // ONE DECIMAL, BECAUSE THE VERDICT USES THE RAW RATIO. At toFixed(0) a frame measuring 9.6% printed "10%" beside a
  // ≥10% bar and was reported FAIL - the number could not explain the verdict it sat next to (measured: the same
  // build gave 5/7 and 6/7 on two dumps, and the tower line was the difference). A share near its bar is printed
  // with enough resolution to show which side of it the frame is on.
  line(dark >= 0.35, 'tower', 'dark plane dominates', '≥35% of the region', `${(100 * dark).toFixed(1)}%`);
  const blue = s.rows.filter((r) => { const q = hsl(...r.rgb); return q.h > 200 && q.h < 250 && q.s > 0.25; }).reduce((n, r) => n + r.share, 0);
  line(blue >= 0.10, 'tower', 'blue-glass windows', '≥10% of the region', `${(100 * blue).toFixed(1)}%`);
}
// 3. THE MID-RISE: the checkerboard means BOTH a near-white and a dark blue at once.
{
  const s = regionStats('midrise');
  const white = s.rows.filter((r) => r.rgb.every((v) => v > 235)).reduce((n, r) => n + r.share, 0);
  const darkb = s.rows.filter((r) => { const q = hsl(...r.rgb); return q.h > 200 && q.h < 250; }).reduce((n, r) => n + r.share, 0);
  line(white >= 0.08 && darkb >= 0.08, 'midrise', 'checkerboard: white + dark blue', 'both ≥8%', `white ${(100 * white).toFixed(0)}% · blue ${(100 * darkb).toFixed(0)}%`);
}
// 4. THE ROAD: the example's asphalt is rgb(98,94,105) then rgb(74,70,80) - warm-neutral, mid-light.
{
  const s = regionStats('road');
  const want = T.road[0].rgb, wq = hsl(...want);
  const near = s.rows.map((r) => ({ ...r, q: hsl(...r.rgb) })).filter((r) => r.q.s < 0.15 && r.q.l > 0.2 && r.q.l < 0.55);
  const best = near[0];
  line(!!best && Math.abs(wq.l - best.q.l) <= 0.12 && Math.abs((want[0] - want[2]) - (best.rgb[0] - best.rgb[2])) <= 20, 'road', 'the asphalt tone', `rgb(${want}) light ${wq.l.toFixed(2)} warmth ${want[0] - want[2]}`, best ? `rgb(${best.rgb}) light ${best.q.l.toFixed(2)} warmth ${best.rgb[0] - best.rgb[2]}` : 'ABSENT');
}
// 5. THE CARS: the example's car region is domainted by road grey plus the cars' own darks and lights.
{
  const s = regionStats('cars');
  const grey = s.rows.filter((r) => { const q = hsl(...r.rgb); return q.s < 0.15; }).reduce((n, r) => n + r.share, 0);
  line(grey >= 0.30, 'cars', 'photo-kept surfaces', '≥30% neutral', `${(100 * grey).toFixed(0)}%`);
}
// A DRAWN PICTURE USES THE TABLE'S TONES. Measured (D20): the real frame uses 36 distinct entries, while the audit's
// flat-rectangle counterexample uses 7 and still passed every region-share line. A share is not a picture: a reduced
// photograph sprays across the palette, a handful of rectangles does not. Bar 24, the gap between 36 and 7.
{
  const toneSet = new Set();
  for (let i = 0; i < W * H; i += 1) toneSet.add(a[i * 3] + ',' + a[i * 3 + 1] + ',' + a[i * 3 + 2]);
  line(toneSet.size >= 24, 'frame', 'a DRAWN picture', 'the frame uses 24+ tones', `${toneSet.size} tones (a photographed yard: 30+)`);
}
console.log(`\n${passes} of ${passes + fails} lines match the example frame.`);
console.log(fails ? 'NOT THE EXAMPLE: build nothing on top of this until every line passes.' : 'MATCHES THE EXAMPLE FRAME, region by region.');
process.exit(fails ? 1 : 0);
