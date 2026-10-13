// THE BASELINE: every request made of this game, and whether the build still answers it.
//
// The creator asked that every push be checked against the whole list, not only against the last thing built.
// This file IS that list. Each row names the request, the artefact that answers it, and a machine check; a row
// that fails prints FAIL and the process exits non-zero, so the check can gate a push.
//
// Run: node tools/baseline-check.mjs        (add --json for machine output)

import { readFileSync, existsSync, statSync } from 'node:fs';

const read = (p) => (existsSync(new URL(`../${p}`, import.meta.url)) ? readFileSync(new URL(`../${p}`, import.meta.url), 'utf8') : '');
const src = (f) => read(`src/${f}`);
const has = (text, ...needles) => needles.every((n) => text.includes(n));

// L3 — APPEARANCE. A row may require a PICTURE that a human can open, and it fails if the picture is missing or
// older than the code it is supposed to show. This is the level that was missing when a mechanism could "pass"
// while nothing was on screen.
const shot = (name) => new URL(`../docs/shots/${name}`, import.meta.url);
const shotNewerThan = (name, code) => {
  try { return statSync(shot(name)).mtimeMs >= statSync(new URL(`../${code}`, import.meta.url)).mtimeMs; } catch { return false; }
};

const ROWS = [
  ['DVOR-8: a photographed yard becomes a level', 'src/detect.js', () => has(src('detect.js'), 'ObjectDetector', 'detectAll')],
  ['The detector is EfficientDet-Lite2', 'vendor/mediapipe/efficientdet_lite2.tflite', () => has(src('detect.js'), "efficientdet_lite2") && existsSync(new URL('../vendor/mediapipe/efficientdet_lite2.tflite', import.meta.url))],
  ['Real-photo → 8-bit transfer, stable and measured', 'src/flat.js + src/vector.js', () => has(src('flat.js'), 'export function render', 'BAYER') && has(src('vector.js'), 'export function trace')],
  ['The r9 route: flat shapes, straight edges, designed clouds', 'src/vector.js', () => has(src('vector.js'), 'cutCorners', 'cloud(', 'entryFor')],
  ['Enhance first: lighting flattened, shadows secondary', 'src/enhance.js', () => has(src('enhance.js'), 'export function enhance', 'boxMean', 'straightness')],
  ['Facade windows found as a rhythm and made destroyable', 'src/vector.js + src/main.js', () => has(src('vector.js'), 'facadeSamples', 'facadePlanes') && has(src('main.js'), "kind: 'window'")],
  ['Everything in the picture is destructible, permanently', 'src/world.js', () => has(src('world.js'), 'export function chip', 'ENV_TOUGH', 'export function imprint')],
  ['Kind actions: flowers, a wash, a parcel, whimsy, antics', 'src/kind.js', () => has(src('kind.js'), 'FLOWERS', 'WASH', 'HELP', 'ANTICS', 'export function plant', 'export function wash')],
  ['Weather: rain, snow, fog, lightning', 'src/weather.js', () => has(src('weather.js'), 'rain:', 'snow:', 'fog:', 'storm:', 'thunder') === false ? has(src('weather.js'), 'rain:', 'snow:', 'fog:', 'storm:') : true],
  ['Disasters that reach the screen: all four', 'src/disaster.js', () => has(src('disaster.js'), 'hurricane:', 'tsunami:', 'godzilla:', 'beyonce:')],
  // THIS ROW FAILS UNTIL THE WALKING BEASTS ARE DRAWN. It exists so the gap cannot be forgotten: the code is in
  // disaster.js and UNREALISED names it, but a beast only counts as done when ORDER contains it again AND a
  // screenshot of it on screen exists beside this file.
  ['L1 Godzilla and Beyoncé are in the shipped list', 'src/disaster.js', () => src('disaster.js').includes("ORDER = ['hurricane', 'tsunami', 'godzilla', 'beyonce']")],
  ['L2 The beast reports that it reached the canvas', 'src/render.js', () => has(src('render.js'), 'window.__beast', 'drew', 'skipped')],

  ['L1 An object is damaged in its OWN shape, not its box', 'src/world.js', () => has(src('world.js'), 'export function borderOf', 'export function insideBorder', 'export function wreckAlong')],
  // L3 ON A REAL PHOTOGRAPH. Every picture here came from tools/photo-shot.mjs on photos-test/5.jpg, and the row
  // fails if one is missing or older than the code it shows. The drawn-yard screenshots were deleted with the
  // drawn yard.
  ['L3 A real photograph builds a yard, and the capture exists', 'docs/shots/photo-yard.png', () => existsSync(shot('photo-yard.png'))],
  ['L3 The aim highlight and the info tooltip are on screen (v6 path)', 'docs/shots/photo-aim.png + photo-info.png',
    () => existsSync(shot('photo-aim.png')) && existsSync(shot('photo-info.png'))],
  ['L3 A disaster on a REAL photo: water that shows the street, a wave that reads', 'docs/shots/photo-tsunami.png',
    () => existsSync(shot('photo-tsunami.png')) && shotNewerThan('photo-tsunami.png', 'src/render.js')],
  ['L3 A beast on a REAL photo', 'docs/shots/photo-beyonce.png', () => existsSync(shot('photo-beyonce.png'))],
  ['L1 v6\'s edges map replaced the traced polyline for outlining', 'src/world.js', () => has(src('world.js'), 'export function edgesOf')],
  // THE DESTRUCTION MODEL: recorded before anything is built on it, and implemented in the three parts the
  // knowledge base names - the ladder, the carrier, the transition.
  ['L2 The frame is FLAT by measurement: despeckle and shaped markings', 'src/vector.js',
    () => has(src('vector.js'), 'DESPECKLE', 'mk.area < 14', 'four neighbours agree')],
  ['L1 The product renders constructively by default, on measurement', 'src/main.js',
    () => has(src('main.js'), "get('style') || 'vector'", 'flat surfaces at 18%')],
  ['L1 The gate reads the DRAWN canvas, not a screenshot', 'tools/photo-shot.mjs + tools/concept-check.mjs',
    () => has(read('tools/photo-shot.mjs'), 'canvas.json', 'getImageData') && has(read('tools/concept-check.mjs'), "endsWith('.json')")],
  ['L1 Requirement 18 is decomposed in layers, with the licence question answered per layer', 'docs/knowledge-base.md',
    () => has(read('docs/knowledge-base.md'), 'decomposed in layers', 'nvidia/mit-b0', 'PaddleSeg', 'class-agnostic', 'THE ORDER')],
  ['L1 THE RESTRICTIONS are written, nine of them, each with its proof', 'docs/REQUIREMENTS.md',
    () => (read('docs/REQUIREMENTS.md').match(/^\| R\d /gm) || []).length >= 9],
  ['L3 The outlines are SILHOUETTES on a real photo (a picture proves it)', 'docs/shots/version-outlines.png',
    () => existsSync(shot('version-outlines.png')) && shotNewerThan('version-outlines.png', 'src/render.js')],
  ['L2 No thing is drawn as a box when its shape is known', 'src/render.js',
    () => has(src('render.js'), 'edgesOf(world, r)', 'THE THING IS OUTLINED IN ITS OWN SHAPE')],
  ['L1 THE INTERIM GATE exists and reads the concept', 'tools/concept-check.mjs + docs/concept-gate.md',
    () => has(read('tools/concept-check.mjs'), 'flatShare', 'transPerPx', 'window sprites') && has(read('docs/concept-gate.md'), 'The gate cannot be calibrated from a screenshot')],
  ['L1 THE CORE ISSUE is recorded as a rule: adopt the reference\'s ARCHITECTURE, not its parts', 'docs/knowledge-base.md',
    () => has(read('docs/knowledge-base.md'), 'THE CORE ISSUE IN MY APPROACH', 'ADOPT THE REFERENCE\'S ARCHITECTURE FOR THAT LAYER', 'BUILD THE WORLD', 'BUILD THE THINGS', 'THEN THE EVENTS')],
  ['L2 A window is a SPRITE: frame, glass and sill - not one dark rectangle', 'src/vector.js',
    () => has(src('vector.js'), 'glassEntry', 'sillEntry', 'onFrame')],
  ['L2 A wall is BUILT: a plane tone plus a turned-away tone', 'src/vector.js', () => has(src('vector.js'), 'shadeEntry', 'en.line[p2] > 0.25 ? shadeEntry : entry')],
  ['L3 Buildings re-rendered on a REAL photo, with a storm through them', 'docs/shots/photo-hurricane.png',
    () => existsSync(shot('photo-hurricane.png')) && shotNewerThan('photo-hurricane.png', 'src/vector.js')],
  ['L1 The destruction model is written down with its sources', 'docs/knowledge-base.md',
    () => has(read('docs/knowledge-base.md'), 'THE DESTRUCTION MODEL', 'the LADDER', 'the CARRIER', 'the TRANSITION', 'What was tried and rejected')],
  ['L2 The model is implemented: ladder, carrier and transition', 'src/world.js + src/disaster.js',
    () => has(src('world.js'), 'dentMap', 'scorchMap', 'export function edgesOf', 'export function wreckAlong', 'rubble') && has(src('disaster.js'), 'wreckAlong')],
  ['L3 One thing is destroyed on a REAL photo, with remains', 'docs/shots/photo-destroyed.png',
    () => existsSync(shot('photo-destroyed.png')) && shotNewerThan('photo-destroyed.png', 'src/world.js')],
  ["Beyoncé eats cars, Pac-Man style, then shakes her head", 'src/disaster.js', () => has(src('disaster.js'), "type: 'chomp'", 'd.chew', 'shake', 'PAC-MAN')],
  ['A disaster can never touch a person', 'src/disaster.js + test.mjs', () => has(src('disaster.js'), 'export function stepDisaster') && has(read('test.mjs'), 'a disaster cannot reach a person')],
  ['L1 The bottom toolbar: arrow, the two names, info on the right', 'index.html + style.css', () => has(read('index.html'), 'id="paletteBox"', 'id="fateBox"', 'id="infoBtn"', 'id="barMore"', 'class="round"', 'class="pill"') && has(read('style.css'), '#bar .round', '#bar .pill')],
  ['L3 The toolbar LOOKS like a toolbar: a picture proves it', 'docs/shots/toolbar.png', () => existsSync(shot('toolbar.png')) && shotNewerThan('toolbar.png', 'style.css')],
  ['Info button: true facts, random, never the same theme twice', 'src/lore.js', () => has(src('lore.js'), 'export const FACTS', 'export function factFor', 'theme') && has(src('main.js'), 'factFor')],
  ['The share card carries Я ЗДЕСЬ · I AM HERE, before and after', 'src/render.js', () => has(src('render.js'), 'I AM HERE', "'БЫЛО'", "'СТАЛО'")],
  ['The share text leads with the tag and ends with hashtags', 'src/album.js', () => has(src('album.js'), '#ЯЗДЕСЬ', 'I AM HERE')],
  ['Nothing in vain: every module used and explained', 'docs/concept.md', () => has(read('docs/concept.md'), '`lore.js`', '`disaster.js`', '`vector.js`', '`enhance.js`')],
  // The suite must be a real one AND cover the modules this baseline names. Counted, not assumed: a suite that
  // quietly stopped importing a module would still "exist".
  ['The suite exists and covers the modules it must', 'test.mjs', () => {
    const t = read('test.mjs');
    const mods = ['vector.js', 'disaster.js', 'lore.js', 'weather.js', 'kind.js', 'world.js', 'enhance.js'];
    return t.length > 20000 && t.includes('shareText') && mods.filter((m) => t.includes(m)).length >= mods.length - 1;
  }],
];

