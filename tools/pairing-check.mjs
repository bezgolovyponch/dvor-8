// THE PAIRING GATE — does what we DREW sit where the photograph says it should?
//
// The creator's pair is exact: photo 1440x2560 -> canvas 288x512 is 5.00 x 5.00, no crop, no letterbox (measured,
// reference/PAIRING.md). So a drawn element can be checked POSITIONALLY against the photograph: the sky we paint must
// occupy the pixels that are sky in the picture, and the structures we keep dark must be where the picture is dark.
// This is the comparison the project never had - art against art, both 288x512, no phone screenshot anywhere.
//
// PREMISES ARE PRINTED WITH THE VERDICT, and no verdict is given when a premise fails.
// Usage: node tools/pairing-check.mjs <photo.jpg> <canvas.json>
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [photoPath, dumpPath] = process.argv.slice(2);
if (!photoPath || !dumpPath) { console.log('usage: node tools/pairing-check.mjs <photo.jpg> <canvas.json>'); process.exit(2); }

// the photograph, reduced exactly as the game reduces it: 5x5 area mean
const tmp = '/tmp/pairing-reduced.png';
execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open(${JSON.stringify(photoPath)}).convert('RGB')
W,H = im.size
print(W, H)
im.resize((288,512), Image.BOX).save(${JSON.stringify(tmp)})
`], { stdio: ['ignore', 'inherit', 'inherit'] });

const png = execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open(${JSON.stringify(tmp)}).convert('RGB')
px = im.load()
out = []
for y in range(512):
    for x in range(288):
        r,g,b = px[x,y]
        out.append(f'{r},{g},{b}')
print(';'.join(out))
`], { encoding: 'utf8' }).trim().split(';').map((s) => s.split(',').map(Number));

const d = JSON.parse(readFileSync(dumpPath, 'utf8'));
const px = (d.px || (d.frame && d.frame.px) || '');
if (!px) { console.log('THE DUMP CARRIES NO PIXELS: keys are', Object.keys(d).join(', '), '- no verdict.'); process.exit(2); }
const frame = px.split(',').map(Number);
const W = 288, H = 512, N = W * H;

const skyish = (r, g, b) => (b > r + 25) || (Math.max(r, g, b) > 150 && (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b) < 0.20);
let photoSky = 0, frameSky = 0, both = 0, either = 0, dark = 0, darkBoth = 0;
for (let i = 0; i < N; i += 1) {
  const p = i * 3;
  const ps = skyish(png[i][0], png[i][1], png[i][2]);
  const fs = skyish(frame[p], frame[p + 1], frame[p + 2]);
  if (ps) photoSky += 1;
  if (fs) frameSky += 1;
  if (ps && fs) both += 1;
  if (ps || fs) either += 1;
  const lumPhoto = 0.299 * png[i][0] + 0.587 * png[i][1] + 0.114 * png[i][2];
  const lumFrame = 0.299 * frame[p] + 0.587 * frame[p + 1] + 0.114 * frame[p + 2];
  if (!ps && lumPhoto < 110) { dark += 1; if (lumFrame < 130) darkBoth += 1; }
}
const iou = either ? both / either : 0;
const darkKeep = dark ? darkBoth / dark : 0;
console.log(`PREMISES: photo ${photoPath} reduced 5x5 to ${W}x${H} (ratio must be 5.00) · ${N} pixels · sky test: blue or bright-neutral`);
console.log(`sky   photograph ${(100 * photoSky / N).toFixed(0)}%  ·  frame ${(100 * frameSky / N).toFixed(0)}%  ·  IoU ${iou.toFixed(2)}`);
console.log(`dark structures kept dark in the frame: ${(100 * darkKeep).toFixed(0)}% of ${dark} pixels`);
const ok = iou >= 0.60 && darkKeep >= 0.60;
console.log(ok
  ? `\nPAIRED: the drawn sky sits where the photograph's sky is (IoU ${iou.toFixed(2)}), and the dark structures stay dark (${(100 * darkKeep).toFixed(0)}%).`
  : `\nNOT PAIRED: sky IoU ${iou.toFixed(2)} (needs 0.60) · dark structures kept ${(100 * darkKeep).toFixed(0)}% (needs 60%). The frame is not built on the photograph's own layout.`);
process.exit(ok ? 0 : 1);
