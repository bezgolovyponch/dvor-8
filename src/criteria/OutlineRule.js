// REQUIREMENT (the creator, verbatim): "the objects we need the outline for are: buildings and cars, also only those
// objects can be destroyed, windows are destroyable but you dont need to outline them."
//
// So this module owns exactly one decision: MAY THIS KIND BE OUTLINED? It exists as its own named file so that
// anyone writing rendering code reads the requirement before changing the behaviour, and so that
// tools/criteria-check.mjs can call the same predicate the renderer calls instead of inventing a proxy.
export const OUTLINED_KINDS = /car|truck|bus|van|building|house|tower|block/i;

/** True when this thing gets the one-pixel outline. Buildings and cars: nothing else. */
export function mayBeOutlined(thing) {
  if (!thing) return false;
  return OUTLINED_KINDS.test(String(thing.kind || '') + ' ' + String(thing.label || ''));
}

/** The predicate the checker runs: it must find the rule in force where the drawing happens. */
export const predicate = (src) => /mayBeOutlined/.test(src) && /OUTLINED_KINDS/.test(src);
