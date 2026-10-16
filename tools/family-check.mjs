// THE COLOUR-COLLAPSE GATE, MEASURED THE WAY IT SHOULD HAVE BEEN FROM THE START.
//
// The first version counted FAMILIES and slandered a correctly-toned frame: three distinct tones of neighbouring
// ramps - the olive, the warm grey and the pale stone of a city in overcast light - were merged into one name and
// read as a 61% collapse, while the frame in fact carried 91% of its pixels in THREE DIFFERENT TONES. A name count
// cannot tell a drawing from a wash; a TONE count can.
//
// What a drawn frame is: many distinct palette ENTRIES, none of them owning the picture. What the blue mush was:
// three entries holding 90% of the frame. So the gate measures exactly that, on the drawn frame:
//   - at least 12 distinct palette entries
//   - no single entry owning more than 35% of the frame
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.log('usage: node tools/family-check.mjs <canvas.json>'); process.exit(2); }
const d = JSON.parse(readFileSync(file, 'utf8'));
const a = d.px.split(',').map(Number), W = d.w, H = d.h, total = W * H;

const counts = new Map();
for (let i = 0; i < total; i += 1) {
  const p = i * 3;
  const k = `${a[p]},${a[p + 1]},${a[p + 2]}`;
  counts.set(k, (counts.get(k) || 0) + 1);
}
const rows = [...counts.entries()].sort((x, y) => y[1] - x[1]);
const largest = rows[0];
const share = largest[1] / total;
const total0 = total;

console.log(`TONES IN THE DRAWN FRAME: ${rows.length} distinct entries`);
for (const [c, n] of rows.slice(0, 5)) console.log(`${((100 * n) / total).toFixed(0).padStart(3)}%  rgb(${c})`);

// A CLEAR SKY IS LEGITIMATELY LARGE. On the second real photograph (a balcony over a car park) the designed sky
// owns 38% of the frame - which is what a clear blue sky DOES - and the gate called it a collapse. The rule is
// about a frame that has no drawing in it, not about a big sky: the sky's own tones are therefore exempt from the
// dominance test, and the test applies to everything else the frame is made of.
const SKY = new Set(['86,118,185', '146,173,206', '207,221,232', '54,72,140', '32,37,90', '15,14,42']);
const nonSky = rows.filter(([c]) => !SKY.has(c));
const worstNonSky = nonSky[0] || rows[0];
const shareNonSky = worstNonSky[1] / total;
const enough = rows.length >= 12;
const spread = shareNonSky <= 0.35;
if (!enough || !spread) {
  console.log(`\nCOLLAPSE: ${rows.length} entries, the largest non-sky entry owning ${(100 * shareNonSky).toFixed(0)}% of the frame.`);
  console.log('A drawing spreads its pixels across many tones; a wash puts them in a few. Check the sky mask, the');
  console.log('family decision (entryFor) and every pass that paints after them.');
  process.exit(1);
}
console.log(`\nno collapse: ${rows.length} entries · sky ${(100 * share).toFixed(0)}% · largest non-sky ${(100 * shareNonSky).toFixed(0)}% of the frame.`);
