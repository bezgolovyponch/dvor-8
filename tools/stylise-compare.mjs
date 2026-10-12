// Renders the stylisation variants side by side AND measures them, so a judgement can be made by looking
// rather than by trusting a ratio. Saves a PNG sheet plus a metrics table.
//
//   BASE=http://127.0.0.1:4312/ node --experimental-websocket tools/stylise-compare.mjs photos-test/a.jpg [out.png]
//
// The variants, and why each:
//   current   what ships today: quantise the raw photo, one global Bayer dither
//   guided    + guided-filter smoothing first (He/Sun/Tang: "better behavior near the edges", O(N),
//             "does not suffer from the gradient reversal artifacts" that bilateral has)
//   flat      + a dither whose strength falls where the picture is flat, so a wall stops buzzing and
//             texture survives where there IS detail
//   fs        + Floyd-Steinberg error diffusion instead of Bayer. Surma's Ditherpunk: error diffusion
//             "can handle arbitrary color palettes, while ordered dithering requires your color palette
//             to be evenly spaced" — and this palette is built from the photograph, so it is not.
//
// The regions are picked INSIDE single surfaces, deliberately. An earlier version straddled the car and its
// shadow, which gave one region a standard deviation of 47 and swamped the whole ratio.

import { withPage } from './browser.mjs';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:4310/';
const photo = process.argv[2] || 'photos-test/a.jpg';
const outPng = process.argv[3] || '/tmp/stylise-compare.png';

