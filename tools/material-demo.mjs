// What the material layer delivers WHEN THE SURFACE MAP IS RIGHT, and how far the automatic map gets.
//
//   BASE=http://127.0.0.1:4312/ node --experimental-websocket tools/material-demo.mjs photos-test/b.jpg /tmp/demo.png
//
// Four pictures of the same photograph:
//   1 PLAIN       quantise + Floyd-Steinberg, what ships today
//   2 AUTO MAP    skies and ground found geometrically, everything else left alone
//   3 FULL MAP    EVERY surface labelled — the surface map a trained segmenter would supply
//   4 LABEL MAP   the hand labels used to make 3, so the claim is checkable rather than asserted
//
// 2 and 3 are the honest comparison: 2 is what can be built today with no model and no licence, 3 is what a
// segmenter adds. The difference between them IS the value of the licence decision.
import { withPage } from './browser.mjs';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:4312/';
const photo = process.argv[2] || 'photos-test/b.jpg';
const outPng = process.argv[3] || '/tmp/material-demo.png';

await withPage(BASE, { width: 980, height: 620 }, async (page) => {
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
    const M = mats.MATERIALS;
    const atlas = mats.patternAtlas(7);

    // ---- 4: HAND LABELS. Rectangles read off the photograph by eye, so every later claim is checkable.
    // This is the one place a human is doing the segmentation, which is exactly what a model would replace.
    // Ordered so each later region overwrites the earlier ones where they overlap, which is how the
    // irregular shapes (trees crossing sky, a bench in front of gravel) are approximated with rectangles.
    // Read off the photograph against a printed coordinate grid, not guessed.
    const L = [
      ['sky',       0,   0, 192,  92],   // the open sky across the top, between the branches
      ['sky',      88,   0, 128, 140],   // .. and the gap down the middle, over the street
      ['foliage',   0,  56,  40, 104],   // trees on the left, over the low roofs
      ['foliage', 100,  44, 192, 122],   // the tree mass on the right, reaching down to the cars
      ['foliage', 166,   0, 192, 156],
      ['wall',     40,  64, 100, 148],   // the stone house on the left
      ['wall',    100,  52, 168, 148],   // the house and its windows on the right
      ['wall',     66,  36,  92,  80],   // the church tower
      ['asphalt',   0, 150, 192, 196],   // the road and the parking, behind and under the cars
      ['earth',     0, 196, 192, 256],   // the gravel and leaf litter the bench stands on
      ['foliage',   0, 182,  96, 236],   // the green bench, which is a green THING on the gravel
    ];

    // ---- 2: the automatic map, skies and ground only
    const auto = mats.skyAndGround(base, W, H).what;

    const BAYER4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map((v) => (v + 0.5) / 16 - 0.5);
    function paletteOf(src, n) {
      const px = []; for (let i = 0; i < src.length; i += 4*7) px.push([src[i],src[i+1],src[i+2]]);
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
        box.sort((a,b)=>a[ax]-b[ax]); const mid=box.length>>1; boxes.push(box.slice(0,mid),box.slice(mid));
      }
      return boxes.map((b)=>{let r=0,g=0,bl=0;for(const p of b){r+=p[0];g+=p[1];bl+=p[2];}return [r/b.length,g/b.length,bl/b.length];});
    }
    const nearest=(pal,r,g,b)=>{let best=0,bd=Infinity;for(let i=0;i<pal.length;i+=1){const d=(pal[i][0]-r)**2+(pal[i][1]-g)**2+(pal[i][2]-b)**2;if(d<bd){bd=d;best=i;}}return best;};
    function quant(src, map, strength) {
      const pal = paletteOf(src, 28), out = new Uint8ClampedArray(src.length);
      for (let y=0;y<H;y+=1) for (let x=0;x<W;x+=1) {
        const i=(y*W+x)*4;
        let d = BAYER4[(y&3)*4+(x&3)] * 26;
        if (map) d += mats.offsetAt(atlas, map, y*W+x, x, y) * strength;
        const k = nearest(pal, src[i]+d, src[i+1]+d, src[i+2]+d);
        out[i]=pal[k][0]; out[i+1]=pal[k][1]; out[i+2]=pal[k][2]; out[i+3]=255;
      }
      return out;
    }
    const KEY = { sky:[80,150,255], foliage:[40,190,70], asphalt:[150,150,160], wall:[240,220,150], earth:[180,110,50], other:[90,60,120] };
    const mapPng = (map) => { const o = new Uint8ClampedArray(W*H*4);
      for (let i=0;i<W*H;i+=1){const k=KEY[M[map[i]]]||[255,0,255]; o[i*4]=k[0];o[i*4+1]=k[1];o[i*4+2]=k[2];o[i*4+3]=255;} return o; };

    const Z=2, sheet=document.createElement('canvas'); sheet.width=W*Z*4+30; sheet.height=H*Z+22;
    const sc=sheet.getContext('2d'); sc.fillStyle='#12052e'; sc.fillRect(0,0,sheet.width,sheet.height); sc.imageSmoothingEnabled=false;
    const put=(buf,i,label)=>{const t=document.createElement('canvas');t.width=W;t.height=H;
      t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf),W,H),0,0);
      sc.drawImage(t,6+i*(W*Z+7),18,W*Z,H*Z);
      sc.font='700 12px ui-monospace, monospace'; sc.fillStyle='#ffd23f'; sc.fillText(label,8+i*(W*Z+7),13);};
    put(quant(base,null,0), 0, '1 PLAIN DITHER');
    put(quant(base,auto,1), 1, '2 AUTO: sky+ground only');
    put(quant(base,hand,2.6), 2, '3 FULL MATERIAL MAP');
    put(mapPng(hand), 3, '4 HAND LABELS');
    return { sheet: sheet.toDataURL('image/png'), auto: mats.share(auto), hand: mats.share(hand) };
  `);
  writeFileSync(outPng, Buffer.from(res.sheet.split(',')[1], 'base64'));
  const row = (t, c) => console.log(`  ${t} ` + Object.entries(c).filter(([, v]) => v > 0.005).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join('  '));
  console.log(`${photo}`);
  row('auto map:', res.auto);
  row('hand map:', res.hand);
  console.log(`  wrote ${outPng}`);
});