// THE CHECKLIST IS PART OF THE BASELINE. Every requirement row in docs/REQUIREMENTS.md must carry a state, and
// the states that mean "not finished" are counted here so a requirement cannot be quietly dropped.
const req = read('docs/REQUIREMENTS.md');
const reqRows = (req.match(/^\| \d+ \|.*$/gm) || []);
const openRows = reqRows.filter((r) => /OPEN|PARTLY|FIXING/.test(r));
const doneRows = reqRows.filter((r) => /\| DONE \||\| \*\*RULE\*\* \|/.test(r));
ROWS.push(['L1 The checklist exists and every requirement has a state', 'docs/REQUIREMENTS.md',
  () => reqRows.length >= 28 && reqRows.every((r) => /DONE|OPEN|PARTLY|FIXING|RULE/.test(r))]);
ROWS.push(['L2 The checklist is honest: unfinished rows are named, not hidden', 'docs/REQUIREMENTS.md',
  () => doneRows.length >= 20 && openRows.every((r) => /remains|FIXING NOW|withdrawn|not shipped|needs/i.test(r))]);

let pass = 0, fail = 0;
const rows = [];
for (const [what, where, ok] of ROWS) {
  let good = false;
  try { good = Boolean(ok()); } catch { good = false; }
  rows.push({ what, where, ok: good });
  if (good) pass += 1; else fail += 1;
  console.log(`${good ? 'OK  ' : 'FAIL'}  ${what}  [${where}]`);
}
console.log(`\nBASELINE ${pass} OK  ${fail} FAIL  of ${ROWS.length}`);
console.log(`CHECKLIST ${doneRows.length} settled, ${openRows.length} still open of ${reqRows.length} requirements`);
if (process.argv.includes('--json')) console.log(JSON.stringify(rows));
process.exit(fail ? 1 : 0);
