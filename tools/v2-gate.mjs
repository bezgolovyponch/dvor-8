import { withPage } from './browser.mjs';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  outlineClosure,
  strayOutline,
  carShapeIoU,
  edgeContrast,
  splitBuildings,
  greenShare,
  paneBand,
  coloursMetric,
  orphanPct,
  skyIoU
} from './gate-metrics.mjs';
import { deltaE00, srgbToLab } from '../src/v2/ciede2000.js';

const W = 288, H = 512, N = W * H;
const BASE = process.env.BASE || 'http://127.0.0.1:4320/';
const OUT = process.env.OUT || 'gate-out/';
const BASELINE_FILE = 'reference/v13/gate-baseline.json';
const REF_PHOTOS = [
  '5.jpg',
  '2026-10-12 23.06.59.jpg',
  '2026-10-12 23.06.55.jpg',
  'sunset.jpg'
];

mkdirSync(OUT, { recursive: true });

function neighbours4(k) {
  const x = k % W, y = (k / W) | 0;
  const out = [];
  if (x > 0) out.push(k - 1);
  if (x < W - 1) out.push(k + 1);
  if (y > 0) out.push(k - W);
  if (y < H - 1) out.push(k + W);
  return out;
}

async function measureFrame(page, photo) {
  await page.run('window.__v2tick(1)');
  const data = await page.run(`
    const c = document.getElementById('screen');
    const ctx = c.getContext('2d');
    const frame = Array.from(ctx.getImageData(0, 0, 288, 512).data);
    const comp = window.__v2comp();
    const dump = window.__v2dump();
    const world = window.__v2world();
    return {
      frame,
      id: Array.from(comp.S.ID),
      sky: Array.from(comp.sky),
      cls: dump.cls,
      sprites: world.sprites.map(s => ({ x0: s.x0, y0: s.y0, w: s.w, h: s.h, px: Array.from(s.px) })),
      palette: comp.RGB.map(c => [c[0], c[1], c[2]]),
      rebuilt: window.__v2.rebuilt || [],
      ready: window.__v2.ready,
      error: window.__v2.error
    };
  `);

  const frameData = data.frame;
  const id = new Uint8Array(data.id);
  const skyMask = new Uint8Array(data.sky);
  const cls = new Uint8Array(data.cls);
  const sprites = data.sprites;
  const paletteRGB = data.palette;
  const rebuilt = data.rebuilt;
  const ready = data.ready;
  const error = data.error;

  const outlineIdx = [48, 49];
  const isOutline = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    const r = frameData[k * 4], g = frameData[k * 4 + 1], b = frameData[k * 4 + 2];
    const c48 = paletteRGB[48], c49 = paletteRGB[49];
    if ((r === c48[0] && g === c48[1] && b === c48[2]) || (r === c49[0] && g === c49[1] && b === c49[2])) {
      isOutline[k] = 1;
    }
  }

  const objMask = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    const idVal = id[k];
    if (idVal >= 1 && idVal < 10) objMask[k] = idVal;
  }
  const spriteIndices = spriteMask(sprites, W);
  for (const { index, spriteId } of spriteIndices) {
    if (index >= 0 && index < N) objMask[index] = spriteId;
  }

  const carSprites = sprites.map((s, si) => ({
    bbox: [s.x0, s.y0, s.w, s.h],
    pixels: Array.from(s.px)
      .map((v, i) => v !== -1 ? (s.y0 + Math.floor(i / s.w)) * W + s.x0 + (i % s.w) : -1)
      .filter(v => v !== -1)
  }));

  const carClassMask = cls;

  const objectEdgeMask = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    const idVal = objMask[k];
    if (idVal === 0) continue;
    for (const nk of neighbours4(k)) {
      if (objMask[nk] !== idVal) { objectEdgeMask[k] = 1; break; }
    }
  }

  const G1_results = outlineClosure(objMask, isOutline);
  const G1 = G1_results.length > 0 ? Math.min(...G1_results.map(r => r.value)) : 1;

  const G2 = strayOutline(isOutline, objectEdgeMask, skyMask);

  const G3 = carShapeIoU(carSprites, carClassMask);

  const G4 = edgeContrast(frameData, objMask, isOutline, (r, g, b) => srgbToLab(r, g, b));

  const G5 = splitBuildings(objMask, frameData);

  const G6 = greenShare(cls, frameData, paletteRGB);

  const G7 = paneBand(rebuilt);

  const G8_colours = coloursMetric(frameData);
  const G8_orphanPct = orphanPct(frameData);
  const G8_skyIoU = skyIoU(skyMask, cls);

  const G9 = ready && !error;

  return {
    photo,
    G1, G2, G3, G4, G5, G6, G7, G8_colours, G8_orphanPct, G8_skyIoU, G9,
    frameData, id: data.id, sky: data.sky, cls: data.cls, sprites: data.sprites, palette: data.palette, rebuilt, ready, error
  };
}

