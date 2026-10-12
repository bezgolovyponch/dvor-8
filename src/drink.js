// The bottle, before it is thrown. Pure.
//
// Under the alcohol filter the thing in the hand is a bottle, and a bottle can be drunk from. A swig is a
// decision with a price on both sides: the hand is busy while it lasts, every swig makes the burst wider
// and the aim worse, and it wears off. An empty bottle gives nothing more until it is thrown, and a throw
// puts a full one in the hand. So "how drunk" is set by the player, swig by swig, and not by the filter.

export const SWIGS = 4;          // in one bottle
export const SWIG_TIME = 0.7;    // seconds a swig takes; nothing can be thrown meanwhile
export const PER_SWIG = 0.25;    // how much one swig adds, on a scale of 0 (dry) to 1
export const WEARS_OFF = 0.012;  // per second
export const START = 0.25;       // one swig in when the bottle is first picked up

export const makeDrink = () => ({ drunk: START, left: SWIGS, busy: 0, swigs: 0 });

// Start a swig. False when the bottle is empty or already at the mouth.
export function swig(d) {
  if (d.busy > 0 || d.left === 0) return false;
  d.left -= 1; d.busy = SWIG_TIME; d.swigs += 1;
  return true;
}

// A thrown bottle is replaced by a full one.
export function fresh(d) { d.left = SWIGS; d.busy = 0; }

export function stepDrink(d, dt) {
  if (d.busy > 0) {
    const part = Math.min(dt, d.busy);
    d.busy -= part;
    d.drunk = Math.min(1, d.drunk + (PER_SWIG * part) / SWIG_TIME);
  } else d.drunk = Math.max(0, d.drunk - WEARS_OFF * dt);
}

// How full the bottle looks, 0…1, falling smoothly while it is at the mouth.
export const level = (d) => (d.left + d.busy / SWIG_TIME) / SWIGS;

// The thing in your hand as it behaves at this moment. At half-drunk it is exactly the throwable as
// throwables.js states it.
//
// The argument changed from a MODE to a THROWABLE. Scatter and splash are properties of the object — how far
// a bottle sprays, how far a pebble does not — so once the hand was split from the eyes, drinking had to
// modify the hand. A "drunk mode" that scaled a view's scatter would be scaling a field the view no longer has.
export function drunkItem(item, drunk) {
  return { ...item, scatter: item.scatter * (0.4 + 1.2 * drunk), splash: item.splash * (0.6 + 0.8 * drunk) };
}
export const stagger = (drunk) => 26 * drunk;   // pixels per second the legs wander, on foot
