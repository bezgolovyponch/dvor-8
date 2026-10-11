// The scan: the opening move of the game.
//
// A scan runs across the yard, and every object it reaches is REPLACED by its 8-bit copy. That is the
// mechanic the project brief names: the scan converts reality into a game you then play.
//
// Two implementations, chosen by what is available:
//
//   local    the scan recognises everything on its own, in order, a band at a time. No network.
//   routed   one bounded model call names what the local pass found (src/recognise.js, docs/routing.md).
//            It runs BESIDE the local pass, never instead of it: with no key, or when every lane fails, the
//            yard is still fully recognised and the game is playable offline. `source` starts as 'local'
//            and becomes 'routed' only when a model's labels have actually been applied — it records what
//            happened, not what was attempted.
//
// The scan never decides anything about a person. It names objects. That line is deliberate: DVOR-8 has
// residents, and a system that "recognises" people would be a different and worse game.

import { scanObject } from './state.js';
import { WORLD_H } from './yard.js';

export const SCAN_MS = 900;          // how long one full pass takes
export const SCAN_BAND = 13;         // how tall the band is, in world units

// The local recogniser. It recognises what is in front of it, in the order the band moves. A real camera
// scan will replace `recognise` and leave everything else alone.
export function makeScan(world, options = {}) {
  return {
    world,
    running: false,
    y: 0,
    startedAt: 0,
    ms: options.ms || SCAN_MS,
    source: null,
  };
}

// The model's names for things, applied to the world. Returns the objects that were renamed.
export function applyLabels(scan, labels) {
  const renamed = [];
  for (const { id, label } of labels || []) {
    const obj = scan.world.objects.find((o) => o.id === id);
    if (!obj || obj.gone) continue;
    obj.label = label;
    renamed.push(obj);
  }
  if (renamed.length) scan.source = 'routed';
  return renamed;
}

export function startScan(scan, now) {
  scan.running = true;
  scan.y = 0;
  scan.startedAt = now;
  scan.source = 'local';
}

export function stepScan(scan, now, onRecognised) {
  if (!scan.running) return null;
  const progress = Math.min(1, (now - scan.startedAt) / scan.ms);
  scan.y = progress * WORLD_H;
  const reached = scan.world.objects.filter((o) => !o.scanned && o.y <= scan.y + SCAN_BAND);
  for (const obj of reached) {
    if (scanObject(scan.world, obj.id)) onRecognised?.(obj);
  }
  if (progress >= 1) {
    scan.running = false;
    scan.y = null;
    // Anything the band passed without reaching — objects below the final position — is recognised at the
    // end, so a completed scan always leaves nothing behind. A scan that silently misses objects is worse
    // than one that is slow.
    for (const obj of scan.world.objects) {
      if (!obj.scanned) { if (scanObject(scan.world, obj.id)) onRecognised?.(obj); }
    }
    return { done: true, source: scan.source };
  }
  return { done: false, progress };
}
