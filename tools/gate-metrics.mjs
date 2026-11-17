import { deltaE00, srgbToLab } from '../src/v2/ciede2000.js';

const DEFAULT_W = 288, DEFAULT_H = 512;

export function spriteMask(sprites, W) {
  const indices = [];
  for (let si = 0; si < sprites.length; si++) {
    const s = sprites[si];
    const pw = s.w, ph = s.h;
    for (let i = 0; i < s.px.length; i++) {
      if (s.px[i] !== -1) {
        const sy = s.y0 + Math.floor(i / pw);
        const sx = s.x0 + (i % pw);
        indices.push({ index: sy * W + sx, spriteId: 10 + si });
      }
    }
  }
  return indices;
}

function makeNeighbours4(W, H) {
  return (k) => {
    const x = k % W, y = (k / W) | 0;
    const out = [];
    if (x > 0) out.push(k - 1);
    if (x < W - 1) out.push(k + 1);
    if (y > 0) out.push(k - W);
    if (y < H - 1) out.push(k + W);
    return out;
  };
}

export function outlineClosure(objMask, isOutline, W = DEFAULT_W, H = DEFAULT_H) {
  const N = W * H;
  const neighbours4 = makeNeighbours4(W, H);
  const objects = new Map();
  for (let k = 0; k < N; k++) {
    const id = objMask[k];
    if (id === 0) continue;
    if (!objects.has(id)) objects.set(id, { pixels: [], boundary: [] });
    objects.get(id).pixels.push(k);
  }
  const results = [];
  for (const [id, obj] of objects) {
    if (obj.pixels.length < 60) continue;
    for (const k of obj.pixels) {
      for (const nk of neighbours4(k)) {
        if (objMask[nk] !== id) {
          obj.boundary.push(k);
          break;
        }
      }
    }
    if (obj.boundary.length === 0) { results.push({ id, value: 0 }); continue; }
    let outlined = 0;
    for (const k of obj.boundary) {
      let hasOutline = false;
      if (isOutline[k]) { hasOutline = true; }
      else {
        for (const nk of neighbours4(k)) {
          if (isOutline[nk]) { hasOutline = true; break; }
        }
      }
      if (hasOutline) outlined++;
    }
    results.push({ id, value: outlined / obj.boundary.length });
  }
  return results;
}

export function strayOutline(outlineMask, objectEdgeMask, skyMask, W = DEFAULT_W, H = DEFAULT_H) {
  const N = W * H;
  const neighbours4 = makeNeighbours4(W, H);
  let totalOutline = 0, stray = 0;
  for (let k = 0; k < N; k++) {
    if (!outlineMask[k]) continue;
    totalOutline++;
    if (skyMask[k]) continue;
    let nearEdge = false;
    for (const nk of neighbours4(k)) {
      if (objectEdgeMask[nk]) { nearEdge = true; break; }
    }
    if (!nearEdge) stray++;
  }
  return totalOutline === 0 ? 0 : stray / totalOutline;
}

export function carShapeIoU(spriteMask, carClassMask) {
  const ious = [];
  for (const car of spriteMask) {
    const { pixels } = car;
    if (pixels.length === 0) continue;
    let inter = 0, uni = 0;
    for (const k of pixels) {
      const a = 1;
      const b = carClassMask[k] === 5 ? 1 : 0;
      if (a && b) inter++;
      if (a || b) uni++;
    }
    ious.push(uni === 0 ? 0 : inter / uni);
  }
  if (ious.length === 0) return 0;
  ious.sort((a, b) => a - b);
  return ious[Math.floor(ious.length / 2)];
}

