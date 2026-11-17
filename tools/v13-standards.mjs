import { withPage } from './browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] || 'v13-standards';
const photos = process.argv.slice(3);
const query = process.env.QUERY || '';
const BASE = process.env.BASE || 'http://127.0.0.1:4320/';
mkdirSync(out, { recursive: true });

const PANE_BAND = [0.25, 0.40];

const MEASURE = `
const comp = window.__v2comp(), S = comp.S, W = 288, H = 512, N = W * H;
const c = document.getElementById('screen'), d = c.getContext('2d').getImageData(0, 0, W, H).data;
const key = (k) => (d[k * 4] << 16) | (d[k * 4 + 1] << 8) | d[k * 4 + 2];
const colours = new Set(); let orphans = 0;
for (let k = 0; k < N; k++) {
  colours.add(key(k));
  const x = k % W, y = (k / W) | 0;
  if (x === 0 || y === 0 || x === W - 1 || y === H - 1) continue;
  const v = key(k);
  if (key(k - 1) !== v && key(k + 1) !== v && key(k - W) !== v && key(k + W) !== v) orphans++;
}
const seg = window.__v2dump().cls; let inter = 0, uni = 0;
for (let k = 0; k < N; k++) { const a = comp.sky[k] ? 1 : 0, b = seg[k] === 0 ? 1 : 0; if (a && b) inter++; if (a || b) uni++; }
const ids = new Set(); for (let k = 0; k < N; k++) if (S.ID[k] >= 1 && S.ID[k] < 10) ids.add(S.ID[k]);
const wins = [...ids].map((id) => comp.WN.filter((w) => w.bid === id).length);
const cars = comp.CARIDS.map((id) => { let n = 0; for (let k = 0; k < N; k++) if (S.ID[k] === id) n++; return n; });
const lab = (r, g, b) => comp.lab(r, g, b);
let neutral = 0, keptNeutral = 0, vivid = 0, keptHue = 0;
for (let k = 0; k < N; k += 3) {
  if (comp.sky[k]) continue;
  const p = lab(comp.R[k], comp.G[k], comp.B[k]), q = lab(d[k * 4], d[k * 4 + 1], d[k * 4 + 2]);
  const cp = Math.hypot(p[1], p[2]), cq = Math.hypot(q[1], q[2]);
  if (cp < 8) { neutral++; if (cq < 15) keptNeutral++; }
  else if (cp > 30) { vivid++; const dh = Math.abs(Math.atan2(p[2], p[1]) - Math.atan2(q[2], q[1])); if (cq > 12 && Math.min(dh, 2 * Math.PI - dh) < 0.6) keptHue++; }
}
const PANE_BAND = ${JSON.stringify(PANE_BAND)};
const panes = [];
let facades = 0, panesInBand = 0;
for (let id = 1; id < 10; id++) {
  let total = 0, glass = 0;
  for (let k = 0; k < N; k++) {
    if (S.ID[k] !== id) continue;
    if (S.base[k] === 48) continue;
    total++;
    if (S.base[k] < 6) glass++;
  }
  if (total >= 200) {
    facades++;
    const share = +(glass / total).toFixed(2);
    panes.push(share);
    if (share >= PANE_BAND[0] && share <= PANE_BAND[1]) panesInBand++;
  }
}
return { greyKept: +(keptNeutral / Math.max(1, neutral)).toFixed(2), hueKept: +(keptHue / Math.max(1, vivid)).toFixed(2), colours: colours.size, orphanPct: +(100 * orphans / N).toFixed(2), skyIoU: +(inter / Math.max(1, uni)).toFixed(3), buildings: ids.size, windowless: wins.filter((n) => n === 0).length, minWindows: wins.length ? Math.min(...wins) : 0, cars: cars.length, tinyCars: cars.filter((n) => n < 40).length, panes, panesInBand, facades };
`;

const rows = [];
for (const photo of photos) {
  await withPage(`${BASE}v2.html?photo=${encodeURIComponent(`photos-test/${photo}`)}${query}`, { width: 412, height: 860 }, async (page) => {
    for (let i = 0; i < 120; i += 1) { await page.wait(1000); if (await page.run('return Boolean(window.__v2 && (window.__v2.ready || window.__v2.error))')) break; }
    const error = await page.run('return window.__v2 && window.__v2.error');
    if (error) { rows.push({ photo, error }); return; }
    await page.run('window.__v2tick(1)');
    const url = await page.run("return document.getElementById('screen').toDataURL('image/png')");
    writeFileSync(`${out}/${photo.replace(/[^a-z0-9]/gi, '')}.png`, Buffer.from(url.split(',')[1], 'base64'));
    rows.push({ photo, ...(await page.run(MEASURE)) });
  });
}
writeFileSync(`${out}/standards.json`, JSON.stringify(rows, null, 1));
for (const r of rows) {
  const paneFail = r.facades > 0 && r.panesInBand < r.facades / 2;
  console.log(JSON.stringify({ ...r, panePass: !paneFail }));
}
