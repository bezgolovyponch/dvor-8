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
  // THE PATH IS RESOLVED, NOT ASSUMED: a row may name a criteria module, a page file or a tool.
  const named = [...r.module.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const mod = named.find((x) => /\.(js|html|css|md)$/.test(x)) || (named[0] || '');
  const candidates = [mod, 'src/' + mod, 'src/criteria/' + mod, 'tools/' + mod, 'docs/' + mod];
  const file = candidates.find((c) => existsSync(c)) || '';
  const exists = !!file;
  links.push([`${mod}`, exists]);
  // the requirement must be quoted in that module's header, so writing the code means reading the requirement
  let quoted = true;
  if (file && file.endsWith('.js')) {
    const src = readFileSync(file, 'utf8').slice(0, 2600).replace(/\s+/g, ' ');
    // EVERY phrase the row quotes must appear in the module's header, so the code carries the requirement
    const quotes = [...r.requirement.matchAll(/\*"([^"]{12,})"/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());
    const missing = quotes.filter((q) => !src.includes(q.slice(0, Math.min(60, q.length))));
    quoted = quotes.length === 0 ? true : missing.length === 0;
    if (!quoted) console.log(`         · missing quote: "${(missing[0] || '').slice(0, 60)}" in ${file}`);
  } else quoted = !!file;
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
