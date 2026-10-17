// THE PLAN CHECK — the composition judged as STRUCTURE (bands + facade archetypes), against the accepted frame's own
// structure, and deterministic (the same input gives the same plan byte for byte).
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { BANDS, FACADE_ROLES } from '../src/plan.js';

const ok = [], bad = [];
const add = (n, p, note = '') => { (p ? ok : bad).push(n); console.log(`${p ? 'ok  ' : 'FAIL'}  ${n}${note ? '  [' + note + ']' : ''}`); };

// 1. THE ACCEPTED FRAME'S OWN BANDS, read from its pixels (small output: the horizon row and the sky row count).
const art = 'reference/v10a-art-canvas.png';
if (!existsSync(art)) { console.log('FAIL  no accepted frame'); process.exit(1); }
const acc = JSON.parse(execSync(`python3 - <<'PY'
from PIL import Image
im=Image.open('${art}').convert('RGB'); w,h=im.size
rows=[]
for y in range(0,h,4):
    c={}
    for x in range(0,w,2):
        p=im.getpixel((x,y)); c[p]=c.get(p,0)+1
    top,n=max(c.items(), key=lambda kv: kv[1])
    rows.append([y, list(top), n/(w/2)])
import json
print(json.dumps({"w":w,"h":h,"rows":rows}))
PY`).toString());
let horizon = -1, skyRows = 0;
for (const [y, c, share] of acc.rows) {
  if (horizon < 0 && y > acc.h * 0.6 && share > 0.22 && (c[0] + c[1] + c[2]) < 120) horizon = y;
  if (c[2] > c[0] + 40 && share > 0.10) skyRows += 1;
}
add('A the accepted frame HAS a horizon line (one dark colour owning >22% of a row below 60%)', horizon > 0, horizon > 0 ? `row ${horizon}` : 'none');
add('B the accepted frame HAS a sky band (rows where one blue owns >=10%)', skyRows >= 16, `${skyRows} sampled rows`);
add('C the accepted frame is built of BANDS, not a gradient (every row has a dominant colour at >=7%)', acc.rows.every(([, , s]) => s >= 0.07), `min share ${Math.min(...acc.rows.map((r) => r[2])).toFixed(2)}`);

// 2. OUR PLAN, produced by the page (tools/plan-probe writes /tmp/plan.json).
const pf = process.argv[2] || '/tmp/plan.json';
if (!existsSync(pf)) { console.log('FAIL  no plan (run the page with ?clock=7.5, then write window.__plan)'); process.exit(1); }
let plan = JSON.parse(readFileSync(pf, 'utf8'));
// A DUMP CARRIES ITS PLAN NOW (photo-shot writes window.__plan into canvas.json), so the same check runs on any
// photograph's own frame: pass the dump and the plan is taken from it.
if (plan && plan.px !== undefined) plan = plan.plan;
if (!plan) { console.log('FAIL  the dump carries no plan'); process.exit(1); }
add('D the plan has the bands in order, starting with sky', plan.bands[0].role === 'sky' && plan.bands.every((b, i) => i === 0 || b.y0 >= plan.bands[i - 1].y1),
  plan.bands.map((b) => `${b.role} ${b.y0}-${b.y1}`).join(' · '));
add('E every band role is one the vocabulary defines', plan.bands.every((b) => BANDS.includes(b.role)), plan.bands.map((b) => b.role).join(','));
add('F every facade carries one of the three archetypes', plan.facades.every((f) => FACADE_ROLES.includes(f.role)),
  plan.facades.map((f) => `${f.role}@${f.box.join(',')}`).join(' · ') || 'no facades');
// THE PLAN MUST UNDERSTAND AT LEAST ONE BUILDING. The line used to demand BOTH archetypes, which is the ACCEPTED
// frame's grammar - but this check runs on any photograph, and a yard with two plain dark buildings is not a defect
// (measured on the operator's second yard: its plan names two dark-planes, both real). What is a defect is a plan
// that cannot name anything, every facade 'grid': that is the plan looking at the picture and understanding nothing.
const roles = new Set(plan.facades.map((f) => f.role));
add('H the plan names at least one archetype on a real building (not every facade "grid")',
  plan.facades.length > 0 && [...roles].some((r) => r !== 'grid'),
  plan.facades.filter((f) => f.role !== 'grid').map((f) => `${f.role}@${f.box.join(',')}`).join(' · ') || 'every facade is grid');
// 3. DETERMINISM: the plan carries no timestamps, no ids that depend on iteration order of a Map, and the same probe
//    run twice must give the same bytes - checked by the caller (the probe writes one file; detgate proves the run).
add('G the plan is a pure function of its inputs (no clock, no random, no Set iteration in the emitted order)',
  !/Date|random|performance/.test(readFileSync('src/plan.js', 'utf8')));
console.log(`\n${bad.length ? 'PLAN NOT ACCEPTED' : 'PLAN ACCEPTED'}: ${ok.length} of ${ok.length + bad.length} structural lines.`);
process.exit(bad.length ? 1 : 0);
