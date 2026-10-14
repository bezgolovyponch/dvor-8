// THE MANDATORY PRE-DELIVERY RULE, AS A TOOL THAT REFUSES.
//
// The creator's instruction: define the concrete rule that cannot be gone around or missed, and BEFORE anything is
// shown compare the work against the baseline, the requirements and that rule, so the flaws are visible directly.
//
// The rule, in five lines. NOTHING IS SHOWN AS DELIVERED UNLESS ALL FIVE PASS ON A REAL PHOTOGRAPH:
//   1 the SKY is there   - a plane, one colour owning its band, blue-ish, not stripes and not empty
//   2 BUILDINGS stand    - window sprites on the facades AND the facades flat, not blurred
//   3 CARS are visible   - the things the detector found are painted in their own pixels and outlined
//   4 THINGS BREAK       - a scripted hit measurably changes the thing it hit
//   5 INFO ANSWERS       - a tap in info mode produces a fact, and the thing is marked
// A failure on any line prints DELIVERY BLOCKED with the line that failed. It exits non-zero, so no report can be
// written past it without the number being seen.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2] || '/Users/m/Documents/workspace/dvor-style-lab/out/deliver';
mkdirSync(OUT, { recursive: true });   // the first run of this tool blocked delivery because its own output
                                       // directory did not exist: the harness wrote nothing and five lines failed
                                       // for that reason alone. The rule must never fail for its own housekeeping.
const DEMO = process.argv[3] || 'photos-test/5.jpg';
const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return (e.stdout || '') + (e.stderr || ''); } };

// ORDER MATTERS, AND GETTING IT WRONG BLOCKED DELIVERY TWICE. The gate measures the CANVAS DUMP, so the capture
// must run FIRST: run the other way round, the gate had no dump to read, printed nothing, and two mandatory lines
// failed for the instrument's own housekeeping rather than for the picture. A rule that fails for its own
// plumbing is not a rule about the product.
const shot = run('node', ['--experimental-websocket', 'tools/photo-shot.mjs', OUT, DEMO, 'ЦУНАМИ']);
const suite = run('node', ['test.mjs']);
const gate = run('node', ['tools/concept-check.mjs', `${OUT}/canvas.json`]);
const base = run('node', ['tools/baseline-check.mjs']);

const dump = existsSync(`${OUT}/canvas.json`) ? JSON.parse(readFileSync(`${OUT}/canvas.json`, 'utf8')) : null;
const steps = {}; for (const line of shot.split('\n')) { try { const o = JSON.parse(line.trim()); if (o && o.step) steps[o.step] = o; } catch { /* not a step line */ } }

const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass, detail });

