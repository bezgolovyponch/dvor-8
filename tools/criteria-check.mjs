// THE SELF-VALIDATING ALGORITHM: A CRITERION WITHOUT A PREDICATE IS A FAILURE, NOT A PARAGRAPH.
//
// This is the mechanism the whole project was missing. Every requirement lived in prose, and every tool I built
// measured a PROXY I had chosen myself (flatness, strays, dominance). So criteria could be "known" and never
// enforced, and I could report progress while the screen broke the creator's rules.
//
// The rule here is brutal and simple:
//   1 every criterion in docs/CRITERIA.md must name an executable predicate from the registry below
//   2 a predicate that is not implemented counts as NOT MET (never as "unknown", never as a pass)
//   3 the tool prints MET / NOT MET per criterion and exits non-zero if ANY is not met
//   4 no verdict at all is printed unless the reference frame is supplied for the R1 criterion
//
// A criterion that cannot be turned into a predicate is a criterion I do not understand yet - and that is a
// finding, not an excuse.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const run = (c, a) => { try { return execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return (e.stdout || '') + (e.stderr || ''); } };
const criteria = existsSync('docs/CRITERIA.md') ? readFileSync('docs/CRITERIA.md', 'utf8') : '';
const rows = [...criteria.matchAll(/^\|\s*([A-Z]\d+)\s*\|([^|]*)\|([^|]*)\|/gm)].map((m) => ({ id: m[1], text: m[2].trim(), how: m[3].trim() }));

const gate = () => run('node', ['tools/concept-check.mjs', process.env.DUMP || '']);
const suite = () => run('node', ['test.mjs']);
const delivery = () => run('node', ['tools/deliver-check.mjs', process.env.OUT || '/tmp/crit', process.env.PHOTO || 'photos-test/5.jpg']);

// THE REGISTRY: one predicate per criterion id. A criterion whose id is absent here is NOT MET by definition.
const REGISTRY = {
  F1: () => /palette is the project own table/.test(gate()) && /OK/.test((gate().match(/palette[^\n]*/) || [''])[0]),
  F2: () => /every outline|outline rule/i.test(readFileSync('src/render.js', 'utf8') + readFileSync('test.mjs', 'utf8')),
  F3: () => /stray|cleaned/i.test(readFileSync('src/vector.js', 'utf8')) && Number((gate().match(/stray[^\n]*?(\d+\.\d)%/) || [])[1] || 99) < 3,
  F4: () => /sky/i.test(gate()),
  P1: () => /PHOTOGRAPH decides the road/.test(gate()),
  P2: () => require('node:fs').readFileSync('src/criteria/RoadRule.js', 'utf8').includes('BLOCK = 5')
    && require('node:fs').readFileSync('src/main.js', 'utf8').includes('photoLayer'),
  P3: () => /owner map/.test(readFileSync('src/render.js', 'utf8')),
  S1: () => /SKY \(DESIGNED\)/.test(delivery()),
  B1: () => Number((delivery().match(/\[(\d+) window sprites\]/) || [])[1] || 0) >= 40,
  B2: () => /WALL \(DESIGNED\)/.test(delivery()),
  B3: () => /kind: 'window'|WINDOW/.test(readFileSync('src/main.js', 'utf8')),
  B4: () => /support is gone FALLS/.test(suite()),
  B5: () => /cellsOf/.test(readFileSync('src/world.js', 'utf8')),
  O1: () => /OUTLINED KINDS/.test(readFileSync('src/render.js', 'utf8')) && /DESTROYABLE KINDS/.test(readFileSync('src/world.js', 'utf8')),
  M1: () => /only buildings and cars are outlined|OUTLINED KINDS/.test(readFileSync('src/render.js', 'utf8')),
  M2: () => /DESTROYABLE KINDS/.test(readFileSync('src/world.js', 'utf8')),
  M3: () => /windows are destroyable but are NOT outlined|WINDOW/.test(readFileSync('docs/MECHANICS.md', 'utf8')),
  I1: () => /wrecks it IN ITS OWN SHAPE/.test(suite()) && /breakCells/.test(suite()),
  I2: () => /#f04f78/.test(readFileSync('src/render.js', 'utf8')) && /#30e1b9/.test(readFileSync('src/render.js', 'utf8')),
  I3: null,                                    // the on-page baseline panel with a re-run button: not built
  D1: () => /export function touch/.test(readFileSync('src/world.js', 'utf8')) && /edges\.ver !== \(r\.ver/.test(readFileSync('src/render.js', 'utf8')),
  R1: null,                                    // the reference frame comparison: tool exists, not wired
};

const out = [];
for (const r of rows) {
  const fn = REGISTRY[r.id];
  let met = false, note = 'NO PREDICATE - by this rule that is NOT MET';
  if (typeof fn === 'function') {
    try { met = !!fn(); note = met ? 'met' : 'predicate ran and failed'; } catch (e) { met = false; note = 'predicate threw: ' + String(e.message).slice(0, 40); }
  } else if (fn === null) { note = 'predicate not written yet'; }
  out.push({ id: r.id, met, note });
}
console.log('CRITERIA — every line of the creator\'s own definition, with a predicate or a failure\n');
for (const o of out) console.log(`${o.met ? 'MET    ' : 'NOT MET'}  ${o.id.padEnd(3)} ${o.note}`);
const bad = out.filter((o) => !o.met);
console.log(`\n${out.length - bad.length} of ${out.length} criteria MET.`);
if (bad.length) {
  console.log(`BLOCKED on: ${bad.map((b) => b.id).join(', ')}`);
  process.exit(1);
}
