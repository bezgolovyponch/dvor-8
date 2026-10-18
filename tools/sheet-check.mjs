// THE OWNER'S SHEET MUST NOT LIE. Two captures in this session were recorded as failed by the tool and shipped in the
// sheet anyway (a closed drawer, a damage shot that proved only the counter), because nothing compared the sheet with
// the files it describes. This gate does exactly that, and nothing else:
//
//   1. every row of the sheet's hash tables names a file that EXISTS;
//   2. the sha256 printed in the sheet equals the file's sha256 (a stale row is a lie about the picture);
//   3. the captures are FRESH - newer than the newest file in src/ - so a picture cannot describe a build that has
//      since changed (the same freshness rule the baseline applies to docs/shots).
//
//   node tools/sheet-check.mjs   ->  exit 0 only when every row is true.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SHEET = 'docs/OWNER-CAPTURES.md';
if (!existsSync(SHEET)) { console.log('SHEET FAIL: no sheet'); process.exit(1); }
const text = readFileSync(SHEET, 'utf8');

// the newest src file, for the freshness rule
let newestSrc = 0;
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else newestSrc = Math.max(newestSrc, statSync(p).mtimeMs);
  }
};
walk('src');

const rows = [...text.matchAll(/\|\s*\d+\s*\|\s*`([^`]+)`\s*\|\s*([\d,\s]+)\s*\|\s*`([0-9a-f]{64})`\s*\|/g)];
if (!rows.length) { console.log('SHEET FAIL: the sheet carries no hash rows'); process.exit(1); }
let bad = 0;
for (const [, file, bytes, sha] of rows) {
  if (!existsSync(file)) { console.log(`SHEET FAIL  ${file} does not exist`); bad += 1; continue; }
  const buf = readFileSync(file);
  const real = createHash('sha256').update(buf).digest('hex');
  if (real !== sha) { console.log(`SHEET FAIL  ${file}: sheet says ${sha.slice(0, 12)}…, the file is ${real.slice(0, 12)}…`); bad += 1; continue; }
  const stated = Number(String(bytes).replace(/[\s,]/g, ''));
  if (stated && stated !== buf.length) { console.log(`SHEET FAIL  ${file}: sheet says ${stated} bytes, the file is ${buf.length}`); bad += 1; continue; }
  const age = statSync(file).mtimeMs;
  if (age < newestSrc) { console.log(`SHEET FAIL  ${file} is older than the newest src file (a picture of a build that changed)`); bad += 1; continue; }
  console.log(`ok  ${file}  sha256 ${sha.slice(0, 12)}…  ${buf.length} bytes`);
}
console.log(bad ? `\nSHEET: ${bad} row(s) not true of the files.` : `\nSHEET OK: ${rows.length} rows, every hash, size and freshness true.`);
process.exit(bad ? 1 : 0);
