// G-DET-LOCAL (docs/DETERMINISM.md §5, level 1/2): WHERE does the frame differ, and is the difference
// TIME (the capture moment) or STATE (a decision re-rolled once per run)?
//
// It takes THREE dumps with the SAME page settings:
//   A  page load 1, the gate's own capture (the same probe the detgate uses)
//   B  the SAME page, a second capture a few seconds later - no reload, so nothing the build rolled changed
//   C  page load 2, the gate's capture (a fresh build of the same photograph)
// and answers:
//   A vs B  = the TIME component: the drawn thing moved or the clock differed between two moments of ONE build
//   A vs C  = the RUN component: what a second build of the same photograph produces
// It also prints the difference's bounding box, its per-row histogram, and whether the two dumps are related
// by a small rigid shift (a camera/fit difference) rather than by content.
//
// Usage: node --experimental-websocket tools/detgate-local.mjs [outdir]
import { withPage } from './browser.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const PHOTO = process.env.PHOTO || 'photos-test/v10a.jpg';
const BASE = process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0';
const outDir = process.argv[2] || '/tmp/det-local';
mkdirSync(outDir, { recursive: true });
const b64 = readFileSync(new URL(`../${PHOTO}`, import.meta.url)).toString('base64');

const UPLOAD = [
  'const input = document.getElementById("shot");',
  'const bin = atob(' + JSON.stringify(b64) + ');',
  'const arr = new Uint8Array(bin.length);',
  'for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);',
  'const dt = new DataTransfer();',
  'dt.items.add(new File([arr], "photo.jpg", { type: "image/jpeg" }));',
  'input.files = dt.files;',
  'input.dispatchEvent(new Event("change", { bubbles: true }));',
  'return "sent";',
].join('\n');

const DUMP = [
  'const c = document.getElementById("yard") || document.getElementById("view");',
  'const g = c.getContext("2d");',
  'const d = g.getImageData(0, 0, c.width, c.height).data;',
  'const out = [];',
  'for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) { const i = (y * c.width + x) * 4; out.push(d[i], d[i + 1], d[i + 2]); }',
  'return { w: c.width, h: c.height, px: out.join(",") };',
].join('\n');

// the gate's own wait: the drawn sky's signature, not "a flat band"
const WAIT_DRAWN = [
  'const c = document.getElementById("yard") || document.getElementById("view");',
  'const g = c.getContext("2d");',
  'const band = Math.max(1, Math.floor(c.height * 0.08));',
  'const d = g.getImageData(0, 0, c.width, band).data;',
  'let blue = 0;',
  'for (let i = 0; i < d.length; i += 4) if (d[i + 2] > d[i] + 25) blue += 1;',
  'return blue / (band * c.width);',
].join('\n');

const loadAndBuild = async (page) => {
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
  return page.run(DUMP);
};

const A = await withPage(BASE, {}, async (page) => {
  const one = await loadAndBuild(page);
  await page.wait(4000);
  const two = await loadAndBuild(page);   // same page, later: the clock moved, the build did not
  return { one, two };
});
const C = await withPage(BASE, {}, async (page) => loadAndBuild(page));

const grid = (d) => (d.px ? (typeof d.px === 'string' ? d.px.split(',').map(Number) : d.px) : null);
const A1 = grid(A.one), A2 = grid(A.two), C1 = grid(C);

const diff = (P, Q) => {
  const n = Math.min(P.length, Q.length) / 3;
  const w = A.one.w, h = A.one.h;
  let count = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  const rows = new Int32Array(h), cols = new Int32Array(w);
  const cells = new Map();                       // 8x8 cells, as the level-2 decomposition used
  for (let p = 0; p < n; p += 1) {
    const i = p * 3;
    if (P[i] === Q[i] && P[i + 1] === Q[i + 1] && P[i + 2] === Q[i + 2]) continue;
    const x = p % w, y = (p / w) | 0;
    count += 1;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    rows[y] += 1; cols[x] += 1;
    const k = ((y / 8) | 0) * 64 + ((x / 8) | 0);
    cells.set(k, (cells.get(k) || 0) + 1);
  }
  const top = [...cells.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([k, v]) => `(${k % 64},${(k / 64) | 0}):${v}`);
  const worstRows = [...rows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([y, v]) => `y${y}:${v}`);
  return { count, box: [x0, y0, x1, y1], top, worstRows, rows, cols };
};

// Is Q a small rigid shift of P? Best (dx,dy) in -4..4 by equal-pixel count.
const shiftScore = (P, Q, w, h) => {
  let best = { dx: 0, dy: 0, same: -1 };
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      let same = 0, n = 0;
      for (let y = 4; y < h - 4; y += 1) {
        for (let x = 4; x < w - 4; x += 1) {
          const a = ((y * w) + x) * 3, b = (((y + dy) * w) + (x + dx)) * 3;
          n += 1;
          if (P[a] === Q[b] && P[a + 1] === Q[b + 1] && P[a + 2] === Q[b + 2]) same += 1;
        }
      }
      if (same > best.same) best = { dx, dy, same, n };
    }
  }
  return best;
};

const AB = diff(A1, A2), AC = diff(A1, C1);
writeFileSync(`${outDir}/a1.json`, JSON.stringify({ w: A.one.w, h: A.one.h, px: A1.join(',') }));
writeFileSync(`${outDir}/a2.json`, JSON.stringify({ w: A.one.w, h: A.one.h, px: A2.join(',') }));
writeFileSync(`${outDir}/c1.json`, JSON.stringify({ w: C.w, h: C.h, px: C1.join(',') }));
const N = A1.length / 3;
console.log(`PREMISES: same page settings (${BASE}) · ${A.one.w}x${A.one.h} = ${N} px per dump · 3 dumps: one page twice (A,B) + a second page (C) · equal-pixel test is EXACT per channel`);
console.log(`A vs B (SAME build, 4 s apart): ${AB.count} px differ (${(100 * AB.count / N).toFixed(2)}%) · box x${AB.box[0]}..${AB.box[2]} y${AB.box[1]}..${AB.box[3]} · cells ${AB.top.join(' ')} · rows ${AB.worstRows.join(' ')}`);
console.log(`A vs C (TWO builds of the same photo): ${AC.count} px differ (${(100 * AC.count / N).toFixed(2)}%) · box x${AC.box[0]}..${AC.box[2]} y${AC.box[1]}..${AC.box[3]} · cells ${AC.top.join(' ')} · rows ${AC.worstRows.join(' ')}`);
if (A.one.w === C.w && A.one.h === C.h) {
  const s = shiftScore(A1, C1, A.one.w, A.one.h);
  console.log(`A vs C rigid-shift probe (dx,dy in -4..4): best dx ${s.dx} dy ${s.dy} explains ${(100 * s.same / s.n).toFixed(2)}% of the inner frame (unshifted equal share is the frame's own repetition rate, so read the DIFFERENCE)`);
}
console.log(`WROTE ${outDir}/a1.json ${outDir}/a2.json ${outDir}/c1.json`);
process.exit(0);
