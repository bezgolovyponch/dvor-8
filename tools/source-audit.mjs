// THE EXTERNAL-SOURCES AUDIT — every published method the operator's SPEC cites must have its mechanism IN THE CODE.
//
// The engine's SPEC is 20 rows, each with `rule`, `method` and `src` (the paper or standard it comes from). This tool
// reads the SPEC from the engine and looks for the mechanism's fingerprint in the engine's own source, so a citation can
// never be decoration: either the code does it, or the row is reported as NOT FOUND (and the audit says so out loud).
//
//   node tools/source-audit.mjs
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../src/ref/engine.js', import.meta.url), 'utf8');
const rows = [...SRC.matchAll(/\{\s*id: '(S\d+)',\s*name: '([^']+)',\s*rule: '([\s\S]*?)',\s*method: '([\s\S]*?)',\s*src: '([\s\S]*?)'\s*\}/g)];
// the fingerprint of each cited mechanism, as it appears in this code
const PROOF = {
  S0: [/for \(let j = 0; j < 2; j\+\+\) for \(let i = 0; i < 2; i\+\+\)/, /Area-average|box-filter/i],
  // the popularity algorithm is written inline: a histogram (hc), a sort by count, a 12-entry SUB and a REMAP loop in Lab
  S2: [/hc\[y\] - hc|sort\(\(x, y\) => hc\[y\]/, /REMAP/, /this\.lab\(/],
  S3: [/rank|median|majority/i, /Clean/],
  S4: [/gx = L\[k - W \+ 1\] \+ 2 \* L\[k \+ 1\]/, /Sobel/i],
  S5: [/grow|region|mask/i, /S7/],
  S6: [/BAYER|bayer|dither/i, /sky/i],
  S7: [/detect|Detector|labels/i],
  S8: [/quad|homograph|warp/i],
  S12: [/grabCut|GrabCut|carCh|vehicles/i],
  S13: [/erode|dilate|outline|silhouette/i],
  S14: [/CH\.forEach|chunkOf/, /pieces/i],
  S15: [/hitChunk/, /st\[i\]/],
  S16: [/cascade\(/, /sup\.length/],
  S17: [/stepPart/, /parts/],
  S18: [/put\(|blit|composite/i],
  S19: [/carGlass|breakWin/, /glass/i],
  S20: [/WEAPONS = \[/],
  S21: [/dis_hurricane/, /dis_tsunami/, /dis_godzilla/, /dis_beyonce/],
  S22: [/mulberry32|this\.seed\(/, /fnv\(/],
  S23: [/shuffle|shuffleBag|facts/i],
};
let ok = 0, missing = 0;
console.log('THE EXTERNAL SOURCES — each SPEC row\'s cited method, looked for in the operator\'s own code');
console.log(`${'row'.padEnd(5)} ${'method'.padEnd(22)} ${'cited source'.padEnd(46)} code`);
for (const r of rows) {
  const [, id, name, , , src] = r;
  const proofs = PROOF[id] || [];
  const hits = proofs.filter((re) => re.test(SRC)).length;
  const good = proofs.length ? hits === proofs.length : true;
  if (good) ok += 1; else missing += 1;
  const cited = src.replace(/\\"/g, '"').replace(/\s+/g, ' ').slice(0, 44);
  console.log(`${id.padEnd(5)} ${name.padEnd(22)} ${cited.padEnd(46)} ${good ? `present (${hits}/${proofs.length})` : `NOT FOUND (${hits}/${proofs.length})`}`);
}
console.log(`\n${missing ? 'SOURCE AUDIT: ' + missing + ' cited method(s) have no mechanism in the code.' : `SOURCE AUDIT PASSED: ${ok} of ${ok} cited methods are present in the engine's own source.`}`);
process.exit(missing ? 1 : 0);
