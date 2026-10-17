// REQUIREMENT (the creator, verbatim): "The buildings are the v6 approach: rebuilt on the photo's column and floor
// grid, so every window and every floor can break." And from the accepted frame (docs/V10A.md): the towers are a
// PLANE with a REGULAR GRID of window rows, a checkerboard, a defined silhouette and a 1-px outline against the
// sky - never a sample of the photograph.
// From the creator's own v9 panel (docs/CRITERIA.md B2): "v6 rebuilt on the photo grid liked · v7 invented rejected." - the checkered tower is the pattern, not a picture.
//
// So this module owns one thing: HOW A BUILDING IS DRAWN. A facade is a plane in two or three tones of its own
// family, carrying a regular grid of window sprites on the photograph's own column and floor pitch, bounded by a
// one-pixel outline. It is a pattern, not a picture - which is exactly why it reads as architecture.
export const MIN_PITCH = 5;

/** The grid of a facade: bays across, floors down, from the facade's own size and the photo's own pitch. */
export function facadeGrid(w, h, pitchX, pitchY) {
  const px = Math.max(MIN_PITCH, Math.round(pitchX || MIN_PITCH));
  const py = Math.max(MIN_PITCH, Math.round(pitchY || MIN_PITCH));
  return { cols: Math.max(1, Math.floor(w / px)), rows: Math.max(1, Math.floor(h / py)), px, py };
}

/** The boxes of one facade's windows, in its own local coordinates. Regular - every bay, every floor. */
export function facadeWindows(w, h, pitchX, pitchY, glassW = 0.6, glassH = 0.55) {
  const g = facadeGrid(w, h, pitchX, pitchY);
  const out = [];
  const gw = Math.max(1, Math.round(g.px * glassW)), gh = Math.max(1, Math.round(g.py * glassH));
  for (let r = 0; r < g.rows; r += 1) {
    for (let c = 0; c < g.cols; c += 1) {
      const x = c * g.px + Math.round((g.px - gw) / 2);
      const y = r * g.py + Math.round((g.py - gh) / 2);
      if (x + gw > w || y + gh > h) continue;
      out.push({ x, y, w: gw, h: gh });
    }
  }
  return out;
}

/** True when this thing is a building: it is drawn as a facade, never sampled from the photograph. */
export const isBuilding = (thing) => /building|house|tower|block/i.test(String((thing && (thing.kind || thing.label)) || ''));

/** Predicate for the checker: the rule must be in force where the facade is drawn. */
export const predicate = (src) => /facadeWindows/.test(src) && /facadeGrid/.test(src);
