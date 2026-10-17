// G-DET-PARSE (docs/DETERMINISM.md §4/§5): IS THE NEURAL PARSE REPRODUCIBLE ON THE SAME INPUT?
//
// WHY THIS EXISTS. The two unpatched captures differ, and the differing cells change ENTIRELY (a bay that took
// the white-panel branch instead of the glass one). A bay's branch is decided by `bayLuma > wallMedian`, both
// read off the WALL MASK, which comes from the SegFormer-B0 scene parse. The published worry is that ONNX
// Runtime's threaded reductions are not bit-reproducible, so the mask edge moves between runs.
//
// WHAT IT MEASURES, and its premise. The page is opened with `?parse=1`, which stores the EXACT input the build
// gave the parse (`window.__sceneIn`, src/main.js) and the parse's result. This tool then calls
// `window.__parseAgain()` - the SAME `sceneParse(source, w, h, sw, sh)` (src/scene-parse.js:74) on the SAME
// stored canvas - and compares the two masks class by class, plus the horizon row. PREMISE: the input is
// bit-identical by construction (the same canvas object, the same `toDataURL`), so any difference in the
// OUTPUT is the model's own. The verdict is WITHHELD (exit 2) when the probe does not arm: a page that never
// parsed is not a passing parse.
//
// Usage: node --experimental-websocket tools/detgate-parse.mjs
import { withPage } from './browser.mjs';
import { readFileSync } from 'node:fs';

const PHOTO = process.env.PHOTO || 'photos-test/v10a.jpg';
const BASE = process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&parse=1';
const bytes = readFileSync(new URL(`../${PHOTO}`, import.meta.url));
const b64 = bytes.toString('base64');

// The page expressions are built as PLAIN STRINGS. (A template literal holding `return { ... }` in statement
// position made V8 report "missing ) after argument list" at the opening backtick - a parser hazard, not a
// real bracket fault; the strings below have no interpolation at all.)
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

const PROBE = [
  'if (!window.__parseFirst || !window.__parseAgain) return "UNARMED";',
  'const a = window.__parseFirst;',
  'const b = await window.__parseAgain();',
  'if (!b) return "NULL";',
  'const fnv = (m) => { let s = 2166136261; for (let i = 0; i < m.length; i += 1) s = Math.imul(s ^ m[i], 16777619); return s >>> 0; };',
  'const classes = Object.keys(a.masks).sort();',
  'const rows = [];',
  'let totalDiff = 0;',
  'for (const k of classes) {',
  '  const ma = a.masks[k]; const mb = b.masks[k];',
  '  let diff = -1;',
  '  if (ma && mb && ma.length === mb.length) { diff = 0; for (let i = 0; i < ma.length; i += 1) if (ma[i] !== mb[i]) diff += 1; }',
  '  if (diff !== 0) { rows.push(k + ":" + diff); if (diff > 0) totalDiff += diff; }',
  '}',
  'let hz = 0;',
  'for (let x = 0; x < a.horizon.length; x += 1) if (a.horizon[x] !== b.horizon[x]) hz += 1;',
  'return [a.w, a.h, classes.length, totalDiff, hz, fnv(a.masks.sky), fnv(b.masks.sky), rows.join(" ")].join("|");',
].join('\n');

const runOnce = () => withPage(BASE, {}, async (page) => {
  await page.wait(2500);
  await page.run(UPLOAD);
  for (let i = 0; i < 60; i += 1) {
    await page.wait(2000);
    const left = await page.run('return document.getElementById("left").textContent;');
    if (left && left !== '0') break;
  }
  return page.run(PROBE);
});

const parse = (s) => {
  if (s === 'UNARMED' || s === 'NULL' || typeof s !== 'string') return { ok: false, why: String(s) };
  const [w, h, classes, totalDiff, horizonDiff, hashA, hashB, rows] = s.split('|');
  return { ok: true, w: +w, h: +h, classes: +classes, totalDiff: +totalDiff, horizonDiff: +horizonDiff, hashA: +hashA, hashB: +hashB, rows: rows ? rows.trim() : '' };
};

const A = parse(await runOnce());
const B = parse(await runOnce());
console.log(JSON.stringify({ A, B }));
if (!A.ok || !B.ok) {
  console.log(`G-DET-PARSE VERDICT WITHHELD: the probe did not arm (load1 ${A.why || 'ok'}, load2 ${B.why || 'ok'}) - a page that never parsed is not a passing parse.`);
  process.exit(2);
}
console.log(`PREMISES: sceneParse called a second time on the SAME stored canvas (src/main.js ?parse=1), once per page load, two page loads · ${A.w}x${A.h} grid · ${A.classes} binary class masks · ${A.w * A.h} game pixels per mask`);
console.log(`LOAD 1: ${A.totalDiff} px differ between the two parses of the same input · horizon columns differing ${A.horizonDiff} of ${A.w}${A.rows ? ' · classes ' + A.rows : ''}`);
console.log(`LOAD 2: ${B.totalDiff} px differ between the two parses of the same input · horizon columns differing ${B.horizonDiff} of ${B.w}${B.rows ? ' · classes ' + B.rows : ''}`);
console.log(`CROSS-LOAD: sky mask hash load1 ${A.hashA} vs load2 ${B.hashA} -> ${A.hashA === B.hashA ? 'IDENTICAL' : 'DIFFERENT'}; within-load ${A.hashA} -> ${A.hashB} (${A.hashA === A.hashB ? 'identical' : 'DIFFERENT'})`);
const within = A.totalDiff + B.totalDiff;
const cross = A.hashA === B.hashA;
if (!within && cross) {
  console.log('G-DET-PARSE PASS: the parse is bit-reproducible both within a load and across loads on a bit-identical input.');
  process.exit(0);
}
console.log(`G-DET-PARSE FAIL: the parse is NOT reproducible - ${within} px differ within a load, the sky mask is ${cross ? 'stable' : 'UNSTABLE'} across loads.`);
process.exit(1);
