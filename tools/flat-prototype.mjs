// THE APPROACH THE REQUIREMENTS IMPLY, TESTED. Flat colour areas, drawn outlines, windows as rectangles.
//
//   BASE=http://127.0.0.1:4312/ node --experimental-websocket tools/flat-prototype.mjs <photo.jpg> <out.png> [targetH]
//
// Requirements this is built to (the creator's answers):
//   - ANY photo, and THE PHOTO'S OWN ASPECT RATIO is preserved
//   - SIMPLIFY HARD: flat colour areas plus drawn outlines, not photographic grain
//   - WINDOWS, DOORS, BUILDING EDGES, TREES, ROAD/KERB, SKY, CARS all readable
//   - the place stays RECOGNISABLE
//
// The sequence, and why each step is there:
//   1 REGIONS    Felzenszwalb & Huttenlocher (IJCV 2004): "preserve detail in low-variability image regions
//                while ignoring detail in high-variability regions". This IS the hard simplification: a
//                region becomes ONE flat colour, so grain cannot survive.
//   2 MERGE      small regions are absorbed, so a wall is one area rather than forty fragments.
//   3 RAMP       each region takes a colour from a small set of hue-shifted ramps. This is the step that
//                makes one photo look like the same game as the next: the palette is a FIXED STRUCTURE of
//                ramps (shadow/mid/light with the shadow hue-shifted toward blue), not a median cut of the
//                photo. The photo chooses which ramp and which step, never the palette itself.
//   4 OUTLINE    region borders are drawn. In flat-colour art the outline is what makes a shape read.
//   5 WINDOWS    a small region that is much darker than the region around it, and roughly rectangular, is
//                a window or a door.
import { withPage } from './browser.mjs';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:4312/';
const photo = process.argv[2] || 'photos-test/b.jpg';
const outPng = process.argv[3] || '/tmp/flat.png';
const TARGET_H = Number(process.argv[4] || 256);

