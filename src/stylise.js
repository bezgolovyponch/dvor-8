// The photograph -> the scene the game draws. This is the only style route; there is no second one.
//
// WHAT THIS MODULE IS NOW, AND WHAT IT REPLACED
// --------------------------------------------
// It used to quantise the photograph's own pixels: grade, an edge-preserving guided filter, a palette cut
// from the picture by median cut, then Floyd-Steinberg error diffusion, then an ink pass over the structure
// lines. That whole chain is gone, and the reason is measured rather than a matter of taste.
//
//   THE PALETTE WAS PER-PHOTOGRAPH, so every yard was a different game. The three photographs supplied for
//   testing have hue spreads of 92.6, 25.8 and 31.2 degrees; the same code therefore produced three unrelated
//   colour schemes. A style is a fixed decision, not a per-image measurement.
//
//   QUANTISING THE PHOTOGRAPH KEEPS ITS NOISE. Asphalt grain, leaf texture and JPEG ringing are all
//   high-frequency, and after error diffusion every one of them becomes the same speckle. Measured on the
//   courtyard, a flat field gave 5704 of 6144 pixels a gradient of zero, and the surfaces had no border
//   between them because nothing had decided where one surface ended.
//
// The replacement is in src/flat.js and this file is the seam to it: it runs the flat render and then
// supplies the two things the rest of the game asks a styled picture for — the material map that says where
// the sky is, and the region list the object layer reads.
//
// The frame is the PHOTOGRAPH'S OWN SHAPE. flat.js works at whatever size it is given, and main.js derives
// that size from the image, so a tall phone photograph makes a tall level.

import { render as renderFlat, RAMPS, STEPS, outlineOf, voidOf } from './flat.js';
import { SKY, OTHER } from './surfaces.js';


/**
 * The scene, from the photograph.
 *
 * Returns the palette index per pixel, the palette, the region list, and a material map. Everything the game
 * needs is in the return value; nothing is read back out of module state.
 */
export function styliseFlat(rgba, w, h, opts = {}) {
  const st = renderFlat(rgba, w, h, opts);
  const n = w * h;

  // THE MATERIAL MAP, read back from flat.js's own decision rather than measured again.
  //
  // Two things need to know where the sky is: the window finder skips it when looking for dark openings in a
  // wall, and the paint refuses to land on it. Both read `what`. A pixel's palette index is
  // `ramp * STEPS + tone`, so its ramp comes straight out of the index and the ramp's own NAME says what it
  // is — no colour rule, no threshold, and no second classifier that could disagree with the painter.
  //
  // An earlier version returned null here, on the honest grounds that flat.js does not classify materials.
  // That was right about the naming and wrong about the consequence: `takesPaint` reads
  // `!what || what[i] !== SKY`, so a null map means EVERY pixel takes paint, and a thrown ball of paint
  // landed on the sky. The flaw was hidden by a harness assertion that compared a total splat count and so
  // could not fail.
  const out = st.palette.length - 2;
  const what = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    const k = st.idx[i];
    if (k >= out) { what[i] = OTHER; continue; }
    const ramp = RAMPS[(k / STEPS) | 0];
    what[i] = ramp && ramp.name === 'sky' ? SKY : OTHER;
  }

  return {
    idx: st.idx,
    palette: st.palette,
    // `smooth` is what the window finder reads for its colour checks. The flat route has no smoothed
    // photographic layer and does not need one: its colours are already flat.
    smooth: rgba,
    surfaces: { what, horizon: 0, skyShare: 0 },
    regions: st.regions,
    outlinePixels: st.outlinePixels,
    style: 'flat',
  };
}

export { outlineOf, voidOf };
