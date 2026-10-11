// The 8-bit palette, derived rather than hand-picked.
//
// The pinned environment standard gives the saturation band per depth layer:
//
//   Sky / far bg   20-30%      Distant     40-60%
//   Mid hills      60-80%      Foreground  80-100%
//
// "Skip this and your scene looks flat" — so the band is enforced in code. A colour asked for at the wrong
// saturation for its layer is pulled back into the band, which means a mistake in the drawing code cannot
// quietly flatten the scene.
//
// 8-bit here is a LOOK, not a limit set (project brief, Q3): the palette is quantised to the classic
// 3-bits-per-channel steps because that is what the era looks like, not because anything forbids more.

import { layerById } from './state.js';

// The era's quantisation: 8 levels per channel, which is what "8-bit colour" looks like on screen.
export const LEVELS = 8;
// Eight evenly spaced steps across 0..255: 0, 36, 73, 109, 146, 182, 219, 255. The first version divided
// 255 by (LEVELS - 1) and rounded before scaling, which produced values that were not on the ladder at all.
const LADDER = Array.from({ length: LEVELS }, (_, i) => Math.round((i * 255) / (LEVELS - 1)));
export const quantise = (v) => LADDER.reduce((best, step) => (Math.abs(step - v) < Math.abs(best - v) ? step : best), LADDER[0]);
export const onLadder = (v) => LADDER.includes(v);

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
function toHsl([r, g, b]) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}
function fromHsl([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

// ---- filters: a state of the viewer, expressed as a palette ---------------------------------------
//
// A filter changes how the yard LOOKS and nothing else. It is done the way the era did whole-screen
// effects: the picture is not redrawn, the palette it is looked up through is remapped. Every decision
// below is recorded with its source in docs/filters.md.
//
//   sat     multiplies saturation          light   multiplies lightness
//   toward  a colour the result is mixed toward, and by how much
//   drift   how far the hue wanders over time (colour cycling), and how fast
export const FILTERS = {
  sober:      { label: 'трезвый' },
  weed:       { label: 'трава',     sat: 1.30, light: 1.04, drift: 0.035, driftRate: 0.6 },
  alcohol:    { label: 'алкоголь',  sat: 0.75, toward: '#c8843a', mix: 0.18 },
  depression: { label: 'депрессия', sat: 0.15, light: 0.82, toward: '#3a4a6a', mix: 0.15 },
};

let current = FILTERS.sober;
let clock = 0;
export function setFilter(id, seconds = 0) {
  current = FILTERS[id] || FILTERS.sober;
  clock = seconds;
}

// The filter applied to one colour, as [r, g, b], NOT yet quantised.
function filtered(rgb) {
  const f = current;
  if (f === FILTERS.sober) return rgb;
  let [h, s, l] = toHsl(rgb);
  if (f.drift) h = (h + f.drift * Math.sin(clock * f.driftRate) + 1) % 1;
  s = Math.max(0, Math.min(1, s * (f.sat ?? 1)));
  l = Math.max(0, Math.min(1, l * (f.light ?? 1)));
  let out = fromHsl([h, s, l]);
  if (f.toward) {
    const to = hexToRgb(f.toward);
    out = out.map((v, i) => v + (to[i] - v) * f.mix);
  }
  return out;
}

// For the things that are still REAL — not yet scanned, so not on the 8-bit ladder — the filter applies
// without quantising. A filter is the viewer's state; it does not wait for the scan.
export const tint = (hex) => rgbToHex(filtered(hexToRgb(hex)));
export const saturationOf = (hex) => toHsl(hexToRgb(hex))[1];
export const lightnessOf = (hex) => toHsl(hexToRgb(hex))[2];

// Pull a colour into its layer's saturation band and quantise it. This is the one function every draw call
// goes through, so the atmospheric perspective cannot be forgotten at a call site.
export function forLayer(hex, layerId) {
  const band = layerById(layerId).sat;
  let [h, s, l] = toHsl(hexToRgb(hex));
  s = Math.max(band[0], Math.min(band[1], s));
  // The band first, the filter second, the ladder last: a filter may leave the band — that is what it is
  // for — but nothing may leave the ladder.
  const rgb = filtered(fromHsl([h, s, l])).map(quantise);
  return rgbToHex(rgb);
}

// A darker and a lighter form of the same colour, for the 1-2 shade steps the character standard allows
// for internal shading. No gradients: the era did not have them.
export function shade(hex, amount) {
  let [h, s, l] = toHsl(hexToRgb(hex));
  l = Math.max(0, Math.min(1, l + amount));
  return rgbToHex(fromHsl([h, s, l]).map(quantise));
}

export const INK = '#101820';

// The sky per time of day. Each is a real colour, quantised on the way out.
export const SKY = {
  dawn: '#c98a7a',
  day: '#7aa8c9',
  dusk: '#7a5a8a',
  night: '#1a1f3a',
};
