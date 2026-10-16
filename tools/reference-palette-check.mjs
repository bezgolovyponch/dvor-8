// THE REFERENCE-PALETTE GATE — the creator's question "why aren't you comparing it to the requested frame?" as a check.
//
// It reads the ACCEPTED frame (reference/v10a-target-hi.webp) and extracts the colours that define its identity by
// role - the sky, the clouds, the outline, the road greys - then measures the same roles in OUR frame and reports the
// distance. This is a comparison of a frame against the accepted frame, which is what "matching the design" means;
// the roles are DERIVED from the reference every run, never typed in here.
//
// PREMISES PRINTED WITH THE VERDICT. No verdict if the reference cannot be read.
// Usage: node tools/reference-palette-check.mjs <canvas.json> [reference-image]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const dumpPath = process.argv[2];
const refPath = process.argv[3] || 'reference/v10a-target-hi.webp';
if (!dumpPath) { console.log('usage: node tools/reference-palette-check.mjs <canvas.json> [reference-image]'); process.exit(2); }

const rgb2hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const dd = mx - mn;
    s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
    if (mx === r) h = 60 * (((g - b) / dd) % 6);
    else if (mx === g) h = 60 * ((b - r) / dd + 2);
    else h = 60 * ((r - g) / dd + 4);
  }
  if (h < 0) h += 360;
  return { h, s, l };
};
const hueGap = (a, b) => { let d = Math.abs(a - b); return d > 180 ? 360 - d : d; };

// ---- the ACCEPTED frame's roles, extracted from the reference image in python and read back as JSON ----
const refJson = execFileSync('python3', ['-c', `
import json, sys
from PIL import Image
from collections import Counter
im = Image.open(${JSON.stringify(refPath)}).convert('RGB')
W, H = im.size
px = im.load()
c = Counter()
# the art area: skip the caption strip at the bottom and the header row at the top
for y in range(int(H*0.10), int(H*0.86)):
    for x in range(0, W):
        c[px[x, y]] += 1
def hsl(r, g, b):
    r, g, b = r/255, g/255, b/255
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx+mn)/2
    s = 0 if mx == mn else (mx-mn)/(2-mx-mn) if l > 0.5 else (mx-mn)/(mx+mn)
    h = 0
    if mx != mn:
        d = mx-mn
        h = 60*(((g-b)/d) % 6) if mx == r else 60*((b-r)/d+2) if mx == g else 60*((r-g)/d+4)
    return (h % 360, s, l)
tops = [(col, n) for col, n in c.most_common(400)]
sky = max((t for t in tops if hsl(*t[0])[0] > 190 and hsl(*t[0])[0] < 250 and hsl(*t[0])[1] > 0.35), key=lambda t: t[1])
cloud = max((t for t in tops if min(t[0]) > 225), key=lambda t: t[1], default=None)
dark = max((t for t in tops if max(t[0]) < 60), key=lambda t: t[1], default=None)
greys = [t for t in tops if 60 < max(t[0]) < 170 and hsl(*t[0])[1] < 0.22][:5]
print(json.dumps({
  'sky': list(sky[0]), 'cloud': list(cloud[0]) if cloud else None,
  'dark': list(dark[0]) if dark else None, 'greys': [list(g[0]) for g in greys],
  'greyMean': [round(sum(g[0][i] for g in greys)/len(greys)) for i in range(3)] if greys else None,
  'size': [W, H],
}))
`], { encoding: 'utf8' });
const ref = JSON.parse(refJson);

