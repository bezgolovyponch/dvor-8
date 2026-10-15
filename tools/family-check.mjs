// THE COLOUR-COLLAPSE GATE — the measurement nobody had.
//
// The creator kept seeing a blue mush while every gate passed, because no gate asked the only question that matters
// about colour: DOES THE FRAME USE THE FAMILIES THE PHOTOGRAPH USES? The suite checks behaviour, flatness checks
// surfaces, window counts check structure - and a frame painted entirely in the sky family passed all of them.
//
// The palette has eight families with declared hues (flat.js RAMPS). This tool classifies every colour in the drawn
// frame into its family, prints the shares, and FAILS when one family owns more than HALF the frame. A street is not
// 90% sky-blue; a photograph's yard is stone, earth, foliage, metal and warm, with sky only where the sky is.
import { readFileSync } from 'node:fs';
import { RAMPS } from '../src/flat.js';

const file = process.argv[2];
if (!file) { console.log('usage: node tools/family-check.mjs <canvas.json>'); process.exit(2); }
const d = JSON.parse(readFileSync(file, 'utf8'));
const a = d.px.split(',').map(Number), W = d.w, H = d.h;

const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn;
  const s = mx ? dd / mx : 0;
  let h = 0;
  if (dd) {
    if (mx === r) h = 60 * (((g - b) / dd) % 6);
    else if (mx === g) h = 60 * ((b - r) / dd + 2);
    else h = 60 * ((r - g) / dd + 4);
  }
  if (h < 0) h += 360;
  return { h, s };
};
const familyOf = (r, g, b) => {
  const { h, s } = hsv(r, g, b);
  let best = RAMPS[0], bd = 1e9;
  for (const R of RAMPS) {
    let dh = Math.abs(R.hue - h); if (dh > 180) dh = 360 - dh;
    const dist = dh / 180 * 1.6 + Math.abs((R.sat || 0) - s);
    if (dist < bd) { bd = dist; best = R; }
  }
  return best.name;
};

const counts = new Map();
for (let i = 0; i < W * H; i += 1) {
  const p = i * 3;
  const f = familyOf(a[p], a[p + 1], a[p + 2]);
  counts.set(f, (counts.get(f) || 0) + 1);
}
const total = W * H;
const rows = [...counts.entries()].sort((x, y) => y[1] - x[1]);
console.log('FAMILIES IN THE DRAWN FRAME\n');
for (const [f, n] of rows) console.log(`${((100 * n) / total).toFixed(0).padStart(3)}%  ${f}`);
const worst = rows[0];
const share = worst[1] / total;
if (share > 0.5) {
  console.log(`\nCOLLAPSE: "${worst[0]}" owns ${(100 * share).toFixed(0)}% of the frame.`);
  console.log('A frame is not a drawing when one family owns it: check the sky mask, the family decision (entryFor)');
  console.log('and every pass that paints after them. This is the gate the blue mush passed for weeks.');
  process.exit(1);
}
console.log(`\nno family owns more than half the frame (largest: ${worst[0]} at ${(100 * share).toFixed(0)}%).`);
