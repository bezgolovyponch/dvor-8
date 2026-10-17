// G-DET-ANALYZE: THE ANALYZER IS A FUNCTION OF THE DUMP, AND OF NOTHING ELSE.
//
// docs/DETERMINISM.md R5 and §4: the frame gate (G-DET-FRAME) says the BUILD is reproducible; this gate says the
// MEASUREMENT is. Same stored canvas dump + same code => the same numbers, byte for byte - otherwise a number
// quoted against another number is quietly a different run of the tool, which is the failure the contract exists
// to prevent. Two existing analyzers are run TWICE each on the SAME dump file, their stdout is written to two temp
// files per tool, and the files are compared byte for byte. Neither analyzer is touched: this gate only runs them.
//
// ONE DUMP, NOT A COPY: the file is the same path both times and its sha256 is printed before and after the runs,
// so "the same input" is evidence rather than an assumption. A MISSING dump withholds the verdict (exit 2) - an
// absent input is not a passing zero - and so does an analyzer that prints nothing: two empty outputs are not
// "identical bytes", they are two failures that agree.
//
// Usage: node tools/detgate-analyze.mjs [canvas.json]   (default /tmp/det-a/canvas.json, the dump G-DET-FRAME makes)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));   // the analyzers are root-relative by their own design
const DUMP = resolve(ROOT, process.argv[2] || process.env.DUMP || '/tmp/det-a/canvas.json');
const PHOTO = process.env.PHOTO || 'photos-test/v10a.jpg';
const OUT = '/tmp/det-analyze';
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

if (!existsSync(DUMP)) {
  console.log(`G-DET-ANALYZE VERDICT WITHHELD: no dump at ${DUMP} - there is nothing to analyze twice.`);
  process.exit(2);
}
const before = readFileSync(DUMP);
let d = null;
try { d = JSON.parse(before.toString('utf8')); } catch { /* named below */ }
if (!d || !d.px) {
  console.log(`G-DET-ANALYZE VERDICT WITHHELD: ${DUMP} carries no pixels (keys: ${d ? Object.keys(d).join(', ') : 'not JSON'}) - not a canvas dump.`);
  process.exit(2);
}

mkdirSync(OUT, { recursive: true });
const run = (args) => {
  const r = spawnSync('node', args, { cwd: ROOT, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  return { out: r.stdout || Buffer.alloc(0), err: r.stderr || Buffer.alloc(0), code: r.status };
};

// the two read-only analyzers that take a dump; style-check needs the photograph as well (its own sky IoU premise)
const TOOLS = [
  { name: 'match-check', args: () => ['tools/match-check.mjs', DUMP] },
  { name: 'style-check', args: () => ['tools/style-check.mjs', DUMP, PHOTO] },
];
console.log(`PREMISES: one stored dump ${DUMP} (${d.w}x${d.h}, ${d.w * d.h} px, sha256 ${sha(before).slice(0, 16)}) · each analyzer run TWICE by node on the SAME file, never on a copy · stdout compared byte for byte · photo ${PHOTO} for style-check · each analyzer's own exit code is recorded, not judged (this gate measures reproducibility, not the frame)`);

let differs = 0, silent = 0;
for (const t of TOOLS) {
  const passes = ['a', 'b'].map((pass) => {
    const r = run(t.args());
    const file = `${OUT}/${t.name}-${pass}.txt`;
    writeFileSync(file, r.out);
    return { ...r, file };
  });
  const [A, B] = passes;
  let common = 0;
  while (common < A.out.length && common < B.out.length && A.out[common] === B.out[common]) common += 1;
  const same = A.out.length === B.out.length && common === A.out.length;
  const n = Math.max(A.out.length, B.out.length);
  console.log(`${(same ? 'IDENTICAL' : 'DIFFERS').padEnd(9)}  ${t.name.padEnd(11)} identical bytes: ${same ? n : common}/${n} · exit ${A.code}/${B.code} · files ${A.file} · ${B.file}`);
  if (!same) {
    differs += 1;
    console.log(`   first difference at byte ${common}: ${JSON.stringify(A.out.slice(common, common + 80).toString())} vs ${JSON.stringify(B.out.slice(common, common + 80).toString())}`);
    const d2 = spawnSync('diff', ['-u', A.file, B.file], { encoding: 'utf8' });   // the two temp files, diffed as files
    if (d2.stdout) console.log(d2.stdout.split('\n').slice(0, 20).join('\n'));
  }
  if (!A.out.length) {
    silent += 1;
    console.log(`   PREMISE FAILED: ${t.name} printed nothing, so "identical" would be two failures agreeing.`);
  }
  if (A.err.length || B.err.length) console.log(`   stderr ${A.err.length}/${B.err.length} bytes: ${JSON.stringify(A.err.slice(0, 200).toString())}`);
}
const after = sha(readFileSync(DUMP));
console.log(`DUMP UNCHANGED BY THE FOUR RUNS: sha256 ${after.slice(0, 16)} (${after === sha(before) ? 'identical to before' : 'CHANGED'}), so both runs of each tool read the same bytes`);
if (silent) {
  console.log(`G-DET-ANALYZE VERDICT WITHHELD: ${silent} analyzer(s) produced no output - there is no measurement to compare.`);
  process.exit(2);
}
console.log(differs
  ? `G-DET-ANALYZE FAIL: ${differs} analyzer(s) did not reproduce their own output on the same dump.`
  : `G-DET-ANALYZE PASS: match-check and style-check each printed identical bytes twice on the same dump.`);
process.exit(differs ? 1 : 0);
