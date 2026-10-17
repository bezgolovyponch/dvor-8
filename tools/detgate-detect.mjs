// G-DET-DETECT (docs/DETERMINISM.md §5, level 2): IS THE OBJECT DETECTOR REPRODUCIBLE ON THE SAME INPUT?
//
// WHY. The frame's differing pixels are CONTENT (a drawn element present in one build and not the other), not a
// shift - so the question is which BUILD input moved. Two neural stages feed the build: the scene parse
// (segmentation) and the object detector (MediaPipe EfficientDet-Lite2). G-DET-PARSE proves the parse is
// bit-reproducible; this proves the same or the opposite for the detector, which is the only other stage whose
// output the bay/panel decisions and the region list are built from.
//
// PREMISE. The input is rebuilt ONCE per page load (the photograph scaled to LONG 512, src/main.js:610 fit(512,
// 512)), kept in `window.__detIn`, and handed to `detectAll` (src/detect.js:33) TWICE in the same page. Any
// difference between the two runs is therefore the detector's own. The verdict is WITHHELD (exit 2) if the
// probe does not arm.
//
// Usage: node --experimental-websocket tools/detgate-detect.mjs
import { withPage } from './browser.mjs';
import { readFileSync } from 'node:fs';

const PHOTO = process.env.PHOTO || 'photos-test/v10a.jpg';
// `&parse=1` only arms the shared input handle (src/main.js); it changes nothing the detector or the build does.
const BASE = process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&parse=1';
const DETECT_MODULE = '/game/src/detect.js';
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

const ARMDET = [
  'const src = window.__sceneIn && window.__sceneIn.source;',
  'if (!src) return "NOINPUT";',
  'const det = await import(' + JSON.stringify(DETECT_MODULE) + ');',
  'const c = document.createElement("canvas");',
  'c.width = 512; c.height = 512;',
  'c.getContext("2d").drawImage(src, 0, 0, 512, 512);',
  'window.__detIn = c;',
  'return String(c.width) + "x" + String(c.height);',
].join('\n');

const PROBE = [
  'if (!window.__detIn) return "NOINPUT";',
  'const det = await import(' + JSON.stringify(DETECT_MODULE) + ');',
  'const b64 = window.__detIn.toDataURL("image/png");',
  'const mk = () => new Promise((resolve) => { const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); c.width = window.__detIn.width; c.height = window.__detIn.height; c.getContext("2d").drawImage(img, 0, 0); resolve(c); }; img.src = b64; });',
  'const c1 = await mk();',
  'const c2 = await mk();',
  'const r1 = await det.detectAll(c1);',
  'const r2 = await det.detectAll(c2);',
  'const sgn = (v) => Math.round(v * 1e6) / 1e6;',
  'const key = (k) => sgn(k.x) + "," + sgn(k.y) + "," + sgn(k.w) + "," + sgn(k.h) + "," + k.label.slice(0, 10) + "," + Math.round(k.score * 1000);',
  'const A1 = r1.all.map(key);',
  'const A2 = r2.all.map(key);',
  'const K1 = r1.kept.map(key);',
  'const K2 = r2.kept.map(key);',
  'const pairDiff = (P, Q) => { const n = Math.max(P.length, Q.length); const out = []; for (let i = 0; i < n; i += 1) if (P[i] !== Q[i]) out.push(i + ":" + (P[i] || "-") + "->" + (Q[i] || "-")); return out; };',
  'const dA = pairDiff(A1, A2);',
  'const dK = pairDiff(K1, K2);',
  'return JSON.stringify({ n: [A1.length, A2.length, K1.length, K2.length], dA: dA.length, dK: dK.length, sample: dA.slice(0, 6).concat(dK.slice(0, 6)), kept: K1 });',
].join('\n');

const runOnce = () => withPage(BASE, {}, async (page) => {
  await page.wait(2500);
  await page.run(UPLOAD);
  for (let i = 0; i < 60; i += 1) {
    await page.wait(2000);
    const left = await page.run('return document.getElementById("left").textContent;');
    if (left && left !== '0') break;
  }
  const armed = await page.run(ARMDET);
  if (armed !== '512x512') return { armed: false, why: armed };
  const s = await page.run(PROBE);
  const r = JSON.parse(s);
  const [n1, n2, k1, k2] = r.n;
  return { armed: true, n1, n2, k1, k2, rawDiffN: r.dA, keptDiffN: r.dK, sample: r.sample, keptList: JSON.stringify(r.kept), verdict: s };
});

const A = await runOnce();
const B = await runOnce();
console.log(JSON.stringify({ A, B }));
if (!A.armed || !B.armed) {
  console.log(`G-DET-DETECT VERDICT WITHHELD: the probe did not arm (load1 ${A.why || 'ok'}, load2 ${B.why || 'ok'}).`);
  process.exit(2);
}
console.log(`PREMISES: MediaPipe ObjectDetector efficientdet_lite2 (CPU delegate, scoreThreshold 0.2, maxResults 25) · detectAll on the SAME 512x512 canvas, twice per page load, two page loads · a detection is keyed by its box coordinates (6 dp), label and score (3 dp)`);
console.log(`LOAD 1: detections ${A.n1} / ${A.n2} · merged ${A.k1} / ${A.k2} · raw differences ${A.rawDiffN} · kept differences ${A.keptDiffN}`);
console.log(`LOAD 2: detections ${B.n1} / ${B.n2} · merged ${B.k1} / ${B.k2} · raw differences ${B.rawDiffN} · kept differences ${B.keptDiffN}`);
const stable = A.rawDiffN === 0 && A.keptDiffN === 0 && B.rawDiffN === 0 && B.keptDiffN === 0 && A.k1 === B.k1 && A.k1 > 0;
const crossSame = A.keptList === B.keptList;
console.log(`CROSS-LOAD: the merged detection list ${crossSame ? 'is IDENTICAL' : 'DIFFERS'} between the two page loads`);
if (stable && crossSame) {
  console.log('G-DET-DETECT PASS: the detector returns the same boxes, labels and scores for a bit-identical input, within and across loads.');
  process.exit(0);
}
console.log(`G-DET-DETECT FAIL: the detector is NOT reproducible (within-load raw diffs ${A.rawDiffN}/${B.rawDiffN}, kept diffs ${A.keptDiffN}/${B.keptDiffN}, cross-load ${crossSame ? 'identical' : 'DIFFERENT'}).`);
process.exit(1);
