// G-DET-WORLD (docs/DETERMINISM.md §5, level 2): IS THE BUILT WORLD THE SAME DATA IN TWO RUNS?
//
// WHY. The frame differs between two builds while BOTH neural stages are bit-reproducible (G-DET-PARSE,
// G-DET-DETECT). The next object down the ladder is the built world itself - `window.__world` (src/main.js:422,
// "THE WORLD IS READABLE FROM THE PAGE, on purpose"), which is what the renderer paints from. If the world's
// data is identical across builds and the frame is not, the difference is TIME (the capture moment / the
// animation clock), not a re-rolled decision. If the data differs, the re-roll is in the build and the hash
// names which field moved.
//
// PREMISE: one page load = one build; the photograph goes in through the game's own file input. Fields hashed:
// idx (the reduced picture), palette, rubble, paint, the region list (id/kind/box/hp/hits), and the counts of the
// things the frame can draw (regions, windows, envHits, blooms, parcels). Verdict WITHHELD if the world is absent.
//
// Usage: node --experimental-websocket tools/detgate-world.mjs
import { withPage } from './browser.mjs';
import { readFileSync } from 'node:fs';

const PHOTO = process.env.PHOTO || 'photos-test/v10a.jpg';
const BASE = process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0';
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

const PROBE = [
  'const w = window.__world;',
  'if (!w) return JSON.stringify({ armed: false });',
  'const fnv = (a) => { let s = 2166136261; for (let i = 0; i < a.length; i += 1) { const v = (a[i] === undefined ? 0 : a[i]) | 0; s = Math.imul(s ^ (v & 255), 16777619); s = Math.imul(s ^ ((v >> 8) & 255), 16777619); } return s >>> 0; };',
  'const pal = w.palette.map((c) => c.join(":")).join("|");',
  'const regions = w.regions.map((r) => [r.id, r.kind || "", r.x, r.y, r.w, r.h, r.hp, r.hits, r.pixels ? r.pixels.length : 0].join(":")).join("|");',
  'const rfmt = (x) => (typeof x === "number" ? Math.round(x * 1000) / 1000 : String(x));',
  'const env = (w.envHits && typeof w.envHits === "object") ? Object.keys(w.envHits).sort().map((k) => k + "=" + rfmt(w.envHits[k])).join(",") : "";',
  'const out = {',
  '  armed: true,',
  '  w: w.w, h: w.h, seed: w.seed,',
  '  idx: fnv(w.idx), rubble: fnv(w.rubble), paint: fnv(w.paint), photo: fnv(w.photo),',
  '  palette: fnv(pal.split("").map((c) => c.charCodeAt(0))), paletteLen: w.palette.length,',
  '  regions: fnv(regions.split("").map((c) => c.charCodeAt(0))), regionCount: w.regions.length,',
  '  envHits: fnv(env.split("").map((c) => c.charCodeAt(0))),',
  '  blooms: (w.blooms || []).length, parcels: (w.parcels || []).length, decals: (w.decals && w.decals.n) || 0,',
  '  strikes: w.strikes, done: !!w.done,',
  '  tables: (w.tables || []).length,',
  '  windows: fnv((window.__windowsSeed || []).join("").split("").map((c) => c.charCodeAt(0))),',
  '  windowCount: (window.__windowsSeed || []).length,',
  '};',
  'return JSON.stringify(out);',
].join('\n');

const runOnce = () => withPage(BASE, {}, async (page) => {
  await page.wait(2500);
  await page.run(UPLOAD);
  for (let i = 0; i < 60; i += 1) {
    await page.wait(2000);
    const left = await page.run('return document.getElementById("left").textContent;');
    if (left && left !== '0') break;
  }
  return JSON.parse(await page.run(PROBE));
});

const A = await runOnce();
const B = await runOnce();
const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])];
console.log(`PREMISES: one page load per build · the world read from window.__world (src/main.js:422) · hash = FNV-1a over the field, printed as an unsigned 32-bit number`);
if (!A.armed || !B.armed) {
  console.log(`G-DET-WORLD VERDICT WITHHELD: no world on the page (load1 ${A.armed}, load2 ${B.armed}).`);
  process.exit(2);
}
const rows = keys.map((k) => ({ k, a: A[k], b: B[k], same: JSON.stringify(A[k]) === JSON.stringify(B[k]) }));
for (const r of rows) console.log(`${r.same ? 'SAME' : 'DIFF'}  ${r.k.padEnd(12)} ${String(r.a).padEnd(14)} ${r.same ? '' : String(r.b)}`);
const moved = rows.filter((r) => !r.same).map((r) => r.k);
if (!moved.length) {
  console.log('G-DET-WORLD PASS: every hashed field of the built world is identical in two builds of the same photograph - the build is deterministic, so any frame difference is the capture moment, not a re-rolled decision.');
  process.exit(0);
}
console.log(`G-DET-WORLD FAIL: the built world DIFFERS between two builds: ${moved.join(', ')}.`);
process.exit(1);
