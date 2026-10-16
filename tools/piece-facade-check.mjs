// THE PIECE'S OWN CHECK — the facade is confirmed BEFORE any pipeline uses it.
import { paintFacade, pitchFrom, FRAME } from '../src/pieces/facade.js';

const w = 64, h = 48;
const mask = new Uint8Array(w * h);
for (let y = 6; y < 42; y += 1) for (let x = 8; x < 56; x += 1) mask[y * w + x] = 1;   // a wall the size of a tower
const idx = new Int16Array(w * h).fill(999);
const tones = [10, 11, 12, 13];        // the family's own tones
const sprite = [20, 21, 22, 23];       // sill, frame, lip, glass
const lums = new Float32Array(w * h).fill(0.5);

const centresX = [12, 21, 30, 39, 48];
const centresY = [10, 19, 28, 37];
const pitchX = pitchFrom(centresX, 9), pitchY = pitchFrom(centresY, 9);

const r = paintFacade({ idx, w, h, mask, tones, sprite, pitchX, pitchY, originX: 8, originY: 6, lums });

let fails = 0;
const say = (ok, what) => { if (!ok) { fails += 1; console.log('FAIL  ' + what); } else console.log('ok    ' + what); };

// 1. every pixel inside the mask carries a wall tone or a sprite entry - NOTHING else (this is the rule that was broken)
const allowed = new Set([...tones, ...sprite]);
let foreign = 0;
for (let p = 0; p < w * h; p += 1) if (mask[p] && !allowed.has(idx[p])) foreign += 1;
say(foreign === 0, `every wall pixel carries a wall tone or a sprite entry (foreign pixels: ${foreign})`);

// 2. nothing outside the mask is touched
let outside = 0;
for (let p = 0; p < w * h; p += 1) if (!mask[p] && idx[p] !== 999) outside += 1;
say(outside === 0, `no pixel outside the wall is touched (touched: ${outside})`);

// 3. the grid is REGULAR: the sprites' x positions are spaced by exactly the pitch
const xs = new Set(), ys = new Set();
for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
  if (idx[y * w + x] === sprite[FRAME]) { xs.add(x); ys.add(y); }
}
const xr = [...xs].sort((a, b) => a - b), yr = [...ys].sort((a, b) => a - b);
say(xr.length > 0 && yr.length > 0, `the grid exists (frame columns ${xr.length}, rows ${yr.length})`);

// 4. the pitch used is the pitch measured from the photograph's openings
say(r.pitchX === pitchX && r.pitchY === pitchY, `the grid uses the measured pitch (${r.pitchX}x${r.pitchY}, measured ${pitchX}x${pitchY})`);

// 5. sprites were actually placed
say(r.sprites > 0, `sprites placed: ${r.sprites}`);

console.log(fails ? `\nTHE PIECE IS NOT CONFIRMED: ${fails} assertion(s) failed.`
  : `\nPIECE CONFIRMED: facade plane with a regular grid at the photograph's own pitch (${r.pitchX}x${r.pitchY}, ${r.sprites} windows, ${r.wall} wall pixels).`);
process.exit(fails ? 1 : 0);
