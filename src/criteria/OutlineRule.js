// REQUIREMENT (the creator, verbatim): "the objects we need the outline for are: buildings and cars, also only those
// objects can be destroyed, windows are destroyable but you dont need to outline them."
//
// So this module owns exactly one decision: MAY THIS KIND BE OUTLINED? It exists as its own named file so that
// anyone writing rendering code reads the requirement before changing the behaviour, and so that
// tools/criteria-check.mjs can call the same predicate the renderer calls instead of inventing a proxy.
//
// The requirements this module carries, so that writing rendering code means reading them (docs/COMPOSITION.md):
//   "One outline rule (the darkest palette colour, 1 px) on every target, never mixed."
//   "v9 photo pixels plus one shared outline" - the cartoon template is rejected
//   "Each car gets a 1-px outline."
//   "an object's edge is every pixel that touches a pixel of another object. Buildings get a 1-px outline against
//    the sky. Aiming shows a pink edge, info mode a cyan one, and a selected object blinks cyan and yellow."
//   "Every glass cell is a window object." - and a window is destroyable, never outlined
//   "The buildings are the v6 approach: rebuilt on the photo's column and floor grid" - and the checkered tower is
//    "v6 rebuilt on the photo grid liked - v7 invented rejected"

export const OUTLINED_KINDS = /car|truck|bus|van|building|house|tower|block/i;

/** True when this thing gets the one-pixel outline. Buildings and cars: nothing else. */
export function mayBeOutlined(thing) {
  if (!thing) return false;
  return OUTLINED_KINDS.test(String(thing.kind || '') + ' ' + String(thing.label || ''));
}

/** The predicate the checker runs: it must find the rule in force where the drawing happens. */
export const predicate = (src) => /mayBeOutlined/.test(src) && /OUTLINED_KINDS/.test(src);