await withPage(BASE, { width: 1000, height: 700 }, async (page) => {
  await page.wait(2000);
  const res = await page.run(`
    const img = new Image();
    img.src = ${JSON.stringify(photo)};
    await img.decode();

    const W = 192, H = 256;
    const ar = img.width / img.height, want = W / H;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ar > want) { sw = img.height * want; sx = (img.width - sw) / 2; } else { sh = img.width / want; sy = (img.height - sh) / 2; }
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    const base = new Uint8ClampedArray(cx.getImageData(0, 0, W, H).data);

    const BAYER4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map((v) => (v + 0.5) / 16 - 0.5);
    const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

    // ---- guided filter, r and eps as the paper's Fig.1 uses (input normalised to [0,1]) ----
    // O(N) box-filter implementation: mean and covariance in a window, then a per-window linear model.
    function boxMean(src, r) {
      const n = W * H;
      const sum = new Float32Array(n), out = new Float32Array(n);
      for (let i = 0; i < n; i += 1) sum[i] = src[i];
      // separable prefix sums, clamped edges
      const row = new Float32Array(n), col = new Float32Array(n);
      for (let y = 0; y < H; y += 1) {
        let acc = 0;
        for (let x = 0; x < W; x += 1) { acc += sum[y * W + x]; if (x > 2 * r) acc -= sum[y * W + x - 2 * r - 1]; row[y * W + x] = acc / Math.min(x + 1, 2 * r + 1); }
      }
      for (let x = 0; x < W; x += 1) {
        let acc = 0;
        for (let y = 0; y < H; y += 1) { acc += row[y * W + x]; if (y > 2 * r) acc -= row[(y - 2 * r - 1) * W + x]; col[y * W + x] = acc / Math.min(y + 1, 2 * r + 1); }
      }
      return col;
    }
    function guided(src, r, eps) {
      const n = W * H;
      const out = new Uint8ClampedArray(src.length);
      for (let ch = 0; ch < 3; ch += 1) {
        const p = new Float32Array(n);
        for (let i = 0; i < n; i += 1) p[i] = src[i * 4 + ch] / 255;
        const mean = boxMean(p, r);
        const pp = new Float32Array(n);
        for (let i = 0; i < n; i += 1) pp[i] = p[i] * p[i];
        const meanPp = boxMean(pp, r);
        const a = new Float32Array(n), b = new Float32Array(n);
        for (let i = 0; i < n; i += 1) {
          const varp = Math.max(0, meanPp[i] - mean[i] * mean[i]);
          a[i] = varp / (varp + eps); b[i] = mean[i] - a[i] * mean[i];
        }
        const ma = boxMean(a, r), mb = boxMean(b, r);
        for (let i = 0; i < n; i += 1) out[i * 4 + ch] = Math.max(0, Math.min(255, (ma[i] * p[i] + mb[i]) * 255));
      }
      for (let i = 3; i < out.length; i += 4) out[i] = 255;
      return out;
    }

    function paletteOf(src, n) {
      const px = [];
      for (let i = 0; i < src.length; i += 4 * 7) px.push([src[i], src[i + 1], src[i + 2]]);
      let boxes = [px];
      while (boxes.length < n) {
        const rng = (b) => { let lo = [255,255,255], hi = [0,0,0];
          for (const p of b) for (let k = 0; k < 3; k += 1) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
          return Math.max(hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2]); };
        boxes.sort((a, b) => rng(b) - rng(a));
        const box = boxes.shift();
        if (!box || box.length < 2) { boxes.push(box); break; }
        let lo = [255,255,255], hi = [0,0,0];
        for (const p of box) for (let k = 0; k < 3; k += 1) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
        const axis = (hi[1]-lo[1] > hi[0]-lo[0]) ? (hi[2]-lo[2] > hi[1]-lo[1] ? 2 : 1) : (hi[2]-lo[2] > hi[0]-lo[0] ? 2 : 0);
        box.sort((a, b) => a[axis] - b[axis]);
        const mid = box.length >> 1;
        boxes.push(box.slice(0, mid), box.slice(mid));
      }
      return boxes.map((b) => { let r=0,g=0,bl=0; for (const p of b) { r+=p[0]; g+=p[1]; bl+=p[2]; } return [r/b.length, g/b.length, bl/b.length]; });
    }
    const nearest = (pal, r, g, b) => { let best=0, bd=Infinity;
      for (let i=0;i<pal.length;i+=1){ const d=(pal[i][0]-r)**2+(pal[i][1]-g)**2+(pal[i][2]-b)**2; if(d<bd){bd=d;best=i;} } return best; };

    const write = (pal, k, out, i) => { out[i]=pal[k][0]; out[i+1]=pal[k][1]; out[i+2]=pal[k][2]; out[i+3]=255; };

    function current(src, n = 28, dither = 26) {
      const pal = paletteOf(src, n), out = new Uint8ClampedArray(src.length);
      for (let y=0;y<H;y+=1) for (let x=0;x<W;x+=1) {
        const i=(y*W+x)*4, d=BAYER4[(y&3)*4+(x&3)]*dither;
        write(pal, nearest(pal, src[i]+d, src[i+1]+d, src[i+2]+d), out, i);
      }
      return { out, pal };
    }

    // A flatness map: 1 where the picture is uniform, 0 where it is busy.
    function flatness(sm) {
      const f = new Float32Array(W*H);
      for (let y=0;y<H;y+=1) for (let x=0;x<W;x+=1) {
        let lo=255,hi=0;
        for (let dy=-1;dy<=1;dy+=1) for (let dx=-1;dx<=1;dx+=1) {
          const nx=Math.min(W-1,Math.max(0,x+dx)), ny=Math.min(H-1,Math.max(0,y+dy));
          const j=(ny*W+nx)*4, l=luma(sm[j],sm[j+1],sm[j+2]);
          lo=Math.min(lo,l); hi=Math.max(hi,l);
        }
        f[y*W+x] = 1 - Math.min(1, (hi-lo)/40);
      }
      return f;
    }

    function flatVariant(src) {
      const sm = guided(src, 4, 0.22);
      const pal = paletteOf(sm, 28), out = new Uint8ClampedArray(src.length);
      const f = flatness(sm);
      for (let y=0;y<H;y+=1) for (let x=0;x<W;x+=1) {
        const i=(y*W+x)*4, d=BAYER4[(y&3)*4+(x&3)]*(6+26*f[y*W+x]);
        write(pal, nearest(pal, sm[i]+d, sm[i+1]+d, sm[i+2]+d), out, i);
      }
      return { out, pal };
    }

    // Floyd-Steinberg: diffuse the quantisation error to neighbours. Works with an arbitrary palette.
    function fsVariantFrom(sm) {
      const pal = paletteOf(sm, 28), out = new Uint8ClampedArray(sm.length);
      // De-interleave properly: i%3 is the channel of THIS buffer slot, so the source offset is
      // (i - i%3)/3 * 4 + i%3. Using i*4 + i%3 reads the same source channel three times over and the
      // channel order is lost — which is what produced a flat blue field on the first attempt.
      const buf = new Float32Array(W*H*3);
      for (let i=0;i<W*H*3;i+=1) { const ch=i%3, px=((i-ch)/3)*4; buf[i]=sm[px+ch]; }
      for (let y=0;y<H;y+=1) for (let x=0;x<W;x+=1) {
        const p=(y*W+x)*3;
        const r=Math.max(0,Math.min(255,buf[p])), g=Math.max(0,Math.min(255,buf[p+1])), b=Math.max(0,Math.min(255,buf[p+2]));
        const k=nearest(pal,r,g,b);
        const i=(y*W+x)*4; write(pal,k,out,i);
        const er=r-pal[k][0], eg=g-pal[k][1], eb=b-pal[k][2];
        const push=(dx,dy,w)=>{ const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) return; const q=(ny*W+nx)*3;
          buf[q]+=er*w; buf[q+1]+=eg*w; buf[q+2]+=eb*w; };
        push(1,0,7/16); push(-1,1,3/16); push(0,1,5/16); push(1,1,1/16);
      }
      return { out, pal };
    }
    function fsVariant(src) { return fsVariantFrom(guided(src, 4, 0.22)); }

    // Diffusion on the raw pixels, with the error scaled by strength. strength=1 is textbook
    // Floyd-Steinberg; lower values diffuse less, which keeps colour transitions tighter and the picture
    // crisper while still smoothing the gradients.
    function diffVariant(src, n, strength) {
      const pal = paletteOf(src, n), out = new Uint8ClampedArray(src.length);
      const buf = new Float32Array(W*H*3);
      for (let i=0;i<W*H*3;i+=1) { const ch=i%3, px=((i-ch)/3)*4; buf[i]=src[px+ch]; }
      for (let y=0;y<H;y+=1) {
        const ltr = (y & 1) === 0;
        for (let k=0;k<W;k+=1) {
          const x = ltr ? k : W-1-k;
          const p=(y*W+x)*3;
          const r=Math.max(0,Math.min(255,buf[p])), g=Math.max(0,Math.min(255,buf[p+1])), b=Math.max(0,Math.min(255,buf[p+2]));
          const idx=nearest(pal,r,g,b);
          const i=(y*W+x)*4; write(pal,idx,out,i);
          const er=(r-pal[idx][0])*strength, eg=(g-pal[idx][1])*strength, eb=(b-pal[idx][2])*strength;
          const d = ltr ? 1 : -1;
          const push=(dx,dy,w)=>{ const nx=x+dx*d, ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) return;
            const q=(ny*W+nx)*3; buf[q]+=er*w; buf[q+1]+=eg*w; buf[q+2]+=eb*w; };
          push(1,0,7/16); push(-1,1,3/16); push(0,1,5/16); push(1,1,1/16);
        }
      }
      return { out, pal };
    }

    // ---- regions, each INSIDE one surface ----
    const R = (x0,y0,x1,y1) => ({ xs:Math.round(x0*W), xe:Math.round(x1*W), ys:Math.round(y0*H), ye:Math.round(y1*H) });
    const REGIONS = {
      road:  R(0.05, 0.86, 0.50, 0.97),   // bare tarmac, bottom left
      wall:  R(0.03, 0.10, 0.24, 0.28),   // the pale brick wall, upper left
      sky:   R(0.60, 0.01, 0.92, 0.06),   // a thin strip of sky, top right
      car:   R(0.36, 0.60, 0.52, 0.68),   // the car's door panel, flat paint
    };
    const stats = (src) => {
      const s = {};
      for (const [name, r] of Object.entries(REGIONS)) {
        const vals = [];
        let sr=0,sg=0,sb=0,n=0;
        for (let y=r.ys;y<r.ye;y+=1) for (let x=r.xs;x<r.xe;x+=1) {
          const i=(y*W+x)*4; sr+=src[i]; sg+=src[i+1]; sb+=src[i+2]; n+=1;
          vals.push(luma(src[i],src[i+1],src[i+2]));
        }
        const lmean = vals.reduce((a,b)=>a+b,0)/vals.length;
        let vs=0; for (const v of vals) vs+=(v-lmean)**2;
        s[name] = { mean:[sr/n,sg/n,sb/n], sd:Math.sqrt(vs/vals.length), unique:new Set(vals.map(v=>Math.round(v))).size };
      }
      const names = Object.keys(s);
      let minBetween=Infinity, maxWithin=0;
      for (let i=0;i<names.length;i+=1) for (let j=i+1;j<names.length;j+=1) {
        const a=s[names[i]].mean, b=s[names[j]].mean;
        minBetween=Math.min(minBetween, Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]));
      }
      for (const n of names) maxWithin=Math.max(maxWithin, s[n].sd*2);
      return { surfaces:s, minBetween:+minBetween.toFixed(1), maxWithin:+maxWithin.toFixed(1), separation:+(minBetween/maxWithin).toFixed(2) };
    };

    const variants = {
      current: current(base),
      guided: (() => { const sm = guided(base, 4, 0.22); return current(sm, 28, 26); })(),
      flat: flatVariant(base),
      fs: fsVariant(base),
      // A much gentler guided pass: r=1 and a small eps. The hypothesis to test is that a light touch
      // removes single-pixel sensor noise without flattening brick, gravel or foliage into paste.
      gentle: (() => { const sm = guided(base, 1, 0.01); return current(sm, 28, 26); })(),
      // NO input smoothing at all, only the diffusion. The guided pass turned out to be the blur the
      // creator objected to, so these isolate the diffusion's contribution on its own.
      crisp: diffVariant(base, 28, 1.0),
      crispHalf: diffVariant(base, 28, 0.5),
      // The blur the creator objected to is the guided filter's EPSILON, not the filter itself: a large
      // eps makes var/(var+eps) small everywhere, so every window collapses to its local mean and the
      // texture inside a surface goes with the noise. These sweep eps down to find where noise falls and
      // texture survives.
      e3: (() => { const sm = guided(base, 1, 0.003); return diffVariant(sm, 28, 1.0); })(),
      e1: (() => { const sm = guided(base, 1, 0.001); return diffVariant(sm, 28, 1.0); })(),
      r2e1: (() => { const sm = guided(base, 2, 0.001); return diffVariant(sm, 28, 1.0); })(),
      gentleFs: (() => { const sm = guided(base, 1, 0.01); const save = base; return fsVariantFrom(sm); })(),
    };

    // ---- build the sheet: photograph, then each variant at 2x ----
    const K = 2, GAP = 8, LABEL = 22;
    const sheet = document.createElement('canvas');
    sheet.width = W*K*11 + GAP*12; sheet.height = H*K + LABEL + GAP*2;
    const sc = sheet.getContext('2d');
    sc.fillStyle = '#12052e'; sc.fillRect(0,0,sheet.width,sheet.height);
    sc.imageSmoothingEnabled = false;

    const draw = (src, dx, label) => {
      const t = document.createElement('canvas'); t.width=W; t.height=H;
      t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(src), W, H), 0, 0);
      sc.drawImage(t, dx, GAP+LABEL, W*K, H*K);
      sc.font = '700 14px ui-monospace, Menlo, monospace';
      sc.fillStyle = '#ffd23f';
      sc.fillText(label, dx+4, GAP+15);
    };
    draw(base, GAP, 'PHOTO 192x256');
    draw(variants.current.out, GAP*2+W*K, 'CURRENT');
    draw(variants.guided.out, GAP*3+W*K*2, 'GUIDED');
    draw(variants.flat.out, GAP*4+W*K*3, 'GUIDED+FLAT-DITHER');
    draw(variants.gentle.out, GAP*5+W*K*4, 'GENTLE r=1');
    draw(variants.gentleFs.out, GAP*6+W*K*5, 'GENTLE+FS');
    draw(variants.crisp.out, GAP*7+W*K*6, 'CRISP FS 1.0');
    draw(variants.crispHalf.out, GAP*8+W*K*7, 'CRISP FS 0.5');
    draw(variants.e3.out, GAP*9+W*K*8, 'r1 eps.003');
    draw(variants.e1.out, GAP*10+W*K*9, 'r1 eps.001');
    draw(variants.r2e1.out, GAP*11+W*K*10, 'r2 eps.001');

    const fsSheet = document.createElement('canvas');
    fsSheet.width = W*K; fsSheet.height = H*K;
    const ft = document.createElement('canvas'); ft.width=W; ft.height=H;
    ft.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(variants.fs.out), W, H), 0, 0);
    fsSheet.getContext('2d').imageSmoothingEnabled = false;
    fsSheet.getContext('2d').drawImage(ft, 0, 0, W*K, H*K);

    return {
      photo: ${JSON.stringify(photo)},
      sheet: sheet.toDataURL('image/png'),
      fsSheet: fsSheet.toDataURL('image/png'),
      raw: stats(base),
      current: stats(variants.current.out),
      guided: stats(variants.guided.out),
      flat: stats(variants.flat.out),
      fs: stats(variants.fs.out),
      gentle: stats(variants.gentle.out),
      gentleFs: stats(variants.gentleFs.out),
      crisp: stats(variants.crisp.out),
      crispHalf: stats(variants.crispHalf.out),
      e3: stats(variants.e3.out),
      e1: stats(variants.e1.out),
      r2e1: stats(variants.r2e1.out),
      palettes: Object.fromEntries(Object.entries(variants).map(([k,v]) => [k, v.pal.length])),
    };
  `);

  writeFileSync(outPng, Buffer.from(res.sheet.split(',')[1], 'base64'));
  writeFileSync(outPng.replace(/\.png$/, '-fs.png'), Buffer.from(res.fsSheet.split(',')[1], 'base64'));

  const row = (name, s) => `${name.padEnd(20)} sep ${String(s.separation).padStart(5)}  between ${String(s.minBetween).padStart(5)}  within ${String(s.maxWithin).padStart(5)}` +
    `   sd[road ${s.surfaces.road.sd.toFixed(1)}, wall ${s.surfaces.wall.sd.toFixed(1)}, sky ${s.surfaces.sky.sd.toFixed(1)}, car ${s.surfaces.car.sd.toFixed(1)}]`;
  console.log(`photo: ${res.photo}    palettes: ${JSON.stringify(res.palettes)}`);
  console.log('separation = closest two surfaces / widest spread inside one. Higher is better.');
  console.log('flatness   = mean per-surface sd. LOWER is better: a flat surface should not buzz.');
  console.log();
  for (const k of ['raw', 'current', 'gentleFs', 'crisp', 'e3', 'e1', 'r2e1']) console.log(row(k, res[k]));
  console.log();
  console.log(`sheet written to ${outPng}  (and ${outPng.replace(/\\.png$/, '-fs.png')})`);
});
