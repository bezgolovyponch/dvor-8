// THE ENGINE BRIDGE — the operator's engine as this app's converter.
//
// `src/ref/engine.js` is the operator's class, byte-exact apart from its header (tools/engine-check.mjs proves the
// sha256 and the FNV of its own scenes). This module runs it on a photograph + an ANNOTATION (the reference's S7
// contract: `{ gy, h0, buildings:[{quad, clip, kind}], cars:[{box, view}] }`) and returns what the app needs:
//
//   idx       the frame as palette indices (the engine's own `clean`, 288x512)
//   palette   the engine's own 50-entry master table (the app's `flat.js` is the same table)
//   regions   the app's own region shape: one per ANNOTATED BUILDING, one per CAR, one per PANE (`WN`), built from
//             the engine's per-pixel id map `S.ID` - so the objects ARE the engine's objects, not a re-detection
//   readout   the engine's own stage numbers (FNV, working palette, windows, per-facade grid/panes) - the numbers the
//             plan gates the frame on (docs/PLAN-REAL-PRODUCT.md §2)
//
// This is the "first half" the project was missing: the geometry is GIVEN (annotation), the conversion is the
// operator's, and nothing in between infers what it was told.

/** The region box of a pixel list. */
const boxOf = (px, w) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const p of px) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};

/**
 * Build the frame and the objects with the operator's engine.
 * @param {object} o
 * @param {string} [o.src]      the photograph's URL (preferred: the engine's S0 averages the ORIGINAL pixels)
 * @param {Uint8ClampedArray} [o.rgba] @param {number} o.w @param {number} o.h   fallback source, the game grid
 * @param {object} o.scene      the annotation, the reference's S7 shape
 * @param {number} [o.seed]
 */
export async function engineFrame({ img: given = null, src = null, rgba = null, w = 288, h = 512, scene, seed = 8 }) {
  const { Component } = await import('./engine.js');
  let img;
  if (given) img = given;                                   // the decoded photograph, the reference's own input
  else if (src) { img = new Image(); img.src = src; await img.decode(); }
  else {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
    img = new Image(); img.src = cv.toDataURL('image/png'); await img.decode();
  }
  const c = new Component();
  c.tok += 1; c.S = null;
  const sc = JSON.parse(JSON.stringify(scene));
  const t0 = performance.now();
  c.build(img, sc, seed);
  const ms = Math.round(performance.now() - t0);
  const idx = Uint8Array.from(c.clean);
  const W = c.W, H = c.H, N = W * H;

  // ---- the objects, from the engine's own id map ---------------------------------------------------------------
  const buildingIds = new Set((sc.buildings || []).map((b) => b.id));
  const carIds = new Set(c.CARIDS || []);
  const byId = new Map();
  for (let k = 0; k < N; k += 1) {
    const id = c.S.ID[k] | 0;
    if (!id) continue;
    let a = byId.get(id); if (!a) byId.set(id, a = []);
    a.push(k);
  }
  const regions = [];
  for (const [id, px] of byId) {
    // THE ENGINE'S OWN TARGETING: `TARGETS = sc.buildings.map(id).concat(CARIDS)` (engine line 267). Anything else the
    // id map carries is an ANNOTATED PROP (the tower scene's ФОНАРЬ id 40, ТРАМВАЙНЫЙ СТОЛБ id 41) - the reference
    // explicitly does not make props targets, and counting them made the HUD read 10 where the operator's is 8.
    const kind = buildingIds.has(id) ? 'building' : carIds.has(id) ? 'car' : null;
    if (!kind) continue;
    const b = boxOf(px, W);
    regions.push({
      id: regions.length, kind, label: kind === 'car' ? 'машина' : (kind === 'building' ? 'дом' : 'вещь'), score: 1,
      pixels: Int32Array.from(px), x: b.x, y: b.y, w: b.w, h: b.h, cx: b.cx, cy: b.cy,
      area: px.length / N, fill: 0.9, hp: kind === 'car' ? 2 : 3, hits: 0, seen: true, gone: false,
      engineId: id,
    });
  }
  // panes: a window is the building's piece, breakable, and NOT counted (the engine's own TARGETS = buildings + cars)
  for (const ww of (c.WN || [])) {
    if (!ww || !ww.pix || ww.pix.length < 4) continue;
    const b = boxOf(ww.pix, W);
    regions.push({
      id: regions.length, kind: 'window', label: 'окно', score: 1, counted: false,
      pixels: Int32Array.from(ww.pix), x: b.x, y: b.y, w: b.w, h: b.h, cx: b.cx, cy: b.cy,
      area: ww.pix.length / N, fill: 0.7, hp: 1, hits: 0, seen: false, gone: false, engineBid: ww.bid,
    });
  }
  // THE ENGINE'S PALETTE IS `RGB` (an array of [r,g,b]) - `PAL` is the packed 32-bit form the engine blits with. The
  // app renders `palette[i]` as an [r,g,b] triple, so the bridge hands over `RGB`; feeding `PAL` (numbers) produced a
  // black frame with a correct idx buffer (measured: the canvas was black while the readout said FNV 7204df6f).
  const palette = (c.RGB || []).map(([r, g, b]) => [r, g, b]);
  return {
    idx, palette, regions, ms, component: c,
    readout: {
      fnv: c.fnv(c.clean), palette: c.SUB.length, windows: (c.WN || []).length, targets: (c.TARGETS || []).length,
      facades: (c.REP || []).map((r) => ({ name: r.name, kind: r.kind, grid: `${r.lu}x${r.lv}`, nw: r.nw, T: r.T, cover: r.cover })),
      gy: c.SC.gy, h0: c.SC.h0, ms,
    },
  };
}

/** The annotation for a named reference scene, straight from the engine's own SCENES. */
export async function referenceScene(label) {
  const { Component } = await import('./engine.js');
  const c = new Component();
  const i = (c.SCENES || []).findIndex((s) => s.id === label);
  return i < 0 ? null : JSON.parse(JSON.stringify(c.SCENES[i]));
}
