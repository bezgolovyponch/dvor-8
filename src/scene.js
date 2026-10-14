// THE SCENE: the thing the renderer draws, in the order it is drawn.
//
// WHY THIS MODULE EXISTS. For the whole of this project the frame was built by passes writing into one pixel buffer:
// a shape pass, then a sky pass, then a wall pass, then a foliage pass, then outlines - each fighting the last, and
// each able to undo what the one before it did. That is why ten delivery lines could pass while the screen was a
// posterised photograph: the picture was never a thing, it was the residue of an order of operations.
//
// A scene is the thing. It holds the picture AS PARTS, each part carrying the method it must be drawn by, and
// `render()` walks the parts in one fixed order and no other. The order is the composition:
//
//   1 GROUND   - the photograph's own layout, pixelated. Never redrawn: a lane marking stays where it is (R14).
//   2 SKY      - designed: one plane, a horizon band, designed clouds. The photograph supplies only WHERE the sky is.
//   3 WALLS    - designed: one plane per facade (2-3 tones of its own family) plus DRAWN window sprites on the
//                facade's own column and floor pitch. The photograph supplies the layout, never the grain.
//   4 FOLIAGE  - designed: one drawn mass per connected tree, two or three greens, drawn boundary.
//   5 OBJECTS  - faithful: the thing's own pixels, cut out, with ONE silhouette outline from the owner map.
//
// A kind whose source is the photograph may not be smoothed; a kind whose source is the design may not keep the
// photograph's pixels. That is the whole rule, and it is now checkable part by part instead of only in the average.

export const ORDER = ['ground', 'sky', 'walls', 'foliage', 'objects'];

export function makeScene(w, h) {
  return {
    w, h,
    ground: null,                 // Uint8Array mask, or null when the whole frame is drawn
    sky: null,                    // { mask, tone, band, clouds }
    walls: [],                    // [{ mask, tones: [shaded, plain, lit], windows: [{ x, y, w, h }] }]
    foliage: [],                  // [{ px, tones: [shaded, plain, lit] }]
    objects: [],                  // [{ id, px, outline }]
  };
}

/** Paints a scene into `idx`, in the one order that composes the picture. */
export function render(scene, idx, { paintGround, paintSky, paintWalls, paintFoliage, paintObjects }) {
  if (scene.ground && paintGround) paintGround(scene, idx);
  if (scene.sky && paintSky) paintSky(scene, idx);
  for (const wall of scene.walls) if (paintWalls) paintWalls(scene, idx, wall);
  for (const mass of scene.foliage) if (paintFoliage) paintFoliage(scene, idx, mass);
  for (const thing of scene.objects) if (paintObjects) paintObjects(scene, idx, thing);
  return idx;
}

/** The scene's own summary, so a check can ask what the picture is made of rather than only how flat it is. */
export function census(scene) {
  const px = (m) => { let n = 0; for (const v of m) if (v) n += 1; return n; };
  return {
    ground: scene.ground ? px(scene.ground) : 0,
    sky: scene.sky ? px(scene.sky.mask) : 0,
    walls: scene.walls.length,
    wallPx: scene.walls.reduce((t, w2) => t + px(w2.mask), 0),
    windows: scene.walls.reduce((t, w2) => t + w2.windows.length, 0),
    foliage: scene.foliage.length,
    foliagePx: scene.foliage.reduce((t, f) => t + f.px.length, 0),
    objects: scene.objects.length,
    objectPx: scene.objects.reduce((t, o) => t + o.px.length, 0),
  };
}
