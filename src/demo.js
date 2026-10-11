// A stand-in photograph, drawn from numbers: a wall with windows, asphalt, and a few things standing on
// it. For a desktop without a camera, and for the tests, which need a picture that is the same every time.

import { mulberry32 } from './rng.js';

export function demoPhoto(w, h, seed = 8) {
  const rnd = mulberry32(seed);
  const out = new Uint8ClampedArray(w * h * 4);
  const put = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4, k = (rnd() - 0.5) * 14;
    out[i] = r + k; out[i + 1] = g + k; out[i + 2] = b + k; out[i + 3] = 255;
  };
  const box = (x, y, bw, bh, c) => { for (let yy = y; yy < y + bh; yy += 1) for (let xx = x; xx < x + bw; xx += 1) put(xx, yy, ...c); };
  const disc = (cx, cy, r, c) => { for (let yy = -r; yy <= r; yy += 1) for (let xx = -r; xx <= r; xx += 1) if (xx * xx + yy * yy <= r * r) put(cx + xx, cy + yy, ...c); };
  const u = w / 144, v = h / 192, X = (n) => Math.round(n * u), Y = (n) => Math.round(n * v);

  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const t = y / h;
    if (t < 0.22) put(x, y, 150 + t * 200, 190 + t * 120, 235);          // sky
    else if (t < 0.58) put(x, y, 196, 180, 158);                           // the house opposite
    else put(x, y, 92 + t * 20, 92 + t * 20, 98 + t * 20);                 // asphalt
  }
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 5; c += 1) {
    box(X(10 + c * 27), Y(50 + r * 20), X(14), Y(12), (r + c) % 3 === 0 ? [240, 205, 110] : [44, 62, 92]);   // windows
  }
  box(X(64), Y(88), X(16), Y(24), [86, 48, 30]);        // the door
  disc(X(120), Y(96), X(15), [44, 120, 52]);            // a tree
  box(X(118), Y(108), X(4), Y(22), [70, 46, 30]);
  box(X(8), Y(124), X(46), Y(20), [196, 38, 44]);       // a car
  box(X(16), Y(118), X(28), Y(8), [40, 52, 70]);
  box(X(70), Y(132), X(18), Y(26), [36, 110, 70]);      // a bin
  box(X(92), Y(134), X(16), Y(24), [40, 70, 150]);      // another
  box(X(20), Y(162), X(40), Y(8), [150, 96, 40]);       // a bench
  box(X(104), Y(166), X(26), Y(14), [226, 196, 60]);    // a crate
  return out;
}
