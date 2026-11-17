import { withPage } from './browser.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const out = process.argv[2] || 'v13-parity';
const look = process.env.LOOK || '';
const scenes = (process.env.SCENES || 'hand,auto').split(',');
const BASE = process.env.BASE || 'http://127.0.0.1:4320/';
const REFS = { 'prague-tower': '5.jpg', 'prague-street': '2026-10-12 23.06.59.jpg', 'aerial-church': '2026-10-12 23.06.55.jpg', 'sunset-bus': 'sunset.jpg' };
mkdirSync(out, { recursive: true });

function readPng(file) {
  const buf = readFileSync(file);
  let o = 8, w = 0, h = 0, type = 0;
  const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), kind = buf.toString('ascii', o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; }
    if (kind === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * bpp), stride = w * bpp;
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      px[y * stride + x] = (line[x] + pred) & 255;
    }
  }
  return { w, h, bpp, px };
}

const result = {};
for (const [ref, photo] of Object.entries(REFS)) {
  for (const scene of scenes) {
    const q = `photo=${encodeURIComponent(`photos-test/${photo}`)}${scene === 'hand' ? '&scene=hand' : ''}${look ? `&look=${look}` : ''}`;
    await withPage(`${BASE}v2.html?${q}`, { width: 412, height: 860 }, async (page) => {
      for (let i = 0; i < 90; i += 1) { await page.wait(1000); if (await page.run('return Boolean(window.__v2 && (window.__v2.ready || window.__v2.error))')) break; }
      await page.run('window.__v2tick(1)');
      const url = await page.run("return document.getElementById('screen').toDataURL('image/png')");
      const file = `${out}/${ref}.${scene}.png`;
      writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      const a = readPng(file), b = readPng(`reference/v13/${ref}.png`);
      let same = 0;
      for (let i = 0; i < a.w * a.h; i += 1) {
        const d = Math.abs(a.px[i * a.bpp] - b.px[i * b.bpp]) + Math.abs(a.px[i * a.bpp + 1] - b.px[i * b.bpp + 1]) + Math.abs(a.px[i * a.bpp + 2] - b.px[i * b.bpp + 2]);
        if (d === 0) same += 1;
      }
      result[`${ref}.${scene}`] = +(same / (a.w * a.h)).toFixed(3);
    });
  }
}
writeFileSync(`${out}/parity.json`, JSON.stringify(result, null, 1));
console.log(look || '(pure v13)', JSON.stringify(result));
