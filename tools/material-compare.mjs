// Does giving each MATERIAL its own pattern separate the surfaces that quantisation merged?
//
//   BASE=http://127.0.0.1:4312/ node --experimental-websocket tools/material-compare.mjs photos-test/b.jpg /tmp/mat.png
//
// Renders the pipeline with and without the material pattern layer, magnified, and reports how much of the
// picture each material covers. The judgement is made by looking, because the surface-separation metric
// proved it can be gamed; the numbers here are for coverage, not for quality.
import { withPage } from './browser.mjs';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:4312/';
const photo = process.argv[2] || 'photos-test/b.jpg';
const outPng = process.argv[3] || '/tmp/mat.png';

await withPage(BASE, { width: 900, height: 620 }, async (page) => {
  await page.wait(2200);
  const res = await page.run(`
    const img = new Image(); img.src = ${JSON.stringify(photo)}; await img.decode();
    const W = 192, H = 256;
    const ar = img.width / img.height, want = W / H;
    let sw, sh, sx = 0, sy = 0;
    if (ar > want) { sw = img.height * want; sx = (img.width - sw) / 2; sh = img.height; }
    else { sh = img.width / want; sy = (img.height - sh) / 2; sw = img.width; }
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    const base = new Uint8ClampedArray(cx.getImageData(0, 0, W, H).data);

    const mats = await import('./src/materials.js');
    const { what, classes } = mats.classify(base, W, H);
    const atlas = mats.patternAtlas(7);
    const cover = mats.share(what);

    // paint the material map itself, so the classification can be judged by eye too
    const KEY = { sky: [80,150,255], foliage: [40,190,70], asphalt: [150,150,160], wall: [240,220,150], earth: [180,110,50], other: [90,60,120] };
    const map = new Uint8ClampedArray(W*H*4);
    for (let i = 0; i < W*H; i += 1) {
      const k = KEY[classes[what[i]]] || [255,0,255];
      map[i*4] = k[0]; map[i*4+1] = k[1]; map[i*4+2] = k[2]; map[i*4+3] = 255;
    }

    const BAYER4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map((v) => (v + 0.5) / 16 - 0.5);
    const luma = (r,g,b) => 0.299*r + 0.587*g + 0.114*b;
    function paletteOf(src, n) {
      const px = []; for (let i = 0; i < src.length; i += 4*7) px.push([src[i], src[i+1], src[i+2]]);
      let boxes = [px];
      while (boxes.length < n) {
        const rng = (b) => { let lo=[255,255,255], hi=[0,0,0];
          for (const p of b) for (let k=0;k<3;k+=1){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}
          return Math.max(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]); };
        boxes.sort((a,b)=>rng(b)-rng(a));
        const box = boxes.shift(); if (!box || box.length < 2) { boxes.push(box); break; }
        let lo=[255,255,255], hi=[0,0,0];
        for (const p of box) for (let k=0;k<3;k+=1){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}
        const ax=(hi[1]-lo[1]>hi[0]-lo[0])?(hi[2]-lo[2]>hi[1]-lo[1]?2:1):(hi[2]-lo[2]>hi[0]-lo[0]?2:0);
        box.sort((a,b)=>a[ax]-b[ax]); const mid = box.length>>1; boxes.push(box.slice(0,mid),box.slice(mid));
      }
      return boxes.map((b)=>{let r=0,g=0,bl=0;for(const p of b){r+=p[0];g+=p[1];bl+=p[2];}return [r/b.length,g/b.length,bl/b.length];});
    }
    const nearest = (pal,r,g,b) => { let best=0,bd=Infinity;
      for(let i=0;i<pal.length;i+=1){const d=(pal[i][0]-r)**2+(pal[i][1]-g)**2+(pal[i][2]-b)**2;if(d<bd){bd=d;best=i;}}return best; };

    // quantise with an optional per-pixel extra offset taken from the material's pattern
    function quant(src, useMaterial) {
      const pal = paletteOf(src, 28), out = new Uint8ClampedArray(src.length);
      for (let y=0;y<H;y+=1) for (let x=0;x<W;x+=1) {
        const i=(y*W+x)*4;
        let d = BAYER4[(y&3)*4+(x&3)] * 26;
        if (useMaterial) d += mats.offsetFor(atlas, what[y*W+x], x, y);
        const k = nearest(pal, src[i]+d, src[i+1]+d, src[i+2]+d);
        out[i]=pal[k][0]; out[i+1]=pal[k][1]; out[i+2]=pal[k][2]; out[i+3]=255;
      }
      return out;
    }

    const Z = 2, sheet = document.createElement('canvas');
    sheet.width = W*Z*3 + 24; sheet.height = H*Z + 22;
    const sc = sheet.getContext('2d'); sc.fillStyle='#12052e'; sc.fillRect(0,0,sheet.width,sheet.height);
    sc.imageSmoothingEnabled = false;
    const put = (buf, i, label) => { const t=document.createElement('canvas'); t.width=W; t.height=H;
      t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf),W,H),0,0);
      sc.drawImage(t, 6+i*(W*Z+6), 18, W*Z, H*Z);
      sc.font='700 13px ui-monospace, monospace'; sc.fillStyle='#ffd23f'; sc.fillText(label, 8+i*(W*Z+6), 13); };
    put(quant(base,false), 0, 'PLAIN DITHER');
    put(quant(base,true), 1, 'MATERIAL PATTERNS');
    put(map, 2, 'MATERIAL MAP');
    return { cover, sheet: sheet.toDataURL('image/png') };
  `);
  writeFileSync(outPng, Buffer.from(res.sheet.split(',')[1], 'base64'));
  console.log(`${photo}  material coverage:`);
  for (const [k, v] of Object.entries(res.cover)) {
    if (v > 0) console.log(`  ${k.padEnd(9)} ${(v * 100).toFixed(1)}%`);
  }
  console.log(`  wrote ${outPng}`);
});
