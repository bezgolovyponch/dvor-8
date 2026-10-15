// From what a detector says is in the photograph to the things you can hit. Pure: no model, no canvas.
//
// The detector (src/detect.js) is a real one — it knows a car from a bench. These functions decide where
// to look (tiles), which of its answers to keep (merge), which of those are fair targets (TARGETS), and
// which pixels of the picture belong to each (toRegions).

// What may be thrown at, what it is called, and how many hits it takes. Everything else the detector
// knows is left alone — above all people and animals, which are never targets and never named.
export const TARGETS = {
  car: { ru: 'машина', hp: 3 }, truck: { ru: 'грузовик', hp: 3 }, bus: { ru: 'автобус', hp: 3 },
  motorcycle: { ru: 'мотоцикл', hp: 2 }, bicycle: { ru: 'велосипед', hp: 2 }, bench: { ru: 'скамейка', hp: 2 },
  'potted plant': { ru: 'цветок в горшке', hp: 1 }, 'fire hydrant': { ru: 'гидрант', hp: 2 },
  'stop sign': { ru: 'знак', hp: 1 }, 'parking meter': { ru: 'паркомат', hp: 2 }, 'traffic light': { ru: 'светофор', hp: 1 },
  chair: { ru: 'стул', hp: 1 }, umbrella: { ru: 'зонт', hp: 1 }, boat: { ru: 'лодка', hp: 3 }, train: { ru: 'поезд', hp: 3 },
  'dining table': { ru: 'стол', hp: 2 }, suitcase: { ru: 'чемодан', hp: 1 }, backpack: { ru: 'рюкзак', hp: 1 },
  'sports ball': { ru: 'мяч', hp: 1 }, skateboard: { ru: 'скейт', hp: 1 }, kite: { ru: 'змей', hp: 1 },
  bottle: { ru: 'бутылка', hp: 1 }, vase: { ru: 'ваза', hp: 1 }, tv: { ru: 'телевизор', hp: 1 }, couch: { ru: 'диван', hp: 2 },
  // Not one of the detector's: found from the picture itself by frame.js, and it says so there.
  window: { ru: 'окно', hp: 2 },
};
export const MAX_TARGETS = 14;
export const MIN_SCORE = 0.4;    // below this the detector is guessing: a "train" in a courtyard
export const MIN_AREA = 0.0008;   // smaller than this is too small to hit with a finger

// Where the detector looks. A car seen from a balcony is a few dozen pixels in a twelve-megapixel photo,
// and a detector that shrinks the whole photo to its input size never sees it. So it is also shown the
// photo in overlapping slices, each at full detail (docs/style.md, F14).
export function tilesFor(w, h, grids = [1, 2, 3], overlap = 0.25) {
  const tiles = [];
  for (const g of grids) {
    const tw = g === 1 ? w : Math.ceil(w / (g - (g - 1) * overlap)), th = g === 1 ? h : Math.ceil(h / (g - (g - 1) * overlap));
    for (let gy = 0; gy < g; gy += 1) {
      for (let gx = 0; gx < g; gx += 1) {
        const x = g === 1 ? 0 : Math.round((gx * (w - tw)) / (g - 1)), y = g === 1 ? 0 : Math.round((gy * (h - th)) / (g - 1));
        tiles.push({ x, y, w: tw, h: th });
      }
    }
  }
  return tiles;
}

