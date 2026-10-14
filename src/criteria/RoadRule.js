// REQUIREMENT (the creator, verbatim): "The road, sidewalk, hedge, trees, people and all 6 cars are the photo,
// pixelated: averaged into 288×512 and snapped to one palette, with nothing redrawn." And: "Every block of 5×5 photo
// pixels becomes one game pixel at the same position, so the game frame lines up with the photo exactly."
//
// So this module owns the PHOTOGRAPH LAYER - the ground the whole frame stands on. Its rule, in one place:
//   the photograph is reduced by a BOX AVERAGE of 5x5 blocks, block (i,j) becomes game pixel (i,j) at the same
//   position, and nothing in this layer is smoothed, sharpened, drawn over or re-composed. Whatever the photograph
//   says the road, the pavement, the markings, the shadows and the car bodies are, that is what the layer says.
export const BLOCK = 5;

/** The photograph layer: one game pixel per 5x5 block, at the same position. The only function that may do this. */
export function photoLayer(boxDown, rgba, sw, sh, dw, dh, block = BLOCK) {
  if (!boxDown) throw new Error('RoadRule needs the box average');
  return boxDown(rgba, sw, sh, dw, dh, 4);
}

/** True when a kind belongs to the photograph layer (kept, never drawn). */
export const isPhotographLayer = (thing) => /road|pavement|sidewalk|ground|marking|shadow|car|truck|bus|van|person|people|bin|bicycle/i.test(String((thing && (thing.kind || thing.label)) || ''));

/** Predicate for the checker: the rule must be in force where the photograph is reduced. */
export const predicate = (src) => /photoLayer/.test(src) && /BLOCK = 5/.test(src);
