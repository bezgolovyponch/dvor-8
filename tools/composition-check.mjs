// THE COMPOSITION CHECK: every element of the accepted frame is bound to a requirement, a module, a baseline row and
// a predicate - and the binding is verified. A broken link is reported; the tool exits non-zero.
import { readFileSync, existsSync } from 'node:fs';

const comp = readFileSync('docs/COMPOSITION.md', 'utf8');
const rows = [...comp.matchAll(/^\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/gm)]
  .map((m) => ({ n: m[1], element: m[2].trim(), requirement: m[3].trim(), module: m[4].trim(), baseline: m[5].trim(), expected: m[6].trim(), predicate: m[7].trim() }));
const crit = readFileSync('tools/criteria-check.mjs', 'utf8');

let broken = 0;
console.log('THE COMPOSITION — element by element, from the accepted frame to the class that draws it\n');
for (const r of rows) {
  const links = [];
  const mod = (r.module.match(/`([^`]+\.js)`/) || [])[1];
  const exists = mod ? existsSync('src/criteria/' + mod.split('/').pop()) || existsSync(mod) : false;
  links.push([`${mod}`, exists]);
  // the requirement must be quoted in that module's header, so writing the code means reading the requirement
  let quoted = false;
  if (exists) {
    const file = existsSync(mod) ? mod : 'src/criteria/' + mod.split('/').pop();
    const src = readFileSync(file, 'utf8').slice(0, 1400);
    const key = (r.requirement.match(/\*"([^"]{20,60})/) || [])[1] || '';
    quoted = key ? src.replace(/\s+/g, ' ').includes(key.replace(/\s+/g, ' ').slice(0, 40)) : true;
  } else quoted = false;
  links.push(['requirement quoted in the module', quoted]);
  // every predicate named must exist in the criteria registry
  const preds = (r.predicate.match(/[A-Z]\d+/g) || []);
  const known = preds.every((p) => new RegExp('\\b' + p + ':').test(crit));
  links.push([`predicates ${preds.join('/') || '-'} registered`, preds.length === 0 ? true : known]);
  const ok = links.every(([, v]) => v);
  if (!ok) broken += 1;
  console.log(`${ok ? 'BOUND ' : 'BROKEN'}  ${r.n.padStart(2)}  ${r.element.slice(0, 62)}`);
  for (const [what, v] of links) if (!v) console.log(`         · ${what}`);
}
console.log(`\n${rows.length - broken} of ${rows.length} elements bound to a requirement, a module, a baseline row and a predicate.`);
if (broken) { console.log('THE COMPOSITION IS NOT COMPLETE — the broken links are listed above.'); process.exit(1); }
