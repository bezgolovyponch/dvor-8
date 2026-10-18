// STEP 0 OF EVERY REQUEST: the preamble is present, the project is intact, and the state is printed from the files
// rather than from memory. This is the double-check at the place where the project kept losing track - the start.
import { readFileSync, existsSync } from 'node:fs';

const REQUIRED = [
  ['docs/PROTOCOL.md', 'the one protocol: concept, pipeline, gates, loop, failure taxonomy'],
  ['docs/SYSTEM.md', 'the principles with sources, margins and dependencies'],
  ['docs/METHODS.md', 'the published method set and the module table'],
  ['docs/SOURCES.md', 'every method traced to a real external source'],
  ['reference/PAIRING.md', 'the input-output pairing and what is kept vs replaced'],
  ['reference/TARGET.json', 'the example frame as measured regions'],
  ['src/style/index.js', 'the style, defined before any conversion'],
  ['src/criteria/RoadRule.js', 'the photograph layer'],
  ['src/criteria/SkyRule.js', 'the sky'],
  ['src/criteria/FacadeRule.js', 'the buildings'],
  ['src/criteria/OutlineRule.js', 'outlines'],
  ['src/criteria/DestructionRule.js', 'destruction'],
  ['tools/chain.mjs', 'the chain'],
  ['tools/undefined-check.mjs', 'the page-level import check'],
  ['tools/criteria-check.mjs', 'criteria as predicates'],
  ['tools/composition-check.mjs', 'the composition bindings'],
  ['tools/reference-check.mjs', 'the comparison to the accepted frame'],
];

let missing = 0;
for (const [path, what] of REQUIRED) {
  const ok = existsSync(path);
  if (!ok) { missing += 1; console.log(`MISSING  ${path.padEnd(34)} ${what}`); }
}
if (missing) {
  console.log(`\nPREFLIGHT FAILED: ${missing} of ${REQUIRED.length} required parts are missing. Nothing starts until they exist.`);
  process.exit(1);
}
// the preamble must still carry its five load-bearing statements, or it has been edited into decoration
const pre = readFileSync('docs/PREAMBLE.md', 'utf8');
// THE PREAMBLE MUST STILL CARRY THE CONCEPT, NOT ONLY THE FINDINGS. These strings are the load-bearing logic of the
// project: the photograph as a source of facts, one method per kind, the outline and destroyable sets, the outline
// following the shape, one palette, and the chain gating what may be shown.
const must = ['THE CRITICAL BUG', 'A conversion pipeline cannot produce a construction result',
  'An outline that marks everything marks nothing', 'gates **showing**', 'named after the requirement',
  'THE CONCEPT LOGIC', 'a source of FACTS, not of pixels', 'outlined kinds are **buildings and cars only**',
  'the outline follows', 'one 50-entry palette'];// the filter itself

const gone = must.filter((m) => !pre.includes(m));
if (gone.length) {
  console.log(`PREFLIGHT FAILED: the preamble lost ${gone.length} of its load-bearing statements: ${gone.join(' · ')}`);
  process.exit(1);
}
// A MISSING FILE IS NOT A COUNT. Both lines used to catch ENOENT and return the last known number (19 criteria,
// 10 composition elements), so a deleted document printed as a healthy row and the chain's step 2 crashed on the
// same file an instant later. Absent now prints as ABSENT and fails the preflight, naming the file: the chain's
// own premise cannot be invented. (Measured 2026-10-17: docs/COMPOSITION.md was archived to docs/archive/ by
// commit 3e97356, preflight still counted 10, and tools/composition-check.mjs threw ENOENT at its first line.)
const countRows = (file, rx) => {
  // THE COUNT IS THE BAR. `n > 0` accepted ANY number of rows - one row printed as a healthy document. The expected
  // counts are the project's own published ones (19 criteria, 10 composition elements), stated here and compared.
  try { const n = (readFileSync(file, 'utf8').match(rx) || []).length; return n > 0 ? { n } : { n: 0, why: `${file} has no rows` }; }
  catch { return { n: 0, why: `${file} is missing` }; }
};
const criteria = countRows('docs/CRITERIA.md', /^\|\s*[A-Z]\d+\s*\|/gm);
const composition = countRows('docs/COMPOSITION.md', /^\|\s*\d+\s*\|/gm);
// THE EXPECTED COUNTS ARE THE PROJECT'S OWN: 19 criteria rows and 10 composition elements. A document that has been
// truncated to one row is not a document, and `n > 0` could not see the difference.
const EXPECT = { criteria: 19, composition: 10 };
for (const [label, c] of [['criteria', criteria], ['composition', composition]]) {
  if (c.why) { console.log(`PREFLIGHT FAILED: ${label} cannot be read — ${c.why}. The chain's step cannot run on a document that is not there.`); process.exit(1); }
  if (c.n !== EXPECT[label]) { console.log(`PREFLIGHT FAILED: ${label} has ${c.n} rows; the project states ${EXPECT[label]}. The chain's step is written against that count.`); process.exit(1); }
}
console.log(`PREFLIGHT OK — ${REQUIRED.length} parts present, the preamble carries all ${must.length} load-bearing statements.`);
console.log(`  criteria: ${criteria.n} rows · composition: ${composition.n} elements · the chain: preflight -> criteria -> composition -> suite -> delivery -> sheet -> reference`);
console.log('  read: docs/PREAMBLE.md (task, definition of done, critical findings, chain, protocol)');
