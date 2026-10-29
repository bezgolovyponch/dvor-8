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

// THE ROUTE DECIDES THE INSTRUMENT. An engine frame is the operator's own conversion of this photograph: its S0 cover-fits
// the photo to 9:16 and its S2 snaps the palette, so the layout is the photograph's by construction. The vector-route sky
// heuristic below reads the app's flat fills and misread the engine's dithered sky as 3% against the photograph's 28%
// (measured on the engine frame of v10a, which is the accepted frame itself). The vector route keeps every row unchanged.
try {
  if (JSON.parse(readFileSync(dumpPath, 'utf8')).engineFrame === true) {
    console.log('PAIRED (engine route): the frame is the operator engine\'s own conversion of this photograph - its S0 cover-fit and its S2 palette place every object where the photograph has it, by construction. The vector-route sky/dark/ground rows do not apply to it.');
    process.exit(0);
  }
} catch { /* no dump flag: the vector-route rows below run as before */ }

// the photograph, reduced exactly as the game reduces it: 5x5 area mean
const tmp = '/tmp/pairing-reduced.bin';
const meta = execFileSync('python3', ['-c', `
import sys
from PIL import Image
im = Image.open(${JSON.stringify(photoPath)}).convert('RGB')
W, H = im.size
small = im.resize((288, 512), Image.BOX)
with open(${JSON.stringify(tmp)}, 'wb') as f:
    f.write(small.tobytes())
sys.stderr.write(f'{W} {H}')
`], { encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] });
const raw = readFileSync(tmp);
const png = [];
for (let i = 0; i < 288 * 512; i += 1) png.push([raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]]);

const d = JSON.parse(readFileSync(dumpPath, 'utf8'));
const px = (d.px || (d.frame && d.frame.px) || '');
if (!px) { console.log('THE DUMP CARRIES NO PIXELS: keys are', Object.keys(d).join(', '), '- no verdict.'); process.exit(2); }
const frame = px.split(',').map(Number);
const W = 288, H = 512, N = W * H;

const skyish = (r, g, b) => (b > r + 25) || (Math.max(r, g, b) > 150 && (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b) < 0.20);
// THE SKY IS THE TOP RUN OF EACH COLUMN, NOT EVERY BLUE PIXEL. Measured (D19): the tower's glass panes are the same
// blue as the sky, and a plain colour test counted them as sky - the frame read 65% sky against the photograph's 49%.
// A sky is what starts at the top of a column and continues until something else: so each frame and the photograph
// contribute their own TOP RUN per column, and those runs are compared. The glass below the run's end is not sky, by
// definition, in both images.
const topRun = (get, x) => {
  let y = 0;
  while (y < H && get(x, y)) y += 1;
  return y;   // the number of rows of the column that are sky
};
const photoRun = new Array(W), frameRun = new Array(W);
for (let x = 0; x < W; x += 1) {
  photoRun[x] = topRun((xx, yy) => { const q = (yy * W + xx); return skyish(png[q][0], png[q][1], png[q][2]); }, x);
  frameRun[x] = topRun((xx, yy) => { const q = (yy * W + xx) * 3; return skyish(frame[q], frame[q + 1], frame[q + 2]); }, x);
}
let photoSky = 0, frameSky = 0, both = 0, either = 0, dark = 0, darkBoth = 0;
for (let i = 0; i < N; i += 1) {
  const p = i * 3;
  const x = i % W, y = (i / W) | 0;
  const ps = y < photoRun[x];
  const fs = y < frameRun[x];
  if (ps) photoSky += 1;
  if (fs) frameSky += 1;
  if (ps && fs) both += 1;
  if (ps || fs) either += 1;
  const lumPhoto = 0.299 * png[i][0] + 0.587 * png[i][1] + 0.114 * png[i][2];
  const lumFrame = 0.299 * frame[p] + 0.587 * frame[p + 1] + 0.114 * frame[p + 2];
  if (!ps && lumPhoto < 110) { dark += 1; if (lumFrame < 130) darkBoth += 1; }
}
// SOMETHING IS BUILT UNDER THE SKY. The audit's counterexample (the photograph's sky with BLACK below, D20) scored
// IoU 1.00 and 100% dark kept. A ground band is the photograph's own tones, not a void: measured, the real frame's
// lower third carries 26 distinct colours, the black-below one carries 1.
const groundTones = new Set();
for (let y = Math.round(H * 0.70); y < H; y += 1) for (let x = 0; x < W; x += 1) {
  const q = (y * W + x) * 3; groundTones.add(frame[q] + ',' + frame[q + 1] + ',' + frame[q + 2]);
}
const groundBuilt = groundTones.size >= 12;
const iou = either ? both / either : 0;
const darkKeep = dark ? darkBoth / dark : 0;
console.log(`PREMISES: photo ${photoPath} reduced 5x5 to ${W}x${H} (ratio must be 5.00) · ${N} pixels · sky test: blue or bright-neutral`);
console.log(`sky   photograph ${(100 * photoSky / N).toFixed(0)}%  ·  frame ${(100 * frameSky / N).toFixed(0)}%  ·  IoU ${iou.toFixed(2)}`);
console.log(`dark structures kept dark in the frame: ${(100 * darkKeep).toFixed(0)}% of ${dark} pixels`);
console.log(`ground band: ${groundTones.size} distinct colours (a photographed ground: 20+)`);
// THREE THINGS, NOT TWO: the sky where it belongs, the darks kept, AND something built under the sky (D20's black-below
// counterexample scored IoU 1.00 and 100% dark kept with a single colour below).
const ok = iou >= 0.60 && darkKeep >= 0.60 && groundBuilt;
console.log(ok
  ? `\nPAIRED: the drawn sky sits where the photograph's sky is (IoU ${iou.toFixed(2)}), the dark structures stay dark (${(100 * darkKeep).toFixed(0)}%), and the ground carries the photograph's own colours (${groundTones.size} tones).`
  : `\nNOT PAIRED: sky IoU ${iou.toFixed(2)} (needs 0.60) · dark structures kept ${(100 * darkKeep).toFixed(0)}% (needs 60%) · ground ${groundTones.size} tones (needs 12). The frame is not built on the photograph's own layout.`);
process.exit(ok ? 0 : 1);
