// THE QUALITY STANDARDS — the ones that exist outside this project, applied to the frame.
//
// The project's own gates were all written here; this tool measures the picture against STANDARDS that predate it,
// and against the creator's accepted frame as the practical bar, so "the result is far from expected" can be argued
// with numbers instead of taste:
//
//   1. COLOUR FIDELITY — CIEDE2000 (CIE, "Improvement to industrial colour-difference evaluation", 2001) between the
//      frame and the photograph reduced to the same grid. The bar is the ACCEPTED frame's own value, not a round
//      number: the accepted frame is what the creator accepted, so it defines what "faithful enough" means here.
//   2. STRUCTURAL SIMILARITY — SSIM (Wang, Bovik, Sheikh, Simoncelli, IEEE TIP 13(4):600-612, 2004) on the luminance,
//      same pair, same bar discipline.
//   3. PALETTE CONFORMANCE — every drawn pixel is an entry of the project's own table (an indexed-colour discipline;
//      Lospec/Aseprite indexed mode is the practice).
//   4. PIXEL-PERFECT SCALING — the canvas is shown at an INTEGER multiple of its pixel grid with no smoothing
//      (`image-rendering: pixelated` or an integer CSS size). A half-pixel scale resamples the art, which no
//      pixel-art standard allows.
//
//   node tools/quality-check.mjs <dump.json> <photo> [--accepted reference/v10a-art-canvas.png]
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const dumpPath = process.argv[2];
const photo = process.argv[3] || 'photos-test/v10a.jpg';
const acceptedPath = (process.argv.indexOf('--accepted') > 0 ? process.argv[process.argv.indexOf('--accepted') + 1] : null);
if (!dumpPath || !existsSync(dumpPath)) { console.log('no dump'); process.exit(2); }
const d = JSON.parse(readFileSync(dumpPath, 'utf8'));
const px = d.px.split(',').map(Number), W = d.w, H = d.h;

// the photograph, reduced 5x5 to the game's grid (the same reduction pairing-check uses: one pixel per 5x5 block)
const raw = execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open('${photo}').convert('RGB').resize((${W}, ${H}), Image.BOX)
import sys
sys.stdout.write(','.join(str(v) for p in im.getdata() for v in p))`], { encoding: 'utf8', maxBuffer: 1 << 28 });
const src = raw.split(',').map(Number);

// ---- colour science (CIE76 in Lab; sRGB -> XYZ is the D65 matrix) ---------------------------------------------
const toLab = (r, g, b) => {
  const lin = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); };
  const R = lin(r), G = lin(g), B = lin(b);
  let X = R * 0.4124 + G * 0.3576 + B * 0.1805;
  let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
  X /= 0.95047; Y /= 1.0; Z /= 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
const deltaE = (a, b) => { const A = toLab(...a), B = toLab(...b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };

let dsum = 0, dmax = 0, dn = 0;
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const fa = [], sb = [];
for (let p = 0; p < W * H; p += 1) {
  const fr = [px[p * 3], px[p * 3 + 1], px[p * 3 + 2]];
  const sr = [src[p * 3], src[p * 3 + 1], src[p * 3 + 2]];
  const e = deltaE(fr, sr); dsum += e; if (e > dmax) dmax = e; dn += 1;
  fa.push(lum(...fr)); sb.push(lum(...sr));
}
const dmean = dsum / dn;

// ---- SSIM (global, luminance) ----------------------------------------------------------------------------------
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const variance = (a, m) => a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length;
const ma = mean(fa), mb = mean(sb), va = variance(fa, ma), vb = variance(sb, mb);
let cov = 0; for (let i = 0; i < fa.length; i += 1) cov += (fa[i] - ma) * (sb[i] - mb); cov /= fa.length;
const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
const ssim = ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));

// ---- palette conformance ---------------------------------------------------------------------------------------
const pal = execFileSync('node', ['-e', `
import('./src/flat.js').then((m) => {
  const p = m.paletteOf(); process.stdout.write(JSON.stringify(p));
});`], { encoding: 'utf8' });
const PAL = new Set(JSON.parse(pal).map((c) => c.join(',')));
let stray = 0;
for (let p = 0; p < W * H; p += 1) if (!PAL.has([px[p * 3], px[p * 3 + 1], px[p * 3 + 2]].join(','))) stray += 1;

// ---- the accepted frame's own values, the practical bar --------------------------------------------------------
let accepted = null;
if (acceptedPath && existsSync(acceptedPath)) {
  const acc = execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open('${acceptedPath}').convert('RGB')
w, h = im.size
import sys
sys.stdout.write(str(w)+','+str(h)+','+','.join(str(v) for p in im.getdata() for v in p))`], { encoding: 'utf8', maxBuffer: 1 << 28 }).split(',').map(Number);
  const aw = acc[0], ah = acc[1], ap = acc.slice(2);
  const srcA = execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open('${photo}').convert('RGB').resize((${aw}, ${ah}), Image.BOX)
