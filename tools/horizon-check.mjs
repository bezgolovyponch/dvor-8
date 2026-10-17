// THE HORIZON GATE — two halves, because the horizon has two jobs.
//
// UNIT: horizonFromSky(sky, w, h) must return, per column, the FIRST NON-SKY ROW. That is the boundary the published
// SkyRegionDetector takes per column, and the difference matters exactly where an object interrupts the sky: the rule
// that searched from the BOTTOM returns the last sky row, which is BELOW the object, so the frame puts clouds and
// silhouettes in the wrong place. NO-SKY GUARD: a mask with no sky at all has no horizon - all zeroes (published:
// `else: skylinePoints = np.array([0]*w)`) - never "the sky ends at the bottom of the frame".
//
// PAGE: ACCEPTANCE is the PARSE's horizon against an independent recomputation of the first non-sky row on the real
// masks, plus the guard on a photograph the model says has no sky; the FRAME's own skyline (what the drawing code
// uses) is printed as a DIAGNOSTIC, because the frame's sky composition is Q15 - it still does not use the mask.
import { horizonFromSky } from '../src/horizon.js';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// ---- THE PREMISES, FROM reference/ (the judged pair, by hash - identity is a hash, not a filename) ---------
// reference/PAIRING.md:16 names photos-test/v10a.jpg as the judged pair's INPUT, md5 70fdff62519414af68af04d5e5bc1112;
// :17 and assets/REGISTRY.md name reference/v10a-art-canvas.png (288x512, the palette-exact expected canvas) and
// reference/TARGET.json (the expected region histograms the match lines are judged on) as the EXPECTATION.
// reference/PAIRING.md also says a.jpg is supplementary: "it may be run, but no acceptance line may rest on it" -
// so the 0.90 line rests on v10a only, and a.jpg is carried as the no-sky guard witness, labelled as such.
const JUDGED_INPUT = 'photos-test/v10a.jpg';
const inputMd5 = createHash('md5').update(readFileSync(JUDGED_INPUT)).digest('hex');
const pngSize = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const CANVAS = 'reference/v10a-art-canvas.png';
const canvasOk = existsSync(CANVAS) && pngSize(CANVAS)[0] === 288 && pngSize(CANVAS)[1] === 512;
const targetOk = existsSync('reference/TARGET.json');

let fails = 0;
const say = (ok, what) => { if (!ok) { fails += 1; console.log('FAIL  ' + what); } else console.log('ok    ' + what); };
say(inputMd5 === '70fdff62519414af68af04d5e5bc1112', `the judged INPUT is the creator's photograph by hash (${JUDGED_INPUT} md5 ${inputMd5})`);
say(canvasOk, `the EXPECTATION canvas is the reference folder's 288x512 ${CANVAS}`);
say(targetOk, 'the EXPECTATION histograms reference/TARGET.json are present (the match lines\' judge)');
const mask = (w, h) => new Uint8Array(w * h);
const set = (m, w, x, y0, y1) => { for (let y = y0; y <= y1; y += 1) m[y * w + x] = 1; };
const W = 40, H = 40;

