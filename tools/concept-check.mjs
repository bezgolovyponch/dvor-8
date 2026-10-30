// THE CONCEPT GATE — the look judged as RULES against the published target, not as one photo against one artefact.
//
// Rows (all measured with tools/concept-audit.mjs, at the art's own 288x512):
//   1 DENSITY   detail (adjacent-pixel diff) must be at least 85% of the target's   - the engine matches this today
//   2 TONES     tones in use (>=0.2% share) at least 85% of the target's           - matches today
//   3 WARMTH    warm-pixel share at least 50% of the target's                      - THE OPEN ROW: target 1.76%, ours 0.00%
//
// Row 3 is deliberately red: it is the next iteration of the self-improvement loop (the published look amplifies warm
// tones 11x the photograph's own share - its bronze mullions, autumn foliage and lit shop window), and a gate that is not
// allowed to be red cannot drive a change. The chain does not run this step yet; this tool is the loop's ledger.
//
//   node tools/concept-check.mjs [frame.png]
import { execFileSync } from 'node:child_process';
const FRAME = process.argv[2] || '/tmp/measure/engine-frame.png';
const TARGET = 'reference/TARGET.webp';
let data;
try {
  const out = execFileSync('node', ['tools/concept-audit.mjs', TARGET, FRAME], { encoding: 'utf8' });
  data = out;
} catch (e) { console.log('NOT MEASURED', String(e.message).slice(0, 160)); process.exit(2); }
const num = (label) => { const m = data.split('\n').find((l) => l.includes(label)); const mm = m && m.match(/target\s+([\d.]+)\s+ours\s+([\d.]+)/); return mm ? [Number(mm[1]), Number(mm[2])] : [NaN, NaN]; };
const [dt, doUrs] = num('detail (adjacent diff)');
const [tt, to] = num('tones in use');
const [wt, wo] = num('warm pixels %');
let bad = 0;
const row = (id, name, t, o, need) => { const ok = o >= need; if (!ok) bad += 1; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${id} ${name.padEnd(10)} target ${t.toFixed(2).padStart(7)}  ours ${o.toFixed(2).padStart(7)}  needs ${need.toFixed(2)}`); };
row('1', 'DENSITY', dt, doUrs, dt * 0.85);
row('2', 'TONES', tt, to, tt * 0.85);
row('3', 'WARMTH', wt, wo, wt * 0.5);
console.log(`\n${bad ? 'CONCEPT: ' + bad + ' row(s) below the published look' : 'CONCEPT: every row is the published look\'s'}.`);
process.exit(bad ? 1 : 0);
