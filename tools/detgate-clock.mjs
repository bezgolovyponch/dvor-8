// G-DET-CLOCK (docs/DETERMINISM.md §5, level 3): IS THE FRAME ITSELF DETERMINISTIC ONCE THE CLOCK IS PINNED?
//
// WHY. The build is deterministic and every one of its inputs is reproducible, yet two captures of the same
// photograph differ:
//   G-DET-PARSE   the SegFormer-B0 parse        PASS  (0 px differ on a bit-identical input)
//   G-DET-DETECT  the EfficientDet-Lite2 detector PASS (58 raw and 5 merged detections identical)
//   G-DET-WORLD   the built world (window.__world) PASS (idx, rubble, paint, palette, 38 regions, envHits identical)
// The frame is drawn from the animation clock (`frame()` in src/main.js: clock -> motion -> draw's `seconds`),
// so the capture lands at a different moment of the animation in each run. `?clock=<seconds>` pins that clock.
//
// PREMISE: the page must report the pin it used (`window.__clockPin`, printed below). If it is not pinned the
// verdict is WITHHELD - an unpinned capture comparing equal would be luck, not determinism.
//
// Usage: node --experimental-websocket tools/detgate-clock.mjs [outdir]
import { withPage } from './browser.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const PHOTO = process.env.PHOTO || 'photos-test/v10a.jpg';
const PIN = process.env.PIN || '7.5';
const BASE = process.env.BASE || `http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=${PIN}`;
const outDir = process.argv[2] || '/tmp/det-clock';
mkdirSync(outDir, { recursive: true });
const bytes = readFileSync(new URL(`../${PHOTO}`, import.meta.url)).toString('base64');

const UPLOAD = [
  'const input = document.getElementById("shot");',
  'const bin = atob(' + JSON.stringify(bytes) + ');',
  'const arr = new Uint8Array(bin.length);',
  'for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);',
  'const dt = new DataTransfer();',
  'dt.items.add(new File([arr], "photo.jpg", { type: "image/jpeg" }));',
  'input.files = dt.files;',
  'input.dispatchEvent(new Event("change", { bubbles: true }));',
  'return "sent";',
].join('\n');

const WAIT_DRAWN = [
  'const c = document.getElementById("yard") || document.getElementById("view");',
  'const g = c.getContext("2d");',
  'const band = Math.max(1, Math.floor(c.height * 0.08));',
  'const d = g.getImageData(0, 0, c.width, band).data;',
  'let blue = 0;',
  'for (let i = 0; i < d.length; i += 4) if (d[i + 2] > d[i] + 25) blue += 1;',
  'return blue / (band * c.width);',
].join('\n');

const DUMP = [
  'const c = document.getElementById("yard") || document.getElementById("view");',
  'const g = c.getContext("2d");',
  'const d = g.getImageData(0, 0, c.width, c.height).data;',
  'const out = [];',
  'for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) { const i = (y * c.width + x) * 4; out.push(d[i], d[i + 1], d[i + 2]); }',
  'return { w: c.width, h: c.height, px: out.join(",") };',
].join('\n');

const CLOCKINFO = 'return JSON.stringify({ pin: window.__clockPin, clock: window.__clock });'.replace('\\"', '"');

const runOnce = (tag) => withPage(BASE, {}, async (page) => {
  await page.wait(2500);
  await page.run(UPLOAD);
  for (let i = 0; i < 45; i += 1) {
    await page.wait(2000);
    const left = await page.run('return document.getElementById("left").textContent;');
    if (left && left !== '0') break;
  }
  for (let tries = 0; tries < 40; tries += 1) {
    const blue = await page.run(WAIT_DRAWN);
    if (blue && blue >= 0.5) break;
    await page.wait(700);
  }
  const info = JSON.parse(await page.run(CLOCKINFO));
  const dump = await page.run(DUMP);
  writeFileSync(`${outDir}/${tag}.json`, JSON.stringify(dump));
  return { info, dump };
});

const A = await runOnce('a');
const B = await runOnce('b');
const grid = (d) => d.px.split(',').map(Number);
const P = grid(A.dump), Q = grid(B.dump);
const N = Math.min(P.length, Q.length) / 3;
let diff = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
const w = A.dump.w, h = A.dump.h;
for (let p = 0; p < N; p += 1) {
  const i = p * 3;
  if (P[i] === Q[i] && P[i + 1] === Q[i + 1] && P[i + 2] === Q[i + 2]) continue;
  diff += 1;
  const x = p % w, y = (p / w) | 0;
  if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
}
console.log(`PREMISES: page = ${BASE} · two separate page loads, each uploading the same photograph through the game's own file input · ${w}x${h} = ${N} px per dump · comparison EXACT per channel`);
console.log(`CLOCK: load1 pin ${A.info.pin} clock ${A.info.clock} · load2 pin ${B.info.pin} clock ${B.info.clock} (the same-named expression is evaluated before each dump, so a pinned page must report a constant)`);
console.log(`WROTE ${outDir}/a.json ${outDir}/b.json`);
if (A.info.pin === -1 || A.info.pin === null || A.info.pin === undefined || B.info.pin === -1) {
  console.log('G-DET-CLOCK VERDICT WITHHELD: the page did not pin the clock, so this capture is of the measuring moment.');
  process.exit(2);
}
const samePin = A.info.pin === B.info.pin && A.info.clock === B.info.clock;
console.log(`A vs B: ${diff} px differ (${(100 * diff / N).toFixed(3)}%)${diff ? ` · box x${x0}..${x1} y${y0}..${y1}` : ''} · the two clocks agree: ${samePin}`);
console.log(`G-DET-CLOCK ${diff === 0 ? 'PASS' : 'FAIL'}: the frame at a pinned clock is ${diff === 0 ? 'byte-identical' : 'NOT identical'} across two builds (${diff} px, bar 0)`);
process.exit(diff === 0 ? 0 : 1);