// ---- OUR frame's roles ----
const d = JSON.parse(readFileSync(dumpPath, 'utf8'));
const px = (d.px || '');
if (!px) { console.log('THE DUMP CARRIES NO PIXELS (keys: ' + Object.keys(d).join(', ') + ') - no verdict.'); process.exit(2); }
const a = px.split(',').map(Number);
const N = d.w * d.h;
const hist = new Map();
for (let i = 0; i < N; i += 1) { const p = i * 3; const k = `${a[p]},${a[p + 1]},${a[p + 2]}`; hist.set(k, (hist.get(k) || 0) + 1); }
const rows = [...hist.entries()].sort((x, y) => y[1] - x[1]);
const mineSky = rows.map(([c2]) => c2.split(',').map(Number)).find((c2) => { const q = rgb2hsl(...c2); return q.h > 190 && q.h < 250 && q.s > 0.35; });
const mineCloud = rows.map(([c2]) => c2.split(',').map(Number)).find((c2) => Math.min(...c2) > 225);
const mineDark = rows.map(([c2]) => c2.split(',').map(Number)).find((c2) => Math.max(...c2) < 60);
// THE GREYS: the most common mid tone with little colour in it - the road, the concrete, the facades. The accepted
// frame's greys are WARM (rgb(98,94,105), rgb(74,70,80): red and blue close, blue barely ahead); ours were cold
// (rgb(87,90,107): blue clearly ahead of red), which is the "everything is grey-blue" the creator keeps seeing.
const mineGrey = rows.map(([c2]) => c2.split(',').map(Number)).find((c2) => {
  const q = rgb2hsl(...c2);
  return q.s < 0.22 && Math.max(...c2) > 60 && Math.max(...c2) < 170;
});

console.log(`PREMISES: reference ${refPath} (${ref.size[0]}x${ref.size[1]}), roles derived from it; frame ${dumpPath} (${d.w}x${d.h}); sky = the most common saturated blue; cloud = the most common near-white; dark = the most common near-black.`);
const show = (label, r, m) => {
  if (!r || !m) { console.log(`${label.padEnd(6)} reference ${r ? r.join(',') : '-'} · frame ${m ? m.join(',') : '-'}  (a role is missing: no verdict on it)`); return null; }
  const hr = rgb2hsl(...r), hm = rgb2hsl(...m);
  console.log(`${label.padEnd(6)} reference rgb(${r.join(',')}) · frame rgb(${m.join(',')}) · hue gap ${hueGap(hr.h, hm.h).toFixed(0)}° · sat ${hr.s.toFixed(2)} -> ${hm.s.toFixed(2)} · light ${hr.l.toFixed(2)} -> ${hm.l.toFixed(2)}`);
  return { hue: hueGap(hr.h, hm.h), sat: Math.abs(hr.s - hm.s), light: Math.abs(hr.l - hm.l) };
};
const s1 = show('sky', ref.sky, mineSky);
const s2 = show('cloud', ref.cloud, mineCloud);
const s3 = show('dark', ref.dark, mineDark);
let greyOk = true;
if (ref.greyMean && mineGrey) {
  const warmRef = ref.greyMean[0] - ref.greyMean[2];
  const warmMine = mineGrey[0] - mineGrey[2];
  const gap = Math.abs(warmRef - warmMine) / 255;
  const hr = rgb2hsl(...ref.greyMean), hm = rgb2hsl(...mineGrey);
  console.log(`grey   reference rgb(${ref.greyMean.join(',')}) (warmth ${warmRef}) · frame rgb(${mineGrey.join(',')}) (warmth ${warmMine}) · hue gap ${hueGap(hr.h, hm.h).toFixed(0)}° · warmth gap ${gap.toFixed(3)}`);
  // a grey must match in warmth, in hue and in lightness: rgb(54,55,68) is not rgb(89,85,95) - it is colder,
  // bluer and darker, and the eye reads that instantly as "the frame is grey-blue".
  greyOk = gap <= 0.055 && hueGap(hr.h, hm.h) <= 15 && Math.abs(hr.l - hm.l) <= 0.10;
}
if (!s1 || !s2) { console.log('\nNO VERDICT: the reference or the frame is missing a defining role.'); process.exit(2); }
const ok = s1.hue <= 8 && s1.sat <= 0.18 && s2.light <= 0.10 && (!s3 || s3.light <= 0.12) && greyOk;
console.log(ok
  ? '\nMATCHES THE ACCEPTED FRAME: the sky, the clouds and the darks are the accepted frame\'s own tones.'
  : `\nDOES NOT MATCH: ${s1.hue > 8 ? `sky hue off by ${s1.hue.toFixed(0)}°` : ''}${s1.sat > 0.18 ? ` sky saturation off by ${s1.sat.toFixed(2)}` : ''}${s2.light > 0.10 ? ` cloud lightness off by ${s2.light.toFixed(2)}` : ''}${greyOk ? '' : ' the greys are too cold, too blue or too dark'}. Fix the palette entries, not the renderer.`);
process.exit(ok ? 0 : 1);
