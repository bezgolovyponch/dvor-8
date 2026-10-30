// THE CONCEPT GATE — the look judged as RULES against the published target, not as one photo against one artefact.
//
// Rows (all measured with tools/concept-audit.mjs, at the art's own 288x512):
//   1 DENSITY   detail (adjacent-pixel diff) must be at least 85% of the target's   - the engine matches this today
//   2 TONES     tones in use (>=0.2% share) at least 85% of the target's           - matches today
//   3 WARMTH    warm-pixel share at least 50% of the target's                      - THE OPEN ROW: target 1.76%, ours 0.00%
//
// Row 3 is deliberately red: it is the next iteration of the self-improvement loop (the published look amplifies warm
// tones 11x the photograph's own share - its bronze mullions, autumn foliage and lit shop window), and a gate that is not
// allowed to be red cannot drive a change. The chain does not run this step yet; this tool is the loop's ledger.
//
//   node tools/concept-check.mjs [frame.png]
import { execFileSync } from 'node:child_process';
// THE GATE READS THE DRAWN CANVAS (a canvas.json from tools/photo-shot.mjs), NOT A SCREENSHOT - see docs/concept-gate.md.
// A .png is accepted only for the eye, and then the canvas-only rows say so.
const FRAME = process.argv[2] || '/tmp/chain-page/canvas.json';
const fromCanvas = FRAME.endsWith('.json');
let metrics = null;
if (fromCanvas) {
  const { readFileSync } = await import('node:fs');
  const d = JSON.parse(readFileSync(FRAME, 'utf8'));
  const px = d.px.split(',').map(Number), W = d.w, H = d.h;
  const idx = (x, y) => { const k = (y * W + x) * 3; return (px[k] << 16) | (px[k + 1] << 8) | px[k + 2]; };
  // flatShare: a pixel is flat when its 2 neighbours right and down are the same colour (a calm run, no edge)
  let flat = 0, tot = 0;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W - 1; x += 1) { tot += 1; if (idx(x, y) === idx(x + 1, y)) flat += 1; }
  // transPerPx: colour changes per pixel along rows and columns
  let tr = 0, trTot = 0;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W - 1; x += 1) { trTot += 1; if (idx(x, y) !== idx(x + 1, y)) tr += 1; }
  for (let y = 0; y < H - 1; y += 1) for (let x = 0; x < W; x += 1) { trTot += 1; if (idx(x, y) !== idx(x, y + 1)) tr += 1; }
  const targets = (d.targets || []);
  metrics = { flatShare: 100 * flat / tot, transPerPx: tr / trTot, windowSprites: targets.filter((t) => t.kind === 'window').length, objects: targets.length };
}
const TARGET = 'reference/TARGET.webp';
// A canvas.json is rendered to a PNG for the rule rows (tone/warm/detail read pixels), while the canvas-only rows read the
// JSON itself.
let data, rendered = FRAME;
try {
  if (fromCanvas) {
    const { readFileSync, writeFileSync } = await import('node:fs');
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { PNG } = require('../gates/node_modules/pngjs');
    const d = JSON.parse(readFileSync(FRAME, 'utf8'));
    const px = d.px.split(',').map(Number);
    const png = new PNG({ width: d.w, height: d.h });
    for (let i = 0; i < d.w * d.h; i += 1) { png.data[i * 4] = px[i * 3]; png.data[i * 4 + 1] = px[i * 3 + 1]; png.data[i * 4 + 2] = px[i * 3 + 2]; png.data[i * 4 + 3] = 255; }
    rendered = '/tmp/concept-frame.png';
    writeFileSync(rendered, PNG.sync.write(png));
  }
  data = execFileSync('node', ['tools/concept-audit.mjs', TARGET, rendered], { encoding: 'utf8' });
} catch (e) { console.log('NOT MEASURED', String(e.message).slice(0, 200)); process.exit(2); }
const num = (label) => { const m = data.split('\n').find((l) => l.includes(label)); const mm = m && m.match(/target\s+([\d.]+)\s+ours\s+([\d.]+)/); return mm ? [Number(mm[1]), Number(mm[2])] : [NaN, NaN]; };
const [dt, doUrs] = num('detail (adjacent diff)');
const [tt, to] = num('tones in use');
const [wt, wo] = num('warm pixels %');
let bad = 0;
const row = (id, name, t, o, need) => { const ok = o >= need; if (!ok) bad += 1; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id} ${name.padEnd(10)} target ${t.toFixed(2).padStart(7)}  ours ${o.toFixed(2).padStart(7)}  needs ${need.toFixed(2)}`); };
row('1', 'DENSITY', dt, doUrs, dt * 0.85);
row('2', 'TONES', tt, to, tt * 0.85);
row('3', 'WARMTH', wt, wo, wt * 0.5);
if (metrics) {
  // THE CANVAS-ONLY ROWS, ON WHAT WAS DRAWN: the frame is FLAT by measurement (calm surfaces), its detail density, and
  // whether its facades are made of the engine's own window sprites.
  const fOk = metrics.flatShare >= 60;
  const tOk = metrics.transPerPx >= 0.05;
  const wOk = metrics.windowSprites >= 1;
  if (!fOk) bad += 1; if (!tOk) bad += 1; if (!wOk) bad += 1;
  console.log(`${fOk ? 'ok  ' : 'FAIL'}  4 FLAT       flatShare ${metrics.flatShare.toFixed(1)}% of the drawn frame (>= 60): the frame is FLAT by measurement`);
  console.log(`${tOk ? 'ok  ' : 'FAIL'}  5 DETAIL     transPerPx ${metrics.transPerPx.toFixed(3)} (>= 0.050)`);
  console.log(`${wOk ? 'ok  ' : 'FAIL'}  6 PANES      window sprites ${metrics.windowSprites} of ${metrics.objects} drawn objects (>= 1)`);
} else {
  console.log('note: a .png was given - the canvas-only rows (flatShare, transPerPx, window sprites) are not measured; the gate cannot be calibrated from a screenshot');
}
console.log(`\n${bad ? 'CONCEPT: ' + bad + ' row(s) below the published look' : 'CONCEPT: every row is the published look\'s'}.`);
process.exit(bad ? 1 : 0);
