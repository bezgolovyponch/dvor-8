// THE CONCEPT STEP — build the PRODUCT route's frame, dump its canvas, judge the concept.
//
// The page group measures the app's own renderer (`?vector=1`); the concept is the published product's look, which the
// product route (the engine) produces. So this step takes its own dump on `?engine=1` and hands it to tools/concept-check.mjs,
// which reads the DRAWN canvas and never a screenshot (docs/concept-gate.md).
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/chain-concept';
mkdirSync(OUT, { recursive: true });
const chrome = process.env.CHROME || '';
const env = { ...process.env, CHROME: chrome, BASE: 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=7.5&engine=1' };
try {
  execFileSync('node', ['--experimental-websocket', 'tools/photo-shot.mjs', OUT, 'photos-test/v10a.jpg', 'ЦУНАМИ'], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  console.log('FAIL  0j CONCEPT    the product route did not produce a frame:', String(e.message).slice(0, 120));
  process.exit(1);
}
const out = execFileSync('node', ['tools/concept-check.mjs', `${OUT}/canvas.json`], { encoding: 'utf8' });
process.stdout.write(out);
process.exit(out.includes('every row is the published look') ? 0 : 1);
