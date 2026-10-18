// THE OWNER'S SHEET MUST NOT LIE. Two captures in this session were recorded as failed by the tool and shipped in the
// sheet anyway (a closed drawer, a damage shot that proved only the counter), because nothing compared the sheet with
// the files it describes. This gate does exactly that, and nothing else:
//
//   1. every row of the sheet's hash tables names a file that EXISTS;
//   2. the sha256 printed in the sheet equals the file's sha256 (a stale row is a lie about the picture);
//   3. the captures belong to the CURRENT BUILD - the sheet records a build hash (sha256 over src/ + index.html +
//      style.css, tools/build-hash.mjs) and this gate recomputes it.
//
// WHY THE FRESHNESS RULE IS A CONTENT HASH, NOT AN MTIME. The first version compared each capture's mtime with the
// newest src file's mtime. Measured 2026-10-18: a `git checkout` of UNCHANGED files updated their mtimes, and the
// gate called all six owner captures stale while their sha256s matched the sheet byte for byte - a false red. A
// timestamp also fails the other way (`touch` makes an old picture look fresh). The build's identity is its content.
//
//   node tools/sheet-check.mjs   ->  exit 0 only when every row is true.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildHash } from './build-hash.mjs';

const SHEET = 'docs/OWNER-CAPTURES.md';
if (!existsSync(SHEET)) { console.log('SHEET FAIL: no sheet'); process.exit(1); }
const text = readFileSync(SHEET, 'utf8');

// the build the sheet says these captures describe
const { hash: build, files: buildFiles } = buildHash();
const statedBuild = text.match(/build:\s*`([0-9a-f]{64})`/);
console.log(`PREMISE: build ${build.slice(0, 12)}… over ${buildFiles} files (src/, index.html, style.css) · sheet states ${statedBuild ? statedBuild[1].slice(0, 12) + '…' : 'NONE'}`);
let bad = 0;
if (!statedBuild) {
  console.log('SHEET FAIL: the sheet does not record the build it describes - a picture cannot be checked against an unnamed build.');
  bad += 1;
} else if (statedBuild[1] !== build) {
  console.log(`SHEET FAIL: the sheet describes build ${statedBuild[1].slice(0, 12)}…, the tree is ${build.slice(0, 12)}… - the captures are of a build that changed.`);
  bad += 1;
}

const rows = [...text.matchAll(/\|\s*\d+\s*\|\s*`([^`]+)`\s*\|\s*([\d,\s]+)\s*\|\s*`([0-9a-f]{64})`\s*\|/g)];
if (!rows.length) { console.log('SHEET FAIL: the sheet carries no hash rows'); process.exit(1); }
for (const [, file, bytes, sha] of rows) {
  if (!existsSync(file)) { console.log(`SHEET FAIL  ${file} does not exist`); bad += 1; continue; }
  const buf = readFileSync(file);
  const real = createHash('sha256').update(buf).digest('hex');
  if (real !== sha) { console.log(`SHEET FAIL  ${file}: sheet says ${sha.slice(0, 12)}…, the file is ${real.slice(0, 12)}…`); bad += 1; continue; }
  const statedBytes = Number(String(bytes).replace(/[\s,]/g, ''));
  if (statedBytes && statedBytes !== buf.length) { console.log(`SHEET FAIL  ${file}: sheet says ${statedBytes} bytes, the file is ${buf.length}`); bad += 1; continue; }
  console.log(`ok  ${file}  sha256 ${sha.slice(0, 12)}…  ${buf.length} bytes`);
}
console.log(bad ? `\nSHEET: ${bad} row(s) not true of the files.` : `\nSHEET OK: ${rows.length} rows, every hash and size true, and every capture belongs to the recorded build.`);
process.exit(bad ? 1 : 0);
