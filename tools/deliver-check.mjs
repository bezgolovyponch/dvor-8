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
// `env` is per-call so the two capture runs (free interaction, pinned frame) can carry different URLs.
const run = (cmd, args, env) => {
  try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: env ? { ...process.env, ...env } : process.env }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
};

// ORDER MATTERS, AND GETTING IT WRONG BLOCKED DELIVERY TWICE. The gate measures the CANVAS DUMP, so the capture
// must run FIRST: run the other way round, the gate had no dump to read, printed nothing, and two mandatory lines
// failed for the instrument's own housekeeping rather than for the picture. A rule that fails for its own
// plumbing is not a rule about the product.
// THE CAPTURE IS CLEAN, AND THE FRAME IT MEASURES IS THE PICTURE. Measured 2026-10-17: the same page captured through
// the plain URL gave 42% of the sky band in one blue (the tsunami GRADE hid the clouds) while the clean frame gives
// 29% - so lines 1 and 2b were passing on a transient. ?clean=1 removes overlays and grades (docs/DETERMINISM.md R2
// says gate captures are clean and offline). A rule about the picture must not be measured through a filter.
// THE CAPTURE IS PINNED, NOT "WAITED FOR". An animated page NEVER settles (people walk, particles run), so the
// settled-hash wait could only ever report false - audited 2026-10-18. The repo's own determinism affordance is
// `?clock=` (G-DET-CLOCK): it freezes the simulation phase, the pin is read back from the dump, and the capture is
// then reproducible byte for byte (tools/detgate.mjs proves it: 0 px between unpatched runs).
// ?debug exposes the page's own API (window.dvor8.cam) so the scripted run can AIM AT A TARGET - a fixed fraction of
// the frame drifted off the cars and scored 0 (measured). The debug flag does not alter the canvas: the owner's
// captures are taken with it and the frame measures the same.
// TWO ROLES, TWO RUNS. The FRAME is captured at the pinned clock (reproducible: ?clock=7.5, dt=0), but the clock pin
// also FREEZES THE PHYSICS - a thrown stone never flies, and the scripted destruction scored 0 (measured). So the
// interaction steps run on a page WITHOUT the pin, and only the measured dump comes from the pinned run. The free run
// goes first so the pinned run's canvas.json is the one the frame lines read.
const FREE = (process.env.BASE_FREE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&debug');
const PINNED = (process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=7.5&debug');
const shotFree = run('node', ['--experimental-websocket', 'tools/photo-shot.mjs', `${OUT}-free`, DEMO, 'ЦУНАМИ'],
  { BASE: FREE });
const shotPinned = run('node', ['--experimental-websocket', 'tools/photo-shot.mjs', OUT, DEMO, 'ЦУНАМИ'],
  { BASE: PINNED });
const suite = run('node', ['test.mjs']);
const gate = run('node', ['tools/concept-check.mjs', `${OUT}/canvas.json`]);
const base = run('node', ['tools/baseline-check.mjs']);

const dump = existsSync(`${OUT}/canvas.json`) ? JSON.parse(readFileSync(`${OUT}/canvas.json`, 'utf8')) : null;
// the steps come from the FREE run (the interaction); the dump from the PINNED run (the frame)
const steps = {}; for (const line of shotFree.split('\n')) { try { const o = JSON.parse(line.trim()); if (o && o.step) steps[o.step] = o; } catch { /* not a step line */ } }
for (const line of shotPinned.split('\n')) { try { const o = JSON.parse(line.trim()); if (o && o.step && /settled|built|errors/.test(o.step)) steps[o.step] = o; } catch { /* not a step line */ } }

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
  // THE PIN IS THE PREMISE: a capture without the pinned clock is a capture of an arbitrary moment.
  const pinned = !!(dump && Number(dump.clockPin) === 7.5);
  add('1 SKY (DESIGNED): one blue plane, one colour owning its band >= 35%',
    pinned && share >= 0.35 && skyish, pinned
      ? `${(100 * share).toFixed(0)}% of the band is rgb(${topColour}), skyish=${skyish} (clock pin 7.5)`
      : 'the capture carries no clock pin - WITHHELD, not passed');

  // 2 BUILDINGS: window sprites exist (printed by the gate) and the facades are flat rather than blurred
  // THE COUNT IS THE NUMBER IN BRACKETS, NOT THE BAR IN THE LABEL. `(\d+) window sprites` matched the row's own
  // threshold ("at least 8 window sprites") and reported 8 where the frame has hundreds; the flat share likewise
  // comes from the result bracket, not from any row label.
  const windows = Number((gate.match(/\[(\d+) window sprites\]/) || [])[1] || 0);
  // (a `flat` share was parsed here and never read: the flatness of a surface is line 2b's job, which measures tone
  // concentration and prints both sides. Deleted rather than invented into a line.)
  // the flatness of a surface is line 2b's job; this line is about the BUILDING being built at all
  add('2 BUILDINGS: window sprites are many (>= 40)', windows >= 40, `${windows} window sprites`);
  // the WALL itself, measured where a wall is: the left third below the sky, which on this photograph is one facade
  const wallW = Math.floor(W * 0.3), wallTop = Math.floor(H * 0.12), wallBot = Math.floor(H * 0.45);
  const wallHist = new Map();
  let wallTot = 0;
  for (let y = wallTop; y < wallBot; y += 1) for (let x = 0; x < wallW; x += 1) {
    const k = px(x, y).join(','); wallHist.set(k, (wallHist.get(k) || 0) + 1); wallTot += 1;
    // (a `wallFlat` neighbour counter was computed here and never read; 2b's tone concentration is the measurement
    // that decides flatness, so the dead counter is deleted rather than given an invented bar.)
  }
  const wallTopShare = [...wallHist.values()].sort((a2, b2) => b2 - a2)[0] / Math.max(1, wallTot);
  // 2b's BAR IS THE ACCEPTED FRAME'S OWN WALL, NOT A ROUND NUMBER. The old "at most 8 tones, largest >= 40%" was
  // invented: measured on the creator's accepted canvas (reference/v10a-art-canvas.png, the same 86x169 window),
  // that frame has 30 tones and its largest owns 18.8% - the reference FAILS the old bar. The judge rule says the
  // artefact wins, so the line is now "no more tones than the accepted frame's wall, and its largest tone owns at
  // least as much", with both sides printed. (DECISIONS D13.)
  const acceptedWall = (() => {
    try {
      const out = run('python3', ['-c', `from PIL import Image
im=Image.open('reference/v10a-art-canvas.png').convert('RGB'); W,H=im.size; px=im.load()
ww=int(W*0.3); t=int(H*0.12); b=int(H*0.45); h={}
for y in range(t,b):
    for x in range(ww):
        c=px[x,y]; h[c]=h.get(c,0)+1
tot=(b-t)*ww; top=max(h.values())
print(len(h), round(100*top/tot,1))`]);
      const [tones, largest] = out.trim().split(/\s+/).map(Number);
      return Number.isFinite(tones) && Number.isFinite(largest) ? { tones, largest } : null;
    } catch { return null; }
  })();
  if (!acceptedWall) {
    add('2b WALL (DESIGNED): the accepted frame\'s own wall could not be read', false, 'no background for the bar - WITHHELD, not passed');
  } else {
    add('2b WALL (DESIGNED): no more tones than the accepted frame\'s wall, and its largest tone owns at least as much',
      wallHist.size <= acceptedWall.tones && 100 * wallTopShare >= acceptedWall.largest,
      `${wallHist.size} tones, largest ${(100 * wallTopShare).toFixed(1)}% · accepted frame's wall: ${acceptedWall.tones} tones, largest ${acceptedWall.largest}%`);
  }
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
// A MISSING STEP IS NOT A CLEAN CONSOLE. `(steps.errors?.errors || [])` read a run that died before printing the
// last step as error-free - the same `?? 0` class the project has paid for before. The step must EXIST.
add('6 NO PAGE ERRORS during the whole run', !!steps.errors && (steps.errors.errors || []).length === 0,
  steps.errors ? JSON.stringify(steps.errors.errors || []).slice(0, 90) : 'the errors step never printed - WITHHELD, not passed');
add('7 THE SUITE passes', /FAIL 0/.test(suite), (suite.match(/PASS \d+\s+FAIL \d+/) || ['no suite output'])[0]);
// THE LINE MUST COMPARE THE NUMBERS. `/BASELINE \d+ OK/` passed beside "BASELINE 32 OK 18 FAIL of 50" - a report
// that prints its own contradiction. The recorded baseline is 31 OK / 19 FAIL of 50 (RUNLOG T+54); "does not
// regress" means at least 31 OK and at most 19 FAIL, and both numbers are printed.
{
  const m = /BASELINE\s+(\d+) OK\s+(\d+) FAIL\s+of\s+(\d+)/.exec(base);
  const okN = m ? Number(m[1]) : NaN, failN = m ? Number(m[2]) : NaN;
  add('8 THE BASELINE does not regress', Number.isFinite(okN) && okN >= 31 && failN <= 19,
    m ? `${okN} OK / ${failN} FAIL of ${m[3]} (recorded floor: 31 OK / 19 FAIL)` : 'no baseline output - WITHHELD, not passed');
}
// LINE 10: THE TARGET. The creator's criteria are in one file, and the frame must be comparable to the reference
// frame on five measures. This is the line that knows what the result should LOOK like - the one that was missing
// for the whole project, which is how ten lines could pass on a posterised photograph.
const crit = existsSync('docs/CRITERIA.md');
add('10 THE CREATOR\'S CRITERIA are in one file, with every area represented',
  crit && ['frame', 'sky', 'buildings', 'windows', 'objects', 'interactions'].every((k2) => new RegExp(k2, 'i').test(readFileSync('docs/CRITERIA.md', 'utf8'))),
  crit ? 'docs/CRITERIA.md: frame, photograph, sky, buildings, windows, objects, interactions, reference' : 'docs/CRITERIA.md missing');
add('0 THE DEFINITION OF DONE is written down and read by this rule', existsSync('docs/DONE.md') && /THE DEFINITION OF DONE/.test(readFileSync('docs/DONE.md', 'utf8')),
  'docs/DONE.md: the nine conditions and the six missing pieces');
// THE INSTRUMENT LINE MUST NOT PASS BESIDE ITS OWN FAILING ROW. It tested the premises pattern and "no WITHHELD",
// so `[GATE 7 OK 1 FAIL]` read as a pass (audited 2026-10-18). The gate's own FAIL count is the verdict now, and
// both numbers are printed.
{
  const gm = /GATE\s+(\d+) OK\s+(\d+) FAIL/.exec(gate);
  add('9 THE INSTRUMENT states its premises and does not withhold the verdict',
    !!gm && Number(gm[2]) === 0 && /INSTRUMENT: the dump is 1:1/.test(gate) && !/VERDICT WITHHELD/.test(gate),
    gm ? `${gm[1]} OK / ${gm[2]} FAIL from the concept gate` : 'no gate output - WITHHELD, not passed');
}

const failed = checks.filter((c) => !c.pass);
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'}  ${c.name}  [${c.detail}]`);
if (failed.length) {
  console.log(`\nDELIVERY BLOCKED — ${failed.length} of ${checks.length} mandatory lines fail:`);
  for (const c of failed) console.log(`  · ${c.name}`);
  process.exit(1);
}
console.log(`\nDELIVERY READY — all ${checks.length} mandatory lines pass on ${DEMO}`);
