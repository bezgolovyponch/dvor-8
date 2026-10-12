// Windows you can actually break, built the way a shipped engine builds them.
//
// THE SHIPPED MODEL, AND WHY IT IS THE RIGHT ONE HERE
// ---------------------------------------------------
// Half-Life 2's glass is the Source engine entity `func_breakable_surf`, and Valve's own developer
// documentation describes it verbatim as: "It defines a breakable surface, for partially breakable
// glass/tile/etc." and "This entity is functionally similar to real-life tempered glass."
//
// Its parameters, as the wiki prints them:
//   Fragility (fragility) <integer> - "If the 'Surface Type' is set to Glass, this value sets how fragile the
//                                     glass pieces are after the surface has been broken."
//   Surface Type (surfacetype)      - "0: Glass, 1: Tile"
//   Faces that will be broken must have exactly four sides.
//   a per-material break texture    - the crack stages are PAINTED INTO the texture, not simulated
//   a "Physics damage decals" flag
//
// That is the whole design: ONE quad, a PRE-DRAWN crack texture with a few stages, an integer damage
// accumulator, a fragility threshold, and then a burst of pieces. There is no simulation in it, and it shipped
// in one of the most imitated games ever made. At 192x256 it is exactly what fits.
//
// WHAT WAS REJECTED, AND WHY
// --------------------------
// Real fracture simulation exists and is well documented, and every version of it is wrong for this project.
// O'Brien & Hodgins, "Graphical Modeling and Animation of Brittle Fracture" (SIGGRAPH 1999) "augment[s]
// existing techniques for simulating flexible objects to include models for crack initiation and propagation
// in three-dimensional volumes ... the simulation determines where cracks should initiate and in what
// directions they should propagate" - a finite-element volume, offline. Müller, Chentanez & Kim (TOG 2013)
// is a GPU convex decomposition at console scale. Digital Molecular Matter is proprietary C++ middleware for
// Windows/Xbox 360/PS3/Mac/Linux with no browser build, and NVIDIA's PhysX Blast is a C++ SDK whose own
// documentation states "There is no physics or collision representation. There is no graphics
// representation." None of them drops into a dependency-free canvas game, and none of them is needed to make
// a window at 192 pixels look like it broke.
//
// Note also that "Fast Voronoi fracture" is NOT a real paper title - a search of Crossref, Semantic Scholar
// and ACM found nothing under that name, so it is not cited here. Voronoi decomposition as a way to CHOOSE
// PIECE SHAPES is real and documented (Houdini's Voronoi Fracture node: "Fractures the input geometry by
// performing a Voronoi decomposition of space around the input cell points"), and that idea - seeds around
// the impact point - is what decides where the shards are, which is all that is borrowed from it.

import { mulberry32 } from './rng.js';

// Stages, from Source's own model: a fragility value and a damage accumulator. Three visible stages is what
// the crack texture would hold; the fourth is the break itself.
export const STAGES = 4;
export const GLASS_HP = 2;          // a window is thinner than a bench: two hits and it is gone

/**
 * Make a window out of the pixels a photograph gave us.
 *
 * The pixels are the GLASS — whatever was behind the window in the photograph — and they are kept, because
 * a window that shows nothing is a hole rather than a window. `frame` is the outline the yard already draws
 * round a thing.
 */
export function makeWindow(region, worldW = 0, rnd = mulberry32(1)) {
  return {
    region,
    worldW: worldW || region.w,
    hp: GLASS_HP,
    hits: 0,
    stage: 0,
    gone: false,
    cracks: [],          // where the glass was struck, so the cracks grow from the strikes
    rnd,
  };
}

/**
 * Take a hit. Returns the stage reached, so the caller can decide what to play.
 *
 * The cracks are drawn FROM the impact point outward, which is the one thing borrowed from the brittle
 * fracture literature: O'Brien & Hodgins analyse the stress tensor to decide "where cracks should initiate
 * and in what directions they should propagate". There is no stress tensor here, but there IS an impact
 * point, and a crack that starts where the stone landed reads as real for the same reason the simulated one
 * does.
 */
export function hitWindow(win, x, y, damage = 1) {
  if (win.gone) return { stage: win.stage, broke: false };
  win.hits += damage;
  win.cracks.push({ x, y });
  if (win.hits >= win.hp) {
    win.gone = true;
    win.stage = STAGES;
    return { stage: STAGES, broke: true };
  }
  win.stage = Math.min(STAGES - 1, win.hits);
  return { stage: win.stage, broke: false };
}

/**
 * The shards a broken window leaves, as a 2D Voronoi around seeds biased toward the strikes.
 *
 * The bias is the point: a window hit in one corner breaks into small pieces there and large pieces at the
 * far side, because the energy was concentrated where the stone landed. Uniform random seeds would give a
 * tidy mosaic that reads as a pattern rather than as damage.
 */
export function shards(win, count = 9) {
  const r = win.region, rnd = win.rnd;
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    // three seeds in five land near a strike; the rest fall anywhere in the pane
    if (win.cracks.length && rnd() < 0.6) {
      const c = win.cracks[Math.floor(rnd() * win.cracks.length)];
      seeds.push({
        x: Math.max(r.x, Math.min(r.x + r.w, c.x + (rnd() - 0.5) * r.w * 0.5)),
        y: Math.max(r.y, Math.min(r.y + r.h, c.y + (rnd() - 0.5) * r.h * 0.5)),
      });
    } else {
      seeds.push({ x: r.x + rnd() * r.w, y: r.y + rnd() * r.h });
    }
  }
  // each shard is the set of pane pixels nearer its own seed than any other seed
  const cells = seeds.map(() => []);
  // `p` is an index into the whole world buffer, so its coordinates use the WORLD width, not the pane's.
  const worldW = win.worldW || r.w;
  for (const p of r.pixels) {
    const px = p % worldW, py = Math.floor(p / worldW);
    let best = 0, bd = Infinity;
    for (let i = 0; i < seeds.length; i += 1) {
      const d = (seeds[i].x - px) * (seeds[i].x - px) + (seeds[i].y - py) * (seeds[i].y - py);
      if (d < bd) { bd = d; best = i; }
    }
    cells[best].push(p);
  }
  return cells.map((pixels, i) => ({ pixels, seed: seeds[i] })).filter((c) => c.pixels.length);
}
