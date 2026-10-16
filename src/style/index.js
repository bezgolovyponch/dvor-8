// THE STYLE — defined and constructed BEFORE any photograph is converted.
//
// This module is the single source of the look. Every number here was MEASURED from the creator's accepted frame
// (reference/v10a-target-hi.webp, '10a УЛИЦА · Прага · 288×512 · PX = 2') unless marked CHOICE. The conversion of a
// photograph is the act of applying THIS style to it; if a converted frame does not conform to these values, the
// conversion is wrong - not the style.
//
// The style has six parts, in the order the picture is built:
//   1. GROUND   the photograph's own pixels, 5x5 area mean, through the palette (roads, markings, cars, people)
//   2. SKY      one flat plane + white clouds with flat bottoms, in the region the photograph says is sky
//   3. FACADE   a flat plane in ONE family's tones + a regular window grid at the pitch measured from the photograph
//   4. WINDOW   the sprite: light frame, mid glass, pale sill - destroyable, never outlined
//   5. OUTLINE  only the aimed, picked or damaged thing, as its silhouette
//   6. HUD      score · осталось · РАЗБИТО n · danger meter · the bar (info, weapon, disaster, throw)
export const STYLE = {
  version: 'v10a',
  canvas: { w: 288, h: 512, scale: 2 },              // MEASURED: the accepted frame's own label
  block: 5,                                          // MEASURED: 1440x2560 / 288x512 = 5.00 exactly, no crop

  palette: {
    size: 50,                                        // 8 ramps x 6 tones + outline + void
    skyRamp: { hue: 209, sat: 0.75 },                // MEASURED: accepted sky rgb(77,156,232) = hue 209, sat 0.77
    skyTone: [47, 131, 224],                         // the tone the plane lands on after conversion
    cloud: [255, 255, 255],                          // MEASURED: the accepted clouds are PURE WHITE
    cloudShade: [197, 222, 242],                     // one step down: the puff's underside
    neutralRamps: { stone: { hue: 268, sat: 0.10 }, metal: { hue: 252, sat: 0.09 } },
    grey: [89, 85, 95],                              // MEASURED: the accepted frame's dominant grey, warmth -6
    outline: [11, 0, 24],                            // MEASURED: identical in both frames - one family
  },

  sky: { flat: true, dither: false, clouds: 'flat-bottomed puffs', cloudMin: 4, cloudMax: 9, insetFromSkyline: 3 },

  facade: {
    plane: 'one family, flat, no photographic texture inside the wall',   // the rule the piece asserts
    grid: 'regular, pitch measured from the photograph\'s own openings',
    windowRows: 'floor by floor', checkerboard: 'where the photograph shows alternating bays',
  },

  window: { sprite: ['sill', 'frame', 'lip', 'glass'], destroyable: true, outlined: false },

  outline: { kinds: ['building', 'car'], when: ['aimed', 'picked', 'damaged'], never: ['window', 'person'] },

  hud: { left: ['очки', 'разбито'], right: ['осталось', 'опасность'], bar: ['info', 'weapon', 'disaster', 'throw'] },
};

/** The style as a checklist a converted frame can be measured against. */
export const CONFORMANCE = [
  ['sky hue', (m) => Math.abs(m.skyHue - STYLE.palette.skyRamp.hue) <= 8],
  ['sky saturation', (m) => Math.abs(m.skySat - STYLE.palette.skyRamp.sat) <= 0.18],
  ['clouds pure white', (m) => m.cloudWhite === true],
  ['grey warmth and lightness', (m) => Math.abs(m.greyWarmth - (STYLE.palette.grey[0] - STYLE.palette.grey[2])) <= 14 && Math.abs(m.greyLight - 0.35) <= 0.10],
  ['sky sits where the photograph\'s sky is', (m) => m.skyIoU >= 0.60],
  ['no wash: many tones, none dominant', (m) => m.tones >= 12 && m.largestNonSky <= 0.35],
  ['facade carries no foreign pixel', (m) => m.foreignInWall === 0],
  ['outlines only on buildings and cars', (m) => m.outlinedWindows === 0],
];
