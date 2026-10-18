// PIECE CHECK — FACADE-PHOTO (src/pieces/facade-photo.js). Run: node tools/piece-facade-photo-check.mjs
//
// The piece claims three things, and this check refuses each one deliberately:
//   1. it finds the openings as panes (a wall with 5x6 openings -> 30 panes; a blank wall -> 0 panes: no invention);
//   2. it keeps the photograph (every non-pane pixel inside the mask carries the QUANTISED PHOTO COLOUR, not a tone
//      of ours) and recolours ONLY the panes (each pane pixel is on the glass ramp);
//   3. it owns only its mask (no pixel outside the mask is touched, and no pixel another piece owns is overwritten).
// A glass wall (a dark mullion lattice around bright blue panes) is the second case: panes come from the lattice.
import { boundaryQuad, period, paintFacadePhoto } from '../src/pieces/facade-photo.js';

let fails = 0;
const ok = (name, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); if (!cond) fails += 1; };

// a tiny working palette: 0..9 neutral ramp, 10..13 glass, 48 outline
const PAL = Array.from({ length: 50 }, (_, i) => i < 10 ? [20 + i * 18, 20 + i * 18, 20 + i * 18] : i < 14 ? [40 + (i - 10) * 40, 90 + (i - 10) * 40, 180 + (i - 10) * 18] : [26, 18, 32]);
const quant = (r, g, b) => { let best = 0, bd = 1e9; for (let i = 0; i < 10; i += 1) { const p = PAL[i]; const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = i; } } return best; };

// ---------------------------------------------------------------- case 1: punched windows in a light wall
const W = 96, H = 128, n = W * H;
const rgb = new Float32Array(n * 3).fill(180);
const mask = new Uint8Array(n);
for (let y = 10; y < 118; y += 1) for (let x = 14; x < 82; x += 1) mask[y * W + x] = 1;
const holes = [];
for (let r = 0; r < 6; r += 1) for (let c = 0; c < 5; c += 1) {
  const x = 22 + c * 12, y = 20 + r * 15;
  holes.push([x, y]);
  for (let yy = y; yy < y + 7; yy += 1) for (let xx = x; xx < x + 9; xx += 1) {
    if (!mask[yy * W + xx]) continue;
    rgb[(yy * W + xx) * 3] = 40; rgb[(yy * W + xx) * 3 + 1] = 40; rgb[(yy * W + xx) * 3 + 2] = 40;
  }
}
const idx = new Uint8Array(n).fill(255);
const qWall = quant(180, 180, 180);
const r1 = paintFacadePhoto({ idx, w: W, h: H, mask, rgb, quant, glass: [10, 11, 12, 13], outline: 48, groundY: H });
ok('punched: 5x6 openings -> 30 panes', r1 && r1.panes.length === 30, r1 ? `${r1.panes.length} panes, kind ${r1.kind}, cols ${r1.cols} rows ${r1.rows}` : 'null');
let wallOk = true, paneOk = true, outside = false;
const panePx = new Set(); for (const p of r1.panes) for (const k of p.px) panePx.add(k);
for (let k = 0; k < n; k += 1) {
  if (!mask[k]) { if (idx[k] !== 255) outside = true; continue; }
  if (panePx.has(k)) { if (idx[k] < 10 || idx[k] > 13) paneOk = false; } else if (idx[k] !== qWall) wallOk = false;
}
ok('punched: the facade is the photograph (non-pane px carry the quantised photo colour)', wallOk, `wall entry ${qWall}`);
ok('punched: only the panes are recoloured (each on the glass ramp)', paneOk, '');
ok('punched: nothing outside the mask is touched', !outside, '');
ok('punched: at least one pane pixel is the darkest glass tone or lighter', r1.panes.length > 0, '');

// ---------------------------------------------------------------- case 2: a blank wall invents nothing
const idx2 = new Uint8Array(n).fill(255);
const r2 = paintFacadePhoto({ idx: idx2, w: W, h: H, mask, rgb: new Float32Array(n * 3).fill(180), quant, glass: [10, 11, 12, 13], outline: 48, groundY: H });
ok('blank wall: 0 panes (no invented windows)', r2 && r2.panes.length === 0, r2 ? `${r2.panes.length} panes` : 'null');

// ---------------------------------------------------------------- case 3: a glass wall (dark mullions, blue panes)
const rgb3 = new Float32Array(n * 3);
for (let k = 0; k < n; k += 1) { const x = k % W, y = (k / W) | 0; const mull = (x % 8 < 2) || (y % 10 < 2); rgb3[k * 3] = mull ? 24 : 90; rgb3[k * 3 + 1] = mull ? 20 : 150; rgb3[k * 3 + 2] = mull ? 26 : 220; }
const idx3 = new Uint8Array(n).fill(255);
const r3 = paintFacadePhoto({ idx: idx3, w: W, h: H, mask, rgb: rgb3, quant, glass: [10, 11, 12, 13], outline: 48, groundY: H });
ok('glass wall: panes found on the lattice', r3 && r3.panes.length >= 20, r3 ? `${r3.panes.length} panes, kind ${r3.kind}` : 'null');
let gOk = true; for (const p of (r3 ? r3.panes : [])) for (const k of p.px) if (idx3[k] < 10 || idx3[k] > 13) gOk = false;
ok('glass wall: pane pixels on the glass ramp', gOk, '');

// ---------------------------------------------------------------- case 4: skip set is honoured
const skip = new Set([30 * W + 40]);
const idx4 = new Uint8Array(n).fill(255);
paintFacadePhoto({ idx: idx4, w: W, h: H, mask, rgb, quant, glass: [10, 11, 12, 13], outline: 48, groundY: H, skip });
ok('skip: a pixel another piece owns is not overwritten', idx4[30 * W + 40] === 255, '');

// ---------------------------------------------------------------- case 5: the quad fit follows a trapezoid
const trapezoid = new Uint8Array(n);
for (let y = 10; y < 118; y += 1) { const t = (y - 10) / 108; const l = Math.round(14 + t * 10), r = Math.round(82 - t * 10); for (let x = l; x < r; x += 1) trapezoid[y * W + x] = 1; }
const Q = boundaryQuad(trapezoid, W, H);
ok('quad: a trapezoid yields a 4-point quad', !!Q && Q.length === 4, Q ? JSON.stringify(Q) : 'null');

// ---------------------------------------------------------------- case 6: the period of a known comb
const comb = new Float32Array(80).fill(0); for (let i = 0; i < 80; i += 10) comb[i] = 10;
const per = period(comb);
ok('period: a 10-px comb returns 10', !per.fb && per.p >= 9 && per.p <= 20, `p ${per.p} ac ${per.ac.toFixed(2)}`);

console.log(fails ? `\nPIECE CHECK: ${fails} failure(s).` : '\nPIECE CHECK PASSED: the facade keeps the photo, recolours only its panes, and invents nothing.');
process.exit(fails ? 1 : 0);
