// A stand-in yard, drawn from numbers, for a desk without a balcony and for the tests.
//
// It is a DRAWING, so the detector is not asked about it: the drawing knows what it drew and says so. On
// a real photograph the list of things comes from the detector instead (src/detect.js).

import { mulberry32 } from './rng.js';

export function demoYard(w, h, seed = 8) {
  const rnd = mulberry32(seed);
  const rgba = new Uint8ClampedArray(w * h * 4);
  const put = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4, k = (rnd() - 0.5) * 14;
    rgba[i] = r + k; rgba[i + 1] = g + k; rgba[i + 2] = b + k; rgba[i + 3] = 255;
  };
  const u = w / 144, v = h / 192, X = (n) => Math.round(n * u), Y = (n) => Math.round(n * v);
  const box = (x, y, bw, bh, c) => { for (let yy = Y(y); yy < Y(y + bh); yy += 1) for (let xx = X(x); xx < X(x + bw); xx += 1) put(xx, yy, ...c); };
  const disc = (cx, cy, r, c) => { const R = X(r); for (let yy = -R; yy <= R; yy += 1) for (let xx = -R; xx <= R; xx += 1) if (xx * xx + yy * yy <= R * R) put(X(cx) + xx, Y(cy) + yy, ...c); };

  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const t = y / h;
    if (t < 0.22) put(x, y, 150 + t * 200, 190 + t * 120, 235);
    else if (t < 0.58) put(x, y, 196, 180, 158);
    else put(x, y, 92 + t * 20, 92 + t * 20, 98 + t * 20);
  }
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 5; c += 1) box(10 + c * 27, 50 + r * 20, 14, 12, (r + c) % 3 === 0 ? [240, 205, 110] : [44, 62, 92]);
  box(64, 88, 16, 24, [86, 48, 30]);                                   // a door: scenery
  disc(124, 96, 14, [44, 120, 52]); box(122, 108, 4, 22, [70, 46, 30]); // a tree: scenery

  const dets = [];
  const thing = (label, x, y, bw, bh) => dets.push({ label, score: 1, x: x / 144, y: y / 192, w: bw / 144, h: bh / 192 });
  box(8, 126, 46, 18, [196, 38, 44]); box(16, 119, 28, 8, [40, 52, 70]); box(12, 142, 8, 5, [20, 20, 24]); box(42, 142, 8, 5, [20, 20, 24]);
  thing('car', 8, 119, 46, 28);
  box(84, 142, 44, 16, [40, 80, 190]); box(92, 136, 28, 7, [30, 40, 60]); box(88, 156, 8, 5, [20, 20, 24]); box(116, 156, 8, 5, [20, 20, 24]);
  thing('car', 84, 136, 44, 25);
  box(20, 166, 40, 4, [150, 96, 40]); box(22, 170, 3, 8, [90, 60, 30]); box(55, 170, 3, 8, [90, 60, 30]); box(20, 160, 40, 3, [150, 96, 40]);
  thing('bench', 20, 160, 40, 18);
  box(70, 172, 10, 9, [150, 80, 50]); disc(75, 167, 7, [60, 150, 70]);
  thing('potted plant', 67, 160, 16, 21);
  box(100, 172, 2, 12, [60, 60, 70]); box(112, 172, 2, 12, [60, 60, 70]); box(100, 170, 14, 3, [230, 190, 60]); box(100, 160, 2, 12, [60, 60, 70]);
  thing('chair', 99, 160, 16, 24);
  return { rgba, dets };
}
