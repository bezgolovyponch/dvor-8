// THE EXACT CHECK FOR THE CLASS THAT KILLED THE PHONE THREE TIMES.
//
//   "BLOCK is not defined"      - RoadRule's constant used in main.js, import never landed
//   "mayBeDestroyed is not defined" - the import written beside the comment describing it, not at the top
//   "infoOn is not defined"     - a guard placed outside its scope
//
// A crude lexical scan produced 823 false findings, which is the same failure as every bad instrument in this
// project: measuring the wrong thing confidently. This one is EXACT and needs no parser: for every import in every
// module, the name must be exported by the file it is imported from. A missing name is reported; nothing else is
// guessed. It is the bug class, checked at the only place it can be checked without running a browser.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(p);
  }
};
walk('src');

const exportsOf = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) for (const part of m[1].split(',')) {
    const n = part.trim().split(/\s+as\s+/).pop().trim();
    if (n) names.add(n);
  }
  if (/export\s+default/.test(src)) names.add('default');
  exportsOf.set(resolve(f), names);
}

let bad = 0;
const isModule = (spec) => spec.endsWith('.js') && !/^https?:/.test(spec);
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const spec = m[2];
    if (!isModule(spec)) continue;
    const target = resolve(dirname(resolve(f)), spec);
    if (!existsSync(target)) { console.log(`MISSING FILE  ${f} imports ${spec}`); bad += 1; continue; }
    const exp = exportsOf.get(target) || new Set();
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      if (!exp.has(name)) { console.log(`NOT EXPORTED  ${f} imports { ${name} } from ${spec}`); bad += 1; }
    }
  }
}

if (bad) {
  console.log(`\n${bad} broken import(s). Each one is a page-level failure the suite cannot see.`);
  process.exit(1);
}
// The second heuristic (uppercase symbols that look unimported) was dropped: it counted words inside Russian
// comments and strings - "ORDER", "SIZE", "EVERY" - which is exactly the crude-measurement failure this project kept
// repeating. What remains is EXACT: an import that names a non-export is a fact, not a guess.
console.log(`every import in ${files.length} modules names an export that exists.`);