// 1. CLEAN SKY: rows 0..9 sky in every column -> the horizon is row 10 everywhere.
{
  const m = mask(W, H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (y < 10) m[y * W + x] = 1;
  const hz = horizonFromSky(m, W, H);
  const bad = [...hz].filter((v) => v !== 10).length;
  say(bad === 0, `a clean sky ends at its first non-sky row (10): ${bad} columns differ`);
}

// 2. AN OBJECT INTERRUPTS THE SKY: column 10 is sky above (0..9), a solid object (10..19) and sky again (20..30).
//    The boundary is row 10 - the FIRST non-sky row - not row 30, which is where a bottom-most search lands.
{
  const m = mask(W, H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (y < 10 || y > 19) m[y * W + x] = 1;
  for (let y = 10; y <= 19; y += 1) m[y * W + 10] = 0;
  const hz = horizonFromSky(m, W, H);
  say(hz[10] === 10, `sky interrupted by an object: column 10 horizon ${hz[10]} (published rule 10, bottom-most search 30)`);
}

// 3. AN OCCLUDED COLUMN (no sky at the top at all - a tower fills it) borrows its neighbours' boundary.
{
  const m = mask(W, H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (y < 10) m[y * W + x] = 1;
  for (let y = 0; y < 10; y += 1) m[y * W + 20] = 0;
  const hz = horizonFromSky(m, W, H);
  say(hz[20] === 10, `an occluded column borrows its neighbour's horizon (column 20: ${hz[20]})`);
}

// 4. NO SKY AT ALL: the guard. All zeroes, never -1 and never the bottom row.
{
  const m = mask(W, H);
  const hz = horizonFromSky(m, W, H);
  const zero = [...hz].every((v) => v === 0);
  say(zero, `no sky at all -> the horizon is 0 in every column (got ${zero ? 'all 0' : [...new Set(hz)].slice(0, 4)}): the frame must paint no sky`);
}
console.log(fails ? `\nTHE HORIZON RULE IS NOT CONFIRMED: ${fails} assertion(s) failed.` : '\nTHE HORIZON RULE IS CONFIRMED (unit).');

// ---- PAGE: the frame's skyline against the parse mask, on the two named photographs ---------------------
if (fails === 0) {
  const { withPage } = await import('./browser.mjs');
  const photos = (process.argv.slice(2).length ? process.argv.slice(2) : ['photos-test/v10a.jpg', 'photos-test/a.jpg']);
  for (const photo of photos) {
    const url = `http://127.0.0.1:4312/game/index.html?clean=1&news=0&horizon=1&photo=/game/${photo}`;
    try {
      const r = await withPage(url, {}, async (page) => {
        const t0 = Date.now();
        while (Date.now() - t0 < 60000) {
          const got = await page.run('return (window.__parseHorizon && window.__frameHorizon) ? { ph: window.__parseHorizon, h: window.__frameHorizon, painted: window.__skyPainted || null, clouds: window.__clouds ? window.__clouds.placed : null } : null');
          if (got) return got;
          await page.wait(500);
        }
        return null;
      });
      if (!r) { fails += 1; console.log(`FAIL  ${photo}: no __frameHorizon readout (the page never built, or ?horizon=1 is not surfaced)`); continue; }
      const { ph, h, painted, clouds } = r;
      const share = h.cols ? h.agree / h.cols : 0;
      // ACCEPTANCE: the PARSE's horizon is the first non-sky row (recomputed independently in the gate).
      // A no-sky photograph has ZERO resolved columns by definition; the guard line below is its assertion.
      if (!ph.noSky) say(ph.agree === ph.resolved && ph.resolved > 0, `${photo}: the parse's horizon IS the first non-sky row in ${ph.agree}/${ph.resolved} resolved columns (${ph.imputed} imputed by the published neighbour rule)`);
      // A PHOTOGRAPH WITH NO SKY IS THE GUARD'S CASE, NOT A 0.90 CASE. photos-test/a.jpg is an AZLK against a brick
      // wall: the parse returns building/car/pole/road/sidewalk/terrain and no sky at all. The requirement there is
      // that the frame paints NO sky and places NO cloud - the published guard (`skylinePoints = [0]*w`).
      if (h.noSky) {
        // NOTHING TO RENDER WHEN NOTHING WAS FOUND. a.jpg is a car against a wall: the detector finds no target, the
        // yard never builds, and paintSky is never called, so `painted` is NULL - "not measured", not "measured 0".
        // The guard is asserted on what the page can observe: the mask has no sky, the horizon is 0 everywhere (the
        // 100% figure below is two zero vectors, printed so it cannot be mistaken for an agreement number), and no
        // cloud is placed. A titled "painted 0" would be a claim about a pass that never ran.
        const guardOk = h.skyPx === 0 && clouds === 0 && (painted === null || painted === 0);
        say(guardOk && ph.noSky,
          `${photo}: NO SKY in the parse -> guard fires (noSky ${ph.noSky}), horizon 0 in ${ph.cols} columns, ${clouds} clouds, painted ${painted === null ? 'n/a (no yard built)' : painted + ' px'}`);
        console.log(`      OPEN ITEM Q15 (measured, NOT a pass): the FRAME's own skyline agrees with masks.sky on only ${(100 * share).toFixed(1)}% of columns. The 0.90 acceptance above is on the PARSE's horizon; the frame still does not use that mask, and this number is the size of the gap. It is reported in the verdict below, never dropped.`);
      } else {
        say(painted > 0,
          `${photo}: the frame paints ${painted} sky px`);
        console.log(`      OPEN ITEM Q15 (measured, NOT a pass): the FRAME's skyline agrees with masks.sky on ${(100 * share).toFixed(1)}% of ${h.cols} columns (mean |d| ${h.mean.toFixed(2)}, max ${h.max}). The frame does not use the mask; the acceptance above is the parse's own horizon.`);
      }
    } catch (e) {
      fails += 1;
      console.log(`FAIL  ${photo}: ${String(e.message || e).slice(0, 120)}`);
    }
  }
  console.log(fails ? `\nTHE HORIZON IS NOT CONFIRMED: ${fails} assertion(s) failed.` : '\nTHE HORIZON IS CONFIRMED for the PARSE: its horizon is the first non-sky row (exact on resolved columns) and the no-sky guard fires. NOT confirmed for the FRAME: Q15 is open - the frame\'s skyline agrees with masks.sky on a minority of columns, and that gap is measured and named above rather than demoted to a comment.');
}
process.exit(fails ? 1 : 0);
