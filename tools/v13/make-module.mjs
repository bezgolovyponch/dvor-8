// THE ENGINE MODULE — the operator's engine, byte-exact, made importable by the app.
//
// The extraction `tools/v13/engine-v13.txt` is the operator's own class lifted verbatim from the .dc.html (refs.mjs
// refuses to run if the file has moved). The app must run THE SAME code, not a re-derivation: this script writes
// `src/ref/engine.js` by replacing the header `class Component extends DCLogic` with `class Component` (the class is
// self-contained - refs.mjs proved it runs with only a canvas) and appending the export.
//
// It prints the sha256 of the body it wrote, and the app's engine check re-computes it, so a silent divergence between
// the app's converter and the operator's file is REFUSED rather than shipped.
//
//   node tools/v13/make-module.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const src = readFileSync(new URL('./engine-v13.txt', import.meta.url), 'utf8');
const head = 'class Component extends DCLogic {';
if (!src.startsWith(head)) { console.log(`REFUSED: the extraction does not start with "${head}"`); process.exit(2); }
const body = 'class Component {\n' + src.slice(head.length);
const out = `// GENERATED FROM tools/v13/engine-v13.txt BY tools/v13/make-module.mjs — DO NOT EDIT BY HAND.
// This is the operator's own engine code, byte-exact apart from the class header and the export below.
// Its sha256 is checked by tools/engine-check.mjs against ENGINE_SHA; a mismatch refuses the build.
${body}\nexport { Component };\n`;
writeFileSync(new URL('../../src/ref/engine.js', import.meta.url), out);
const sha = createHash('sha256').update(out).digest('hex');
console.log(`ENGINE MODULE WRITTEN: src/ref/engine.js · ${out.length} chars · sha256 ${sha}`);
console.log(`ENGINE_SHA=${sha}`);
