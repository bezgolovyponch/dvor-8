// G-DET-RENDER (docs/DETERMINISM.md §5, level 3): IS THE RENDERER DETERMINISTIC WHEN IT IS HANDED A FIXED BUILD
// AND A FIXED CLOCK?
//
// WHY. The parse, the detector and the built world are all bit-reproducible, and the clock can be pinned
// (`?clock=`), yet two builds still differ. That leaves the render itself: the draw path is the only thing
// between the world and the dump. This gate asks one question with one number: at the SAME clock and the same
// world, does the renderer paint the same bytes TWICE IN A ROW?
//
// PREMISE: the page must report its pin (window.__clockPin) and a world (window.__world); otherwise the verdict
// is WITHHELD. Two dumps are taken back to back in one build (render variance alone) and the same pair is taken
// in a second build (the gate's own A/B).
//
// Usage: node --experimental-websocket tools/detgate-render.mjs
import { withPage } from './browser.mjs';
import { readFileSync } from 'node:fs';

const PHOTO = process.env.PHOTO || 'photos-test/v10a.jpg';
const PIN = process.env.PIN || '7.5';
const BASE = process.env.BASE || `http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=${PIN}`;
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

const HASH = [
  'const c = document.getElementById("yard") || document.getElementById("view");',
  'const g = c.getContext("2d");',
  'const d = g.getImageData(0, 0, c.width, c.height).data;',
  'let h = 2166136261;',
  'for (let i = 0; i < d.length; i += 4) { h = Math.imul(h ^ d[i], 16777619); h = Math.imul(h ^ d[i + 1], 16777619); h = Math.imul(h ^ d[i + 2], 16777619); }',
  'let rh = 2166136261;',
  'for (let i = 0; i < d.length; i += 4) if (d[i + 3] !== 255) rh = Math.imul(rh ^ d[i + 3], 16777619);',
  'const st = window.__drawState ? window.__drawState() : null;',
  'return JSON.stringify({ hash: h >>> 0, alphaHash: rh >>> 0, clock: window.__clock, pin: window.__clockPin, stage: document.getElementById("banner") ? document.getElementById("banner").textContent.slice(0, 12) : "", state: st });',
].join('\n');

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
  const one = JSON.parse(await page.run(HASH));
  await page.wait(1200);                       // several frames later, SAME build, SAME pinned clock
  const two = JSON.parse(await page.run(HASH));
  console.error('STATE ' + tag + ' ' + JSON.stringify({ one: one.state, two: two.state }));
  return { tag, one, two };
});

const A = await runOnce('a');
const B = await runOnce('b');
console.log(`PREMISES: page = ${BASE} · dumps are FNV-1a hashes of the canvas bytes of two 288x512 frames taken 1.2 s apart in the same build, plus the same reading from a second build · the clock is pinned, so a moving element must still land on the same phase`);
for (const r of [A, B]) console.log(`BUILD ${r.tag}: clock ${r.one.clock} (pin ${r.one.pin}) · hash1 ${r.one.hash} · hash2 ${r.two.hash} · same build ${r.one.hash === r.two.hash ? 'IDENTICAL' : 'DIFFERS'} · stage "${r.one.stage}"`);
if (A.one.pin === -1 || !A.one.pin) {
  console.log('G-DET-RENDER VERDICT WITHHELD: the page did not pin the clock.');
  process.exit(2);
}
const withinA = A.one.hash === A.two.hash;
const withinB = B.one.hash === B.two.hash;
const across = A.one.hash === B.one.hash;
console.log(`WITHIN BUILD A ${withinA ? 'stable' : 'UNSTABLE'} · WITHIN BUILD B ${withinB ? 'stable' : 'UNSTABLE'} · ACROSS BUILDS ${across ? 'identical' : 'DIFFERENT'}`);
if (withinA && withinB && across) {
  console.log('G-DET-RENDER PASS: at one fixed world and one fixed clock the renderer paints byte-identical frames, within a build and across builds.');
  process.exit(0);
}
if (!withinA || !withinB) {
  console.log('G-DET-RENDER FAIL: the renderer does NOT paint the same bytes twice at a fixed world and a fixed clock - the re-roll is IN the draw path.');
  process.exit(1);
}
console.log('G-DET-RENDER FAIL: the renderer is stable within a build but two builds differ at the same pinned clock - the input to the draw path still differs between builds.');
process.exit(1);
