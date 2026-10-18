// THE V13 ENGINE AS A MEASURABLE ARTEFACT.
// Extracts the design-doc component, runs its build() on a real photograph at 288x512, and writes the clean frame
// plus its own readouts. No rendering framework, no browser support.js: build() is self-contained.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { withPage } from '../browser.mjs';

const out = process.argv[2] || '/tmp/v13';
mkdirSync(out, { recursive: true });
const src = readFileSync(new URL('./engine.txt', import.meta.url), 'utf8');
const body = src.replace('class Component extends DCLogic', 'class Component');
const page = `<!doctype html><meta charset=utf-8><canvas id=c width=576 height=1024></canvas>
<script>
${body}
window.__C = new Component();
window.__run = async (i, url) => {
  const c = window.__C;
  const sc = JSON.parse(JSON.stringify(c.SCENES[i])); sc.src = url;
  const img = new Image(); img.src = url; await img.decode();
  c.tok++; c.S = null;
  const t0 = performance.now(); c.build(img, sc, i); const t1 = performance.now();
  const h1 = c.fnv(c.clean);
  c.build(img, sc, i); const h2 = c.fnv(c.clean);
  const cv = document.createElement('canvas'); cv.width = 576; cv.height = 1024;
  const g = cv.getContext('2d'); const im = g.createImageData(576, 1024);
  c.blit2(im, c.clean); g.putImageData(im, 0, 0);
  const wn = c.WN.map((w) => ({ bid: w.bid, n: w.pix.length, ch: w.ch }));
  const rep = c.REP.map((r) => ({ id: r.id, name: r.name, kind: r.kind, auto: r.auto, corr: r.corr, pf: r.pf, bf: r.bf,
    lu: r.lu, lv: r.lv, cols: r.cols, rows: r.rows, nw: r.nw, cands: r.cands, glassDom: r.glassDom, T: r.T, fcls: r.fcls,
    cover: r.cover, wall: r.wall, preW: r.preW, prePx: r.prePx, gu: { p: r.gu.p, ph: r.gu.ph, ac: r.gu.ac, fb: r.gu.fb, P: r.gu.P, rawL: r.gu.rawL, acL: r.gu.acL }, gv: { p: r.gv.p, ph: r.gv.ph, ac: r.gv.ac, fb: r.gv.fb, P: r.gv.P, rawL: r.gv.rawL, acL: r.gv.acL } }));
  return { i, ms: Math.round(t1 - t0), h1, h2, det: h1 === h2, sub: c.SUB, rep,
    wn: wn.length, wnByBid: wn.reduce((a, w) => (a[w.bid] = (a[w.bid] || 0) + 1, a), {}),
    ch: c.CH.length, targets: c.TARGETS.length, sky: { theme: c.SKY.theme, h0: c.SKY.h0, n: c.SKY.n, orn: c.SKY.orn, sat: c.SKY.sat },
    png: cv.toDataURL('image/png') };
};
</script>`;
writeFileSync(new URL('./page.html', import.meta.url), page);
const photos = [
  ['/game/photos-test/v10a.jpg', 'prague-tower'],
  ['/game/photos-test/2026-10-12%2023.06.59.jpg', 'prague-street'],
  ['/game/photos-test/2026-10-12%2023.06.55.jpg', 'aerial-church'],
  ['/game/photos-test/sunset.jpg', 'sunset-bus'],
];
const all = [];
await withPage('http://127.0.0.1:4312/game/tools/v13/page.html', { width: 800, height: 1200 }, async (pg) => {
  await pg.wait(800);
  for (const [photo, label] of photos) {
    const r = await pg.run(`return await window.__run(${photos.findIndex((p) => p[1] === label)}, ${JSON.stringify(photo)})`);
    writeFileSync(`${out}/${label}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
    delete r.png;
    all.push(r);
    console.log(JSON.stringify({ label, ...r, rep: undefined, sub: r.sub, wn: r.wn, wnByBid: r.wnByBid }));
    console.log('  rep ' + JSON.stringify(r.rep));
  }
});
writeFileSync(`${out}/readout.json`, JSON.stringify(all, null, 1));
