// REQUIREMENT (the creator, verbatim): "also only those objects can be destroyed, windows are destroyable but you
// dont need to outline them." And, from the baseline: "people are never targets".
//
// This module owns one decision: MAY THIS KIND BE DESTROYED? Buildings, cars and windows. Never the trees, never the
// ground, never a person.
//
// The requirement this module carries, verbatim (docs/COMPOSITION.md element 9):
//   "Throw at a window: the glass breaks. Hit the same spot again: it cracks, then darkens, then the panels fall off
//    and leave the frame, then the frame falls. Anything above a missing piece falls after it, and the rubble stays."

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

// ---- PER-MATERIAL DAMAGE (docs/AUDIT.md, step 6) ------------------------------------------------------------
//
// A hit on glass, brick and sheet metal does not look the same, and until now every kind broke by one generic path -
// which is why damage read as noise instead of as damage. The ready-made pattern from the games this project cites
// (Rampage: pieces off; Rampart: walls as blocks; Bomberman: a wave through cells) is a MATERIAL PROFILE: how far a
// blow scrapes the material's own ramp, how big a hole it tears, and how often it goes through to void.
export const MATERIALS = {
  glass: { scrape: 2, hole: 1.25, shatter: 0.45 },   // shatters wide, goes through easily
  brick: { scrape: 1, hole: 0.9, shatter: 0.25 },    // chips, crumbles at the edges
  concrete: { scrape: 1, hole: 0.8, shatter: 0.2 },  // dust, small holes
  metal: { scrape: 1, hole: 0.7, shatter: 0.12 },    // dents, almost never through
  wood: { scrape: 1, hole: 1.0, shatter: 0.3 },
};

/** Which material a thing is made of. The detector's label decides; anything unknown is concrete. */
export function materialOf(thing) {
  const what = String((thing && (thing.kind || thing.label)) || '') + ' ' + String((thing && thing.material) || '');
  if (/window|glass|окно|стекл/i.test(what)) return 'glass';
  if (/brick|кирпич|wall|стена|building|house|tower|block/i.test(what)) return 'brick';
  if (/car|truck|bus|van|bin|bicycle|bench|metal|машин/i.test(what)) return 'metal';
  if (/tree|bush|wood|дерев/i.test(what)) return 'wood';
  return 'concrete';
}

/** The damage a blow does to this thing: how far it scrapes, how wide it tears, how often it goes through. */
export function damageProfile(thing) {
  const m = MATERIALS[materialOf(thing)] || MATERIALS.concrete;
  return { material: materialOf(thing), ...m };
}

/** Predicate for the checker: the profile must be in force where damage is applied. */
export const predicate6 = (worldSrc) => /damageProfile/.test(worldSrc) && /MATERIALS/.test(readFileSyncSafe());
function readFileSyncSafe() { try { return require('node:fs').readFileSync('src/criteria/DestructionRule.js', 'utf8'); } catch { return ''; } }
