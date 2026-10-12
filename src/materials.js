// What each part of the picture is MADE of, and what that material looks like at 192 pixels wide.
//
// THE DIAGNOSIS BEHIND THE COMPLAINT
// ----------------------------------
// Quantising a photograph replaces one kind of noise with another. Asphalt grain, brick texture and leaf
// detail are all high-frequency, and after Floyd-Steinberg every one of them becomes the SAME high-frequency
// speckle. That is why a quantised courtyard reads as one undifferentiated mush: the surfaces are drawn in
// the same visual language even though they are not the same material. The creator's words were "no real
// distinguishing visual border between the asphalt and the tree" and "trees are blurred", and both have this
// single cause.
//
// Pixel art has never solved this by quantising harder. It solves it by giving every material its OWN
// pattern, drawn from a small shared vocabulary, over the photograph's own light and colour. A tree at 192
// pixels is not a photograph of leaves; it is a few clusters of darker and lighter green. A wall is a run of
// stones. Asphalt is fine speckle. The UNIFIED STYLE comes from every surface using the same small
// vocabulary; the VISUAL DISTINCTION comes from each surface using a different entry in it.
//
// The vocabulary follows the documented pixel-art convention for dither patterns, verbatim from a pixel-art
// reference table:
//   Checkerboard  "Creates even, uniform intermediate tones"     -> "Gradients, shadows, sky"
//   Bayer         "Gradual density change for smooth gradients"  -> "Sky, water, light gradients"
//   Random        "Irregular placement creates organic textures" -> "Dirt, rocks, grime, noise"
//   Stripe        "Horizontal, vertical, or diagonal lines"      -> "Wood grain, fabric, wind flow"
//   Crosshatch    "Crossed lines"                                -> "Metal, shadows, heavy textures"
// and its applied examples: "Ground & Dirt - Random dither creates organic textures. Random patterns work
// best for natural elements."; "Sky & Clouds - Use checkerboard dither for light-to-dark blue gradients."
// The same source warns "Keep patterns consistent within a piece" and "Don't dither 3+ colors
// simultaneously (becomes chaotic)" — which is why each material is drawn with ONE pattern, and why there
// are six classes and not thirty. This is documented practice, not peer-reviewed research, and is labelled
// as such.
//
// ---------------------------------------------------------------------------------------------------
// THE GAP, MEASURED RATHER THAN ASSUMED — READ THIS BEFORE TRUSTING ANY AUTOMATIC SURFACE LABEL
// ---------------------------------------------------------------------------------------------------
// This file does NOT decide what a surface is. It takes a surface map and draws it. That split is not
// tidiness; it is the result of measuring the courtyard photograph, where colour and texture do NOT separate
// the materials a game needs to separate:
//
//   surface        R     G     B   luma   G/R   colour spread   local texture
//   sky            106   145   194   139   1.37      87.7            21.2
//   tree (dark)     93    88    85    89   0.95       8.6            18.7
//   tree (lit)     124   140   152   137   1.13      27.6            28.5
//   building       167   161   145   161   0.96      22.0            27.8
//   asphalt         88    75    71    78   0.86      16.6            22.4
//   cars            73    75    86    76   1.02      12.9            31.2
//   bench           52    55    49    53   1.05       5.2            18.0
//   ground          92    62    49    69   0.68      42.6            16.5
//
// TREE (dark) and BENCH differ by 4.4 in colour spread and 0.7 in texture. ASPHALT and TREE overlap on both.
// Sky is the ONLY surface here with a clean signature, and it is clean only because it is unoccluded. An
// attempt to classify these into materials by colour and texture put the bench in the trees and the trees in
// "unknown" — see docs/environment-transfer.md. No amount of tuning fixes that, because the statistics are
// the same; only a model that has LEARNED the boundaries can separate them.
//
// So this module's contract is: given a surface map from ANY source, draw a unified style. The sources, in
// order of reliability, are:
//   1. a trained segmenter                      (SegFormer-B0 ADE20K — licence pending, see the doc)
//   2. depth from a monocular depth model       (a fence in front of a hedge is then separable)
//   3. hand-authored masks over the photograph  (always available, never wrong, does not scale)
// The geometric route — sky by top-connected blue dominance, ground by frame contact — is worth doing for
// sky and ground ONLY, because those two are structurally defined rather than visually defined.

// Deterministic value noise. Not random per run: the same yard must always give the same picture, which is
// the rule the whole project is held to.
function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

export const MATERIALS = ['sky', 'foliage', 'asphalt', 'wall', 'earth', 'other'];

/**
 * The pattern for each material, as a per-pixel signed offset added before quantisation.
 *
 * `cell` is the size of the pattern in pixels: fine for asphalt, coarse for foliage, and no pattern at all
 * for sky and wall, which are FLAT surfaces and should dither smoothly rather than grain. The amplitudes are
 * small on purpose: the photograph's colour and light are kept, and only its high-frequency noise is
 * replaced, because an offset that swamped the tone would defeat the point.
 */