async function runPhoto(photo, thresholds, baselineMode) {
  let query = '';
  if (baselineMode) {
    query = '&scene=hand&look=v13';
  } else if (process.env.LOOK) {
    query = `&look=${process.env.LOOK}`;
  }
  const url = `${BASE}v2.html?photo=${encodeURIComponent(`photos-test/${photo}`)}${query}`;

  return await withPage(url, { width: 412, height: 860 }, async (page) => {
    for (let i = 0; i < 120; i += 1) {
      await page.wait(1000);
      const v2 = await page.run('return window.__v2 || null');
      if (v2 && (v2.ready || v2.error)) break;
    }
    const error = await page.run('return window.__v2 && window.__v2.error');
    if (error) {
      return { photo, results: null, error: String(error) };
    }

    const m = await measureFrame(page, photo);
    const frameFile = `${OUT}${photo.replace(/[^a-z0-9.]/gi, '_')}.frame.png`;
    const url = await page.run("return document.getElementById('screen').toDataURL('image/png')");
    writeFileSync(frameFile, Buffer.from(url.split(',')[1], 'base64'));

    if (m.error) {
      return { photo, results: null, error: String(m.error) };
    }

    const results = {
      photo,
      G1: { value: m.G1, threshold: thresholds.G1, pass: m.G1 >= thresholds.G1 },
      G2: { value: m.G2, threshold: thresholds.G2, pass: m.G2 <= thresholds.G2 },
      G3: { value: m.G3, threshold: thresholds.G3, pass: m.G3 >= thresholds.G3 },
      G4: { value: m.G4, threshold: thresholds.G4, pass: m.G4 >= thresholds.G4 },
      G5: { value: m.G5, threshold: thresholds.G5, pass: m.G5 <= thresholds.G5 },
      G6: { value: m.G6, threshold: thresholds.G6, pass: m.G6 >= thresholds.G6 },
      G7: { value: m.G7.share, threshold: 0.5, pass: m.G7.pass },
      G8_colours: { value: m.G8_colours, threshold: null, pass: true },
      G8_orphanPct: { value: m.G8_orphanPct, threshold: null, pass: true },
      G8_skyIoU: { value: m.G8_skyIoU, threshold: null, pass: true },
      G9: { value: m.G9, threshold: true, pass: m.G9 }
    };

    if (baselineMode) {
      return { photo, metrics: {
        G1: m.G1, G2: m.G2, G3: m.G3, G4: m.G4, G5: m.G5, G6: m.G6, G7: m.G7.share
      }};
    }

    return { photo, results };
  });
}

function computeThresholds(baselineResults) {
  const G1_vals = baselineResults.map(r => r.metrics.G1);
  const G2_vals = baselineResults.map(r => r.metrics.G2);
  const G3_vals = baselineResults.map(r => r.metrics.G3);
  const G4_vals = baselineResults.map(r => r.metrics.G4);
  const G5_vals = baselineResults.map(r => r.metrics.G5);
  const G6_vals = baselineResults.map(r => r.metrics.G6);
  const G7_vals = baselineResults.map(r => r.metrics.G7);

  return {
    G1: Math.min(...G1_vals),
    G2: Math.max(...G2_vals),
    G3: Math.min(...G3_vals),
    G4: Math.min(...G4_vals),
    G5: Math.max(...G5_vals),
    G6: Math.min(...G6_vals),
    G7: 0.5
  };
}

async function main() {
  const args = process.argv.slice(2);
  const baselineMode = args.includes('--baseline');
  const photosArg = args.filter(a => !a.startsWith('--'));

  let photos;
  if (baselineMode) {
    photos = REF_PHOTOS;
  } else if (photosArg.length > 0) {
    photos = photosArg;
  } else {
    const dirs = ['photos-test', 'photos-test/commons'];
    photos = [];
    for (const dir of dirs) {
      if (existsSync(dir)) {
        for (const f of readdirSync(dir)) {
          if (f.toLowerCase().endsWith('.jpg')) photos.push(f);
        }
      }
    }
  }

  let thresholds;
  if (baselineMode) {
    thresholds = { G1: 0, G2: 1, G3: 0, G4: 0, G5: 999, G6: 0, G7: 0.5 };
  } else {
    if (!existsSync(BASELINE_FILE)) throw new Error(`Baseline file not found: ${BASELINE_FILE}. Run with --baseline first.`);
    thresholds = JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));
  }

  const allResults = [];
  let anyFail = false;

  for (const photo of photos) {
    try {
      const res = await runPhoto(photo, thresholds, baselineMode);
      if (baselineMode) {
        allResults.push(res);
      } else {
        const { photo: p, results, error } = res;
        if (error) {
          console.log(JSON.stringify({ photo: p, G9: { value: false, threshold: true, pass: false }, error }));
          anyFail = true;
          allResults.push({ photo: p, error, G9: { value: false, threshold: true, pass: false } });
        } else {
          console.log(JSON.stringify({ photo: p, ...results }));
          const fails = Object.entries(results).filter(([k, v]) => k !== 'photo' && !v.pass);
          if (fails.length > 0) {
            anyFail = true;
            console.error(`FAIL ${p}: ${fails.map(([k,v]) => `${k}=${v.value} (threshold ${v.threshold})`).join(', ')}`);
          }
          allResults.push({ photo: p, results });
        }
      }
    } catch (e) {
      console.error(`ERROR ${photo}: ${e.message}`);
      anyFail = true;
      allResults.push({ photo, error: e.message, G9: { value: false, threshold: true, pass: false } });
    }
  }

  if (baselineMode) {
    const computed = computeThresholds(allResults);
    writeFileSync(BASELINE_FILE, JSON.stringify(computed, null, 1));
    console.log(JSON.stringify({ baseline: computed }));
  } else {
    const summary = {
      total: photos.length,
      passed: allResults.filter(r => r.results && Object.values(r.results).every(v => v.pass)).length,
      failed: allResults.filter(r => r.results && Object.values(r.results).some(v => !v.pass)).length,
      errors: allResults.filter(r => r.error).length
    };
    console.log(JSON.stringify({ summary }));
    writeFileSync(`${OUT}gate.json`, JSON.stringify(allResults, null, 1));

    if (anyFail) process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });