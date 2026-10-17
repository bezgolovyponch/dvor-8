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

// THE FRAME THE CRITERIA GATE MEASURES IS THE ONE THE PAGE BLOCK WROTE. Four of the creator's criteria are
// measurements OF A FRAME (palette table, stray share, sky band, the photograph deciding the road), and the gate
// used to be called with no frame at all - so it reported a failure of the picture when it had been handed nothing.
// The PAGE block below runs before these steps and writes exactly this dump.
const DUMP = (process.env.PAGE_OUT || '/tmp/chain-page') + '/canvas.json';
const steps = [
  ['0 PREFLIGHT', 'node', ['tools/preflight.mjs'], {}],
  ['0b IMPORTS', 'node', ['tools/undefined-check.mjs'], {}],
  ['1 CRITERIA', 'node', ['tools/criteria-check.mjs'], { DUMP }],
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
        // CLEAN AND OFFLINE (docs/DETERMINISM.md R2): ?clean=1 removes overlays and grades, and ?news=0 removes the news
    // flights - whose HEADLINE IS DRAWN INTO THE CANVAS (render.js plane()/ship() write it with the 5x7 font). Without
    // news=0 the gate dumps carried a live headline across the top of the frame; measured on the same page: the
    // ticker's paper was 16% of the sky band.
    { BASE: process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=7.5' });
  // THE STEP LINES ARE JSON: READ THEM AS JSON. A regex over the harness's stdout reported `left 0, console DIRTY`
  // for a page that was in fact clean (`errors: []`), which is the fourth time one of my instruments described
  // itself instead of the thing it measured. Each line the harness prints IS a JSON object; the last one for a
  // step is that step's result.
  const stepsOf = new Map();
  for (const line of pageOut.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    try { const o = JSON.parse(t); if (o && o.step) stepsOf.set(o.step, o); } catch { /* not a step line */ }
  }
  // A MISSING STEP IS NOT A PASSING ZERO: `left ?? 0` and `errors ?? []` once turned a harness that could not start
  // its browser into the reassuring line "left 0, console clean". The two steps must EXIST, and the left count is
  // then read from the built step and the console from the errors step.
  const builtStep = stepsOf.get('built'), errStep = stepsOf.get('errors');
  const left = builtStep ? Number(builtStep.left) : NaN;
  const clean = errStep ? (errStep.errors || []).length === 0 : false;
  const ok = Number.isFinite(left) && left > 0 && clean;
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
// STEP 6c - THE PAIRING GATE. The check this project never had: does what we DREW sit where the PHOTOGRAPH says it
// should? It compares the frame against the photograph itself (both art, both 288x512, the photograph reduced by the
// same 5x5 area mean the game uses), so no phone screenshot is involved and no opinion is required. Its first run
// found the greedy sky that paints over buildings on four of six real photographs.
{
  const dump = (process.env.PAGE_OUT || '/tmp/chain-page') + '/canvas.json';
  const photo = process.env.PHOTO || 'photos-test/v10a.jpg';
  const r = run('node', ['tools/pairing-check.mjs', photo, dump], {});
  const line = r.out.trim().split('\n').filter((l) => /IoU|PAIRED|PREMISES/.test(l)).slice(-2).join(' · ');
  console.log(`${r.code === 0 ? 'PASS' : 'FAIL'}  6c PAIRING    ${line.slice(0, 140)}`);
  if (r.code !== 0 && !process.env.KEEP_GOING) {
    console.log('\nTHE CHAIN STOPPED AT 6c PAIRING: the frame is not built on the photograph\'s own layout.');
    process.exit(1);
  }
}
// STEP 6d - THE REFERENCE-PALETTE GATE. "Why aren't you comparing it to the requested frame?" - because nothing
// mechanical did. This step measures OUR frame's defining roles (sky, clouds, darks) against the roles extracted from
// the creator's accepted frame, and it fails on a hue or saturation gap. Its first run: sky hue off 11 degrees and
// saturation off 0.36 (rgb(86,118,185) against the accepted rgb(77,156,232)); clouds and darks already match.
{
  const dump = (process.env.PAGE_OUT || '/tmp/chain-page') + '/canvas.json';
  const r = run('node', ['tools/reference-palette-check.mjs', dump], {});
  const line = r.out.trim().split('\n').filter((l) => /^(sky|cloud|dark) |MATCH|DOES NOT/.test(l)).slice(-1)[0];
  console.log(`${r.code === 0 ? 'PASS' : 'FAIL'}  6d REFERENCE  ${(line || '').slice(0, 140)}`);
  if (r.code !== 0 && !process.env.KEEP_GOING) {
    console.log('\nTHE CHAIN STOPPED AT 6d REFERENCE: the frame does not use the accepted frame\'s colours.');
    process.exit(1);
  }
}
// STEP 6e - THE MATCH GATE. It was MISSING FROM THE CHAIN, which is how "CHAIN GREEN" stayed true while
// `node tools/match-check.mjs` exited 1 on every dump (6 of 7: the mid-rise's checkerboard). A chain that omits a
// red gate is not a chain: this step runs it on the frame PAGE just wrote, gates SHOWING like the others, and the
// operator's own DONE list names match 7/7.
{
  const dump = (process.env.PAGE_OUT || '/tmp/chain-page') + '/canvas.json';
  const r = run('node', ['tools/match-check.mjs', dump], {});
  const line = r.out.trim().split(String.fromCharCode(10)).filter((l) => /lines match|NOT THE EXAMPLE|IN THE EXAMPLE/.test(l)).slice(-1)[0];
  console.log(`${r.code === 0 ? 'PASS' : 'FAIL'}  6e MATCH      ${(line || '').slice(0, 140)}`);
  if (r.code !== 0 && !process.env.KEEP_GOING) {
    console.log('\nTHE CHAIN STOPPED AT 6e MATCH: the frame does not match the accepted example. A chain that omits a red gate is not a chain.');
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
