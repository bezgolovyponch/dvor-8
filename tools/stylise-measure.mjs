// How well does the stylisation separate SURFACES? Measures the current pipeline and two candidate fixes
// on a real photograph, in the browser (which is the only image environment this machine has).
//
//   BASE=http://127.0.0.1:4312/ node --experimental-websocket tools/stylise-measure.mjs photos-test/a.jpg
//
// The question it answers: after quantisation, can you still tell the ROAD from the WALL? A scene reads
// correctly when surfaces differ from each other MORE than each differs from itself. That is the ratio
// printed as `separation` — and it is the number the creator's complaint is really about.

import { withPage } from './browser.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4310/';
const photo = process.argv[2] || 'photos-test/a.jpg';

await withPage(BASE, { width: 900, height: 900 }, async (page) => {
  await page.wait(2000);
  const res = await page.run(`
    const img = new Image();
    img.src = ${JSON.stringify(photo)};
    await img.decode();

    const W = 192, H = 256;
    // Crop the centre of the photo to the game's aspect, the same way the game frames a yard.
    const ar = img.width / img.height, want = W / H;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ar > want) { sw = img.height * want; sx = (img.width - sw) / 2; } else { sh = img.width / want; sy = (img.height - sh) / 2; }
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.imageSmoothingEnabled = true;
    cx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    const base = cx.getImageData(0, 0, W, H);

    // ---- helpers -------------------------------------------------------
    const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

    // A 5x5 bilateral: edge-preserving smoothing. Weights fall off with BOTH distance and colour
    // difference, which is the whole point — it flattens a wall without crossing the wall's edge.
    function bilateral(src, radius, sigmaS, sigmaR) {
      const out = new Uint8ClampedArray(src.length);
      const s2 = 2 * sigmaS * sigmaS, r2 = 2 * sigmaR * sigmaR;
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        let wr = 0, wg = 0, wb = 0, wsum = 0;
        for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = (ny * W + nx) * 4;
          const dr = src[j] - src[i], dg = src[j + 1] - src[i + 1], db = src[j + 2] - src[i + 2];
          const w = Math.exp(-(dx * dx + dy * dy) / s2) * Math.exp(-(dr * dr + dg * dg + db * db) / r2);
          wr += src[j] * w; wg += src[j + 1] * w; wb += src[j + 2] * w; wsum += w;
        }
        out[i] = wr / wsum; out[i + 1] = wg / wsum; out[i + 2] = wb / wsum; out[i + 3] = 255;
      }
      return out;
    }

    // Median-cut to N colours, the way the game builds its palette from the photo's own colours.
    function paletteOf(src, n) {
      const px = [];
      for (let i = 0; i < src.length; i += 4 * 7) px.push([src[i], src[i + 1], src[i + 2]]);   // sample
      let boxes = [px];
      while (boxes.length < n) {
        boxes.sort((a, b) => {
          const rng = (b2) => { let lo = [255, 255, 255], hi = [0, 0, 0];
            for (const p of b2) for (let k = 0; k < 3; k += 1) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
            return Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); };
          return rng(b) - rng(a);
        });
        const box = boxes.shift();
        if (!box || box.length < 2) { boxes.push(box); break; }
        let lo = [255, 255, 255], hi = [0, 0, 0];
        for (const p of box) for (let k = 0; k < 3; k += 1) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
        const axis = (hi[1] - lo[1] > hi[0] - lo[0]) ? (hi[2] - lo[2] > hi[1] - lo[1] ? 2 : 1) : (hi[2] - lo[2] > hi[0] - lo[0] ? 2 : 0);
        box.sort((a, b) => a[axis] - b[axis]);
        const mid = box.length >> 1;
        boxes.push(box.slice(0, mid), box.slice(mid));
      }
      return boxes.map((b) => {
        let r = 0, g = 0, bl = 0;
        for (const p of b) { r += p[0]; g += p[1]; bl += p[2]; }
        return [r / b.length, g / b.length, bl / b.length];
      });
    }

    const nearest = (pal, r, g, b) => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < pal.length; i += 1) {
        const d = (pal[i][0] - r) ** 2 + (pal[i][1] - g) ** 2 + (pal[i][2] - b) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    };

    const BAYER4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map((v) => (v + 0.5) / 16 - 0.5);

    // The game's current pipeline: quantise straight from the raw pixels with one ordered dither.
    function current(src, n = 28, dither = 26) {
      const pal = paletteOf(src, n);
      const out = new Uint8ClampedArray(src.length);
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4, d = BAYER4[(y & 3) * 4 + (x & 3)] * dither;
        const k = nearest(pal, src[i] + d, src[i + 1] + d, src[i + 2] + d);
        out[i] = pal[k][0]; out[i + 1] = pal[k][1]; out[i + 2] = pal[k][2]; out[i + 3] = 255;
      }
      return out;
    }

    // Candidate A: edge-preserving smoothing first, then the same quantisation.
    function smoothed(src, n = 28, dither = 26) {
      return current(bilateral(src, 2, 2.2, 26), n, dither);
    }

    // Candidate B: smoothing, then a dither whose STRENGTH depends on how flat the local area is. A flat
    // wall gets a calm pattern; a busy area keeps detail. One global dither cannot do both.
    function material(src, n = 28) {
      const sm = bilateral(src, 2, 2.2, 26);
      const pal = paletteOf(sm, n);
      const out = new Uint8ClampedArray(src.length);
      const flat = new Float32Array(W * H);
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        let lo = 255, hi = 0;
        for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
          const nx = Math.min(W - 1, Math.max(0, x + dx)), ny = Math.min(H - 1, Math.max(0, y + dy));
          const j = (ny * W + nx) * 4, l = luma(sm[j], sm[j + 1], sm[j + 2]);
          lo = Math.min(lo, l); hi = Math.max(hi, l);
        }
        flat[y * W + x] = 1 - Math.min(1, (hi - lo) / 40);       // 1 = perfectly flat, 0 = busy
      }
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        const d = BAYER4[(y & 3) * 4 + (x & 3)] * (8 + 26 * flat[y * W + x]);
        const k = nearest(pal, sm[i] + d, sm[i + 1] + d, sm[i + 2] + d);
        out[i] = pal[k][0]; out[i + 1] = pal[k][1]; out[i + 2] = pal[k][2]; out[i + 3] = 255;
      }
      return out;
    }

    // ---- regions of the photograph, picked by hand from the real image ----
    // Fractions of the frame: road along the bottom, wall across the upper left, car in the middle.
    const region = (x0, y0, x1, y1) => {
      const xs = Math.round(x0 * W), xe = Math.round(x1 * W), ys = Math.round(y0 * H), ye = Math.round(y1 * H);
      return { xs, xe, ys, ye };
    };
    const REGIONS = {
      road: region(0.05, 0.80, 0.55, 0.98),
      wall: region(0.02, 0.08, 0.28, 0.35),
      car:  region(0.30, 0.55, 0.62, 0.72),
      sky:  region(0.55, 0.02, 0.95, 0.10),
    };

    const stats = (src) => {
      const s = {};
      for (const [name, r] of Object.entries(REGIONS)) {
        let sr = 0, sg = 0, sb = 0, n = 0, varsum = 0;
        const vals = [];
        for (let y = r.ys; y < r.ye; y += 1) for (let x = r.xs; x < r.xe; x += 1) {
          const i = (y * W + x) * 4;
          sr += src[i]; sg += src[i + 1]; sb += src[i + 2]; n += 1;
          vals.push(luma(src[i], src[i + 1], src[i + 2]));
        }
        const m = [sr / n, sg / n, sb / n];
        const lmean = vals.reduce((a, b) => a + b, 0) / vals.length;
        for (const v of vals) varsum += (v - lmean) ** 2;
        s[name] = { mean: m, sd: Math.sqrt(varsum / vals.length), unique: new Set(vals.map((v) => Math.round(v))).size };
      }
      // separation = smallest distance between two surfaces / largest spread within a surface
      const names = Object.keys(s);
      let minBetween = Infinity, maxWithin = 0;
      for (let i = 0; i < names.length; i += 1) for (let j = i + 1; j < names.length; j += 1) {
        const a = s[names[i]].mean, b = s[names[j]].mean;
        minBetween = Math.min(minBetween, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
      for (const n of names) maxWithin = Math.max(maxWithin, s[n].sd * 2);
      return { surfaces: s, minBetween: +minBetween.toFixed(1), maxWithin: +maxWithin.toFixed(1),
               separation: +(minBetween / Math.max(1e-6, maxWithin)).toFixed(2) };
    };

    const raw = new Uint8ClampedArray(base.data);
    return {
      photo: ${JSON.stringify(photo)},
      raw: stats(raw),
      current: stats(current(raw)),
      smoothed: stats(smoothed(raw)),
      material: stats(material(raw)),
    };
  `);
  console.log(JSON.stringify(res, null, 1));
});
