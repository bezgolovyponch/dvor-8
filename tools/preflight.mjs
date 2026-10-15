// STEP 0 OF EVERY REQUEST: the preamble is present, the project is intact, and the state is printed from the files
// rather than from memory. This is the double-check at the place where the project kept losing track - the start.
import { readFileSync, existsSync } from 'node:fs';

const REQUIRED = [
  ['docs/PREAMBLE.md', 'the preamble itself'],
  ['docs/CRITERIA.md', 'the creator\'s criteria, verbatim'],
  ['docs/DONE.md', 'the definition of done'],
  ['docs/V10A.md', 'the accepted frame, analysed'],
  ['docs/AUDIT.md', 'the audit and the critical bug'],
  ['docs/COMPOSITION.md', 'element -> requirement -> class -> baseline'],
  ['docs/MECHANICS.md', 'outlined kinds, destroyable kinds'],
  ['docs/STRATEGY.md', 'the plan and its dependencies'],
  ['src/criteria/RoadRule.js', 'the photograph layer'],
  ['src/criteria/SkyRule.js', 'the sky'],
  ['src/criteria/FacadeRule.js', 'the buildings'],
  ['src/criteria/OutlineRule.js', 'outlines'],
  ['src/criteria/DestructionRule.js', 'destruction'],
  ['tools/chain.mjs', 'the chain'],
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
const must = ['THE CRITICAL BUG', 'A conversion pipeline cannot produce a construction result',
  'An outline that marks everything marks nothing', 'gates **showing**', 'named after the requirement'];
const gone = must.filter((m) => !pre.includes(m));
if (gone.length) {
  console.log(`PREFLIGHT FAILED: the preamble lost ${gone.length} of its load-bearing statements: ${gone.join(' · ')}`);
  process.exit(1);
}
const criteria = (readFileSync('docs/CRITERIA.md', 'utf8').match(/^\|\s*[A-Z]\d+\s*\|/gm) || []).length;
const composition = (readFileSync('docs/COMPOSITION.md', 'utf8').match(/^\|\s*\d+\s*\|/gm) || []).length;
console.log(`PREFLIGHT OK — ${REQUIRED.length} parts present, the preamble carries all ${must.length} load-bearing statements.`);
console.log(`  criteria: ${criteria} rows · composition: ${composition} elements · the chain: preflight -> criteria -> composition -> suite -> delivery -> reference`);
console.log('  read: docs/PREAMBLE.md (task, definition of done, critical findings, chain, protocol)');
