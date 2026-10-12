// The palette. The yard is stored as INDICES and looked up through a table every frame, so a filter is a
// different table, not a different picture (docs/style.md, F1 and F3).
//
// The table is made FROM THE PHOTOGRAPH: the 28 colours that describe this yard best, after it has been
// graded toward the look — more contrast, more colour, purple in the shadows. A red car stays red and a
// green tree stays green; the first version mapped brightness onto two fixed ramps and turned every yard
// into the same heat-map, which is why nothing in it could be recognised.

export const COLOURS = 28;
// The palette is not COLOURS long. buildPalette appends the game's own ink and void colours after the
// photograph's colours, so a pixel index runs to PALETTE_SIZE, not to COLOURS. COLOURS stays as it was —
// it is how many colours are cut from the PHOTOGRAPH — and this is the bound for anything that walks the
// finished table, which is what `nearest` needs and what a test should assert against.
export const PALETTE_SIZE = COLOURS + 2;
export const OUTLINE = COLOURS;       // the dark line round a thing
export const VOID = COLOURS + 1;      // what is left where something was
export const SIZE = COLOURS + 2;

// HOW MANY COLOURS A PALETTE ACTUALLY HAS, and why this cannot be the constant.
//
// `COLOURS` is how many colours the MEDIAN-CUT route cuts from a photograph. It is not a property of a
// palette: the flat route builds a fixed table of six ramps x four tones plus the two structural entries, so
// 26, and a yard's palette is whatever its own route produced. Two failures came from treating the constant
// as the size — `scorchMap` searched past the end of a 26-entry table and threw, so the demo yard never
// built, and the street's block arithmetic assumed every yard contributes exactly COLOURS. Both are fixed by
// asking the palette.
export const colourCount = (palette) => Math.max(1, palette.length - 2);
// A street of several photographs keeps every photograph's own colours: the table grows by one block of
// COLOURS per photograph, after the first block and the two shared entries. An index is one byte, and 255
// means "nothing fallen here", so nine photographs is the most a street can hold.
export const MAX_YARDS = 9;
export const baseOf = (yard, block = COLOURS) => (yard === 0 ? 0 : SIZE + (yard - 1) * block);
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

/**
 * For each colour, the colour its wreck has: the nearest entry to a dark, greyed version of it.
 *
 * EVERYTHING IS DERIVED FROM THE TABLE, and it was not before. The original hard-wired COLOURS and SIZE, which
 * are the constants of the median-cut palette the photograph used to be reduced to. When the game moved to
 * the flat route — a fixed palette of six ramps x four tones plus the outline and the void, so 26 entries
 * rather than 30 — this function searched past the end of the table, `table[i]` came back undefined, and
 * `nearest` threw. The whole demo yard failed to build and nothing appeared on screen, while every unit test
 * passed because none of them built a world from a flat palette.
 *
 * The two structural entries are found by POSITION, not by the constant: buildPalette and flat.js both append
 * the outline and then the void, so the last two are those two and the rest are colours.
 */
export function scorchMap(table) {
  const colours = Math.max(1, table.length - 2);
  const OUT = table.length - 2, VOID = table.length - 1;
  return Uint8Array.from({ length: table.length }, (_, i) => {
    if (i === OUT || i === VOID) return i;
    const [r, g, b] = table[i];
    const grey = luma(table[i]) * 255;
    return nearest(table, (r * 0.4 + grey * 0.6) * 0.34, (g * 0.4 + grey * 0.6) * 0.34, (b * 0.4 + grey * 0.6) * 0.34, colours, 0);
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
//
// SATURATION IS SCALED ON A CHROMA AXIS, NOT IN HSL, and that is a fix rather than a preference.
//
// The first version multiplied HSL saturation and then divided the colour back to the wanted luma. Those two
// steps fight: rescaling to luma changes the distance from grey, so a filter set to REDUCE saturation came
// out MORE saturated. Measured on the flat palette, the alcohol look was supposed to be washed out and
// instead went from mean saturation 0.330 to 0.392 — the opposite of what it is for.
//
// The transform below is the standard one instead. The colour is moved toward or away from its own GREY of
// the same luma, with the amount capped so nothing clips:
//
//     grey = luma(c)          (a neutral of the same brightness)
//     out  = grey + (c - grey) * k
//
// `k > 1` saturates, `k < 1` washes out, and because grey is by definition the same brightness, the operation
// cannot change the luma at all — so the separate luma correction is not needed for it and cannot undo it.
// The cap keeps the most saturated entry from reaching 255 and clipping to a different hue.
export function lookThrough(table, filterId, seconds = 0) {
  const f = LOOKS[filterId];
  if (!f || filterId === 'sober') return table;
  return table.map((rgb) => {
    let [h, s, l] = toHsl(rgb);
    h = (h + (f.drift || 0) * Math.sin(seconds * (f.driftRate || 0)) + 1) % 1;
    let out = fromHsl([h, s, l]);
    // the hue turn can move brightness, so it is pulled back here — before the chroma scale, so the scale
    // has the last word on saturation and cannot be undone
    const want = luma(rgb) * (f.light ?? 1), got = luma(out);
    if (got > 0) out = out.map((v) => (v * want) / got);
    // THE TOWARD MIX COMES FIRST, before the chroma scale, because mixing toward a colour moves brightness
    // and would otherwise reorder the tones AFTER the scale had set them. Measured with the order the other
    // way round: every filter came out non-monotone in luma, which means a dark thing could read lighter than
    // a light one — the yard stops being readable.
    if (f.toward) { const to = hex(f.toward); out = out.map((v, i) => v + (to[i] - v) * f.mix); }
    const k = f.sat ?? 1;
    if (k !== 1) {
      const g = luma(out);
      // the largest k that keeps every channel in range, so a strong filter never clips to another hue
      let kk = k;
      for (let i = 0; i < 3; i += 1) {
        const d = out[i] - g;
        if (Math.abs(d) < 1e-6) continue;
        const room = d > 0 ? (255 - g) / d : (0 - g) / d;
        if (room > 0) kk = Math.min(kk, room);
      }
      out = out.map((v) => g + (v - g) * kk);
    }
    return out.map((v) => Math.round(Math.max(0, Math.min(255, v))));
  });
}

export const css = ([r, g, b]) => `rgb(${r},${g},${b})`;
