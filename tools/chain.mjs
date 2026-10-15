// THE BULLETPROOF ACTION CHAIN — the one command every request follows, in the order the dependencies impose.
//
// The project kept losing track because each round began wherever attention landed: a render pass, a doc, a
// measurement. This chain is the answer to "what do I do now" and it cannot be skipped, because each step refuses to
// pass the baton when it fails, and the failure names the next action.
//
//   1 CRITERIA     every criterion of the creator's own definition has a predicate, and it is MET
//   2 COMPOSITION  every element of the accepted frame is bound to requirement -> class -> baseline -> predicate
//   3 SUITE        the behaviour is right (node test.mjs)
//   4 DELIVERY     the twelve mandatory lines, including the definition of done and the criteria file
//   5 REFERENCE    the frame against the accepted frame, art against art (when art is supplied)
//
// Step 5 is the gate on SHOWING anything; steps 1-4 are the gate on CONTINUING.
import { execFileSync } from 'node:child_process';
const run = (cmd, args, env = {}) => { try { return { out: execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } }), code: 0 }; } catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), code: e.status ?? 1 }; } };

const steps = [
  ['0 PREFLIGHT', 'node', ['tools/preflight.mjs'], {}],
  ['0b IMPORTS', 'node', ['tools/undefined-check.mjs'], {}],
  ['1 CRITERIA', 'node', ['tools/criteria-check.mjs'], {}],
  ['2 COMPOSITION', 'node', ['tools/composition-check.mjs'], {}],
  ['3 SUITE', 'node', ['test.mjs'], {}],
  ['4 DELIVERY', 'node', ['tools/deliver-check.mjs', process.env.OUT || '/tmp/chain', process.env.PHOTO || 'photos-test/v10a.jpg', 'ЦУНАМИ'], {}],
];
// STEP 6 - THE PAGE GATE. Every other gate tests code in isolation from the page: the suite calls trace() and
// makeWorld() in Node, so it never touches the file input, the decode, the detector, the build or the HUD. That is
// how a missing import could ship while 320 checks passed - the phone found it. This step drives the REAL page on a
// REAL photograph and refuses to pass unless a yard was actually built (left > 0) and the console is clean.
{
  const out = process.env.PAGE_OUT || '/tmp/chain-page';
  const { out: pageOut } = run('node', ['--experimental-websocket', 'tools/photo-shot.mjs', out, process.env.PHOTO || 'photos-test/v10a.jpg', 'ЦУНАМИ'],
    { BASE: process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1' });
  const built = /"step":"built"[^}]*"left":"(\d+)"/.exec(pageOut);
  const errs = /"step":"errors","errors":\[([^\]]*)\]/.exec(pageOut);
  const left = built ? Number(built[1]) : 0;
  const clean = errs ? errs[1].trim().length <= 2 : false;
  const ok = left > 0 && clean;
  console.log(`${ok ? 'PASS' : 'FAIL'}  6 PAGE         a yard built from a real photograph: left ${left}, console ${clean ? 'clean' : 'DIRTY'}`);
  if (!ok) {
    console.log('\nTHE CHAIN STOPPED AT 6 PAGE. A page gate that cannot build a yard verifies nothing: the suite, the criteria and the composition all passed while the real path was broken.');
    process.exit(1);
  }
}
// STEP 6b - THE COLOUR-COLLAPSE GATE, on the frame step 6 just drew. Every other check passed while the frame was
// 96% one colour family; this is the one that asks whether the picture uses the families the photograph uses.
{
  const dump = (process.env.PAGE_OUT || '/tmp/chain-page') + '/canvas.json';
  const { out: fam, code } = run('node', ['tools/family-check.mjs', dump], {});
  const last = fam.trim().split('\n').filter(Boolean).slice(-1)[0];
  console.log(`${code === 0 ? 'PASS' : 'FAIL'}  6b FAMILIES    ${last.slice(0, 120)}`);
  if (code !== 0 && !process.env.KEEP_GOING) {
    console.log('\nTHE CHAIN STOPPED AT 6b FAMILIES: the drawn frame does not use the families the photograph uses.');
    process.exit(1);
  }
}
if (process.env.REFERENCE) steps.push(['5 REFERENCE', 'node', ['tools/reference-check.mjs', (process.env.OUT || '/tmp/chain') + '/canvas.json', process.env.REFERENCE], {}]);

console.log('THE CHAIN — each step must pass before the next is read\n');
let stopped = null;
for (const [name, cmd, args, env] of steps) {
  const { out, code } = run(cmd, args, env);
  const last = out.trim().split('\n').filter(Boolean).slice(-2).join(' | ');
  console.log(`${code === 0 ? 'PASS' : 'FAIL'}  ${name.padEnd(14)} ${last.slice(0, 130)}`);
  if (code !== 0 && !stopped) { stopped = name; if (!process.env.KEEP_GOING) break; }
}
if (stopped) {
  console.log(`\nTHE CHAIN STOPPED AT ${stopped}. The failures above name the next action; nothing is shown until it passes.`);
  process.exit(1);
}
console.log('\nTHE CHAIN PASSED — every criterion, every binding, the suite and the rule. The frame may be shown.');
