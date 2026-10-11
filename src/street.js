// The street beyond the photograph. Pure: arrays in, arrays out.
//
// A world starts as one yard. Walking out of it needs more street, and there are two kinds:
//   a PHOTOGRAPH the player adds   — the exact next yard, with its own colours and its own real things;
//   a MADE yard                    — more of the same place, built only out of a photograph already given.
// A made yard invents nothing. Its ground and walls are strips of the photograph, re-ordered so that each
// strip's edge matches the one before it (image quilting, in one direction), and its things are copies of
// things the detector really found. It is told apart from a photograph in the data (`made`), and on screen.

import { COLOURS, MAX_YARDS, baseOf, scorchMap } from './palette.js';
import { makeWorld } from './world.js';

export const STRIP = 16;        // width of one borrowed strip, pixels
export const MAX_STREET = 40;   // yards; past this the street ends rather than slow the phone down
const CHOICES = 5;              // a strip is picked from this many best-fitting ones, so a street does not repeat exactly

// A photograph's yard as a piece of street. `things` are the regions as objects.js made them.
export const yardFrom = ({ w, h, idx, palette, regions, owner }) => ({ w, h, idx, palette, regions, owner, made: false });

// The picture with its things taken out: each thing's pixels are replaced by the nearest pixel of the
// same row that is not a thing. Strips are cut from this, so a made yard never shows half a car that
// cannot be hit.
export function cleared(yard) {
  const { w, h, idx, owner } = yard, out = Uint8Array.from(idx);
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      if (owner[row + x] < 0) continue;
      let l = x - 1, r = x + 1;
      while (l >= 0 && owner[row + l] >= 0) l -= 1;
      while (r < w && owner[row + r] >= 0) r += 1;
      const gapL = l >= 0 ? x - l : 1e9, gapR = r < w ? r - x : 1e9;
      if (gapL === 1e9 && gapR === 1e9) continue;   // a row that is all thing is left as it is
      // taken from a little further off than the edge of the gap, so a filled hole keeps some texture
      let from = gapL <= gapR ? l - ((gapL - 1) % 6) : r + ((gapR - 1) % 6);
      if (from < 0 || from >= w || owner[row + from] >= 0) from = gapL <= gapR ? l : r;
      out[row + x] = idx[row + from];
    }
  }
  return out;
}

// A made yard out of a photograph's. `edge` is the column the new yard must continue from (palette
// indices of the same photograph, or null), so the join with what is already there does not show.
export function grow(src, rnd, edge = null) {
  const { w, h, palette } = src, clean = cleared(src);
  const far = new Float32Array(COLOURS * COLOURS);
  for (let a = 0; a < COLOURS; a += 1) for (let b = 0; b < COLOURS; b += 1) {
    far[a * COLOURS + b] = Math.hypot(palette[a][0] - palette[b][0], palette[a][1] - palette[b][1], palette[a][2] - palette[b][2]);
  }
  const idx = new Uint8Array(w * h), owner = new Int16Array(w * h).fill(-1);
  let last = edge;
  for (let x = 0; x < w; x += STRIP) {
    const width = Math.min(STRIP, w - x), fits = [];
    for (let from = 0; from + width <= w; from += 2) {
      let cost = 0;
      if (last) for (let y = 0; y < h; y += 2) { const a = last[y], b = clean[y * w + from]; if (a < COLOURS) cost += far[a * COLOURS + b]; }
      fits.push({ from, cost: cost + rnd() * 0.001 });
    }
    fits.sort((a, b) => a.cost - b.cost);
    const { from } = fits[Math.floor(rnd() * Math.min(CHOICES, fits.length))];
    for (let y = 0; y < h; y += 1) for (let k = 0; k < width; k += 1) idx[y * w + x + k] = clean[y * w + from + k];
    last = new Uint8Array(h);
    for (let y = 0; y < h; y += 1) last[y] = idx[y * w + x + width - 1];
  }

  // Things: a few of the real ones again, each where such a thing stands in the photograph (its own
  // height in the picture), moved along and sometimes turned round.
  const regions = [];
  const count = src.regions.length ? Math.min(src.regions.length + 1, 2 + Math.floor(rnd() * 3)) : 0;
  for (let n = 0; n < count; n += 1) {
    const model = src.regions[Math.floor(rnd() * src.regions.length)];
    if (model.w >= w - 4) continue;
    const flip = rnd() < 0.5;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const x0 = 2 + Math.floor(rnd() * (w - model.w - 4));
      if (regions.some((r) => x0 < r.x + r.w + 3 && r.x < x0 + model.w + 3 && model.y < r.y + r.h + 3 && r.y < model.y + model.h + 3)) continue;
      const id = regions.length, pixels = [];
      for (const p of model.pixels) {
        const mx = (p % src.w) - model.x, y = (p / src.w) | 0;
        const q = y * w + x0 + (flip ? model.w - 1 - mx : mx);
        idx[q] = src.idx[p]; owner[q] = id; pixels.push(q);
      }
      regions.push({ ...model, id, pixels: Int32Array.from(pixels), x: x0, cx: x0 + model.w / 2, hits: 0, gone: false, seen: true });
      break;
    }
  }
  return { w, h, idx, palette, regions, owner, made: true, like: src };
}

