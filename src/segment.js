// Finding the things in the picture. Local, no network, no model: a thing is a patch of similar
// brightness and warmth, fenced by outlines, that is neither a speck nor the background.
//
// This finds SHAPES. It does not know a bin from a bench — naming is the model's job (src/recognise.js),
// and without a key things are numbered, not named. What it guarantees is that any photograph at all,
// including a blank wall, yields enough targets to play: a test asserts that on a flat and a noisy picture.

import { OUTLINE } from './palette.js';

export const MIN_OBJECTS = 4;
export const MAX_OBJECTS = 10;
export const MIN_SHARE = 0.0015;   // smaller than this is a speck
export const MAX_SHARE = 0.10;     // larger than this is sky, wall or ground
export const MIN_FILL = 0.35;      // a patch thinner than this inside its own box is a line, not a thing

export function segment(st, w, h) {
  const n = w * h;
  const cls = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    cls[i] = st.idx[i] === OUTLINE ? 255 : (st.warm[i] << 2) | Math.min(3, (st.soft[i] * 4) | 0);
  }
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const found = [];
  for (let start = 0; start < n; start += 1) {
    if (seen[start] || cls[start] === 255) continue;
    const c = cls[start];
    const pixels = [];
    let top = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    stack[top++] = start; seen[start] = 1;
    while (top) {
      const p = stack[--top];
      pixels.push(p);
      const x = p % w, y = (p / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && !seen[p - 1] && cls[p - 1] === c) { seen[p - 1] = 1; stack[top++] = p - 1; }
      if (x < w - 1 && !seen[p + 1] && cls[p + 1] === c) { seen[p + 1] = 1; stack[top++] = p + 1; }
      if (y > 0 && !seen[p - w] && cls[p - w] === c) { seen[p - w] = 1; stack[top++] = p - w; }
      if (y < h - 1 && !seen[p + w] && cls[p + w] === c) { seen[p + w] = 1; stack[top++] = p + w; }
    }
    const area = pixels.length;
    if (area < MIN_SHARE * n || area > MAX_SHARE * n) continue;
    if (area / ((x1 - x0 + 1) * (y1 - y0 + 1)) < MIN_FILL) continue;
    found.push({ pixels, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  found.sort((a, b) => b.pixels.length - a.pixels.length);
  const chosen = found.slice(0, MAX_OBJECTS);

  // Too few: cut the busiest cells of a grid out as targets. Not pretty, but a yard that cannot be played
  // is worse than one whose targets are rectangles.
  if (chosen.length < MIN_OBJECTS) {
    const taken = new Uint8Array(n);
    for (const r of chosen) for (const p of r.pixels) taken[p] = 1;
    const cols = 4, rows = 5, cw = Math.floor(w / cols), ch = Math.floor(h / rows);
    const cells = [];
    for (let gy = 0; gy < rows; gy += 1) {
      for (let gx = 0; gx < cols; gx += 1) {
        const pixels = [];
        let busy = 0;
        const x = gx * cw + 3, y = gy * ch + 3;
        for (let yy = y; yy < y + ch - 6; yy += 1) {
          for (let xx = x; xx < x + cw - 6; xx += 1) {
            const p = yy * w + xx;
            if (taken[p]) continue;
            pixels.push(p);
            if (st.idx[p] === OUTLINE) busy += 1;
          }
        }
        // ties broken by position, so a flat picture gets a spread of targets rather than one corner
        cells.push({ pixels, x, y, w: cw - 6, h: ch - 6, rank: busy * 1000 + ((gx * 7 + gy * 3) % 11) });
      }
    }
    cells.sort((a, b) => b.rank - a.rank);
    for (const cell of cells) {
      if (chosen.length >= MIN_OBJECTS) break;
      if (cell.pixels.length < MIN_SHARE * n) continue;
      chosen.push(cell);
    }
  }

  // Top to bottom, so the scan meets them in order and the numbers read naturally.
  chosen.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
  const owner = new Int16Array(n).fill(-1);
  const regions = chosen.map((r, id) => {
    for (const p of r.pixels) owner[p] = id;
    const share = r.pixels.length / n;
    return {
      id, pixels: Int32Array.from(r.pixels), x: r.x, y: r.y, w: r.w, h: r.h,
      cx: r.x + r.w / 2, cy: r.y + r.h / 2, area: r.pixels.length,
      hp: share < 0.01 ? 1 : share < 0.04 ? 2 : 3, hits: 0, gone: false, seen: false, label: null,
    };
  });
  return { regions, owner };
}
