// CLEAR THE CACHES BEFORE A SHIP — the operator: "always run local, clear cache, before ship new".
//
// A ship must be measured on the code that is about to be published, not on a stale build cache, a stale service worker
// or a browser holding the previous bundle. This clears everything the build and the gates can reuse, proves the local
// page still serves the CURRENT files, and reports what it removed. It is the first step of android/release.sh, so a ship
// cannot skip it.
//
//   node tools/cache-clear.mjs            clear, then smoke the local page
//   node tools/cache-clear.mjs --dry      list what would go, touch nothing
import { rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry');
const TARGETS = [
  'node_modules/.cache',
  '.parcel-cache',
  '.next',
  'dist',
  'build',
  'android/out/.cache',
  'android/app/build/intermediates/assets',
];
const gone = [];
for (const t of TARGETS) {
  if (!existsSync(t)) continue;
  let bytes = 0;
  const walk = (p) => { for (const e of readdirSync(p, { withFileTypes: true })) { const q = `${p}/${e.name}`; if (e.isDirectory()) walk(q); else bytes += statSync(q).size; } };
  try { walk(t); } catch (e) { /* a file, not a dir */ }
  gone.push(`${t} (${(bytes / 1e6).toFixed(1)} MB)`);
  if (!DRY) rmSync(t, { recursive: true, force: true });
}
console.log(DRY ? 'DRY RUN — would clear:' : 'CLEARED:');
for (const g of gone) console.log('  ', g);
if (!gone.length) console.log('   nothing cached to clear');

// THE LOCAL PAGE MUST SERVE THE FILES ON DISK: hash the three pieces a bundle could have cached and print them, so the
// ship's log carries the exact hashes it was built from.
const files = ['src/main.js', 'style.css', 'index.html'];
console.log(DRY ? 'the local page would be built from:' : 'the local page is built from:');
for (const f of files) {
  const h = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
  console.log(`   ${f.padEnd(14)} ${h}`);
}
// AND THE SERVED PAGE MUST BE THESE FILES: a stale server or a cache in front of it is exactly what "clear cache" is for.
// The three files are fetched over the local server and hashed; a mismatch refuses the ship.
const SERVE = process.env.SERVE || 'http://127.0.0.1:4312/game/';
let bad = 0;
for (const f of files) {
  const url = SERVE + f;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) { console.log(`   ${f.padEnd(14)} served HTTP ${res.status}`); bad += 1; continue; }
    const got = createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex').slice(0, 16);
    const disk = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
    const ok = got === disk;
    if (!ok) bad += 1;
    console.log(`   ${f.padEnd(14)} served ${got} ${ok ? '== disk' : '!= disk ' + disk}`);
  } catch (e) {
    console.log(`   ${f.padEnd(14)} NOT SERVED (${String(e && e.message || e).slice(0, 40)}) - start it: python3 tools/serve.py`);
    bad += 1;
  }
}
if (bad) { console.log(`\nCACHE/ SERVE CHECK FAILED: ${bad} file(s) are not what the local page serves - do not ship.`); process.exit(1); }
console.log('\nCACHE CLEARED AND SERVED FILES MATCH THE DISK: safe to run the chain and ship.');
process.exit(0);
