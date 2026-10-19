// THE SCENE ANNOTATION — piece. Contract: the reference's own S7 format (a ground line, a horizon, building QUADS and
// car BOXES) → validated geometry the painter can use; and a quad → the facade's own pixel mask.
//
// WHY THIS IS THE MISSING PIECE. The reference's SPEC, stage S7 ("Detector contract"), in its own words:
//
//   "Objects arrive as labelled shapes: facade {quad of 4 corners TL, TR, BR, BL; optional clip polygon; kind
//    auto|curtain|checker|masonry}, vehicle {box x, y, w, h; ...}. People and trees are never annotated: they stay photo
//    pixels. Shapes come from manual annotation or from any detector (...). Everything after this point is
//    deterministic."
//
// `tools/v13/engine-v13.txt` then carries the actual annotations as `SCENES`: `{ gy, h0, buildings:[{quad, clip,
// kind}], cars:[{box, view}] }`. That is the half of the converter that is NOT perception - it is GIVEN - and it is
// exactly what this project never had: our pipeline inferred facades from a semantic parse and silently lost them
// when the parse was thin (b.jpg: 69 window regions, 0.0% glass, a 432x45 px pitch on a 288-px frame).
//
// So the annotation is now a brick with the reference's own contract: whatever produces it (the player's tap, a
// detector, or a file), a VALID annotation turns into facade instances through `annotationFacades`, and an invalid one
// is refused instead of being divided by.
//
// The validation is the reference's format plus the arithmetic a painter needs: a quad must lie in the frame, must not
// be degenerate, and must be large enough to hold a lattice (>= 12 x 12 px - below that a pane would be under 3 px,
// which the outline rule and the hit test both refuse).

/** Point-in-polygon (even-odd), for the quad → mask. */
const inside = (poly, x, y) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

/**
 * Validate an annotation in the reference's S7 shape.
 * @returns {{ ok:boolean, errors:string[], buildings:object[], cars:object[] }}
 */
export function validateAnnotation(ann, w, h) {
  const errors = [];
  if (!ann || typeof ann !== 'object') return { ok: false, errors: ['the annotation is not an object'], buildings: [], cars: [] };
  const gy = Number(ann.gy), h0 = Number(ann.h0);
  if (!Number.isFinite(gy) || gy <= 0 || gy > h) errors.push(`gy must be a row inside the frame (got ${ann.gy})`);
  // h0 is OPTIONAL IN THE REFERENCE'S OWN DATA: three of its four scenes omit it (`sky: 'auto'` measures the horizon
  // from the sky region at S6). Validated only when present - a stricter rule would refuse the operator's own file.
  if (ann.h0 != null && (!Number.isFinite(h0) || h0 <= 0 || h0 > h)) errors.push(`h0 must be a row inside the frame (got ${ann.h0})`);
  const buildings = [], cars = [];
  for (const [i, b] of (Array.isArray(ann.buildings) ? ann.buildings : []).entries()) {
    const quad = Array.isArray(b && b.quad) ? b.quad : null;
    if (!quad || quad.length < 4) { errors.push(`building ${i}: a quad of 4 corners is required`); continue; }
    let bad = 0;
    for (const c of quad) {
      if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) { bad += 1; continue; }
      if (c[0] < 0 || c[1] < 0 || c[0] > w || c[1] > h) bad += 1;
    }
    if (bad) { errors.push(`building ${i}: ${bad} corner(s) outside the frame`); continue; }
    const xs = quad.map((c) => c[0]), ys = quad.map((c) => c[1]);
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    if (bw < 12 || bh < 12) { errors.push(`building ${i}: degenerate quad ${bw.toFixed(0)}x${bh.toFixed(0)} px (a lattice needs 12x12)`); continue; }
    buildings.push({ quad, clip: Array.isArray(b.clip) ? b.clip : null, kind: b.kind || 'auto', id: b.id ?? i + 1, name: b.name || '' });
  }
  for (const [i, c] of (Array.isArray(ann.cars) ? ann.cars : []).entries()) {
    const box = c && (c.box || c);
    if (!box || !Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.w) || !Number.isFinite(box.h)) { errors.push(`car ${i}: a box {x,y,w,h} is required`); continue; }
    if (box.w < 4 || box.h < 4) { errors.push(`car ${i}: degenerate box ${box.w}x${box.h} px`); continue; }
    if (box.x < 0 || box.y < 0 || box.x + box.w > w || box.y + box.h > h) { errors.push(`car ${i}: box outside the frame`); continue; }
    cars.push({ box, view: c.view || 'box' });
  }
  return { ok: errors.length === 0, errors, buildings, cars, gy: Number(ann.gy), h0: Number.isFinite(h0) && h0 > 0 ? h0 : null };
}

/** The pixels of a polygon (a quad, or a clip polygon) in frame space. */
export function quadPixels(w, h, poly) {
  const xs = poly.map((c) => c[0]), ys = poly.map((c) => c[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  const px = [];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) if (inside(poly, x + 0.5, y + 0.5)) px.push(y * w + x);
  return px;
}

/**
 * A validated annotation → the facade instances the painter takes (each with its own pixel mask and box).
 * This is the piece that turns "the operator's/player's annotation" into geometry the rest of the pipeline already
 * understands - the reference's S7 contract, productised.
 */
export function annotationFacades(ann, w, h) {
  const v = validateAnnotation(ann, w, h);
  const out = [];
  for (const b of v.buildings) {
    const poly = b.clip && b.clip.length >= 3 ? b.clip : b.quad;
    const pixels = quadPixels(w, h, poly);
    if (pixels.length < 200) continue;
    const xs = poly.map((c) => c[0]), ys = poly.map((c) => c[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys)));
    out.push({
      pixels,
      box: { x: x0, y: y0, w: Math.min(w - 1, Math.ceil(Math.max(...xs))) - x0, h: Math.min(h - 1, Math.ceil(Math.max(...ys))) - y0 },
      role: b.kind === 'checker' ? 'checker' : 'auto',
      quad: b.quad, clip: b.clip, annotated: true,
    });
  }
  return { facades: out, cars: v.cars, gy: Number(ann.gy), h0: Number(ann.h0), errors: v.errors };
}