const area = (b) => b.w * b.h;
function overlapOf(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

// The same thing is seen in several slices. Two boxes are one thing when most of the smaller lies inside
// the larger; the larger is kept, because a box cut off by a slice's edge is the smaller one.
export function merge(dets, { minScore = MIN_SCORE, max = MAX_TARGETS } = {}) {
  const kept = [];
  const pool = dets.filter((d) => TARGETS[d.label] && d.score >= minScore && d.w * d.h >= MIN_AREA)
    .sort((a, b) => area(b) * (0.5 + b.score) - area(a) * (0.5 + a.score));
  for (const d of pool) {
    if (d.w * d.h > 0.6) continue;   // "the whole photo is a car" is the detector being wrong
    if (kept.some((k) => overlapOf(k, d) / Math.min(area(k), area(d)) > 0.55)) continue;
    kept.push(d);
  }
  return kept.sort((a, b) => b.score - a.score).slice(0, max);
}

// Which pixels of the picture are the thing. The box says roughly where; inside it, a pixel belongs to
// the thing when its colour is unlike the colours around the outside of the box. If that goes wrong —
// almost nothing or almost everything — the thing is a rounded box, which is at least where it is.
export function toRegions(dets, rgba, w, h) {
  const owner = new Int16Array(w * h).fill(-1);
  const sorted = [...dets].sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
  const regions = [];
  for (const d of sorted) {
    const x0 = Math.max(0, Math.floor(d.x * w)), y0 = Math.max(0, Math.floor(d.y * h));
    const x1 = Math.min(w - 1, Math.ceil((d.x + d.w) * w)), y1 = Math.min(h - 1, Math.ceil((d.y + d.h) * h));
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (bw < 4 || bh < 4) continue;
    // the ring just outside the box: what the background there looks like
    const ring = [];
    for (let x = x0 - 2; x <= x1 + 2; x += 1) for (const y of [y0 - 2, y1 + 2]) if (x >= 0 && y >= 0 && x < w && y < h) ring.push((y * w + x) * 4);
    for (let y = y0 - 2; y <= y1 + 2; y += 1) for (const x of [x0 - 2, x1 + 2]) if (x >= 0 && y >= 0 && x < w && y < h) ring.push((y * w + x) * 4);
    // THE CUT-OUT, WITH AN ADAPTIVE CUT. A fixed "30 units from the background" test fails on a car whose paint
    // is close to the road, and the old code then fell back to THE WHOLE BOX - which is why every outline in the
    // game was a rectangle: `edgesOf` was faithfully tracing a box, because the region's pixels WERE a box. The
    // cut is now taken from the ring's OWN distances (the 70th percentile, widened), so a busy background is cut
    // hard and a flat one is cut gently, and there is no fallback to a box.
    const ringDist = [];
    for (let k = 0; k < ring.length; k += 3) {
      const q = ring[k];
      let best = 1e9;
      for (let j = 0; j < ring.length; j += 3) {
        if (j === k) continue;
        const r0 = ring[j], dr = rgba[q] - rgba[r0], dg = rgba[q + 1] - rgba[r0 + 1], db = rgba[q + 2] - rgba[r0 + 2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < best) best = dist;
      }
      ringDist.push(best);
    }
    ringDist.sort((x, y) => x - y);
    const spread = ringDist.length ? ringDist[Math.floor(ringDist.length * 0.7)] : 900;
    const CUT = Math.max(18 * 18, spread * 1.3);
    const unlike = (p) => {
      let best = 1e9;
      for (let k = 0; k < ring.length; k += 3) {
        const q = ring[k], dr = rgba[p] - rgba[q], dg = rgba[p + 1] - rgba[q + 1], db = rgba[p + 2] - rgba[q + 2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < best) best = dist;
      }
      return best > CUT;
    };
    const round = (x, y) => {   // inside the rounded box
      const r = Math.min(bw, bh) * 0.28, ax = Math.min(x - x0, x1 - x), ay = Math.min(y - y0, y1 - y);
      return ax >= r || ay >= r || Math.hypot(r - ax, r - ay) <= r;
    };
    let pixels = [];
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const p = y * w + x;
      if (owner[p] === -1 && round(x, y) && (ring.length === 0 || unlike(p * 4))) pixels.push(p);
    }
    // NO FALLBACK TO THE BOX. If the cut kept too little, the thing is cut at the LOOSEST threshold that keeps a
    // majority of the box interior - never the box itself, because the box is what made every outline a rectangle.
    if (pixels.length < bw * bh * 0.25) {
      const loose = Math.max(10 * 10, spread);
      pixels = [];
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
        const p = y * w + x;
        if (owner[p] !== -1 || !round(x, y)) continue;
        let best = 1e9;
        for (let k = 0; k < ring.length; k += 3) {
          const q = ring[k], dr = rgba[p] - rgba[q], dg = rgba[p + 1] - rgba[q + 1], db = rgba[p + 2] - rgba[q + 2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < best) best = dist;
        }
        if (best > loose) pixels.push(p);
      }
    }
    // A THING IS ONE MASS, NOT A SCATTER OF PATCHES. The cut-out kept every pixel inside the box that differed
    // from the ring, so a car came back as a dozen disjoint patches - measured on the creator's photograph: one car
    // was 1960 pixels in FOURTEEN clusters, another 556 in seven. An outline drawn from such a set traces patch
    // boundaries, which is exactly the "objects clustering is wrong" on the phone. The set is now reduced to its
    // LARGEST CONNECTED CLUSTER, which is the thing; the patches were the photograph's grain.
    if (pixels.length >= 12) {
      const inside = new Set(pixels);
      const seen = new Set();
      let best = null;
      for (const p0 of pixels) {
        if (seen.has(p0)) continue;
        const stack = [p0];
        const group = [];
        seen.add(p0);
        while (stack.length) {
          const q = stack.pop();
          group.push(q);
          const qx = q % w, qy = (q / w) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = qx + dx, ny = qy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const r2 = ny * w + nx;
            if (!inside.has(r2) || seen.has(r2)) continue;
            seen.add(r2);
            stack.push(r2);
          }
        }
        if (!best || group.length > best.length) best = group;
      }
      if (best && best.length >= 12) pixels = best;
    }
    if (pixels.length < 12) continue;
    const id = regions.length;
    for (const p of pixels) owner[p] = id;
    const t = TARGETS[d.label];
    regions.push({
      id, kind: d.label, label: t.ru, score: d.score, pixels: Int32Array.from(pixels),
      x: x0, y: y0, w: bw, h: bh, cx: x0 + bw / 2, cy: y0 + bh / 2, area: pixels.length,
      hp: t.hp, hits: 0, gone: false, seen: false,
    });
  }
  return { regions, owner };
}
