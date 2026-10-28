// THE PIECES GATE — every BRICK is verified before the product is assembled from it.
//
// The product is built from pieces, not from a monolith: a piece has a CONTRACT (input → output), PARAMETERS with a
// source (the operator's engine or a published method), and a CHECK of its own that runs on a synthetic input. This
// gate does the one thing a set of bricks needs:
//
//   1. every file in `src/pieces/` is registered here with its check - a piece without a check is NOT a brick and the
//      gate refuses, so no piece can be added and quietly trusted;
//   2. every registered check is RUN, and its own verdict is the piece's verdict (a piece that fails its own contract
//      stops the chain like any other lie);
//   3. the table names, for each piece, the stage of the pipeline it serves, so the assembly has an index.
//
//   node tools/pieces-check.mjs   ->  exit 0 only when every brick is present and every check passes.
import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// piece file -> { check, stage, contract }
const PIECES = [
  { file: 'downscale.js', check: 'piece-downscale-check.mjs', stage: 'S0 / PROTOCOL 4', contract: 'photograph → the art grid, by selection (PixelOE), a 3-px line kept' },
  { file: 'facade.js', check: 'piece-facade-check.mjs', stage: 'PROTOCOL 3', contract: 'a facade plane + a window sprite grid at the photograph\'s own pitch' },
  { file: 'facade-photo.js', check: 'piece-facade-photo-check.mjs', stage: 'v13 S8–S11', contract: 'a quad homography → the photo kept, panes recoloured, nothing invented' },
  { file: 'sky-style.js', check: 'piece-sky-check.mjs', stage: 'v13 S6', contract: 'a sky mask + the palette → a deterministic plane-and-cloud field, no confetti' },
  { file: 'ground-planes.js', check: 'piece-ground-check.mjs', stage: 'v13 S2–S3', contract: 'one paved pad → its own two planes at the reference\'s 40% share, a closed paint mask' },
  { file: 'working-palette.js', check: 'piece-working-palette-check.mjs', stage: 'v13 S1–S2', contract: 'a frame → the working palette: capped, structure pinned, family-faithful' },
  { file: 'outline.js', check: 'piece-outline-check.mjs', stage: 'v13 S13', contract: 'a region pixel set → the 1-px silhouette of its MASS (lattice → perimeter, not a scatter)' },
  { file: 'scene-annotation.js', check: 'piece-annotation-check.mjs', stage: 'v13 S7', contract: 'the reference\'s annotation format → validated geometry + a quad → the facade mask' },
  { file: 'region-grow.js', check: 'piece-region-grow-check.mjs', stage: 'v13 S5 → S7', contract: 'a photograph + a tap → the connected region and its quad (a wall, not its windows)' },
];
const HAVE = readdirSync('src/pieces').filter((f) => f.endsWith('.js'));
const registered = new Set(PIECES.map((p) => p.file));
const unregistered = HAVE.filter((f) => !registered.has(f));

const rows = [];
let failed = 0;
for (const p of PIECES) {
  if (!existsSync(`src/pieces/${p.file}`)) { rows.push({ piece: p.file, state: 'MISSING', detail: 'the piece is not in src/pieces', stage: p.stage }); failed += 1; continue; }
  let out = '', code = 0;
  try { out = execFileSync('node', [`tools/${p.check}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); code = e.status ?? 1; }
  const last = out.trim().split('\n').filter(Boolean).slice(-1)[0] || '(no verdict printed)';
  if (code !== 0) failed += 1;
  rows.push({ piece: p.file, state: code === 0 ? 'VERIFIED' : 'FAILED', detail: last, stage: p.stage });
}
for (const f of unregistered) { rows.push({ piece: f, state: 'NO CHECK', detail: 'a piece without a check is not a brick - register it in tools/pieces-check.mjs', stage: '-' }); failed += 1; }

const pad = (s, n) => String(s).padEnd(n);
console.log('THE PIECES — every brick verified before the product is assembled');
console.log(`${pad('piece', 16)} ${pad('stage', 16)} ${pad('state', 9)} contract / verdict`);
for (const r of rows) {
  const c = (PIECES.find((p) => p.file === r.piece) || {}).contract || '';
  console.log(`${pad(r.piece, 16)} ${pad(r.stage, 16)} ${pad(r.state, 9)} ${c}`);
  if (r.state !== 'VERIFIED') console.log(`${pad('', 43)}→ ${r.detail.slice(0, 120)}`);
}
console.log(`\n${failed ? 'PIECES FAILED' : 'PIECES CONFIRMED'}: ${rows.length - failed} of ${rows.length} bricks verified` + (failed ? '' : ' — the assembly may proceed'));
process.exit(failed ? 1 : 0);
