// THE EXTERNALLY VERIFIABLE VERIFICATION — one command, every claim, each one recomputable by a stranger.
//
// The operator's final requirement: "the confirmation gates MUST BE EXTERNALLY verifiable". So this tool does not trust the
// app, my prose, or any artefact I produced. For every claim it either (a) recomputes an artefact from a PUBLISHED source,
// or (b) runs a gate whose input and output are both files a third party has, and prints a digest of the result. If a step
// cannot be recomputed, it says so instead of passing.
//
//   node tools/verify.mjs
//
// The published sources it recomputes from:
//   tools/v13/engine-v13.txt      the operator's engine, as extracted (sha256 pinned)
//   reference/TARGET.webp         the published look
//   reference/PAIRING.md          the input->output pairing of the judged photograph
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const rows = [];
const add = (claim, how, ok, detail) => { rows.push({ claim, how, ok, detail }); };

// 1 THE ENGINE IS THE EXTRACTION, BY RECONSTRUCTION. A stranger regenerates the module from the published extraction and
//   gets the file in the tree: no hand edit can hide, and no "declared deviation" can exist unobtrusively.
try {
  const before = sha('src/ref/engine.js');
  execFileSync('node', ['tools/v13/make-module.mjs'], { encoding: 'utf8' });
  const after = sha('src/ref/engine.js');
  add('engine module = f(extraction)', 'node tools/v13/make-module.mjs', before === after, `sha ${after.slice(0, 16)}…  (extraction ${sha('tools/v13/engine-v13.txt').slice(0, 16)}…)`);
} catch (e) { add('engine module = f(extraction)', 'make-module.mjs', false, String(e.message).slice(0, 90)); }

// 2 THE EXTRACTION IS THE PRISTINE SLICE, BY ITS OWN DIGEST.
const EXTRACT = 'ea0273fee448126ec074c9f69c8833834a5710bd9afc4d2da0a0fd19e1886279';
add('extraction untouched', 'sha256 tools/v13/engine-v13.txt', sha('tools/v13/engine-v13.txt') === EXTRACT, sha('tools/v13/engine-v13.txt').slice(0, 16) + '…');

// 3 THE PUBLISHED LOOK'S RULES, RECOMPUTED FROM THE TARGET ITSELF (not from any frame of mine).
try {
  const t = execFileSync('node', ['tools/concept-audit.mjs', 'reference/TARGET.webp', 'reference/TARGET.webp'], { encoding: 'utf8' });
  add('target rules readable from the published artefact', 'node tools/concept-audit.mjs reference/TARGET.webp (self)', t.includes('THE CONCEPT'), t.split('\n').filter((l) => /tones in use|warm pixels|detail \(/.test(l)).map((l) => l.trim().slice(0, 40)).join(' · '));
} catch (e) { add('target rules readable', 'concept-audit', false, String(e.message).slice(0, 90)); }

// 4 THE JUDGED PAIRING EXISTS AND IS THE ONE THE PROJECT CLAIMS.
const pairing = existsSync('reference/PAIRING.md') ? readFileSync('reference/PAIRING.md', 'utf8') : '';
add('the judged pairing is a published document', 'reference/PAIRING.md', pairing.includes('photos-test/v10a.jpg') && /TARGET\.webp|v10a-target\.webp/.test(pairing), 'input v10a.jpg -> the accepted frame');

// 5 THE BROWSER GATES ARE RECOMPUTABLE, BUT NOT HERE: they need a running server and a browser, so this tool names them and
//   the exact command instead of faking a pass.
const browserGates = [
  ['engine runs + stage numbers', 'CHROME=… node --experimental-websocket tools/engine-check.mjs'],
  ['damage identity', 'CHROME=… node --experimental-websocket tools/damage-check.mjs'],
  ['engine semantics (one step per throw)', 'CHROME=… node --experimental-websocket tools/engine-semantics-check.mjs'],
  ['HUD geometry vs the .dc.html', 'CHROME=… node --experimental-websocket tools/html-audit.mjs'],
  ['disasters visible (4)', 'CHROME=… node --experimental-websocket tools/disaster-check.mjs'],
  ['the look as rules on the drawn canvas', 'CHROME=… node tools/concept-step.mjs'],
  ['no verified number regresses', 'CHROME=… node --experimental-websocket tools/ledger-check.mjs'],
];

console.log('THE VERIFICATION — every claim recomputed from a published source, or named as a command a stranger can run');
for (const r of rows) console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.claim.padEnd(46)} ${r.how.padEnd(46)} ${r.detail}`);
console.log('\nrecomputable browser gates (each prints its own numbers, each refuses on a mismatch):');
for (const [name, cmd] of browserGates) console.log(`      ${name.padEnd(40)} ${cmd}`);
const bad = rows.filter((r) => !r.ok).length;
console.log(`\n${bad ? 'VERIFICATION FAILED: ' + bad + ' claim(s)' : 'VERIFICATION: every claim above is recomputed from a published artefact; the browser gates print their own numbers.'}`);
process.exit(bad ? 1 : 0);
