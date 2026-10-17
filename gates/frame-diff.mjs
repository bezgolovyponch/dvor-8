// EXTERNAL GATE - the measuring is done by published third-party code, not by this project.
//   pixelmatch (MIT, https://github.com/mapbox/pixelmatch) - the industry-standard image differ
//   pngjs      (MIT, https://github.com/pngjs/pngjs)       - published PNG codec
// Premises are printed; the verdict is withheld when a premise fails.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const require = createRequire(import.meta.url);
const pm = require('pixelmatch/package.json').version, pj = require('pngjs/package.json').version;
const [a, b, out] = process.argv.slice(2);
if (!a || !b) { console.log('usage: node gates/frame-diff.mjs <a.png> <b.png> [diff.png]'); process.exit(2); }
const A = PNG.sync.read(readFileSync(a)), B = PNG.sync.read(readFileSync(b));
const sizeOk = A.width === B.width && A.height === B.height;
console.log(`PREMISES: pixelmatch ${pm} · pngjs ${pj} · threshold 0.1 · A ${A.width}x${A.height} · B ${B.width}x${B.height} · same size ${sizeOk}`);
if (!sizeOk) { console.log('VERDICT WITHHELD: the two frames are not the same size - not a like-for-like comparison.'); process.exit(2); }
const diff = new PNG({ width: A.width, height: A.height });
const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0.1 });
if (out) writeFileSync(out, PNG.sync.write(diff));
console.log(`DIFFERING PIXELS: ${n} of ${A.width * A.height} = ${(100 * n / (A.width * A.height)).toFixed(2)}%`);
process.exit(n === 0 ? 0 : 1);
