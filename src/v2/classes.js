import { rgbToOklab } from './oklab.js';

export const CLASS = { SKY: 0, BUILDING: 1, GREEN: 2, TERRAIN: 3, ROAD: 4, CAR: 5, THING: 6, PERSON: 7 };

const SEG_CLASS = {
  sky: CLASS.SKY, building: CLASS.BUILDING, wall: CLASS.BUILDING, vegetation: CLASS.GREEN, terrain: CLASS.TERRAIN,
  road: CLASS.ROAD, sidewalk: CLASS.ROAD, car: CLASS.CAR, truck: CLASS.CAR, bus: CLASS.CAR, train: CLASS.CAR,
  motorcycle: CLASS.CAR, fence: CLASS.THING, pole: CLASS.THING, 'traffic light': CLASS.THING, 'traffic sign': CLASS.THING,
  bicycle: CLASS.THING, person: CLASS.PERSON, rider: CLASS.PERSON,
};

const MAX_SAMPLES_PER_SIDE = 8;

export function classMap(masks, n) {
  const cls = new Uint8Array(n).fill(255);
  for (const [label, mask] of Object.entries(masks || {})) {
    const c = SEG_CLASS[label];
    if (c === undefined) continue;
    for (let i = 0; i < n; i += 1) if (mask[i]) cls[i] = c;
  }
  return fillUnknown(cls);
}

function fillUnknown(cls) {
  let last = CLASS.THING;
  for (let i = 0; i < cls.length; i += 1) {
    if (cls[i] === 255) cls[i] = last;
    else last = cls[i];
  }
  return cls;
}

const median = (values, count) => {
  const v = values.subarray(0, count).sort();
  return v[count >> 1];
};

export function downsample(rgba, sw, sh, W, H) {
  const lab = new Float32Array(W * H * 3);
  const r = new Uint8Array(MAX_SAMPLES_PER_SIDE ** 2), g = new Uint8Array(r.length), b = new Uint8Array(r.length);
  for (let y = 0; y < H; y += 1) {
    const y0 = Math.floor((y * sh) / H), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / H));
    const sy = Math.max(1, Math.floor((y1 - y0) / MAX_SAMPLES_PER_SIDE));
    for (let x = 0; x < W; x += 1) {
      const x0 = Math.floor((x * sw) / W), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / W));
      const sx = Math.max(1, Math.floor((x1 - x0) / MAX_SAMPLES_PER_SIDE));
      let k = 0;
      for (let yy = y0; yy < y1 && k < r.length; yy += sy) {
        for (let xx = x0; xx < x1 && k < r.length; xx += sx) {
          const p = (yy * sw + xx) * 4;
          r[k] = rgba[p]; g[k] = rgba[p + 1]; b[k] = rgba[p + 2]; k += 1;
        }
      }
      const o = rgbToOklab(median(r, k), median(g, k), median(b, k));
      const i = (y * W + x) * 3;
      lab[i] = o[0]; lab[i + 1] = o[1]; lab[i + 2] = o[2];
    }
  }
  return lab;
}
