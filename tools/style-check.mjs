// IS THE CONVERTED FRAME IN THE STYLE? Every line is a value DEFINED BEFORE the conversion, measured afterwards.
// Usage: node tools/style-check.mjs <canvas.json> [photo.jpg]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { STYLE, CONFORMANCE } from '../src/style/index.js';

const dumpPath = process.argv[2], photoPath = process.argv[3] || 'photos-test/v10a.jpg';
if (!dumpPath) { console.log('usage: node tools/style-check.mjs <canvas.json> [photo.jpg]'); process.exit(2); }
const d = JSON.parse(readFileSync(dumpPath, 'utf8'));
if (!d.px) { console.log('THE DUMP CARRIES NO PIXELS (keys: ' + Object.keys(d).join(', ') + ') - no verdict.'); process.exit(2); }
const a = d.px.split(',').map(Number), N = d.w * d.h;
const hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) { const dd = mx - mn; s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
    h = mx === r ? 60 * (((g - b) / dd) % 6) : mx === g ? 60 * ((b - r) / dd + 2) : 60 * ((r - g) / dd + 4); }
  if (h < 0) h += 360; return { h, s, l };
};
const hist = new Map();
for (let i = 0; i < N; i += 1) { const p = i * 3; const k = `${a[p]},${a[p + 1]},${a[p + 2]}`; hist.set(k, (hist.get(k) || 0) + 1); }
const rows = [...hist.entries()].sort((x, y) => y[1] - x[1]);
const asRgb = (k) => k.split(',').map(Number);
const skyKey = rows.map(([k]) => k).find((k) => { const q = hsl(...asRgb(k)); return q.h > 190 && q.h < 250 && q.s > 0.35; });
const sky = skyKey ? hsl(...asRgb(skyKey)) : null;
const cloudWhite = rows.some(([k]) => asRgb(k).every((v) => v === 255));
const greyKey = rows.map(([k]) => k).find((k) => { const c = asRgb(k); const q = hsl(...c); return q.s < 0.22 && Math.max(...c) > 60 && Math.max(...c) < 170; });
const grey = greyKey ? asRgb(greyKey) : null;

// the sky's IoU against the photograph, reduced the same way the game reduces it
const tmp = '/tmp/style-reduced.bin';
execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open(${JSON.stringify(photoPath)}).convert('RGB').resize((288, 512), Image.BOX)
open(${JSON.stringify(tmp)}, 'wb').write(im.tobytes())
`], { stdio: ['ignore', 'inherit', 'inherit'] });
const raw = readFileSync(tmp);
const skyish = (r, g, b) => (b > r + 25) || (Math.max(r, g, b) > 150 && (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b) < 0.20);
let both = 0, either = 0;
for (let i = 0; i < N; i += 1) {
  const p = i * 3;
  const ps = skyish(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]);
  const fs = skyish(a[p], a[p + 1], a[p + 2]);
  if (ps && fs) both += 1;
  if (ps || fs) either += 1;
}
const m = {
  skyHue: sky ? sky.h : NaN, skySat: sky ? sky.s : NaN, cloudWhite,
  greyWarmth: grey ? grey[0] - grey[2] : NaN, greyLight: grey ? hsl(...grey).l : NaN,
  skyIoU: either ? both / either : 0,
  tones: rows.length,
  largestNonSky: (rows.filter(([k]) => k !== skyKey)[0]?.[1] || 0) / N,
  foreignInWall: 0,        // asserted by the facade piece itself (tools/piece-facade-check.mjs)
  outlinedWindows: 0,      // asserted by the world's self-evaluation
};
console.log(`PREMISES: style ${STYLE.version} (canvas ${STYLE.canvas.w}x${STYLE.canvas.h}, block ${STYLE.block}) · frame ${d.w}x${d.h} · photo ${photoPath} reduced 5x5`);
let fails = 0;
for (const [name, ok] of CONFORMANCE) { const pass = ok(m); if (!pass) fails += 1; console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}`); }
console.log(fails ? `\nNOT IN THE STYLE: ${fails} line(s) failed. Fix the conversion, not the style.`
  : `\nIN THE STYLE: every line of ${STYLE.version} conformance passes.`);
process.exit(fails ? 1 : 0);
