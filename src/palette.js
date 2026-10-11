// The palette. The yard is stored as INDICES and looked up through a table every frame, so a filter is a
// different table, not a different picture (docs/style.md, F1 and F3).
//
// The table is made FROM THE PHOTOGRAPH: the 28 colours that describe this yard best, after it has been
// graded toward the look — more contrast, more colour, purple in the shadows. A red car stays red and a
// green tree stays green; the first version mapped brightness onto two fixed ramps and turned every yard
// into the same heat-map, which is why nothing in it could be recognised.

export const COLOURS = 28;
export const OUTLINE = COLOURS;       // the dark line round a thing
export const VOID = COLOURS + 1;      // what is left where something was
export const SIZE = COLOURS + 2;
// A street of several photographs keeps every photograph's own colours: the table grows by one block of
// COLOURS per photograph, after the first block and the two shared entries. An index is one byte, and 255
// means "nothing fallen here", so nine photographs is the most a street can hold.
export const MAX_YARDS = 9;
export const baseOf = (yard) => (yard === 0 ? 0 : SIZE + (yard - 1) * COLOURS);
const blockOf = (i) => (i < SIZE ? 0 : SIZE + Math.floor((i - SIZE) / COLOURS) * COLOURS);
const OUTLINE_RGB = [11, 0, 24], VOID_RGB = [4, 0, 10];

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

// The grade: what makes a phone photograph look like this game. lo/hi are the photo's own darkest and
// brightest brightness, so a grey overcast yard still gets blacks and whites.
export const SHADOW = [44, 12, 96], LIGHT = [255, 240, 200];
export function grade(r, g, b, lo = 0, hi = 1) {
  const span = Math.max(0.08, hi - lo);
  const l0 = luma([r, g, b]);
  const l1 = Math.max(0, Math.min(1, (l0 - lo) / span));
  const k = l0 > 0.004 ? l1 / l0 : 0;
  let [h, s, l] = toHsl([Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)]);
  s = Math.min(1, s * 1.45 + 0.04);
  const out = fromHsl([h, s, l]);
  const dark = (1 - l1) ** 2 * 0.5, bright = l1 ** 3 * 0.14;
  return out.map((v, i) => v + (SHADOW[i] - v) * dark + (LIGHT[i] - v) * bright);
}

// Median cut: split the photograph's colours into boxes along their widest channel until there are
// COLOURS of them; each box's average is one palette entry.
export function buildPalette(pixels, count = COLOURS) {
  let boxes = [pixels];
  while (boxes.length < count) {
    let pick = -1, widest = -1, channel = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c += 1) {
        let min = 255, max = 0;
        for (const p of box) { if (p[c] < min) min = p[c]; if (p[c] > max) max = p[c]; }
        // weighted by how many pixels the box holds, so large plain areas are split before rare specks
        const range = (max - min) * Math.sqrt(box.length);
        if (range > widest) { widest = range; pick = i; channel = c; }
      }
    });
    if (pick < 0 || widest <= 0) break;
    const box = boxes[pick].sort((a, b) => a[channel] - b[channel]);
    const half = box.length >> 1;
    boxes.splice(pick, 1, box.slice(0, half), box.slice(half));
  }
  const table = boxes.map((box) => [0, 1, 2].map((c) => Math.round(box.reduce((n, p) => n + p[c], 0) / Math.max(1, box.length))));
  while (table.length < count) table.push(table[table.length - 1] || [0, 0, 0]);
  table.sort((a, b) => luma(a) - luma(b));
  return [...table, OUTLINE_RGB, VOID_RGB];
}

export function nearest(table, r, g, b, upto = COLOURS, from = 0) {
  let best = from, bestD = 1e12;
  for (let i = from; i < upto; i += 1) {
    const c = table[i], d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// For each colour, the colour its wreck has: the nearest entry, among its own photograph's colours, to a
// dark, greyed version of it.
export function scorchMap(table) {
  return Uint8Array.from({ length: table.length }, (_, i) => {
    if (i === OUTLINE || i === VOID) return i;
    const [r, g, b] = table[i], grey = luma(table[i]) * 255, from = blockOf(i);
    return nearest(table, (r * 0.4 + grey * 0.6) * 0.34, (g * 0.4 + grey * 0.6) * 0.34, (b * 0.4 + grey * 0.6) * 0.34, from + COLOURS, from);
  });
}

//   sat, light   multiply          toward, mix   a colour everything is mixed toward, and by how much
//   drift        how far the hue wanders over time (colour cycling), and how fast
export const LOOKS = {
  sober:      {},
  weed:       { sat: 1.60, toward: '#39ff14', mix: 0.07, drift: 0.05, driftRate: 0.6 },
  alcohol:    { sat: 0.75, toward: '#ff9a3c', mix: 0.28 },
  depression: { sat: 0.10, light: 0.70, toward: '#33405c', mix: 0.22 },
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// The yard's table as one filter shows it at one moment.
export function lookThrough(table, filterId, seconds = 0) {
  const f = LOOKS[filterId];
  if (!f || filterId === 'sober') return table;
  return table.map((rgb) => {
    const want = luma(rgb) * (f.light ?? 1);
    let [h, s, l] = toHsl(rgb);
    h = (h + (f.drift || 0) * Math.sin(seconds * (f.driftRate || 0)) + 1) % 1;
    s = Math.max(0, Math.min(1, s * (f.sat ?? 1)));
    let out = fromHsl([h, s, l]);
    // turning the hue changes how bright a colour looks; it is pulled back so no filter reorders the tones
    const got = luma(out);
    if (got > 0) out = out.map((v) => Math.min(255, (v * want) / got));
    if (f.toward) { const to = hex(f.toward); out = out.map((v, i) => v + (to[i] - v) * f.mix); }
    return out.map((v) => Math.round(Math.max(0, Math.min(255, v))));
  });
}
export const css = ([r, g, b]) => `rgb(${r},${g},${b})`;
