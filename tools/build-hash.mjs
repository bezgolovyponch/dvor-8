// THE BUILD'S IDENTITY, BY CONTENT — not by timestamp.
//
// WHY THIS EXISTS. The owner's sheet gate (tools/sheet-check.mjs) used to say a capture was fresh when its mtime was
// newer than the newest file in src/. That measures the FILESYSTEM, not the build: a `git checkout` of unchanged
// files updates their mtimes, so a picture of the current build was reported stale (measured 2026-10-18: all six
// owner captures failed on mtime while their sha256s matched the sheet byte for byte). The reverse is just as bad —
// `touch` can make a picture of an old build look fresh. A freshness rule must be content-addressed: hash the files
// that decide the frame, record that hash with the picture, and compare hashes.
//
// WHAT THE BUILD IS, for this project: every file that can change the frame is under src/ (the tracer, the renderer,
// the world, the palette, the pieces), plus the page shell (index.html) and the stylesheet (style.css). The vendor/
// models and photos are inputs, not build code; tools/ is the harness. The hash is sha256 over the sorted relative
// paths and their bytes, so it is stable across checkouts and sensitive to one changed byte.
//
//   node tools/build-hash.mjs        -> prints "<sha256>  <n> files (src/, index.html, style.css)"
//   import { buildHash } from './build-hash.mjs'
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ROOTS = ['src', 'index.html', 'style.css'];

function walk(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
}

export function buildFiles() {
  const files = [];
  for (const r of ROOTS) {
    const p = join(ROOT, r);
    if (statSync(p).isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files.map((p) => relative(ROOT, p)).sort();
}

export function buildHash() {
  const files = buildFiles();
  const h = createHash('sha256');
  for (const rel of files) {
    h.update(rel);
    h.update('\0');
    h.update(readFileSync(join(ROOT, rel)));
    h.update('\0');
  }
  return { hash: h.digest('hex'), files: files.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { hash, files } = buildHash();
  console.log(`${hash}  ${files} files (src/, index.html, style.css)`);
}
