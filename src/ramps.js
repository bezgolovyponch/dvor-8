// One palette for every yard. This is what makes two different photographs look like the same game.
//
// WHY A FIXED PALETTE. A palette cut from each photograph (median cut, the earlier build) reproduces the
// photograph: an overcast yard comes out grey-brown, a sunset yard orange, and nothing ties them together.
// Hotline Miami, the reference the creator named, is read as "pixel art with a high-contrast colour palette"
// (Wikipedia) — one palette, the same in every level. A game look is a fixed set of colours that every
// picture is forced into, not a summary of each picture.
//
// HOW IT IS BUILT. Pixel-art palettes are made of RAMPS: one hue taken from dark to light, with the hue
// turning as it goes — "a good color ramp should also apply hue-shifting" (Slynyrd, Pixelblog 1, a standard
// practitioner reference; seen through a search summary, the page did not open). The convention: shadows
// turn toward blue-purple, lights toward yellow, so even a grey wall gets cool shadows and warm lights. That
// is also the look this game already had (purple shadows, warm whites; docs/style.md D2), now made a rule.
//
// The hues were set from MEASUREMENT, not by eye: on the test yards overcast foliage sits at OKLab hue 108-117
// with chroma 0.086, so the green ramp is centred at 124 and yellow at 88, putting the boundary below the
// foliage; a clear sky measured L 0.92, chroma 0.076, which no three-step ramp reached (docs/pixel-pipeline.md).
//
// The ramps are laid out in OKLab/OKLCH (Ottosson 2020), where equal steps of L look like equal steps of
// brightness and a hue can be turned without the lightness changing. Numbers are CHOICE, set by looking at
// the three test yards (docs/pixel-pipeline.md).
//
// Seven chromatic families of three steps, a fourth light step on blue for a clear sky, one neutral ramp of
// five, and one deep shadow: 28, the same count
// the rest of the game was built around (palette.js COLOURS), so nothing downstream changes size.

export const FAMILIES = [
  // name,     hue°  chroma at the middle step
  ['red',      25,   0.20],
  ['orange',   58,   0.17],
  ['yellow',   88,   0.16],
  ['green',   124,   0.16],
  ['teal',    200,   0.11],
  ['blue',    260,   0.15],
  ['pink',    338,   0.19],
];
const STEPS = [0.34, 0.53, 0.75];          // L of the three steps of a chromatic ramp
const CHROMA = [0.80, 1.0, 0.85];          // chroma of each step relative to the family's
const SHIFT = [18, 8];                     // degrees the dark step turns toward purple, the light toward yellow.
                                           // The light turn is the smaller: at 18° the light steps of yellow,
                                           // orange and green all converged on the same tan
const COOL = 290, WARM = 85;               // where shadows and lights turn to
const NEUTRAL = [0.13, 0.30, 0.48, 0.68, 0.91];         // the grey ramp: asphalt, concrete, cloud
const SKY = [0.86, 0.10, 245];                          // a fourth, light step on the blue ramp: clear sky
const DEEP = [0.21, 0.09, 300];            // the deep purple shadow every ramp falls into

// OKLab (Ottosson 2020), constants as published.
const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = (v) => { const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(c * 255))); };
const LIN = Float64Array.from({ length: 256 }, (_, i) => lin(i));
export function toOklab(r, g, b) {
  const R = LIN[r | 0], G = LIN[g | 0], B = LIN[b | 0];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
export function fromOklab(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186168 * m + 1.7076147010 * s)];
}
// Is an OKLab colour inside sRGB? Used to pull chroma in until it is, so no ramp step is clipped into a
// different hue.
function inGamut(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186168 * m + 1.7076147010 * s];
  return rgb.every((v) => v >= -0.001 && v <= 1.001);
}
export function lch(L, C, h) {
  let c = C;
  const rad = (h * Math.PI) / 180;
  while (c > 0 && !inGamut(L, c * Math.cos(rad), c * Math.sin(rad))) c -= 0.005;
  return fromOklab(L, Math.max(0, c) * Math.cos(rad), Math.max(0, c) * Math.sin(rad));
}
// Turn hue h toward target t by up to d degrees, the short way round.
const toward = (h, t, d) => { const diff = ((t - h + 540) % 360) - 180; return h + Math.sign(diff) * Math.min(Math.abs(diff), d); };

/** The 28 colours, each with its family and step, darkest first. Pure and fixed. */
export function masterRamps() {
  const out = [];
  NEUTRAL.forEach((L, i) => {
    // the greys are not grey: cool and faintly purple in the dark, warm in the light
    const t = i / (NEUTRAL.length - 1);
    out.push({ rgb: lch(L, 0.035 - 0.015 * t, t < 0.5 ? 295 : 75), family: 'neutral', step: i });
  });
  out.push({ rgb: lch(...DEEP), family: 'deep', step: 0 });
  out.push({ rgb: lch(...SKY), family: 'blue', step: 3 });
  for (const [name, hue, chroma] of FAMILIES) {
    STEPS.forEach((L, i) => {
      const h = i === 0 ? toward(hue, COOL, SHIFT[0]) : i === 2 ? toward(hue, WARM, SHIFT[1]) : hue;
      out.push({ rgb: lch(L, chroma * CHROMA[i], h), family: name, step: i });
    });
  }
  const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return out.sort((a, b) => luma(a.rgb) - luma(b.rgb));
}
