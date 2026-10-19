// THE ANNOTATION PIECE'S OWN CHECK — the reference's own SCENES run through it, and invalid geometry is refused.
//
//   1. THE REFERENCE PASSES   every building quad / car box in the operator's own `SCENES` (lifted from
//                             tools/v13/engine-v13.txt) validates against a 288x512 frame - the format is the file's
//   2. THE MASK IS THE QUAD   a quad's pixel mask is inside the polygon (its area matches the shoelace area within a
//                             pixel per row, and no pixel of the mask lies outside the polygon's bounding box)
//   3. A DEGENERATE QUAD IS REFUSED   a 7x7 px quad (a pane-sized "building") fails, printing why
//   4. OUT OF FRAME IS REFUSED        a quad with a corner off the 288x512 grid fails
//   5. FACADES COME OUT       the reference's scenes yield at least one facade instance each, with >= 200 px
//   6. DETERMINISM            the same annotation gives the same instance list
//
//   node tools/piece-annotation-check.mjs   ->  exit 0 only when every promise holds.
import { readFileSync } from 'node:fs';
import { validateAnnotation, annotationFacades, quadPixels } from '../src/pieces/scene-annotation.js';

let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(56)} ${detail}`); if (cond) pass += 1; else fail += 1; };
const W = 288, H = 512;

// ---- the operator's own SCENES, lifted from the engine text (data only: private or plain)
const txt = readFileSync(new URL('../tools/v13/engine-v13.txt', import.meta.url), 'utf8');
const i = txt.indexOf('SCENES = [');
const j = txt.indexOf('\n  ];', i);
const SCENES = new Function(`return ${txt.slice(i + 'SCENES = '.length, j + 4)}`)();
ok('1 THE REFERENCE PASSES: its own SCENES validate', SCENES.length >= 4 && SCENES.every((s) => validateAnnotation(s, W, H).ok),
  `${SCENES.length} scenes: ` + SCENES.map((s) => `${s.id}(${s.buildings.length}b/${s.cars.length}c:${validateAnnotation(s, W, H).errors.length}e)`).join(' '));

// ---- the mask is the quad
const quad = [[100, 100], [180, 100], [180, 200], [100, 200]];
const px = quadPixels(W, H, quad);
const shoelace = 0.5 * Math.abs(quad.reduce((acc, [x, y], k) => { const [nx, ny] = quad[(k + 1) % quad.length]; return acc + (x * ny - nx * y); }, 0));
const outsideBox = px.filter((p) => { const x = p % W, y = (p / W) | 0; return x < 100 || x > 180 || y < 100 || y > 200; }).length;
ok('2 THE MASK IS THE QUAD', Math.abs(px.length - shoelace) <= 80 && outsideBox === 0, `${px.length} px vs shoelace ${shoelace}, ${outsideBox} outside the box`);

// ---- a degenerate "building" is refused
const tiny = validateAnnotation({ gy: 300, h0: 250, buildings: [{ quad: [[10, 10], [17, 10], [17, 17], [10, 17]] }], cars: [] }, W, H);
ok('3 A DEGENERATE QUAD IS REFUSED (7x7)', !tiny.ok && tiny.errors.some((e) => /degenerate quad/.test(e)), tiny.errors[0] || '(no error)');

// ---- out of frame is refused
const off = validateAnnotation({ gy: 300, h0: 250, buildings: [{ quad: [[-5, 10], [80, 10], [80, 90], [-5, 90]] }], cars: [] }, W, H);
ok('4 OUT OF FRAME IS REFUSED', !off.ok && off.errors.some((e) => /outside the frame/.test(e)), off.errors[0] || '(no error)');

// ---- facades come out of the reference's scenes
const inst = SCENES.map((s) => annotationFacades(s, W, H));
ok('5 FACADES COME OUT of the reference\'s scenes', inst.every((r) => r.facades.length >= 1 && r.facades.every((f) => f.pixels.length >= 200)),
  inst.map((r, k) => `${SCENES[k].id}:${r.facades.length}f/${r.facades[0] ? r.facades[0].pixels.length : 0}px`).join(' '));

// ---- determinism
const a = JSON.stringify(annotationFacades(SCENES[0], W, H));
const b = JSON.stringify(annotationFacades(SCENES[0], W, H));
ok('6 DETERMINISM', a === b, 'same instance list twice');

console.log(`\n${fail ? 'PIECE CHECK FAILED' : 'PIECE CONFIRMED'}: the annotation is ${pass} of ${pass + fail} promises - the reference's S7 format, validated, and a quad becomes a facade mask.`);
process.exit(fail ? 1 : 0);
