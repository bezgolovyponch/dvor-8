// THE CONCEPT AUDIT — the target's STYLE, measured as rules, not photo-by-photo.
//
// The flaw this fixes: comparing one photo to one artefact gives a number without an idea. The target is a published
// product LOOK, and a look is a set of measurable rules: how many tones the art uses, how warm it goes, how much
// high-frequency detail it carries (dither, mullions, glints), how thick its outlines are, how the sky is textured.
// This tool extracts those rules from ANY image and prints them side by side, so the engine can be raised to the
// concept - and so a change can be judged against the concept, not against a single frame.
//
//   node tools/concept-audit.mjs <target-image> <candidate-image> [x0,y0,x1,y1]
//
// The band defaults to the HUD-free centre, so the product screenshot's HUD is not measured as art.
import { execFileSync } from 'node:child_process';

const [target, cand, band] = process.argv.slice(2);
if (!target || !cand) { console.log('usage: node tools/concept-audit.mjs <target-image> <candidate-image> [band]'); process.exit(2); }
const py = String.raw`
import sys, json, math
from PIL import Image
band = [float(v) for v in (sys.argv[3].split(',') if len(sys.argv) > 3 else ['0.10','0.22','0.90','0.72'])]
# EVERY MEASURE IS AT THE ART'S OWN SIZE: a 547x580 crop and a 231x256 crop cannot be compared on adjacent-pixel
# differences (measured: the target read 27 and the candidate 51 purely from the scale). Both are resized to 288x512.
def load(p):
    im = Image.open(p).convert('RGB')
    w, h = im.size
    x0, y0, x1, y1 = int(w*band[0]), int(h*band[1]), int(w*band[2]), int(h*band[3])
    return im.crop((x0, y0, x1, y1)).resize((288, 512), Image.LANCZOS)
def metrics(im):
    W, H = im.size
    px = list(im.getdata())
    n = len(px)
    # 1 TONES: quantise to a 6x6x6 cube and count the cells that carry at least 0.2% of the pixels
    from collections import Counter
    cells = Counter(((r*6)//256, (g*6)//256, (b*6)//256) for r, g, b in px)
    tones = sum(1 for v in cells.values() if v >= n*0.002)
    # 2 WARMTH: pixels that are warm (R>B, saturated) - the autumn foliage, the lit shop window
    warm = sum(1 for r, g, b in px if r > b + 18 and r > 60 and (max(r,g,b)-min(r,g,b)) > 30)
    # 3 DETAIL: mean absolute difference to the right and the neighbour below - dither, mullions and glints all raise it
    hi = 0.0; cnt = 0
    for y in range(H):
        for x in range(W-1):
            i = y*W + x
            a, b2 = px[i], px[i+1]
            hi += abs(a[0]-b2[0]) + abs(a[1]-b2[1]) + abs(a[2]-b2[2]); cnt += 1
    # 4 SKY TEXTURE: the top third's high-frequency energy (the dither/stipple of the clouds)
    sky = 0.0; sc = 0
    for y in range(0, H//3):
        for x in range(W-1):
            i = y*W + x
            a, b2 = px[i], px[i+1]
            sky += abs(a[0]-b2[0]) + abs(a[1]-b2[1]) + abs(a[2]-b2[2]); sc += 1
    return {'size': [W, H], 'tones': tones, 'warmPct': 100*warm/n, 'detail': hi/cnt, 'skyDetail': sky/sc,
            'coloursRaw': len(set(px))}
out = {'target': metrics(load(sys.argv[1])), 'candidate': metrics(load(sys.argv[2]))}
print(json.dumps(out))
`;
let r;
const args = ['-c', py, target, cand]; if (band) args.push(band);
try { r = JSON.parse(execFileSync('python3', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })); }
catch (e) { console.log('NOT MEASURED', String(e.message).slice(0, 200)); process.exit(2); }
const t = r.target, c = r.candidate;
const row = (k, label, fmt = (v) => v.toFixed(2)) => console.log(`  ${label.padEnd(26)} target ${fmt(t[k]).padStart(9)}   ours ${fmt(c[k]).padStart(9)}   ${c[k] >= t[k] * 0.8 ? 'ok' : 'BELOW'}`);
console.log('THE CONCEPT — the target look as rules, not one frame');
console.log(`  target ${t.size.join('x')} · candidate ${c.size.join('x')} · HUD-free band`);
row('tones', 'tones in use (>=0.2%)', (v) => String(v));
row('coloursRaw', 'raw distinct colours', (v) => String(v));
row('warmPct', 'warm pixels %', (v) => v.toFixed(2));
row('detail', 'detail (adjacent diff)', (v) => v.toFixed(2));
row('skyDetail', 'sky detail (top third)', (v) => v.toFixed(2));
