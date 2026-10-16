// PIECE: FACADE — a flat drawn plane with a regular window grid at the pitch MEASURED FROM THE PHOTOGRAPH.
//
// This is a piece, not a pass: it takes an index buffer, a mask of the wall's own pixels, the family's tones and a
// pitch, and it writes only those pixels. It can be confirmed alone (tools/piece-facade-check.mjs) before any
// pipeline uses it, which is the fix for the conceptual error that produced photographic texture inside walls and
// window rectangles that corresponded to nothing.
//
// THE RULES OF THE PIECE, asserted by its check:
//   1. every pixel inside the mask carries a WALL tone of the given family, or a window-sprite entry - nothing else;
//   2. windows sit on a REGULAR grid: the same pitch in both directions, from the given origin;
//   3. no pixel outside the mask is touched.
export const SILL = 0, FRAME = 1, LIP = 2, GLASS = 3;   // the sprite's four parts, in drawing order

/**
 * @param {object} o
 * @param {Int16Array} o.idx      the frame's index buffer (written in place)
 * @param {number} o.w @param {number} o.h
 * @param {Uint8Array} o.mask     1 where the wall is
 * @param {number[]} o.tones      the wall's own ramp tones, darkest first
 * @param {number[]} o.sprite     [sill, frame, lip, glass] palette entries
 * @param {number} o.pitchX @param {number} o.pitchY   the grid, measured from the photograph
 * @param {number} o.originX @param {number} o.originY the grid's first line
 * @param {number[]} [o.lums]     optional per-pixel value (0..1) that picks the wall tone; defaults to the tone order
 * @returns {{ wall: number, sprites: number, pitchX: number, pitchY: number }}
 */
export function paintFacade({ idx, w, h, mask, tones, sprite, pitchX, pitchY, originX, originY, lums }) {
  const px = Math.max(4, Math.round(pitchX | 0));
  const py = Math.max(4, Math.round(pitchY | 0));
  const ox = ((originX | 0) % px + px) % px;
  const oy = ((originY | 0) % py + py) % py;
  let wall = 0;
  // 1. the plane: one family's tones, flat, nothing else
  for (let p = 0; p < w * h; p += 1) {
    if (!mask[p]) continue;
    const v = lums ? lums[p] : 0.5;
    const t = v < 0.30 ? 0 : v < 0.48 ? 1 : v < 0.66 ? 2 : 3;
    idx[p] = tones[Math.min(tones.length - 1, t)];
    wall += 1;
  }
  // 2. the grid: a sprite where the grid's own cell is fully inside the mask
  let sprites = 0;
  const bw = Math.max(1, px - 2), bh = Math.max(1, py - 2);
  for (let y = oy; y + py <= h; y += py) {
    for (let x = ox; x + px <= w; x += px) {
      let inside = true;
      for (let dy = 0; dy < py && inside; dy += 1) {
        for (let dx = 0; dx < px; dx += 1) if (!mask[(y + dy) * w + (x + dx)]) { inside = false; break; }
      }
      if (!inside) continue;
      // the sprite: sill under, frame around, lip inside the frame, glass in the middle
      for (let dx = 0; dx < bw; dx += 1) idx[(y + bh - 1) * w + (x + 1 + dx)] = sprite[SILL];
      for (let dy = 0; dy < bh; dy += 1) {
        idx[(y + dy) * w + x] = sprite[FRAME];
        idx[(y + dy) * w + (x + bw - 1)] = sprite[FRAME];
      }
      for (let dx = 0; dx < bw; dx += 1) idx[y * w + (x + dx)] = sprite[FRAME];
      for (let dy = 1; dy < bh - 1; dy += 1) for (let dx = 1; dx < bw - 1; dx += 1) {
        idx[(y + dy) * w + (x + dx)] = (dx === 1 || dy === 1) ? sprite[LIP] : sprite[GLASS];
      }
      sprites += 1;
    }
  }
  return { wall, sprites, pitchX: px, pitchY: py, originX: ox, originY: oy };
}

/** The pitch, measured from the openings the photograph actually shows: the median gap between their centres. */
export function pitchFrom(centres, fallback) {
  const s = centres.slice().sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < s.length; i += 1) { const g = s[i] - s[i - 1]; if (g > 3) gaps.push(g); }
  if (!gaps.length) return fallback;
  gaps.sort((a, b) => a - b);
  return gaps[gaps.length >> 1];
}