await withPage(BASE, { width: 1100, height: 800 }, async (page) => {
  await page.wait(2000);
  const res = await page.run(`
    const img = new Image(); img.src = ${JSON.stringify(photo)}; await img.decode();
    // THE PHOTO'S OWN ASPECT RATIO, at a fixed height. This is the first requirement and it changes
    // everything downstream: there is no centre crop any more.
    const H = ${TARGET_H};
    const W = Math.max(64, Math.round(H * img.width / img.height));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, 0, 0, img.width, img.height, 0, 0, W, H);
    const src = new Uint8ClampedArray(cx.getImageData(0, 0, W, H).data);

    // ---- 1. Felzenszwalb regions ---------------------------------------------------------------------
    // The parameter is k, renamed scale in scikit-image; selective search uses k = 50 on 8-bit
    // greyscale. Merge distance here is summed over three channels (0-765), so k is scaled to match.
    function felzenszwalb(a, w, h, k) {
      const n = w * h;
      const parent = new Int32Array(n), size = new Int32Array(n).fill(1), diff = new Float32Array(n);
      for (let i = 0; i < n; i += 1) parent[i] = i;
      const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      const edges = [];
      for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
        const i = y * w + x;
        for (const [dx, dy] of [[1,0],[0,1],[1,1],[-1,1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          const d = Math.abs(a[i*4]-a[j*4]) + Math.abs(a[i*4+1]-a[j*4+1]) + Math.abs(a[i*4+2]-a[j*4+2]);
          edges.push([d, i, j]);
        }
      }
      edges.sort((p, q) => p[0] - q[0]);
      for (const [d, i, j] of edges) {
        const ri = find(i), rj = find(j);
        if (ri === rj) continue;
        if (d <= Math.min(diff[ri] + k / size[ri], diff[rj] + k / size[rj])) {
          const big = size[ri] >= size[rj] ? ri : rj, small = big === ri ? rj : ri;
          parent[small] = big; size[big] += size[small]; diff[big] = Math.max(diff[big], d, diff[small]);
        }
      }
      const lab = new Int32Array(n), remap = new Map();
      let next = 0;
      for (let i = 0; i < n; i += 1) {
        const r = find(i);
        if (!remap.has(r)) remap.set(r, next++);
        lab[i] = remap.get(r);
      }
      return { lab, count: next };
    }

    // ---- 2/3. merge small regions and give each a ramp step ------------------------------------------
    function flatColour(a, lab, count, w, h, minSize) {
      const sums = new Float64Array(count * 3), sizes = new Int32Array(count);
      for (let i = 0; i < w * h; i += 1) {
        const r = lab[i];
        sums[r*3] += a[i*4]; sums[r*3+1] += a[i*4+1]; sums[r*3+2] += a[i*4+2];
        sizes[r] += 1;
      }
      // absorb anything below minSize into the neighbouring region with the closest colour
      const parent = new Int32Array(count);
      for (let i = 0; i < count; i += 1) parent[i] = i;
      const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      const mean = (r) => sizes[r] ? [sums[r*3]/sizes[r], sums[r*3+1]/sizes[r], sums[r*3+2]/sizes[r]] : [0,0,0];
      for (let r = 0; r < count; r += 1) {
        if (sizes[r] >= minSize) continue;
        const m = mean(r);
        let best = -1, bd = Infinity;
        for (let i = 0; i < w * h; i += 1) {
          const q = find(lab[i]);
          if (q === r) continue;
          const mq = mean(q);
          const d = (m[0]-mq[0])**2 + (m[1]-mq[1])**2 + (m[2]-mq[2])**2;
          if (d < bd) { bd = d; best = q; }
        }
        if (best >= 0) { parent[r] = best; sizes[best] += sizes[r]; sums[best*3]+=sums[r*3]; sums[best*3+1]+=sums[r*3+1]; sums[best*3+2]+=sums[r*3+2]; }
      }
      const outLab = new Int32Array(w * h);
      for (let i = 0; i < w * h; i += 1) outLab[i] = find(lab[i]);
      return { outLab, mean, sizes };
    }

    // ---- the ramp palette: a FIXED STRUCTURE, chosen from the photo but never derived from it ----------
    // A pixel-art ramp is a hue-shifted set of steps, not a lightness ramp of one hue. The shadow end of
    // each ramp is pulled toward blue-violet and the light end toward yellow, which is the convention that
    // makes flat art read as lit rather than as tinted. Six ramps cover what a yard contains.
    const RAMPS = [
      { name: 'sky',     hue: 210, sat: 0.55 },
      { name: 'foliage', hue: 108, sat: 0.45 },
      { name: 'earth',   hue: 28,  sat: 0.40 },
      { name: 'stone',   hue: 40,  sat: 0.16 },
      { name: 'metal',   hue: 220, sat: 0.10 },
      { name: 'warm',    hue: 8,   sat: 0.50 },
    ];
    const STEPS = 4;
    function hsl2rgb(h, s, l) {
      h = ((h % 360) + 360) % 360 / 360;
      const a = s * Math.min(l, 1 - l);
      const f = (n) => { const k = (n + h * 12) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))))); };
      return [f(0), f(8), f(4)];
    }
    // build STEPS tones per ramp: dark end shifted toward blue-violet, light end toward yellow
    const TONES = RAMPS.map((r) => {
      const out = [];
      for (let i = 0; i < STEPS; i += 1) {
        const t = i / (STEPS - 1);
        const l = 0.16 + t * 0.68;
        const hue = r.hue + (1 - t) * 24 - t * 12;      // shadows toward blue, lights toward yellow
        const sat = r.sat * (1 - Math.abs(t - 0.55) * 0.45);
        out.push(hsl2rgb(hue, sat, l));
      }
      return out;
    });
    const rgb2hsl = (R, G, B) => {
      R /= 255; G /= 255; B /= 255;
      const mx = Math.max(R,G,B), mn = Math.min(R,G,B), d = mx - mn;
      let hh = 0;
      if (d) {
        if (mx === R) hh = 60 * (((G - B) / d) % 6);
        else if (mx === G) hh = 60 * ((B - R) / d + 2);
        else hh = 60 * ((R - G) / d + 4);
      }
      const l = (mx + mn) / 2;
      const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
      return [((hh % 360) + 360) % 360, s, l];
    };
    function rampFor(colour) {
      const [hh, ss, ll] = rgb2hsl(colour[0], colour[1], colour[2]);
      let best = 0, bd = Infinity;
      for (let i = 0; i < RAMPS.length; i += 1) {
        let dh = Math.abs(hh - RAMPS[i].hue); if (dh > 180) dh = 360 - dh;
        const d = dh * (0.6 + ss) + Math.abs(ss - RAMPS[i].sat) * 120;
        if (d < bd) { bd = d; best = i; }
      }
      return { ramp: best, t: Math.max(0, Math.min(1, ll)) };
    }

    const { lab, count } = felzenszwalb(src, W, H, 190);
    const minSize = Math.max(12, Math.round(W * H * 0.0016));
    const { outLab, mean, sizes } = flatColour(src, lab, count, W, H, minSize);

    // ---- paint it ------------------------------------------------------------------------------------
    const idx = new Uint8Array(W * H);
    const rampOf = new Int32Array(count).fill(-1), toneOf = new Int32Array(count).fill(-1);
    const out = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i += 1) {
      const r = outLab[i];
      if (rampOf[r] < 0) {
        const m = mean(r);
        const { ramp, t } = rampFor(m);
        rampOf[r] = ramp;
        toneOf[r] = Math.max(0, Math.min(STEPS - 1, Math.round(t * (STEPS - 1))));
      }
      const col = TONES[rampOf[r]][toneOf[r]];
      out[i*4] = col[0]; out[i*4+1] = col[1]; out[i*4+2] = col[2]; out[i*4+3] = 255;
      idx[i] = rampOf[r] * STEPS + toneOf[r];
    }

    // ---- 4. outline the regions ----------------------------------------------------------------------
    const OUTLINE = [11, 0, 24];
    let edge = 0;
    for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
      const i = y * W + x;
      if (outLab[i] !== outLab[i-1] || outLab[i] !== outLab[i+1] || outLab[i] !== outLab[i-W] || outLab[i] !== outLab[i+W]) {
        out[i*4] = OUTLINE[0]; out[i*4+1] = OUTLINE[1]; out[i*4+2] = OUTLINE[2];
        edge += 1;
      }
    }

    // ---- 5. windows: a small region much darker than the one around it, roughly rectangular ----------
    const box = new Map();
    for (let i = 0; i < W * H; i += 1) {
      const r = outLab[i];
      const b = box.get(r) || { x0: W, x1: -1, y0: H, y1: -1, n: 0, luma: 0, ramp: rampOf[r], tone: toneOf[r] };
      const x = i % W, y = (i / W) | 0;
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      b.n += 1; b.luma += 0.299*out[i*4] + 0.587*out[i*4+1] + 0.114*out[i*4+2];
      box.set(r, b);
    }
    const windows = [];
    for (const [r, b] of box) {
      const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
      const fill = b.n / (bw * bh);
      const mLuma = b.luma / b.n;
      if (bw < 3 || bh < 3 || bw > W * 0.4 || bh > H * 0.4) continue;
      if (fill < 0.55) continue;
      const aspect = bw / bh;
      if (aspect < 0.2 || aspect > 5) continue;
      // is the surrounding area much brighter? then this is a window in a wall
      let around = 0, an = 0;
      for (let y = Math.max(0, b.y0 - 3); y < Math.min(H, b.y1 + 4); y += 1)
        for (let x = Math.max(0, b.x0 - 3); x < Math.min(W, b.x1 + 4); x += 1) {
          const q = outLab[y * W + x];
          if (q === r) continue;
          around += 0.299*out[(y*W+x)*4] + 0.587*out[(y*W+x)*4+1] + 0.114*out[(y*W+x)*4+2];
          an += 1;
        }
      const mAround = an ? around / an : mLuma;
      if (mLuma < mAround * 0.66 && mAround > 60) windows.push({ r, x: b.x0, y: b.y0, w: bw, h: bh, fill: +fill.toFixed(2), dark: +(mLuma / mAround).toFixed(2) });
    }

    // draw the windows found, so they can be judged by eye
    const marked = new Uint8ClampedArray(out);
    for (const wd of windows) {
      for (let x = wd.x; x < wd.x + wd.w; x += 1) {
        for (const y of [wd.y, wd.y + wd.h - 1]) { const i = (y*W+x)*4; marked[i]=255; marked[i+1]=40; marked[i+2]=180; }
      }
      for (let y = wd.y; y < wd.y + wd.h; y += 1) {
        for (const x of [wd.x, wd.x + wd.w - 1]) { const i = (y*W+x)*4; marked[i]=255; marked[i+1]=40; marked[i+2]=180; }
      }
    }

    const S = Math.max(1, Math.min(3, Math.floor(720 / H)));
    const sheet = document.createElement('canvas');
    sheet.width = W*S*3 + 24; sheet.height = H*S;
    const sc = sheet.getContext('2d'); sc.fillStyle = '#12052e'; sc.fillRect(0,0,sheet.width,sheet.height);
    sc.imageSmoothingEnabled = false;
    const put = (buf, i) => { const t = document.createElement('canvas'); t.width=W; t.height=H;
      t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf),W,H),0,0);
      sc.drawImage(t, 0,0,W,H, 6+i*(W*S+6),0,W*S,H*S); };
    put(src, 0); put(out, 1); put(marked, 2);
    return { W, H, regions: count, kept: new Set(Array.from(outLab)).size, edgePct: +(100*edge/(W*H)).toFixed(2), windows, sheet: sheet.toDataURL('image/png') };
  `);
  console.log(`${photo}  ->  ${res.W}x${res.H}  (photo's own aspect ratio)`);
  console.log(`  Felzenszwalb regions: ${res.regions}  ->  after absorbing small ones: ${res.kept}`);
  console.log(`  outline pixels: ${res.edgePct}%`);
  console.log(`  windows found: ${res.windows.length}`);
  for (const w of res.windows.slice(0, 12)) console.log(`     ${w.w}x${w.h} at ${w.x},${w.y}  fill ${w.fill}  ${w.dark}x darker than its surroundings`);
  writeFileSync(outPng, Buffer.from(res.sheet.split(',')[1], 'base64'));
  console.log(`  wrote ${outPng}   [photo | flat+outline | windows marked]`);
});
