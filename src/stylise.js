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

import { liftRegister } from './style/register.js';   // the style's own register, applied AFTER the conversion
import { trace } from './vector.js';
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
  // wall, and the paint refuses to land on it. Both read `what`.
  //
  // WHAT CHANGED IN REVISION 2, and why this reads a role instead of a ramp name. The route used to force every
  // bright top-of-frame region onto the sky ramp, so "the ramp is sky" and "this is sky" were the same
  // sentence. It no longer forces it: a grey overcast sky is painted from the metal ramp and a sunset cloud
  // bank from the stone ramp, because forcing them blue was the bug that turned a sunset sky blue. The sky is
  // therefore carried explicitly as a ROLE in `regions.role`, and this map reads that. Re-deriving it here from
  // a colour rule would be a second classifier, free to disagree with the painter.
  const out = st.palette.length - 2;
  const what = new Uint8Array(n);
  const role = st.regions && st.regions.role;
  const SKY_ROLE = 1;
  for (let i = 0; i < n; i += 1) {
    if (role) { what[i] = role[st.regions.label[i]] === SKY_ROLE ? SKY : OTHER; continue; }
    const k = st.idx[i];
    if (k >= out) { what[i] = OTHER; continue; }
    const ramp = RAMPS[(k / STEPS) | 0];
    what[i] = ramp && ramp.name === 'sky' ? SKY : OTHER;
  }

  // THE STYLE'S REGISTER, APPLIED LAST. The conversion copies the photograph's own darkness; the style (measured
  // from the accepted frame: dominant grey rgb(89,85,95), lightness 0.35) uses the palette's MIDDLE register and
  // reserves the darkest tones for outlines. This is the last write to the frame, so nothing can undo it.
  liftRegister(st.idx, { protect: st.windowsPx instanceof Set ? st.windowsPx : new Set() });
  return {
    idx: st.idx,
    palette: st.palette,
    // `smooth` is what the window finder reads for its colour checks. The flat route has no smoothed
    // photographic layer and does not need one: its colours are already flat.
    smooth: rgba,
    surfaces: { what, horizon: 0, skyShare: 0 },
    regions: st.regions,
    // THE SURFACES BEHIND THE THINGS, for the environment's own damage (world.js): flat.js's region map, the
    // ramp each region is painted from (which is what it is made of — see the toughness table), and each
    // region's role. Handed straight through: nothing here classifies anything, it carries a decision already
    // made by the painter.
    env: { label: st.regions.label, rampOf: st.regions.rampOf, role: st.regions.role, nr: st.regions.nr,
      rampName: RAMPS.map((r) => r.name) },
    outlinePixels: st.outlinePixels,
    style: 'flat',
  };
}

/**
 * THE VECTOR ROUTE (r9), behind the same contract as the flat one so the game does not know which it is using.
 *
 * Why it exists: the flat route paints per pixel, and per pixel it is unstable - it dithers everything, merges
 * facades of similar tone, and leaves pixel-jagged borders. This route refuses to paint per pixel: it finds the
 * sky, finds the shapes, gives each shape ONE colour, straightens the borders with a traced-and-simplified
 * polygon, places designed clouds, and draws one line along the skyline. Measured on the three photographs it
 * cuts stray pixels from 13-15% to 0.04-0.09%, specks under four pixels from 18-19% to 0.22-0.36%, and blobs
 * per thousand pixels from 19-23 to 2.0-4.2, at 40-110 ms.
 *
 * What it is NOT yet: facade windows are found by a local-contrast test that gets one or two per photograph
 * where a street facade holds dozens, and the sky's colour is the photograph's own blue core rather than a
 * designed one. Both are honest open items, recorded in docs/environment-style.md.
 */
export function styliseVector(rgba, w, h, opts = {}) {
  const st = trace(rgba, w, h, opts);
  const n = w * h;
  const out = st.palette.length - 2;
  // The materials this route works in: sky, foliage, everything else, plus the windows it found, which the game
  // turns into things with hit points.
  const what = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) what[i] = st.idx[i] === out ? OTHER : (st.skyline[i % w] > ((i / w) | 0) ? SKY : OTHER);
  const label = new Int32Array(n).fill(-1);
  const regions = { label, rampOf: [], role: new Uint8Array(0), nr: 0, size: [], box: [], cx: [], cy: [] };
  // THE STYLE'S REGISTER, APPLIED LAST. The conversion copies the photograph's own darkness; the style (measured
  // from the accepted frame: dominant grey rgb(89,85,95), lightness 0.35) uses the palette's MIDDLE register and
  // reserves the darkest tones for outlines. This is the last write to the frame, so nothing can undo it.
  liftRegister(st.idx, { protect: st.windowsPx instanceof Set ? st.windowsPx : new Set() });
  return {
    idx: st.idx, palette: st.palette, smooth: rgba,
    surfaces: { what, horizon: 0, skyShare: st.skyShare },
    regions, env: null,
    windows: st.windows || [],
    structures: st.structures || [],
    outlinePixels: st.linePixels,
    stats: st,
    style: 'vector',
  };
}

export { outlineOf, voidOf };
