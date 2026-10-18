// THE PROSE MUST QUOTE THE TOOL. Every defect of the last rounds had one shape: a number or a claim that was true when
// written and drifted away from the product (the sheet quoting 0.173, the README quoting 221 checks, a picture of a
// build two days older). This gate closes the class for NUMBERS: it asks the tools what they print, then reads the
// documents the operator is pointed at and fails when a document states a different figure.
//
// The historical reports (AUDIT-REPORT, CROSS-AUDIT-FINDINGS, BASELINE-TRIAGE) are EXEMPT BY CONSTRUCTION: each carries
// the line "THIS FILE IS HISTORY" at its top, and their numbers must stay as written.
//
//   node tools/docs-check.mjs   ->  exit 0 only when the current documents agree with the tools.
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const suiteOut = run('node', ['test.mjs']);
const suite = { pass: Number((suiteOut.match(/PASS (\d+)/) || [])[1]), fail: Number((suiteOut.match(/FAIL (\d+)/) || [])[1]) };
const baseOut = run('node', ['tools/baseline-check.mjs']);
const base = { ok: Number((baseOut.match(/BASELINE (\d+) OK/) || [])[1]), fail: Number((baseOut.match(/(\d+) FAIL/) || [])[1]) };

const CURRENT = ['README.md', 'docs/DONE-EVIDENCE.md', 'docs/OWNER-CAPTURES.md', 'docs/MECHANICS.md', 'docs/DECISIONS.md'];
const HISTORY = new Set(['docs/AUDIT-REPORT.md', 'docs/CROSS-AUDIT-FINDINGS.md', 'docs/BASELINE-TRIAGE.md']);
// ONLY THE DOCUMENTS THE OPERATOR IS POINTED AT. The rest of docs/ is design notes and dated audits; a first version of
// this gate read them all and reported 31 "mismatches" that were simply old papers (structure.md's 109 checks,
// request-audit's 287). Those are history by their own nature, and gating them would force a rewrite of the record.
const files = CURRENT.filter((f) => !HISTORY.has(f));

const problems = [];
for (const f of files) {
  let text = '';
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  if (text.includes('THIS FILE IS HISTORY')) continue;
  // "N checks" claims must equal the suite's PASS count
  for (const m of text.matchAll(/(\d{2,4})\s+checks/gi)) {
    const n = Number(m[1]);
    if (n !== suite.pass) problems.push(`${f}: says "${m[0]}", the suite prints PASS ${suite.pass}`);
  }
  // "X OK ... of Y" baseline claims must equal the baseline's own figures
  for (const m of text.matchAll(/(\d{1,2})\s*OK\s*(?:\/\s*(\d{1,2}))?/gi)) {
    const ok = Number(m[1]);
    if (ok !== base.ok) problems.push(`${f}: says "${m[0]}", the baseline prints ${base.ok} OK`);
  }
  // an explicitly withdrawn figure must not be repeated as current
  for (const dead of ['313 of 320', '32 OK', '18 FAIL', '221 checks']) {
    if (text.includes(dead)) problems.push(`${f}: repeats the withdrawn figure "${dead}"`);
  }
}
console.log(`PREMISES: the suite prints PASS ${suite.pass} FAIL ${suite.fail}; the baseline prints ${base.ok} OK / ${base.fail} FAIL; `
  + `${files.length} current documents read, ${HISTORY.size} historical reports exempt.`);
if (problems.length) {
  for (const p of problems) console.log(`DOCS FAIL  ${p}`);
  console.log(`\nDOCS: ${problems.length} claim(s) do not match the tools.`);
  process.exit(1);
}
console.log('\nDOCS OK: every current document quotes the tools it is about.');