export function edgeContrast(frameData, objMask, isOutline, labFn, W = DEFAULT_W, H = DEFAULT_H) {
  const N = W * H;
  const neighbours4 = makeNeighbours4(W, H);
  const objects = new Map();
  for (let k = 0; k < N; k++) {
    const id = objMask[k];
    if (id === 0) continue;
    if (!objects.has(id)) objects.set(id, { pixels: [], boundary: [] });
    objects.get(id).pixels.push(k);
  }
  const objectMedians = [];
  for (const [id, obj] of objects) {
    if (obj.pixels.length < 60) continue;
    for (const k of obj.pixels) {
      for (const nk of neighbours4(k)) {
        if (objMask[nk] !== id) {
          obj.boundary.push(k);
          break;
        }
      }
    }
    if (obj.boundary.length === 0) continue;
    const deltas = [];
    for (const k of obj.boundary) {
      let insideK = k;
      let outsideK = -1;
      for (const nk of neighbours4(k)) {
        if (objMask[nk] !== id) { outsideK = nk; break; }
      }
      if (outsideK === -1) continue;
      if (isOutline[insideK] || isOutline[outsideK]) {
        for (const nk2 of neighbours4(insideK)) {
          if (objMask[nk2] === id && !isOutline[nk2]) { insideK = nk2; break; }
        }
        for (const nk2 of neighbours4(outsideK)) {
          if (objMask[nk2] !== id && !isOutline[nk2]) { outsideK = nk2; break; }
        }
      }
      const r1 = frameData[insideK * 4], g1 = frameData[insideK * 4 + 1], b1 = frameData[insideK * 4 + 2];
      const r2 = frameData[outsideK * 4], g2 = frameData[outsideK * 4 + 1], b2 = frameData[outsideK * 4 + 2];
      const lab1 = labFn(r1, g1, b1);
      const lab2 = labFn(r2, g2, b2);
      deltas.push(deltaE00(lab1, lab2));
    }
    if (deltas.length > 0) {
      deltas.sort((a, b) => a - b);
      objectMedians.push(deltas[Math.floor(deltas.length / 2)]);
    }
  }
  if (objectMedians.length === 0) return 0;
  objectMedians.sort((a, b) => a - b);
  return objectMedians[Math.floor(objectMedians.length * 0.1)];
}

export function splitBuildings(objMask, frameData, W = DEFAULT_W, H = DEFAULT_H) {
  const N = W * H;
  const neighbours4 = makeNeighbours4(W, H);
  const buildingIds = new Set();
  for (let k = 0; k < N; k++) {
    const id = objMask[k];
    if (id >= 1 && id < 10) buildingIds.add(id);
  }
  const ids = [...buildingIds];
  let pairs = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const id1 = ids[i], id2 = ids[j];
      let touch = false;
      for (let k = 0; k < N && !touch; k++) {
        if (objMask[k] !== id1) continue;
        for (const nk of neighbours4(k)) {
          if (objMask[nk] === id2) { touch = true; break; }
        }
      }
      if (!touch) continue;
      const colourCount1 = new Map(), colourCount2 = new Map();
      for (let k = 0; k < N; k++) {
        if (objMask[k] === id1) {
          const key = (frameData[k * 4] << 16) | (frameData[k * 4 + 1] << 8) | frameData[k * 4 + 2];
          colourCount1.set(key, (colourCount1.get(key) || 0) + 1);
        } else if (objMask[k] === id2) {
          const key = (frameData[k * 4] << 16) | (frameData[k * 4 + 1] << 8) | frameData[k * 4 + 2];
          colourCount2.set(key, (colourCount2.get(key) || 0) + 1);
        }
      }
      let max1 = 0, maxKey1 = -1;
      for (const [key, count] of colourCount1) if (count > max1) { max1 = count; maxKey1 = key; }
      let max2 = 0, maxKey2 = -1;
      for (const [key, count] of colourCount2) if (count > max2) { max2 = count; maxKey2 = key; }
      if (maxKey1 === maxKey2) pairs++;
    }
  }
  return pairs;
}

export function greenShare(cls, frameData, paletteRGB, W = DEFAULT_W, H = DEFAULT_H) {
  const N = W * H;
  const greenIndices = new Set([...Array(6).keys()].map(i => i + 6), [...Array(6).keys()].map(i => i + 42));
  const greenPaletteKeys = new Set();
  for (const idx of greenIndices) {
    const [r, g, b] = paletteRGB[idx];
    greenPaletteKeys.add((r << 16) | (g << 8) | b);
  }
  let greenPixels = 0, matched = 0;
  for (let k = 0; k < N; k++) {
    if (cls[k] !== 2) continue;
    greenPixels++;
    const key = (frameData[k * 4] << 16) | (frameData[k * 4 + 1] << 8) | frameData[k * 4 + 2];
    if (greenPaletteKeys.has(key)) matched++;
  }
  return greenPixels === 0 ? 1 : matched / greenPixels;
}

