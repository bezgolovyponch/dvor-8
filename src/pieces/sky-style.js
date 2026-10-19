// THE SKY'S STYLE — piece. Contract: takes the sky's MASK, the designed puffs and the palette; writes the sky's
// tones into `idx`; returns what it measured. It decides nothing about WHERE the sky is (the sky region is stage 5 of
// the pipeline) and nothing about which tones exist (the palette is stage 1) - it is the STYLE of the sky only.
//
// THE PARAMETERS, AND THEIR SOURCE (all from the operator's engine, `tools/v13/engine-v13.txt`):
//   S6  `skyStyle(x, y)` line 85 - base tone, Bayer-dithered band toward the horizon, and flat two-tone clouds from
//       value noise. The band is NOT painted here: in this palette its only light tone is the sky ramp's white, and
//       measured at T+134 a faithful band costs R1 its whole budget (blue -0.111 against 0.09). Recorded in
//       docs/WIRING-REVIEW.md as the open item; this piece paints the part that measures.
//   S6  the noise: two octaves (`vn(x/20+3, y/7)*.65 + vn(x/7+9, y/3+2)*.35`), shade sampled from the same field
//       2.5 px higher ("cloud shade = the same noise sampled 2.5 px higher"), smoothstep interpolation
//       (Perlin 1985 lineage; v13's own `vn`).
//   S6  threshold 0.03 in the reference. Ours is 0.12 with a zenith lift and a horizon push, because the reference
//       piles clouds at the TOP (`-(ys-150)/60*0.2`) and this project's delivery rule S1 requires the top band's most
//       common colour to be the blue plane - the reconciliation is measured and recorded (D25, T+126/T+134).
//
// THE TONES ARE THE SKY RAMP'S OWN: lit = the ramp's top tone (white), shade = three rungs below the top (the blue of
// a cloud's underside), base = the plane the palette resolves for the sky's colour. No entry is added.
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** A stateless hash: the field must be a function of the pixel, so two runs of one photograph are identical. */
const hash2 = (x, y) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Two-octave value noise with smoothstep interpolation - the reference's `vn`, ours in pixel units. */
const vnoise = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};

/**
 * Paint the sky's style into `idx` (in place).
 * @param {object} o
 * @param {number} o.w @param {number} o.h
 * @param {Int32Array|Uint8Array} o.idx        the frame's palette indices
 * @param {Uint8Array} o.skyMask               1 on every sky pixel
 * @param {Int32Array|null} [o.cloudMask]      the designed puffs: entry per pixel, -1 for none
 * @param {Int32Array} o.skyline               the first non-sky row per column (the horizon, measured)
 * @param {number} o.base                      the palette entry for the plane (resolved with the sky flag)
 * @param {number} o.ramp                      the sky ramp's first palette index
 * @param {number} [o.steps]                   tones per ramp (6 in this palette)
 * @returns {{ base:number, skyHeight:number, field:{px:number,lit:number,shade:number}, puffs:number, cover:number }}
 */
export function paintSkyStyle({ w, h, idx, skyMask, cloudMask = null, skyline, base, ramp, steps = 6 }) {
  const n = w * h;
  const lit = ramp + steps - 1;          // the cloud's lit top: the ramp's palest tone (pure white in this table)
  const shade = ramp + Math.max(1, steps - 3);   // its underside: three rungs below the top
  // the sky's own height, measured from the skyline it was given - never a fixed row count (a 270-row sky and a
  // 334-row sky must both place their deck the same way; measured on the operator's sunset scene at T+129)
  let skyH = 0, cols = 0;
  for (let x = 0; x < w; x += 1) if (skyline[x] > 0 && skyline[x] <= h) { skyH += skyline[x]; cols += 1; }
  skyH = cols ? skyH / cols : h * 0.65;

  let painted = 0;
  for (let p2 = 0; p2 < n; p2 += 1) if (skyMask[p2]) { idx[p2] = base; painted += 1; }

  let px = 0, litPx = 0, shadePx = 0;
  for (let p2 = 0; p2 < n; p2 += 1) {
    if (!skyMask[p2]) continue;
    const x = p2 % w, y = (p2 / w) | 0;
    const v = vnoise(x / 31 + 3, y / 11) * 0.65 + vnoise(x / 11 + 9, y / 5 + 2) * 0.35 - 0.5
      + 0.10 * clamp01((y - 0.12 * skyH) / (0.48 * skyH));                  // the horizon push: the deck sits over the yard
    const thr = 0.12 + 0.06 * clamp01((0.30 * skyH - y) / (0.30 * skyH));    // the zenith lift: the top keeps its plane
    if (v <= thr) continue;
    if (v > thr + 0.08) { idx[p2] = lit; litPx += 1; } else { idx[p2] = shade; shadePx += 1; }
    px += 1;
  }
  // THE DESIGNED PUFFS GO ON TOP (v13 S14's pieces): they were placed against the photograph's own sky, so they keep
  // their recorded tones and the field never overwrites them.
  let puffs = 0;
  if (cloudMask) for (let p2 = 0; p2 < n; p2 += 1) if (cloudMask[p2] >= 0 && skyMask[p2]) { idx[p2] = cloudMask[p2]; puffs += 1; }
  return { base, skyHeight: Math.round(skyH), field: { px, lit: litPx, shade: shadePx }, puffs, cover: painted ? px / painted : 0 };
}