// The last column of the street as it stands, in the indices of one photograph's own colours — what a
// made yard is matched against. Null when the street ends in another photograph's colours.
export function edgeOf(world, base) {
  const edge = new Uint8Array(world.h).fill(255), x = world.w - 1;
  let known = 0;
  for (let y = 0; y < world.h; y += 1) {
    const v = world.idx[y * world.w + x] - base;
    if (v >= 0 && v < COLOURS) { edge[y] = v; known += 1; }
  }
  return known > world.h / 2 ? edge : null;
}

// Whether the street can still take this yard.
export function room(world, yard) {
  if (world.yards.length >= MAX_STREET) return false;
  const known = world.yards.some((y) => y.palette === yard.palette);
  return known || new Set(world.yards.map((y) => y.palette)).size < MAX_YARDS;
}

// Put a yard on the end of the street. Everything already there stays exactly as it is — wrecks, rubble,
// score — and only moves in memory, because the picture has become wider.
export function extend(world, yard) {
  if (!room(world, yard)) return false;
  const twin = world.yards.find((y) => y.palette === yard.palette);
  const base = twin ? twin.base : baseOf(new Set(world.yards.map((y) => y.palette)).size);
  if (!twin) {
    world.palette = [...world.palette, ...yard.palette.slice(0, COLOURS)];
    world.scorch = scorchMap(world.palette);
  }
  const part = makeWorld({ ...yard, seed: world.seed });   // the new yard with its outlines drawn
  const x0 = world.w, W = x0 + yard.w, h = world.h, first = world.regions.length;
  const idx = new Uint8Array(W * h), owner = new Int16Array(W * h).fill(-1), rubble = new Uint8Array(W * h).fill(255);
  for (let y = 0; y < h; y += 1) {
    idx.set(world.idx.subarray(y * x0, y * x0 + x0), y * W);
    owner.set(world.owner.subarray(y * x0, y * x0 + x0), y * W);
    rubble.set(world.rubble.subarray(y * x0, y * x0 + x0), y * W);
    for (let x = 0; x < yard.w; x += 1) {
      const v = part.idx[y * yard.w + x], o = part.owner[y * yard.w + x];
      idx[y * W + x0 + x] = v < COLOURS ? v + base : v;
      if (o >= 0) owner[y * W + x0 + x] = o + first;
    }
  }
  for (const r of world.regions) r.pixels = r.pixels.map((p) => ((p / x0) | 0) * W + (p % x0));
  for (const r of part.regions) {
    world.regions.push({ ...r, id: r.id + first, x: r.x + x0, cx: r.cx + x0, seen: true,
      pixels: r.pixels.map((p) => ((p / yard.w) | 0) * W + x0 + (p % yard.w)) });
  }
  Object.assign(world, { idx, owner, rubble, w: W });
  world.yards.push({ x: x0, w: yard.w, base, made: yard.made, palette: yard.palette });
  if (part.regions.length) world.done = false;
  return true;
}

// How far up the picture a walker may go: just above the highest thing, because everything that can be
// hit must also be reachable on foot — and no further, because above the things is usually wall and sky.
export function bandTop(world) {
  const top = world.regions.reduce((m, r) => Math.min(m, r.y), world.h);
  return Math.max(14, Math.min(Math.round(world.h * 0.6), top - 8));
}
