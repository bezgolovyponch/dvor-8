// The palette. The yard is stored as INDICES, never as colours, and is looked up through this table every
// frame — so a filter is a different table, not a different picture (docs/style.md, F1 and F3).
//
// Eighteen entries: a cool ramp and a warm ramp of eight tones each, dark to light, then the outline and
// the void a destroyed thing leaves behind. Two ramps because one would turn a photograph into a duotone
// poster; a warm thing and a cool thing of the same brightness must stay different things.

export const TONES = 8;
export const COOL = 0;
export const WARM = TONES;
export const OUTLINE = 16;
export const VOID = 17;
export const SIZE = 18;

const BASE = [
  '#12052e', '#27106b', '#3b1fa8', '#3b55e0', '#2f9bff', '#3fe0f0', '#a8fff0', '#ffffff',
  '#1c0530', '#560d6e', '#a3178c', '#f0286e', '#ff5a3c', '#ff9a2e', '#ffd23f', '#fff6c2',
  '#0b0018', '#04000a',
];

//   hue     turns the whole wheel by this fraction      sat, light   multiply
//   toward  a colour everything is mixed toward, and by how much
//   drift   how far the hue wanders over time (colour cycling), and how fast
export const FILTERS = {
  sober:      { label: 'трезвый' },
  weed:       { label: 'трава',     hue: 0.30, sat: 1.10, drift: 0.06, driftRate: 0.6 },
  alcohol:    { label: 'алкоголь',  sat: 0.70, toward: '#ff9a3c', mix: 0.30 },
  depression: { label: 'депрессия', sat: 0.12, light: 0.72, toward: '#33405c', mix: 0.20 },
};

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function toHsl([r, g, b]) {
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
export function fromHsl([h, s, l]) {
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
export const luma = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// The table for one filter at one moment: eighteen [r, g, b] triples.
export function paletteFor(filterId, seconds = 0) {
  const f = FILTERS[filterId] || FILTERS.sober;
  return BASE.map((hex) => {
    let rgb = hexToRgb(hex);
    if (f === FILTERS.sober) return rgb;
    let [h, s, l] = toHsl(rgb);
    h = (h + (f.hue || 0) + (f.drift || 0) * Math.sin(seconds * (f.driftRate || 0)) + 2) % 1;
    s = Math.max(0, Math.min(1, s * (f.sat ?? 1)));
    const want = luma(rgb) * (f.light ?? 1);
    rgb = fromHsl([h, s, l]);
    // Turning the hue changes how bright a colour LOOKS even when its lightness is kept — a blue turned
    // yellow jumps up the ramp. The look is pulled back to the brightness it had, so a filter can never
    // reorder the tones and make the yard unreadable.
    const got = luma(rgb);
    if (got > 0) rgb = rgb.map((v) => Math.min(255, (v * want) / got));
    if (f.toward) {
      const to = hexToRgb(f.toward);
      rgb = rgb.map((v, i) => v + (to[i] - v) * f.mix);
    }
    return rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))));
  });
}
export const css = ([r, g, b]) => `rgb(${r},${g},${b})`;