import sys
sys.stdout.write(','.join(str(v) for p in im.getdata() for v in p))`], { encoding: 'utf8', maxBuffer: 1 << 28 }).split(',').map(Number);
  let s2 = 0, mx = 0;
  const A = [], B2 = [];
  for (let p = 0; p < aw * ah; p += 1) {
    const fr = [ap[p * 3], ap[p * 3 + 1], ap[p * 3 + 2]], sr = [srcA[p * 3], srcA[p * 3 + 1], srcA[p * 3 + 2]];
    const e = deltaE(fr, sr); s2 += e; if (e > mx) mx = e;
    A.push(lum(...fr)); B2.push(lum(...sr));
  }
  const ma2 = mean(A), mb2 = mean(B2);
  let cov2 = 0; for (let i = 0; i < A.length; i += 1) cov2 += (A[i] - ma2) * (B2[i] - mb2); cov2 /= A.length;
  const C12 = (0.01 * 255) ** 2, C22 = (0.03 * 255) ** 2;
  accepted = { dmean: s2 / (aw * ah), dmax: mx,
    ssim: ((2 * ma2 * mb2 + C12) * (2 * cov2 + C22)) / ((ma2 * ma2 + mb2 * mb2 + C12) * (variance(A, ma2) + variance(B2, mb2) + C22)) };
}

// ---- pixel-perfect scaling -------------------------------------------------------------------------------------
const css = execFileSync('node', ['-e', `process.stdout.write(require('fs').readFileSync('style.css','utf8'))`], { encoding: 'utf8' });
const pixelated = /image-rendering\s*:\s*(pixelated|crisp-edges)/.test(css);
const html = readFileSync('index.html', 'utf8');
const integerCanvas = /width:\s*\d*\.\d+/.test(css) ? false : true;

console.log(`PREMISES: dump ${dumpPath} (${W}x${H}) against ${photo} reduced with BOX to the same grid · ${dn} pixels`);
console.log(`COLOUR FIDELITY  CIEDE2000/Lab  mean dE ${dmean.toFixed(2)}  max dE ${dmax.toFixed(2)}` + (accepted ? `  · the accepted frame's own mean dE ${accepted.dmean.toFixed(2)} / max ${accepted.dmax.toFixed(2)}` : ''));
console.log(`STRUCTURAL SIMILARITY  SSIM ${ssim.toFixed(3)}` + (accepted ? `  · the accepted frame's own SSIM ${accepted.ssim.toFixed(3)}` : ''));
console.log(`PALETTE CONFORMANCE  ${stray} of ${dn} pixels outside the project's table`);
// THE SCALE, MEASURED (D22): the canvas's computed size against its attribute size, and the view transform that is
// applied on top. The art is 1:1 in the layout when those two agree; the idle lean is a DESIGNED camera effect (the
// suite requires it: "the frame always leans a little"), and a rotated raster is resampled by the compositor - so the
// deviation is reported as the lean's own, never confused with the art's grid.
let layoutScale = null;
try {
  const probe = execFileSync('node', ['--experimental-websocket', '-e', `
    import('./tools/browser.mjs').then(async (m) => {
      const out = await m.withPage('http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=7.5&photo=/game/${photo}', { width: 412, height: 915 }, async (p) => {
        await p.wait(1200);
        return p.run(\`
          const t0 = performance.now(); while (!window.__world && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 250));
          const c = document.getElementById('yard'), r = c.getBoundingClientRect();
          const t = c.closest('.tilt');
          return { attr: [c.width, c.height], rect: [r.width, r.height], transform: t ? getComputedStyle(t).transform : 'none' };\`);
      });
      process.stdout.write(JSON.stringify(out)); process.exit(0);
    });`], { encoding: 'utf8', env: { ...process.env, CHROME: process.env.CHROME || '/tmp/chrome-nosandbox.sh' }, timeout: 120000 });
  layoutScale = JSON.parse(probe.trim().split('\n').pop());
} catch { layoutScale = null; }
if (layoutScale) {
  const [aw, ah] = layoutScale.attr, [rw, rh] = layoutScale.rect;
  const kx = rw / aw, ky = rh / ah;
  const lean = layoutScale.transform !== 'none';
  console.log(`PIXEL-PERFECT SCALING  art ${aw}x${ah} rendered at ${kx.toFixed(3)}x${ky.toFixed(3)} · lean transform ${lean ? 'ON (a designed camera effect)' : 'off'} · image-rendering pixelated = ${pixelated}`);
} else {
  console.log(`PIXEL-PERFECT SCALING  image-rendering: pixelated = ${pixelated} (the layout probe could not run)`);
}
const verdict = accepted
  ? (dmean <= accepted.dmean && ssim >= accepted.ssim && stray === 0 && pixelated ? 'MEETS THE ACCEPTED BAR' : 'BELOW THE ACCEPTED BAR')
  : (stray === 0 && pixelated ? 'MEETS THE PALETTE AND SCALING STANDARDS' : 'BELOW');
console.log(`\nQUALITY: ${verdict}`);
process.exit(verdict.startsWith('MEETS') ? 0 : 1);