export function paneBand(rebuilt) {
  if (!rebuilt || rebuilt.length === 0) return { pass: true, share: 0, count: 0 };
  let inBand = 0;
  for (const f of rebuilt) {
    if (f.share >= 0.25 && f.share <= 0.40) inBand++;
  }
  return { pass: inBand / rebuilt.length >= 0.5, share: inBand / rebuilt.length, count: rebuilt.length };
}

export function coloursMetric(frameData, W = DEFAULT_W, H = DEFAULT_H) {
  const N = W * H;
  const colours = new Set();
  for (let k = 0; k < N; k++) {
    const key = (frameData[k * 4] << 16) | (frameData[k * 4 + 1] << 8) | frameData[k * 4 + 2];
    colours.add(key);
  }
  return colours.size;
}

export function orphanPct(frameData, W = DEFAULT_W, H = DEFAULT_H) {
  const N = W * H;
  let orphans = 0;
  for (let k = 0; k < N; k++) {
    const x = k % W, y = (k / W) | 0;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) continue;
    const v = (frameData[k * 4] << 16) | (frameData[k * 4 + 1] << 8) | frameData[k * 4 + 2];
    const v1 = (frameData[(k - 1) * 4] << 16) | (frameData[(k - 1) * 4 + 1] << 8) | frameData[(k - 1) * 4 + 2];
    const v2 = (frameData[(k + 1) * 4] << 16) | (frameData[(k + 1) * 4 + 1] << 8) | frameData[(k + 1) * 4 + 2];
    const v3 = (frameData[(k - W) * 4] << 16) | (frameData[(k - W) * 4 + 1] << 8) | frameData[(k - W) * 4 + 2];
    const v4 = (frameData[(k + W) * 4] << 16) | (frameData[(k + W) * 4 + 1] << 8) | frameData[(k + W) * 4 + 2];
    if (v !== v1 && v !== v2 && v !== v3 && v !== v4) orphans++;
  }
  return +(100 * orphans / N).toFixed(2);
}

export function skyIoU(compSky, seg, W = DEFAULT_W, H = DEFAULT_H) {
  const N = W * H;
  let inter = 0, uni = 0;
  for (let k = 0; k < N; k++) {
    const a = compSky[k] ? 1 : 0;
    const b = seg[k] === 0 ? 1 : 0;
    if (a && b) inter++;
    if (a || b) uni++;
  }
  return uni === 0 ? 0 : +(inter / uni).toFixed(3);
}
export function edgeOutlines(objMask, skyMask, isOutline, isCar, W = DEFAULT_W, H = DEFAULT_H) {
  const acc = { buildingSky: [0, 0], car: [0, 0] };
  for (let k = 0; k < W * H; k += 1) {
    const me = objMask[k];
    if (!me) continue;
    const x = k % W, y = (k / W) | 0;
    for (const n of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1]) {
      if (n < 0 || objMask[n] === me) continue;
      const key = isCar(me) ? 'car' : !objMask[n] && skyMask[n] ? 'buildingSky' : null;
      if (key) { acc[key][0] += 1; if (isOutline[k] || isOutline[n]) acc[key][1] += 1; }
      break;
    }
  }
  const share = ([n, o]) => (n ? o / n : 1);
  return { buildingSky: share(acc.buildingSky), car: share(acc.car) };
}

export function strayOutlineShare(objMask, skyMask, isOutline, W = DEFAULT_W, H = DEFAULT_H) {
  const kind = (k) => objMask[k] || (skyMask[k] ? -1 : 0);
  let all = 0, stray = 0;
  for (let k = 0; k < W * H; k += 1) {
    if (!isOutline[k]) continue;
    all += 1;
    const x = k % W, y = (k / W) | 0, me = kind(k);
    const onEdge = [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1].some((n) => n >= 0 && kind(n) !== me);
    if (!onEdge) stray += 1;
  }
  return all ? stray / all : 0;
}
