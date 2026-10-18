// THE V13 REFERENCE FRAMES — the operator's engine, extracted byte-for-byte from the source HTML, run on its own
// scenes at 288×512. These frames are what "expected and desirable" means in code: art against art, same photo,
// same grid, same 50-entry palette structure.
//
// WHY EXTRACTION AND NOT THE PAGE: the HTML needs ./support.js (the Design-Canvas runtime), which is not present next
// to the file. The logic class is self-contained, so it is lifted verbatim into a page that provides only a canvas.
// The lift is verified every run: the committed copy tools/v13/engine-v13.txt must equal the HTML slice, and the
// extraction's sha256 is printed. If the operator's file moves, the reference is WITHHELD, not silently re-based.
//
// WHAT IT WRITES (default reference/v13/):
//   <scene>.png            the clean frame at 288×512 (PX = 2 blit down-sampled to the game grid)
//   readout.json           per scene: FNV of two builds, working palette, per-facade report, window/chunk counts
//   provenance.json        html path + sha256, engine sha256, scene→photo map, build time
//
// SCENE → PHOTO. The file's scene sources (assets/prague.jpg, uploads/…) do not exist in this repo; the same four
// photographs do, under photos-test/. The map is printed with the reference so a reader can see the pairing.
//
//   CHROME=... node --experimental-websocket tools/v13/refs.mjs [outdir]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { withPage } from '../browser.mjs';

const HTML = process.env.V13_HTML || '/Users/m/Downloads/DVOR-8 Photo2Pixel v13.dc.html';
const OUT = process.argv[2] || 'reference/v13';
const SCENES = [
  [0, 'prague-tower', '/game/photos-test/v10a.jpg'],
  [1, 'prague-street', '/game/photos-test/2026-10-12%2023.06.59.jpg'],
  [2, 'aerial-church', '/game/photos-test/2026-10-12%2023.06.55.jpg'],
  [3, 'sunset-bus', '/game/photos-test/sunset.jpg'],
];

const html = readFileSync(HTML, 'utf8');
const htmlSha = createHash('sha256').update(html).digest('hex');
const i = html.indexOf('class Component extends DCLogic {');
const j = html.indexOf('</script>', i);
if (i < 0 || j < 0) { console.log('REFERENCE WITHHELD: the engine class is not in the HTML'); process.exit(2); }
const engine = html.slice(i, j);
const engineSha = createHash('sha256').update(engine).digest('hex');
const committed = readFileSync(new URL('./engine-v13.txt', import.meta.url), 'utf8');
if (committed !== engine) {
  console.log(`REFERENCE WITHHELD: tools/v13/engine-v13.txt (${committed.length} chars) is not the HTML slice (${engine.length} chars).`);
  console.log('Re-extract it from the operator file, or set V13_HTML to the file the committed extraction came from.');
  process.exit(2);
}
console.log(`PREMISES: html sha256 ${htmlSha.slice(0, 12)}… · engine sha256 ${engineSha.slice(0, 12)}… (${engine.length} chars, lines 123–861) · committed extraction verified byte-equal`);
console.log(`scenes: ${SCENES.map(([n, label, p]) => `${label} <- ${p}`).join(' · ')}`);

mkdirSync(OUT, { recursive: true });
const body = engine.replace('class Component extends DCLogic', 'class Component');
const pageName = `page-${engineSha.slice(0, 12)}.html`;
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
  const cv = document.createElement('canvas'); cv.width = 288; cv.height = 512;
  // 1:1 INDEX BLIT. c.blit2() writes 2x2 blocks into a 576x1024 buffer (the phone view); a 288x512 canvas must read
  // the index buffer directly, or every other line is mangled (measured: the first version produced scanline noise).
  const g = cv.getContext('2d'); const im = g.createImageData(288, 512); const o32 = new Uint32Array(im.data.buffer);
  for (let k = 0; k < 288 * 512; k++) o32[k] = c.P32[c.clean[k]];
  g.putImageData(im, 0, 0);
  // the ID map and the window map, for gates that must know WHICH pixels are facade/window, not just their colour
  const idPng = (() => { const cv2 = document.createElement('canvas'); cv2.width = 288; cv2.height = 512; const g2 = cv2.getContext('2d'); const d2 = g2.createImageData(288, 512); for (let k = 0; k < 288 * 512; k++) { const id = c.S.ID[k]; const v = id ? (id < 10 ? [240, 79, 120] : [48, 225, 185]) : (c.sky[k] ? [29, 43, 83] : [26, 18, 32]); d2.data[k * 4] = v[0]; d2.data[k * 4 + 1] = v[1]; d2.data[k * 4 + 2] = v[2]; d2.data[k * 4 + 3] = 255; } g2.putImageData(d2, 0, 0); return cv2.toDataURL('image/png'); })();
  const winPng = (() => { const cv2 = document.createElement('canvas'); cv2.width = 288; cv2.height = 512; const g2 = cv2.getContext('2d'); const d2 = g2.createImageData(288, 512); for (let k = 0; k < 288 * 512; k++) { const w = c.winOf[k] >= 0; d2.data[k * 4] = w ? 249 : 26; d2.data[k * 4 + 1] = w ? 194 : 18; d2.data[k * 4 + 2] = w ? 43 : 32; d2.data[k * 4 + 3] = 255; } g2.putImageData(d2, 0, 0); return cv2.toDataURL('image/png'); })();
  // S0 - THE BOX-AVERAGED PHOTO, from the reference's own S0 (R/G/B means at 288x512). This is the photo-side
  // reference a facade gate needs: v13's facade IS this photo, so "is our facade the photograph?" is measurable.
  const s0Png = (() => { const cv2 = document.createElement('canvas'); cv2.width = 288; cv2.height = 512; const g2 = cv2.getContext('2d'); const d2 = g2.createImageData(288, 512); for (let k = 0; k < 288 * 512; k++) { d2.data[k * 4] = c.R[k]; d2.data[k * 4 + 1] = c.G[k]; d2.data[k * 4 + 2] = c.B[k]; d2.data[k * 4 + 3] = 255; } g2.putImageData(d2, 0, 0); return cv2.toDataURL('image/png'); })();
  const wn = c.WN.map((w) => ({ bid: w.bid, n: w.pix.length, ch: w.ch }));
  const rep = c.REP.map((r) => ({ id: r.id, name: r.name, kind: r.kind, auto: r.auto, corr: r.corr, pf: r.pf, bf: r.bf,
    lu: r.lu, lv: r.lv, cols: r.cols, rows: r.rows, nw: r.nw, cands: r.cands, glassDom: r.glassDom, T: r.T, fcls: r.fcls,
    cover: r.cover, wall: r.wall, gu: { p: r.gu.p, P: r.gu.P }, gv: { p: r.gv.p, P: r.gv.P } }));
  return { i, ms: Math.round(t1 - t0), h1, h2, det: h1 === h2, sub: c.SUB, rep,
    anno: { gy: c.SC.gy, h0: c.SC.h0, sky: c.SC.sky, buildings: c.SC.buildings, cars: c.SC.cars },
    wn: wn.length, wnByBid: wn.reduce((a, w) => (a[w.bid] = (a[w.bid] || 0) + 1, a), {}),
    png: cv.toDataURL('image/png'), idPng, winPng, s0Png };
};
</script>`;
const pagePath = new URL(`./${pageName}`, import.meta.url);
writeFileSync(pagePath, page);

const all = [];
await withPage(`http://127.0.0.1:4312/game/tools/v13/${pageName}`, { width: 800, height: 1200 }, async (pg) => {
  await pg.wait(800);
  for (const [i, label, photo] of SCENES) {
    const r = await pg.run(`return await window.__run(${i}, ${JSON.stringify(photo)})`);
    writeFileSync(`${OUT}/${label}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
    writeFileSync(`${OUT}/${label}.id.png`, Buffer.from(r.idPng.split(',')[1], 'base64'));
    writeFileSync(`${OUT}/${label}.win.png`, Buffer.from(r.winPng.split(',')[1], 'base64'));
    writeFileSync(`${OUT}/${label}.s0.png`, Buffer.from(r.s0Png.split(',')[1], 'base64'));
    delete r.png; delete r.idPng; delete r.winPng; delete r.s0Png;
    all.push({ label, photo, ...r });
    console.log(`${label.padEnd(14)} fnv ${r.h1}${r.det ? ' (twice, equal)' : ' ✗ BUILDS DIFFER'} · ${r.ms} ms · working palette ${r.sub.length} · windows ${r.wn} · chunks ${r.ch ?? ''} · ${r.rep.map((x) => x.name + ' ' + x.kind + ' nw=' + x.nw + (x.glassDom ? ' glass' : '') + ' grid ' + x.lu + 'x' + x.lv).join(' | ')}`);
    if (!r.det) { console.log('REFERENCE WITHHELD: two builds of the same scene differ — the reference is not deterministic here.'); process.exit(2); }
  }
});
writeFileSync(`${OUT}/readout.json`, JSON.stringify(all, null, 1));
writeFileSync(`${OUT}/provenance.json`, JSON.stringify({ html: HTML, htmlSha256: htmlSha, engineSha256: engineSha, engineChars: engine.length, palette: (await withPage(`http://127.0.0.1:4312/game/tools/v13/${pageName}`, { width: 400, height: 400 }, async (pg) => pg.run('return window.__C.PAL'))), scenes: SCENES.map(([i, l, p]) => ({ i, scene: l, photo: p })), builtAt: new Date().toISOString() }, null, 1));
console.log(`\nREFERENCE WRITTEN: ${OUT}/ — 4 scenes, 288×512, two builds each with equal FNV.`);