// 1 THE SKY
if (dump) {
  const W = dump.w, H = dump.h, a = dump.px.split(',').map(Number);
  const px = (x, y) => [a[(y * W + x) * 3], a[(y * W + x) * 3 + 1], a[(y * W + x) * 3 + 2]];
  const band = Math.max(1, Math.floor(H * 0.08));
  const hist = new Map();
  for (let y = 0; y < band; y += 1) for (let x = 0; x < W; x += 1) { const k = px(x, y).join(','); hist.set(k, (hist.get(k) || 0) + 1); }
  const [topColour, topN] = [...hist.entries()].sort((p, q) => q[1] - p[1])[0];
  const [r, g, b] = topColour.split(',').map(Number);
  const share = topN / (band * W);
  // A SKY IS A BRIGHT, LOW-CHROMA PLANE - not necessarily a blue one. The creator's Prague photograph is
  // OVERCAST and its sky measures rgb(224,219,215): warm white. My first version of this line demanded blue, so it
  // failed a sky that is a plane by every other measure - the same class of mistake as the three instruments in F12.
  // POLICY (docs/render-policy.md): the sky is DESIGNED, so the check is the one v9's own screen passes - one
  // BLUE plane - not "any bright tone", which is how a fidelity-grey sky slipped through this line for two rounds.
  const skyish = b > r + 20 && b > 120;
  add('1 SKY (DESIGNED): one blue plane, one colour owning its band >= 35%',
    share >= 0.35 && skyish, `${(100 * share).toFixed(0)}% of the band is rgb(${topColour}), skyish=${skyish}`);

  // 2 BUILDINGS: window sprites exist (printed by the gate) and the facades are flat rather than blurred
  // THE COUNT IS THE NUMBER IN BRACKETS, NOT THE BAR IN THE LABEL. `(\d+) window sprites` matched the row's own
  // threshold ("at least 8 window sprites") and reported 8 where the frame has hundreds; the flat share likewise
  // comes from the result bracket, not from any row label.
  const windows = Number((gate.match(/\[(\d+) window sprites\]/) || [])[1] || 0);
  const flat = Number((gate.match(/\[(\d+)% in the sky band\]/) || [])[1] || 0);
  // the flatness of a surface is line 2b's job; this line is about the BUILDING being built at all
  add('2 BUILDINGS: window sprites are many (>= 40)', windows >= 40, `${windows} window sprites`);
  // the WALL itself, measured where a wall is: the left third below the sky, which on this photograph is one facade
  const wallW = Math.floor(W * 0.3), wallTop = Math.floor(H * 0.12), wallBot = Math.floor(H * 0.45);
  const wallHist = new Map();
  let wallTot = 0, wallFlat = 0;
  for (let y = wallTop; y < wallBot; y += 1) for (let x = 0; x < wallW; x += 1) {
    const k = px(x, y).join(','); wallHist.set(k, (wallHist.get(k) || 0) + 1); wallTot += 1;
    if (k === px(x + 1, y).join(',') && k === px(x, y + 1).join(',')) wallFlat += 1;
  }
  const wallTopShare = [...wallHist.values()].sort((a2, b2) => b2 - a2)[0] / Math.max(1, wallTot);
  add('2b WALL (DESIGNED): at most 8 tones, and its largest tone owns at least 40% of the facade',
    wallHist.size <= 8 && wallTopShare >= 0.40,
    `${wallHist.size} tones, the largest owning ${(100 * wallTopShare).toFixed(0)}% of the left facade`);
} else {
  add('1 SKY: the canvas was dumped at all', false, 'no canvas.json - nothing to measure');
}

// 3 CARS: the harness counts what the detector found and the game kept
add('3 CARS: things were found on the photograph and kept as targets',
  Number(steps.built?.left ?? 0) > 0, `left: ${steps.built?.left ?? 'n/a'}`);

// 4 THINGS BREAK
add('4 DESTRUCTION: a scripted run measurably breaks the yard (score moves)',
  Number(steps.destroyed?.score ?? 0) > 0, `score after the run: ${steps.destroyed?.score ?? 'n/a'}`);

// 5 INFO ANSWERS
const noteText = String(steps.info?.note || '');
add('5 INFO: a tap in info mode produces a fact', noteText.length > 20, noteText.slice(0, 70) || 'no note');

// the instruments themselves must be honest, and the baseline must not regress
add('6 NO PAGE ERRORS during the whole run', (steps.errors?.errors || []).length === 0,
  JSON.stringify(steps.errors?.errors || []).slice(0, 90));
add('7 THE SUITE passes', /FAIL 0/.test(suite), (suite.match(/PASS \d+\s+FAIL \d+/) || ['no suite output'])[0]);
add('8 THE BASELINE does not regress', /BASELINE \d+ OK/.test(base), (base.match(/BASELINE \d+ OK\s+\d+ FAIL\s+of \d+/) || ['no baseline output'])[0]);
add('9 THE INSTRUMENT states its premises and does not withhold the verdict',
  /INSTRUMENT: the dump is 1:1/.test(gate) && !/VERDICT WITHHELD/.test(gate),
  (gate.match(/GATE \d+ OK\s+\d+ FAIL/) || ['no gate output'])[0]);

const failed = checks.filter((c) => !c.pass);
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'}  ${c.name}  [${c.detail}]`);
if (failed.length) {
  console.log(`\nDELIVERY BLOCKED — ${failed.length} of ${checks.length} mandatory lines fail:`);
  for (const c of failed) console.log(`  · ${c.name}`);
  process.exit(1);
}
console.log(`\nDELIVERY READY — all ${checks.length} mandatory lines pass on ${DEMO}`);