const PATTERN = {
  // foliage: CLUSTERED blobs, 3-pixel cells. "Irregular placement creates organic textures."
  foliage: (x, y, seed) => (hash((x / 3) | 0, (y / 3) | 0, seed) - 0.5) * 30,
  // asphalt: fine one-pixel speckle, gentle. The random family at a small amplitude, so the surface stays
  // calm and slightly granular rather than noisy.
  asphalt: (x, y, seed) => (hash(x, y, seed) - 0.5) * 11,
  // earth: the same family, a coarser cell, so gravel is visibly not asphalt.
  earth: (x, y, seed) => (hash((x / 2) | 0, (y / 2) | 0, seed ^ 0x9e37) - 0.5) * 20,
  // sky and wall are FLAT: no pattern of their own, left to the ordered dither, which is what makes a
  // gradient instead of grain.
  sky: () => 0,
  wall: () => 0,
  other: (x, y, seed) => (hash(x, y, seed ^ 0x51ed) - 0.5) * 8,
};

export const TILE = 64;   // the tile size the dithering literature recommends; ample for 1-3 pixel cells

export function patternAtlas(seed = 1) {
  const atlas = {};
  for (const m of MATERIALS) {
    const tile = new Float32Array(TILE * TILE);
    for (let y = 0; y < TILE; y += 1) for (let x = 0; x < TILE; x += 1) tile[y * TILE + x] = PATTERN[m](x, y, seed);
    atlas[m] = tile;
  }
  return atlas;
}

export const offsetFor = (atlas, material, x, y) => atlas[MATERIALS[material]][(y & (TILE - 1)) * TILE + (x & (TILE - 1))];

/** The offset for a pixel, given a surface map and an atlas. Out-of-range maps fall back to `other`. */
export const offsetAt = (atlas, what, i, x, y) => offsetFor(atlas, what ? what[i] : MATERIALS.length - 1, x, y);

export function share(what) {
  const counts = new Map();
  for (const v of what) counts.set(v, (counts.get(v) || 0) + 1);
  const out = {};
  for (const m of MATERIALS) out[m] = (counts.get(MATERIALS.indexOf(m)) || 0) / what.length;
  return out;
}

/**
 * The ONLY two surfaces worth finding geometrically, because they are defined by POSITION rather than by
 * appearance: sky is whatever reaches the top of the frame and leads in blue, and ground is whatever reaches
 * the bottom of the frame. Everything else needs a model or a hand.
 *
 * Verified working on the courtyard photograph: sky 32.1% of the frame with the horizon at row 112 of 256,
 * against a true sky of roughly 35%. An earlier attempt searched for the strongest horizontal gradient and
 * found row 252 of 256 — the bottom of the picture — because in a balcony photograph the strongest
 * horizontal edge is the frame, not the skyline.
 */
export function skyAndGround(rgba, w, h) {
  const n = w * h;
  const y = new Float32Array(n), b = new Float32Array(n), r = new Float32Array(n), g = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    r[i] = rgba[i * 4]; g[i] = rgba[i * 4 + 1]; b[i] = rgba[i * 4 + 2];
    y[i] = 0.299 * r[i] + 0.587 * g[i] + 0.114 * b[i];
  }
  const sorted = Float32Array.from(y).sort();
  const floor = sorted[Math.floor(n * 0.45)];
  const isSky = (i) => b[i] > r[i] * 1.06 && b[i] >= g[i] * 0.98 && y[i] > floor;
  const inSky = new Uint8Array(n);
  let reach = new Uint8Array(w);
  for (let x = 0; x < w; x += 1) if (isSky(x)) { reach[x] = 1; inSky[x] = 1; }
  let horizon = 1;
  for (let row = 1; row < h; row += 1) {
    // `grown` must start EMPTY each row. Seeding it with the previous row's reach let a full row of 1s march
    // down through rows containing no sky at all, and it covered 99.8% of the frame — a real bug, kept here
    // as the reason the loop is written this way.
    const grown = new Uint8Array(w);
    let count = 0;
    for (let x = 0; x < w; x += 1) {
      const touches = reach[x] || (x > 0 && reach[x - 1]) || (x + 1 < w && reach[x + 1]);
      if (touches && isSky(row * w + x)) { grown[x] = 1; count += 1; }
    }
    if (count < Math.max(3, w * 0.03)) break;
    reach = grown;
    for (let x = 0; x < w; x += 1) if (grown[x]) inSky[row * w + x] = 1;
    horizon = row + 1;
  }
  const what = new Uint8Array(n).fill(MATERIALS.indexOf('other'));
  const SKY = MATERIALS.indexOf('sky'), EARTH = MATERIALS.indexOf('earth');
  for (let i = 0; i < n; i += 1) if (inSky[i]) what[i] = SKY;
  for (let row = horizon; row < h; row += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = row * w + x;
      if (what[i] !== SKY) what[i] = EARTH;   // the ground plane, warm or not, is the part you walk on
    }
  }
  return { what, horizon, skyShare: inSky.reduce((a, v) => a + v, 0) / n, classes: MATERIALS };
}
