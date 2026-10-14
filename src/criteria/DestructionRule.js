// REQUIREMENT (the creator, verbatim): "also only those objects can be destroyed, windows are destroyable but you
// dont need to outline them." And, from the baseline: "people are never targets".
//
// This module owns one decision: MAY THIS KIND BE DESTROYED? Buildings, cars and windows. Never the trees, never the
// ground, never a person.
export const DESTROYABLE_KINDS = /car|truck|bus|van|building|house|tower|block|window/i;
export const NEVER = /person|people|human|child|dog|cat/i;

/** True when a hit on this thing may do damage. */
export function mayBeDestroyed(thing) {
  if (!thing) return false;
  const what = String(thing.kind || '') + ' ' + String(thing.label || '');
  if (NEVER.test(what)) return false;         // a person is never a target, by the baseline
  return DESTROYABLE_KINDS.test(what);
}

/** True when this thing is a window: destroyable, never outlined. */
export const isWindow = (thing) => /window|окно/i.test(String(thing && (thing.kind || thing.label) || ''));
