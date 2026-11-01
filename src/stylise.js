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
import { reduceToWorkingPalette } from './pieces/working-palette.js';   // v13 S2: the frame's working palette (a piece)
import { trace, entryFor } from './vector.js';
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
  // THE BUILDINGS ARE PROTECTED FROM THE GROUND'S LIFT. Without this the tower's own dark plane was lifted away
  // (match-check: "dark plane dominates" 46% -> 3%) because in a tower's columns the skyline is row 0.
  const protectReg = st.windowsPx instanceof Set ? new Set(st.windowsPx) : new Set();
  // THE GROUND KEEPS ITS OWN TWO PLANES. The register lift below exists so a converted frame's asphalt does not land
  // one rung too low; it lifts tones 0..1 below the horizon, which flattens the road pass's dark plane onto its light
  // one (measured at T+127 on the dark split: 82.5% of the ground box in ONE tone). The operator's reference frame's
  // own ground is two planes - 45.6% at rgb(98,94,104) and 30.9% at rgb(74,70,80), luma 73, BELOW the accepted
  // frame's register - so the lift is the accepted frame's style here, not the desired frame's (D24's class). The
  // road pass's decision travels in `st.ground` and is protected from the lift.
  if (st.ground) for (let p2 = 0; p2 < n; p2 += 1) if (st.ground[p2] >= 0) protectReg.add(p2);
  if (st.buildings) for (let p2 = 0; p2 < st.buildings.length; p2 += 1) if (st.buildings[p2]) protectReg.add(p2);
  liftRegister(st.idx, {
    protect: protectReg,
    horizon: st.horizon || st.skyline || null, w: st.skyline ? st.skyline.length : 0,
  });
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

  // Build proper regions from trace output (wallParts, structures, sky, foliage) so the game
  // reads a region list identical in contract to the flat route.
  const label = new Int32Array(n).fill(-1);
  const rampOf = [];
  const role = [];
  const size = [];
  const box = [];
  const cx = [];
  const cy = [];
  const luma = [];
  const ink = [];
  const toneOf = [];

  // Region roles matching flat.js: 0 = other/ground, 1 = sky, 2 = foliage, 3 = pane/window
  const ROLE_OTHER = 0;
  const ROLE_SKY = 1;
  const ROLE_FOLIAGE = 2;
  const ROLE_PANE = 3;

  let regionId = 0;

  // Sky region (from sky mask and skyline)
  if (st.skyN && st.skyN > 0) {
    const skyPixels = [];
    for (let i = 0; i < n; i += 1) {
      const y = (i / w) | 0, x = i % w;
      if (y < st.skyline[x]) { skyPixels.push(i); }
    }
    if (skyPixels.length > 0) {
      let minX = w, maxX = 0, minY = h, maxY = 0;
      let sumLuma = 0;
      for (const p of skyPixels) {
        const x = p % w, y = (p / w) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        label[p] = regionId;
        const r = rgba[p * 4], g = rgba[p * 4 + 1], b = rgba[p * 4 + 2];
        sumLuma += r * 0.299 + g * 0.587 + b * 0.114;
      }
      rampOf.push(st.ramps?.sky ?? 0);
      role.push(ROLE_SKY);
      size.push(skyPixels.length);
      box.push([minX, minY, maxX + 1, maxY + 1]);
      cx.push((minX + maxX) / 2);
      cy.push((minY + maxY) / 2);
      luma.push(sumLuma / skyPixels.length);
      ink.push(false);
      // toneOf: sky is typically painted at tone 3-5 (lighter tones), compute from mean luma
      const skyTone = Math.min(5, Math.max(0, Math.round((sumLuma / skyPixels.length - 100) / 40)));
      toneOf.push(skyTone);
      regionId += 1;
    }
  }

  // Building/wall regions from wallParts (facade planes)
  if (st.wallParts) {
    for (const part of st.wallParts) {
      if (!part.pixels || part.pixels.length < 40) continue;
      let sumLuma = 0;
      let sumIdx = 0;
      for (const p of part.pixels) {
        label[p] = regionId;
        const r = rgba[p * 4], g = rgba[p * 4 + 1], b = rgba[p * 4 + 2];
        sumLuma += r * 0.299 + g * 0.587 + b * 0.114;
        sumIdx += st.idx[p];
      }
      const meanIdx = sumIdx / part.pixels.length;
      rampOf.push(st.ramps?.wall ?? 1);
      role.push(ROLE_OTHER); // walls are "other" role (0) in flat.js
      size.push(part.pixels.length);
      box.push([part.x, part.y, part.x + part.w, part.y + part.h]);
      cx.push(part.x + part.w / 2);
      cy.push(part.y + part.h / 2);
      luma.push(sumLuma / part.pixels.length);
      ink.push(false);
      // toneOf: extract tone from mean palette index (index % STEPS)
      toneOf.push(Math.floor(meanIdx) % 6);
      regionId += 1;
    }
  }

  // Foliage regions from structures (if they have foliage role) or separate foliage data
  // Check structures for foliage-like masses
  if (st.structures) {
    for (const struct of st.structures) {
      if (!struct.pixels || struct.pixels.length < 14) continue;
      // Heuristic: check if this structure is foliage by mean color
      let sumR = 0, sumG = 0, sumB = 0;
      let sumIdx = 0;
      for (const p of struct.pixels) {
        sumR += rgba[p * 4]; sumG += rgba[p * 4 + 1]; sumB += rgba[p * 4 + 2];
        sumIdx += st.idx[p];
      }
      const meanR = sumR / struct.pixels.length;
      const meanG = sumG / struct.pixels.length;
      const meanB = sumB / struct.pixels.length;
      const meanIdx = sumIdx / struct.pixels.length;
      const sat = Math.max(meanR, meanG, meanB) ? (Math.max(meanR, meanG, meanB) - Math.min(meanR, meanG, meanB)) / Math.max(meanR, meanG, meanB) : 0;
      const isFoliage = sat > 0.30 && meanG > meanR && meanG > meanB;

      let sumLuma = 0;
      for (const p of struct.pixels) {
        if (label[p] === -1) label[p] = regionId; // only label unassigned
        const r = rgba[p * 4], g = rgba[p * 4 + 1], b = rgba[p * 4 + 2];
        sumLuma += r * 0.299 + g * 0.587 + b * 0.114;
      }
      rampOf.push(isFoliage ? (st.ramps?.foliage ?? 2) : (st.ramps?.wall ?? 1));
      role.push(isFoliage ? ROLE_FOLIAGE : ROLE_OTHER);
      size.push(struct.pixels.length);
      box.push([struct.x, struct.y, struct.x + struct.w, struct.y + struct.h]);
      cx.push(struct.x + struct.w / 2);
      cy.push(struct.y + struct.h / 2);
      luma.push(sumLuma / struct.pixels.length);
      ink.push(false);
      toneOf.push(Math.floor(meanIdx) % 6);
      regionId += 1;
    }
  }

  // Ground/other region for remaining unlabelled pixels
  const otherPixels = [];
  let sumLumaOther = 0;
  let sumIdxOther = 0;
  for (let i = 0; i < n; i += 1) {
    if (label[i] === -1) {
      label[i] = regionId;
      otherPixels.push(i);
      const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
      sumLumaOther += r * 0.299 + g * 0.587 + b * 0.114;
      sumIdxOther += st.idx[i];
    }
  }
  if (otherPixels.length > 0) {
    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (const p of otherPixels) {
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    rampOf.push(st.ramps?.wall ?? 1);
    role.push(ROLE_OTHER);
    size.push(otherPixels.length);
    box.push([minX, minY, maxX + 1, maxY + 1]);
    cx.push((minX + maxX) / 2);
    cy.push((minY + maxY) / 2);
    luma.push(sumLumaOther / otherPixels.length);
    ink.push(false);
    toneOf.push(Math.floor(sumIdxOther / otherPixels.length) % 6);
    regionId += 1;
  }

  const regions = { label, rampOf, role: new Uint8Array(role), nr: regionId, size, box, cx, cy, luma, ink, toneOf };
  // THE STYLE'S REGISTER, APPLIED LAST. The conversion copies the photograph's own darkness; the style (measured
  // from the accepted frame: dominant grey rgb(89,85,95), lightness 0.35) uses the palette's MIDDLE register and
  // reserves the darkest tones for outlines. This is the last write to the frame, so nothing can undo it.
  // THE BUILDINGS ARE PROTECTED FROM THE GROUND'S LIFT. Without this the tower's own dark plane was lifted away
  // (match-check: "dark plane dominates" 46% -> 3%) because in a tower's columns the skyline is row 0.
  const protectReg = st.windowsPx instanceof Set ? new Set(st.windowsPx) : new Set();
  // THE GROUND KEEPS ITS OWN TWO PLANES. The register lift below exists so a converted frame's asphalt does not land
  // one rung too low; it lifts tones 0..1 below the horizon, which flattens the road pass's dark plane onto its light
  // one (measured at T+127 on the dark split: 82.5% of the ground box in ONE tone). The operator's reference frame's
  // own ground is two planes - 45.6% at rgb(98,94,104) and 30.9% at rgb(74,70,80), luma 73, BELOW the accepted
  // frame's register - so the lift is the accepted frame's style here, not the desired frame's (D24's class). The
  // road pass's decision travels in `st.ground` and is protected from the lift.
  if (st.ground) for (let p2 = 0; p2 < n; p2 += 1) if (st.ground[p2] >= 0) protectReg.add(p2);
  if (st.buildings) for (let p2 = 0; p2 < st.buildings.length; p2 += 1) if (st.buildings[p2]) protectReg.add(p2);
  // ---- THE OBJECTS KEEP THEIR OWN COLOUR (bounded experiment) -------------------------------------------
  //
  // The reduction paints a low-saturation object pixel with its SHAPE's mean colour (vector.js:607), so a white
  // car's body comes out at the tone of the road it stands on, and the register lift below raises what is left of
  // it. This restores, inside the ONE source-derived region that already exists - the scene parse's own `car`
  // mask - each interior pixel's own colour, mapped through the quantiser this render path already uses
  // (entryFor, vector.js:72), so the indices written are the active renderer's own and no second palette is
  // involved.
  //
  // THE MASK IS AN INTERIOR MASK, NOT A SILHOUETTE: it is a nearest upsample of the model's low-resolution mask,
  // so its border is stair-stepped and it leaks onto road pixels between and around vehicles. It is used exactly
  // as it is - never widened, never thresholded - and it never decides geometry: the thing's pixels, its outline
  // and its owner map are untouched. Outline and void entries are preserved, and every restored pixel is added to
  // `protect` so the register lift cannot touch it. With no usable mask, the frame is left exactly as it was.
  const carMask = opts.parse && opts.parse.masks ? opts.parse.masks.car : null;
  if (carMask && carMask.length === n) {
    const outlineIdx = st.palette.length - 2, voidIdx = st.palette.length - 1;
    for (let p2 = 0; p2 < n; p2 += 1) {
      if (!carMask[p2]) continue;
      const v = st.idx[p2];
      if (v === outlineIdx || v === voidIdx) continue;       // the established outline and void stay
      st.idx[p2] = entryFor(st.palette, rgba[p2 * 4], rgba[p2 * 4 + 1], rgba[p2 * 4 + 2]);
      protectReg.add(p2);
    }
  }
  liftRegister(st.idx, {
    protect: protectReg,
    horizon: st.horizon || st.skyline || null, w: st.skyline ? st.skyline.length : 0,
    // THE GROUND'S OWN LIFT, MEASURED AGAINST THE ACCEPTED FRAME. Reference road region: luma 90, 46.6% dark.
    // Ours: luma 121, 6.1% dark - the ground climbed three tones (the ladder's default) and the accepted frame's
    // asphalt sits at the bottom of its family. One tone, and the road lands where the reference measures it.
    groundMaxTone: 2,
  });
  // THE WORKING PALETTE IS THE LAST WRITE TO THE FRAME (v13 S2/S3, the line V1 exists for). It has to be last: the
  // car-restoration pass above writes `entryFor` tones and would reintroduce the whole table (measured at T+129:
  // 43 tones with the reduction inside `trace`, 21 with it here).
  const working = reduceToWorkingPalette(st.idx, st.palette, 22);
  if (typeof window !== 'undefined') window.__workingPalette = working;

  // Build env object matching flat route contract: label, rampOf, role, nr, rampName
  // Match flat.js RAMPS order: sky, foliage, earth, stone, metal, warm, dusk, sand
  const rampNames = ['sky', 'foliage', 'earth', 'stone', 'metal', 'warm', 'dusk', 'sand'];
  const env = {
    label: regions.label,
    rampOf: regions.rampOf,
    role: regions.role,
    nr: regions.nr,
    rampName: rampNames
  };

  return {
    idx: st.idx, palette: st.palette, smooth: rgba,
    surfaces: { what, horizon: 0, skyShare: st.skyShare },
    regions, env,
    windows: st.windows || [],
    structures: st.structures || [],
    outlinePixels: st.linePixels,
    stats: st,
    style: 'vector',
  };
}

export { outlineOf, voidOf };
