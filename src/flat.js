// Photograph -> flat-colour scene with drawn outlines. Revision 2, "structure".
//
// WHAT WAS WRONG WITH THE OLD PIPELINE, IN ONE SENTENCE
// ----------------------------------------------------
// It quantised the photograph's own pixels. That preserves every grain of asphalt, every leaf and every JPEG
// artefact as speckle, and speckle at 192 pixels is not detail — it is the reason the picture read as blurry
// mush with no border between the road and the tree. Hotline Miami does not look the way it does because its
// colours were quantised well; it looks that way because its shapes are FLAT and its edges are DRAWN.
//
// So the sequence here is different from the start. Nothing is quantised directly from the photograph.
//
//   0 INK       where the photograph has an edge at all: a difference-of-Gaussians gate (XDoG, k = 1.6).
//   1 REGIONS   Felzenszwalb & Huttenlocher, IJCV 2004: "preserve detail in low-variability image regions
//               while ignoring detail in high-variability regions". This is the hard simplification, and it
//               is why grain cannot survive: a region becomes ONE colour.
//   2 MERGE     the over-segmentation is reduced by a region-adjacency merge, which is the standard step
//               after region growing. The photograph's own ink decides which borders are real.
//   3 RAMP      every region takes a colour from a FIXED set of hue-shifted ramps: six ramps, four tones.
//   4 OUTLINE   the borders the photograph supports are drawn; the rest are not.
//   5 WINDOWS   a small region that is markedly darker than the regions around it, and roughly rectangular,
//               is a window or a door; it is painted from the cold ramp so a pane reads as a pane.
//
// ASPECT RATIO IS THE PHOTOGRAPH'S OWN. There is no centre crop. A tall phone photograph makes a tall level.
//
// ============================================================================================================
// REVISION 2 — WHAT WAS MEASURED, AND WHAT EACH STAGE ANSWERS
// ============================================================================================================
// Revision 1 was played on the three real photographs. Four failures, each answered by a stage rather than by
// taste. Every figure below is from the A/B harness (192x256, the game's own size) on those photographs:
//
//   A. THE PICTURE WAS A CRAQUELURE. The outline was drawn along EVERY region border, so the frame came out
//      webbed with black lines over the wall, the road and the sky: 12.7-15.4% of the frame was ink, and most
//      of those borders were artefacts of segmenting one surface, not edges in the place. FIX: stage 0 reads
//      the photograph's ink and stage 4 draws a border only when the pair of regions behind it is supported by
//      that ink or by a large value difference. The line layer is decided PER PAIR, so a line that is drawn
//      is drawn whole and unbroken instead of dotting in and out.
//
//   B. THE SUNSET CAME OUT GREY. Two causes, both in the merge. The cost divided the colour distance by up to
//      3 for a long shared border, so an orange cloud and the grey cloud beside it — 130 apart in the
//      sum-of-channels metric — merged at an effective cost of 43. And a small region was absorbed into its
//      neighbour by SIZE ALONE, so a bright sun of 40 pixels was painted out whatever it contrasted. FIX:
//      the border bonus can no longer cross a hard colour cap, and an orphan is absorbed only if it is also
//      SIMILAR to the neighbour it would go into. A small, contrasting thing is a thing, and it stays.
//
//   C. NOTHING HAD FORM. Every region of a ramp was dealt a tone by rank, so two similar walls could come out
//      black and white while a wall and its own lit corner came out identical. FIX: stage 3 reads the
//      photograph's own shading. One light direction is taken from the bright side of the sky, each region is
//      split into its lit half and its shadow half along it, and the tone follows. It is a small term on
//      purpose: value ordering is what makes the photograph recognisable, and colour must not be allowed to
//      reorder it (Color2Gray, Gooch et al. 2005: the chroma-induced change to lightness is bounded, default
//      alpha = 10 of 100).
//
//   D. THE SKY TURNED BLUE ON A SUNSET. The sky prior fired on any bright region touching the top of the
//      frame, so a white cloud bank was painted with the blue ramp. FIX: the prior needs the hue, not only
//      the position. A cloud keeps the ramp its own colour asks for, and only a genuinely blue sky is blue.
//
// The palette stays FIXED and small — six ramps of four tones — because that is the identity: the photograph
// chooses which ramp and which tone, never the palette.

// The six ramps, and the saturation of each is a measured compromise rather than a preference. Played on the
// three test photographs with the first figures (sky 0.55, foliage 0.45, warm 0.50) the aerial photograph of a
// field came out as one flat vivid green covering three fifths of the frame and the sunset's glow washed to
// cream. A large area of one saturated colour is the thing the environment standard warns about first — it
// leaves the eye nowhere to rest — so the ramps were pulled toward the middle: a green that is a field and not
// a highlighter, and a sky that is grey in an overcast photograph.
export const RAMPS = [
  { name: 'sky', hue: 218, sat: 0.42 },
  { name: 'foliage', hue: 100, sat: 0.30 },
  { name: 'earth', hue: 28, sat: 0.34 },
  { name: 'stone', hue: 40, sat: 0.15 },
  { name: 'metal', hue: 220, sat: 0.10 },
  { name: 'warm', hue: 8, sat: 0.44 },
  // THE VIOLET RAMP, and it is the last colour the palette can hold: seven ramps of four tones plus the two
  // structural entries is thirty, which is exactly the block a street reserves for one photograph
  // (src/palette.js: SIZE = 30, and the next photograph starts at 30). The pixel-art convention is that a
  // shadow moves toward blue-violet; with only six ramps that convention had nowhere to land, so every shaded
  // surface was painted with the cold grey of the metal ramp. This is where the shaded side of a building, the
  // dark half of a street canyon and the deep folds of foliage go.
  { name: 'dusk', hue: 264, sat: 0.12 },
  // SAND is the eighth: dry grass, dust, sandstone, the khaki of a cloud bank at sunset. Without it those go
  // to `earth`, which is redder, or to `stone`, which is greyer, and a photograph of a dry field comes out
  // either too red or too cold.
  { name: 'sand', hue: 52, sat: 0.30 },
];
export const STEPS = 6;
export const OUTLINE = [11, 0, 24];
// THE RESERVED BAND. In this game's own HUD, pink and cyan mean "you can touch this": the brackets round a
// target, the pips that count its hits, the stick and the bar. Nothing in the yard may wear them, or the one
// signal that says "interactive" stops meaning anything. The bands are the hues of the HUD's own two colours
// (#f0286e, #3fe0f0) with a margin either side, and the tone table is pushed out of them below.
export const RESERVED = [[176, 196], [326, 352]];
// A tone is moved out of the band AND out of a margin either side of it, so that no ramp can even come
// close: the nearest scene tone to a reserved band edge is measured at 14 degrees, which is further than the
// distance between two of the ramps themselves.
const MARGIN = 10;
const unReserve = (hue) => {
  const h = ((hue % 360) + 360) % 360;
  for (const [a, b] of RESERVED) {
    if (h > a - MARGIN && h < b + MARGIN) {
      const toLow = h - (a - MARGIN), toHigh = (b + MARGIN) - h;
      return toLow < toHigh ? (a - MARGIN + 360) % 360 : (b + MARGIN) % 360;
    }
  }
  return h;
};
// The structural entries are always the LAST TWO in a palette, whichever route built it.
export const outlineOf = (palette) => palette[palette.length - 2];
export const voidOf = (palette) => palette[palette.length - 1];

const hsl2rgb = (h, s, l) => {
  const hh = (((h % 360) + 360) % 360) / 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + hh * 12) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))))); };
  return [f(0), f(8), f(4)];
};

/** The fixed tone table: RAMPS x STEPS colours, built once. */
export function tones() {
  return RAMPS.map((r) => {
    const out = [];
    for (let i = 0; i < STEPS; i += 1) {
      const t = i / (STEPS - 1);
      // The four tones are spaced to be told apart after the picture has been shrunk to a phone: 0.15, 0.35,
      // 0.57 and 0.82 in HSL lightness. An even 0.16-0.84 spacing left the two middle tones too close in
      // luma once the ramps were laid side by side, which is a difference the eye loses at 3x zoom.
      // Six tones, and the ladder is why a gradient can be painted without a dither: the gap between two
      // neighbouring tones is about 0.15 of lightness, which is a step the eye reads as the same surface
      // turning, not as two surfaces. With four tones the gap was 0.21 and every step was a visible band.
      const l = [0.11, 0.24, 0.38, 0.53, 0.69, 0.86][i] ?? (0.16 + t * 0.68);
      // HUE SHIFT: a shadow moves +24 degrees round the wheel and a highlight -12, which is the pixel-art
      // convention of a shadow turning toward blue-violet and a highlight toward yellow.
      //
      // Revision 1 turned the shift ROUND on the blue ramps, on the grounds that pushing the sky's shadow
      // "toward blue" in the literal sense makes it more cyan. That was true of the direction it used, and the
      // cure was worse than the disease: the sky ramp's shadow came out at 186 degrees, one degree from the
      // cyan that means "interactive" in this game's own HUD. The direction is the same for every ramp now and
      // the sky's base hue was moved up instead, so its shadow is a deeper blue at 242 and its highlight a
      // paler one at 206 — which is what the inversion was trying to approximate.
      //
      // The reserved band is applied LAST, so no tone of any ramp can end up inside it whatever the shift did.
      const hue = unReserve(r.hue + (1 - t) * 24 - t * 12);
      // Shadows carry more colour than highlights, and the top tone keeps MOST of it. Washing the light end
      // toward white is right for a lit surface and wrong for a bright pigment: measured on the sunset
      // photograph, the sun's own glow — the most saturated thing in the picture — was painted as pale cream,
      // because a fully washed top tone cannot hold orange. 1.15 - t*0.28 keeps the ramp rising in lightness
      // while the colour survives it.
      const sat = r.sat * (1.20 - t * 0.36);
      out.push(hsl2rgb(hue, sat, l));
    }
    return out;
  });
}

// The classic ordered-dither threshold, 8x8. It is used ONLY as material texture, never as a way to fake a
// mid-tone: see the texture stage in `render`.
const BAYER = new Uint8Array([
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]);

const rgb2hsl = (R, G, B) => {
  const r = R / 255, g = G / 255, b = B / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d) {
    if (mx === r) hh = 60 * (((g - b) / d) % 6);
    else if (mx === g) hh = 60 * ((b - r) / d + 2);
    else hh = 60 * ((r - g) / d + 4);
  }
  const l = (mx + mn) / 2;
  return [((hh % 360) + 360) % 360, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
};

/** Which ramp a colour belongs to. */
export function rampFor(colour) {
  const [hh, ss, ll] = rgb2hsl(colour[0], colour[1], colour[2]);
  let best = 0, bd = Infinity;
  for (let i = 0; i < RAMPS.length; i += 1) {
    let dh = Math.abs(hh - RAMPS[i].hue);
    if (dh > 180) dh = 360 - dh;
    const d = dh * (0.6 + ss) + Math.abs(ss - RAMPS[i].sat) * 120;
    if (d < bd) { bd = d; best = i; }
  }
  return { ramp: best, tone: Math.max(0, Math.min(STEPS - 1, Math.round(ll * (STEPS - 1)))) };
}

/** Step 1: over-segment. Felzenszwalb & Huttenlocher, IJCV 2004. */
export function segment(rgba, w, h, k = 300, marks = null) {
  const n = w * h;
  const parent = new Int32Array(n), size = new Int32Array(n).fill(1), diff = new Float32Array(n);
  for (let i = 0; i < n; i += 1) parent[i] = i;
  const find = (x) => { let r = x; while (parent[r] !== r) r = parent[r]; while (parent[x] !== r) { const nx = parent[x]; parent[x] = r; x = nx; } return r; };
  const edges = [];
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      // A THING THE DETECTOR FOUND IS SEGMENTED APART FROM ITS GROUND, and this is where that has to happen.
      // Felzenszwalb's predicate merges a small region into a large one very early, while every fragment is
      // still tiny, so a grey car on grey asphalt was gone before the merge or the orphan stage could protect
      // it — measured: with the mark and without it, the car was painted the same colour as the road. A barrier
      // across the mask boundary costs nothing and makes the guarantee real: a found thing is always its own
      // shape in the picture.
      if (marks && marks[i] !== marks[j]) continue;
      edges.push([Math.abs(rgba[i * 4] - rgba[j * 4]) + Math.abs(rgba[i * 4 + 1] - rgba[j * 4 + 1]) + Math.abs(rgba[i * 4 + 2] - rgba[j * 4 + 2]), i, j]);
    }
  }
  edges.sort((p, q) => p[0] - q[0]);
  for (const [d, i, j] of edges) {
    const ri = find(i), rj = find(j);
    if (ri === rj) continue;
    if (d <= Math.min(diff[ri] + k / size[ri], diff[rj] + k / size[rj])) {
      const big = size[ri] >= size[rj] ? ri : rj, small = big === ri ? rj : ri;
      parent[small] = big; size[big] += size[small]; diff[big] = Math.max(diff[big], d, diff[small]);
    }
  }
  const lab = new Int32Array(n), remap = new Map();
  let next = 0;
  for (let i = 0; i < n; i += 1) {
    const r = find(i);
    if (!remap.has(r)) remap.set(r, next++);
    lab[i] = remap.get(r);
  }
  return { lab, count: next };
}

/**
 * A BOX DOWNSAMPLE, for the copy the segmentation works on.
 *
 * Why there is a copy at all: the segmentation and its merge are the only super-linear stages in the route,
 * and they are now far finer than the picture needs them to be, because the PAINT is per pixel. Measured at
 * 288 x 512: 1,950 ms with the segmentation at full size, of which the merge is over 1,500. At half size the
 * same photograph costs about 700 ms and the painted picture is indistinguishable, because a surface only has
 * to say which ramp its pixels come from — the detail comes from the photograph, pixel by pixel.
 */
export function boxDown(src, w, h, dw, dh, channels = 1) {
  const out = new Float64Array(dw * dh * channels);
  for (let y = 0; y < dh; y += 1) {
    const y0 = Math.floor((y * h) / dh), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / dh));
    for (let x = 0; x < dw; x += 1) {
      const x0 = Math.floor((x * w) / dw), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / dw));
      let n = 0;
      const acc = new Float64Array(channels);
      for (let yy = y0; yy < y1; yy += 1) for (let xx = x0; xx < x1; xx += 1) {
        n += 1;
        for (let c = 0; c < channels; c += 1) acc[c] += src[(yy * w + xx) * channels + c];
      }
      for (let c = 0; c < channels; c += 1) out[(y * dw + x) * channels + c] = n ? acc[c] / n : 0;
    }
  }
  return out;
}

/** A separable Gaussian blur of one Float32Array channel. Used by the ink gate and nothing else. */
function blur(src, w, h, sigma) {
  const r = Math.max(1, Math.ceil(sigma * 2.5));
  const k = new Float32Array(r * 2 + 1);
  let sum = 0;
  for (let i = -r; i <= r; i += 1) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k[i + r] = v; sum += v; }
  for (let i = 0; i < k.length; i += 1) k[i] /= sum;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    let acc = 0;
    for (let i = -r; i <= r; i += 1) acc += k[i + r] * src[y * w + Math.min(w - 1, Math.max(0, x + i))];
    tmp[y * w + x] = acc;
  }
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    let acc = 0;
    for (let i = -r; i <= r; i += 1) acc += k[i + r] * tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x];
    out[y * w + x] = acc;
  }
  return out;
}

/**
 * STAGE 0 — where the photograph has a line at all.
 *
 * The difference of two Gaussians, which is the ink operator of Winnemöller, Kyprianidis & Olsen (Computers &
 * Graphics 36(6), 2012) with their printed k = 1.6, "a good engineering trade-off" they take from Marr &
 * Hildreth. What is used here is the size of the response, not their full threshold-and-colour pipeline:
 * ink = |G_sigma - G_1.6sigma|, soft-thresholded with their tanh ramp and normalised so that the picture's
 * own 90th percentile is 1.0.
 *
 * This replaces revision 1's Sobel magnitude for one measured reason: a Sobel response is proportional to the
 * local contrast, so the shaded half of a backlit facade produced almost no ink while gravel produced a lot.
 * A DoG response is a band-pass — it answers "is there an edge here", not "how loud is it" — which is exactly
 * the question the line layer asks. Their printed epsilon is stated for their own 0-100 luminance range, so
 * the threshold here is taken from the picture instead of copied from the paper, and that is stated rather
 * than hidden.
 */
export function ink(rgba, w, h, sigma = 1.0, k = 1.6, softness = 1.5) {
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i += 1) lum[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
  const a = blur(lum, w, h, sigma), b = blur(lum, w, h, sigma * k);
  const dog = new Float32Array(n), hist = new Int32Array(256);
  for (let i = 0; i < n; i += 1) { const d = Math.abs(a[i] - b[i]); dog[i] = d; hist[Math.min(255, (d * 2550) | 0)] += 1; }
  let acc = 0, cut = 1;
  const want = Math.max(1, Math.round(n * 0.90));
  for (let bin = 0; bin < 256; bin += 1) { acc += hist[bin]; if (acc >= want) { cut = Math.max(0.004, (bin + 1) / 2550); break; } }
  // THE SOFT THRESHOLD. Above the cut the pixel is ink; below it the response is ramped down to nothing over
  // `softness` times the cut, which is the paper's tanh ramp written as the linear ramp its own figures
  // describe near the threshold. The first version of this multiplied the tanh argument by a constant of my
  // own and returned 0.88 for flat asphalt, so every border in the picture read as a supported edge and the
  // line gate never closed. Measured: the ink map now reaches 0 on flat ground and 1 on a kerb.
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = Math.max(0, Math.min(1, (dog[i] - cut) / (cut * softness)));
  return out;
}

/**
 * Where the light is.
 *
 * A cheap, stated PRIOR, not a measurement of the sun: in the top band of the frame (the sky, if there is
 * sky), the bright side is the side the light comes from. The brightness-weighted centroid of that band is
 * taken and the vector from the band's centre to it is the light direction; if the band is evenly lit the
 * strength is zero and the light is treated as overhead.
 */
export function lightFrom(rgba, w, h) {
  const band = Math.max(2, Math.round(h * 0.38));
  let sum = 0, cnt = 0;
  for (let y = 0; y < band; y += 1) for (let x = 0; x < w; x += 1) { const i = (y * w + x) * 4; sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]; cnt += 1; }
  const mean = sum / Math.max(1, cnt);
  let sw = 0, sx = 0, sy = 0;
  for (let y = 0; y < band; y += 1) for (let x = 0; x < w; x += 1) {
    const i = (y * w + x) * 4;
    const l = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    const wgt = Math.max(0, l - mean);
    sw += wgt; sx += wgt * x; sy += wgt * y;
  }
  if (sw < 1) return { lx: 0, ly: -1, strength: 0 };
  const vx = sx / sw - w / 2, vy = sy / sw - band / 2;
  const m = Math.hypot(vx, vy);
  if (m < w * 0.03) return { lx: 0, ly: -1, strength: 0 };
  return { lx: vx / m, ly: vy / m, strength: Math.min(1, m / (w * 0.22)) };
}

/**
 * HOW DIFFERENT TWO COLOURS ARE, for the merge and only for the merge.
 *
 * The plain sum of the channel differences is dominated by lightness, and that is what let a grey roof and a
 * red brick wall merge: measured on the church photograph, 2,766 pixels are unmistakably red (r > 1.3 g and
 * r > 1.3 b) and only 231 of them came out of the route painted with a warm, earth or sand ramp — 2,331 came
 * out STONE. A grey [140,140,140] and a brick [150,90,70] are 130 apart in the sum metric, which is exactly
 * the tolerance, so the brick was inside the roof's region and the region's mean colour is grey.
 *
 * A colour has two parts and they are not equally important when the question is "is this the same surface":
 * the lightness (how much light it returns) and the chroma (what it does to the light). So the distance is
 * stated in those terms — lightness plus twice the opponent-chroma distance — and a grey and a brick are then
 * 194 apart, well past a tolerance of 130. Two greys of different lightness are unchanged.
 */
const colourDistance = (a, b) => {
  const la = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2], lb = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
  const dL = Math.abs(la - lb);
  const dC = Math.abs((a[0] - la) - (b[0] - lb)) + Math.abs((a[2] - la) - (b[2] - lb));
  return dL + 2 * dC;
};

/**
 * Step 2: reduce the over-segmentation by merging similar ADJACENT regions.
 *
 * THREE THINGS STOP IT, and all three are needed:
 *   - the pair is chosen by colour distance, cheapest first;
 *   - a long shared border makes a merge more attractive (`len`), which is the one place length belongs;
 *   - `cap` is a HARD ceiling on the colour distance itself, which the border bonus cannot cross, and the
 *     photograph's own ink along the shared border pushes apart two regions that look alike but are divided
 *     by a real line in the photograph.
 */
export function merge(rgba, lab, count, w, h, target, trace = null, tone = 95, inkMap = null, cap = 150, inkWeight = 2.6, inkBarrier = 0.45, maxRegion = 0.16, marks = null) {
  const n = w * h;
  const cur = new Int32Array(count);
  const sizes = new Int32Array(count), sr = new Float64Array(count), sg = new Float64Array(count), sb = new Float64Array(count);
  for (let i = 0; i < count; i += 1) cur[i] = i;
  for (let i = 0; i < n; i += 1) {
    const r = lab[i];
    sizes[r] += 1; sr[r] += rgba[i * 4]; sg[r] += rgba[i * 4 + 1]; sb[r] += rgba[i * 4 + 2];
  }
  const find = (x) => { let r = x; while (cur[r] !== r) r = cur[r]; while (cur[x] !== r) { const nx = cur[x]; cur[x] = r; x = nx; } return r; };
  const mean = (r) => (sizes[r] ? [sr[r] / sizes[r], sg[r] / sizes[r], sb[r] / sizes[r]] : [0, 0, 0]);

  // A THING THE DETECTOR FOUND IS NOT SWALLOWED BY A SURFACE. The orphan stage downstream keeps a small thing
  // only if it also CONTRASTS with its neighbour, and a grey car on grey asphalt does not contrast: measured
  // with the mark and without it, the car was merged into the road before the orphan stage ever saw it. So the
  // rule belongs here: a marked region may merge with another marked region, and a marked fragment may absorb
  // its own fragments, but it may not be absorbed into a surface.
  const held = new Uint8Array(count);
  if (marks) for (let i = 0; i < n; i += 1) if (marks[i]) held[find(lab[i])] = 1;

  // ONE MAP, TWO NUMBERS IN IT. The border length and the ink summed along that border are packed into a
  // single integer — length * 65536 + inkSum — so the table is rebuilt once per merge instead of twice.
  // Measured: the second map alone cost 223 ms of a 519 ms merge on a courtyard, because every merge copies
  // the whole table, and a merge happens about 1400 times.
  const KEY = (a, b) => (a < b ? a * count + b : b * count + a);
  const pack = (len, inkSum) => len * 65536 + Math.round(inkSum);
  const packLen = (v) => Math.floor(v / 65536);
  const packInk = (v) => v - packLen(v) * 65536;
  let borders = new Map();
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x, a = find(lab[i]);
    const add = (j) => {
      const b = find(lab[j]);
      if (a === b) return;
      const k = KEY(a, b);
      const was = borders.get(k);
      if (was === undefined) borders.set(k, pack(1, inkMap ? inkMap[j] : 0));
      else borders.set(k, was + 65536 + (inkMap ? Math.round(inkMap[j]) : 0));
    };
    if (x < w - 1) add(i + 1);
    if (y < h - 1) add(i + w);
  }

  const TONE = tone;
  const BIG = Math.max(400, Math.round(n * 0.02));   // a region past this is a surface, not a fragment
  let alive = count;
  while (alive > target) {
    let bestK = -1, bestD = Infinity;
    for (const [k, packed] of borders) {
      const len = packLen(packed);
      const ra = find(Math.floor(k / count)), rb = find(k % count);
      if (ra === rb) continue;
      if (sizes[ra] > BIG && sizes[rb] > BIG) continue;   // two surfaces touching, not a fragment to absorb
      if (marks && held[ra] !== held[rb] && (sizes[ra] > BIG || sizes[rb] > BIG)) continue;   // a found thing stays
      // NO SURFACE MAY SWALLOW THE PICTURE. The merge only insisted that ONE side of a pair be small, so a
      // field could keep absorbing fragments until it was three fifths of the frame: measured on the aerial
      // photograph, one green region of 58% and nothing else in the lower half of the picture. A flat shape
      // past a fifth of the frame is not a surface, it is a wall of colour with no rest for the eye, and the
      // environment standard is explicit that a frame of one saturated area has no focal point at all.
      if (sizes[ra] + sizes[rb] > n * maxRegion) continue;
      const ma = mean(ra), mb = mean(rb);
      const d = colourDistance(ma, mb);
      // THE CHEAP TESTS COME FIRST AND THE SECOND MAP IS READ LAST. `inks` is a second Map keyed the same way
      // as `borders`, and reading it for every pair of every merge cost about 3.5 million extra lookups on a
      // courtyard — measured at roughly 150 ms of a 640 ms transition. The pairs that reach the ink test are
      // the few that are similar enough to be worth merging at all, which is where the cost belongs.
      if (d > cap) continue;                              // the photograph says these are different things
      const lenBonus = 1 + Math.min(2, len / 8);
      let eff = d / lenBonus;
      if (inkMap) {
        const meanInk = packInk(packed) / Math.max(1, len);
        // A BORDER THE PHOTOGRAPH DRAWS IS NOT ERASED. Without this the white bus of the sunset photograph —
        // 0.6% of the frame, so still a "fragment" — merged into the road beside it at a cost of 62 against a
        // tolerance of 110, and the bus disappeared from its own picture. The ink weight alone cannot stop it,
        // because it multiplies a cost that is already below the tolerance.
        if (meanInk >= inkBarrier) continue;
        eff *= 1 + inkWeight * meanInk;
      }
      if (eff < bestD) { bestD = eff; bestK = k; }
    }
    if (trace && alive % 500 === 0) trace.push('alive ' + alive + ' bestEffective ' + (bestD === Infinity ? 'none' : bestD.toFixed(2)) + ' TONE ' + TONE);
    if (bestK < 0 || bestD > TONE) {
      if (trace) trace.push('STOPPED at alive ' + alive + ' because bestEffective ' + (bestD === Infinity ? 'none' : bestD.toFixed(2)) + ' > TONE ' + TONE);
      break;
    }
    const a = find(Math.floor(bestK / count)), b = find(bestK % count);
    const big = sizes[a] >= sizes[b] ? a : b, small = big === a ? b : a;
    cur[small] = big;
    sizes[big] += sizes[small];
    sr[big] += sr[small]; sg[big] += sg[small]; sb[big] += sb[small];
    if (held[small]) held[big] = 1;
    sizes[small] = 0;
    const nextBorders = new Map();
    for (const [k, packed] of borders) {
      const x = find(Math.floor(k / count)), y = find(k % count);
      if (x === y) continue;
      const nk = KEY(x, y);
      const had = nextBorders.get(nk);
      nextBorders.set(nk, had === undefined ? packed : had + packed);
    }
    borders = nextBorders;
    alive -= 1;
  }
  const out = new Int32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = find(lab[i]);
  return out;
}

/** Same as `merge` but with the similarity tolerance stated, so it can be swept and tested. */
export const mergeTone = (rgba, lab, count, w, h, target, tone) => merge(rgba, lab, count, w, h, target, null, tone);

/**
 * Orphans: a small region is absorbed into the neighbour it touches most — UNLESS it also CONTRASTS with that
 * neighbour, in which case it is a thing (a sun, a headlight, a road marking, the wheel of a bicycle) and it
 * is kept. Revision 1 absorbed by size alone, which is why the setting sun was painted out of its own picture.
 */
function absorbOrphans(rgba, dense, w, h, minRegion, keepContrast, marks = null) {
  const n = w * h;
  const ids = new Map();
  for (let i = 0; i < n; i += 1) if (!ids.has(dense[i])) ids.set(dense[i], ids.size);
  const nr = ids.size;
  const lab = new Int32Array(n);
  for (let i = 0; i < n; i += 1) lab[i] = ids.get(dense[i]);
  const cur = new Int32Array(nr), size = new Int32Array(nr);
  const sr = new Float64Array(nr), sg = new Float64Array(nr), sb = new Float64Array(nr);
  for (let r = 0; r < nr; r += 1) cur[r] = r;
  for (let i = 0; i < n; i += 1) {
    const r = lab[i];
    size[r] += 1; sr[r] += rgba[i * 4]; sg[r] += rgba[i * 4 + 1]; sb[r] += rgba[i * 4 + 2];
  }
  const find = (x) => { let r = x; while (cur[r] !== r) r = cur[r]; return r; };
  const mean = (r) => [sr[r] / Math.max(1, size[r]), sg[r] / Math.max(1, size[r]), sb[r] / Math.max(1, size[r])];
  // A THING THE DETECTOR FOUND IS NEVER ABSORBED. The contrast rule below keeps a small bright or dark thing,
  // but a grey car on grey asphalt is neither: it is the same colour as its neighbour and was swallowed, which
  // is why the parked cars of two of the three test photographs were invisible in the painted yard. What the
  // detector found is a thing the player is meant to see and hit, so its pixels are held whatever their colour.
  const held = new Uint8Array(nr);
  if (marks) for (let i = 0; i < n; i += 1) if (marks[i]) held[find(lab[i])] = 1;
  for (let pass = 0; pass < 3; pass += 1) {
    const touch = new Map();
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const i = y * w + x, r = find(lab[i]);
      if (size[r] >= minRegion) continue;
      const add = (j) => { const q = (j >= 0 && j < n) ? find(lab[j]) : r; if (q === r) return; if (!touch.has(r)) touch.set(r, new Map()); touch.get(r).set(q, (touch.get(r).get(q) || 0) + 1); };
      if (x < w - 1) add(i + 1);
      if (x > 0) add(i - 1);
      if (y < h - 1) add(i + w);
      if (y > 0) add(i - w);
    }
    if (!touch.size) break;
    for (const [r, nb] of touch) {
      if (held[find(r)]) continue;                          // found by the detector: it stays
      let best = -1, bestScore = -1;
      for (const [q, cnt] of nb) { if (size[q] === 0) continue; const s = cnt * 1000 + size[q]; if (s > bestScore) { bestScore = s; best = q; } }
      if (best < 0) continue;
      const a = mean(r), b = mean(find(best));
      const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      if (d > keepContrast) continue;                       // small AND unlike its neighbour: it is a thing
      const big = find(best);
      cur[r] = big; size[big] += size[r]; sr[big] += sr[r]; sg[big] += sg[r]; sb[big] += sb[r]; size[r] = 0;
    }
  }
  const out = new Int32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = find(lab[i]);
  return out;
}

/**
 * The whole transition: photograph in, flat-colour scene out.
 *
 * Returns the palette index per pixel, the palette itself, and the regions with their bounding boxes, which
 * is what the object layer needs to find windows and walls.
 */
// THE TABLE IS BUILT ONCE AND SHARED BY EVERY YARD, and that is a change with a consequence worth stating:
// `src/street.js` extends a street by appending a block of colours per photograph, and it skips that when the
// new yard brings the SAME palette object. Returning the same table every time is therefore what lets the
// table be any size at all — fifty colours instead of thirty — without a street of nine photographs running
// out of index space. The photograph still chooses which ramp and which tone; it never chooses the palette.
const TABLE = tones();
const PALETTE = (() => {
  const p = [];
  for (const ramp of TABLE) for (const c of ramp) p.push(c);
  p.push(OUTLINE, [4, 0, 10]);          // the outline and the void are ALWAYS the last two entries
  return p;
})();
export const paletteOf = () => PALETTE;

/**
 * Which ramp ONE PIXEL is painted from: its own colour when it has one, its surface's when it does not.
 *
 * The threshold is a chroma of 0.18. Below it a pixel is grey — a wall, asphalt, a white cloud — and grey
 * pixels belong to whatever surface they are part of, because two greys two degrees apart in hue are the same
 * grey and painting them from different ramps would speckle the surface. Above it the pixel has a colour of
 * its own, and averaging it into its surface is how a red brick church came out grey-green in a green field.
 */
const adjacent = (a, b) => !(a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0);
const RAMP_SKY = 0, RAMP_STONE = 3, RAMP_METAL = 4, RAMP_DUSK = 6, RAMP_SAND = 7;
const CHROMA_ENOUGH = 0.18;
const pixelRampOf = (R, G, B, r) => {
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
  if (!mx || (mx - mn) / mx < CHROMA_ENOUGH) return -1;
  return rampFor([R, G, B]).ramp;
};

export function render(rgba, w, h, opts = {}) {
  const {
    // k is Felzenszwalb's tolerance, and at the low-resolution copy the segmentation runs on it is the
    // difference between 1,400 fragments and 1,150 — the merge has to eat every one of them, at a cost of the
    // whole pair table per merge. Measured on the demo yard at 384 x 512: k = 300 → 353 ms and 126 surfaces,
    // k = 700 → 127 ms and 107. Same picture, three times faster, so the picture reaches the player sooner.
    target = null, k = 700, tone = 110, cap = 130, inkWeight = 2.6, inkBarrier = 0.45, maxRegion = 0.16,
    lineInk = 0.20, lineValue = 0.15, minRegionShare = 0.0012, keepContrast = 80,
    atmosphere = true, faceWeight = 0.35, inkSigma = 1.0, marks = null, inkLine = 0.72,
  } = opts;
  const table = TABLE, palette = PALETTE;
  const n = w * h;
  // ONE SHAPE PER ~320 PIXELS, so the picture keeps the same grain at any size: a budget of 200 shapes was
  // chosen for a 144 x 256 yard, and at 288 x 512 the same 200 shapes are four times too coarse — the church
  // of the test photograph comes out as one blob. The merge still stops when the photograph stops offering
  // similar neighbours, so this is a ceiling rather than a quota.
  const shapes = target ?? Math.max(120, Math.min(900, Math.round(n / 320)));

  const inkMap = ink(rgba, w, h, inkSigma);
  const light = lightFrom(rgba, w, h);

  const segLong = opts.segLong ?? 224;
  const k2 = Math.min(1, segLong / Math.max(w, h));
  const sw = Math.max(48, Math.round(w * k2)), sh = Math.max(48, Math.round(h * k2));
  const atSegScale = sw === w && sh === h;
  const small4 = atSegScale ? rgba : (() => {
    const f = boxDown(rgba, w, h, sw, sh, 4);
    const out = new Uint8ClampedArray(sw * sh * 4);
    for (let i = 0; i < sw * sh * 4; i += 1) out[i] = f[i];
    return out;
  })();
  const inkSmallF = atSegScale ? inkMap : boxDown(inkMap, w, h, sw, sh);
  const inkSmall = atSegScale ? inkMap : Float32Array.from(inkSmallF);
  const marksSmall = (() => {
    if (!marks) return null;
    if (atSegScale) return marks;
    const m = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y += 1) for (let x = 0; x < sw; x += 1) m[y * sw + x] = marks[Math.floor((y * h) / sh) * w + Math.floor((x * w) / sw)];
    return m;
  })();
  const { lab, count } = segment(small4, sw, sh, k, marksSmall);
  const merged = merge(small4, lab, count, sw, sh, shapes, null, tone, inkSmall, cap, inkWeight, inkBarrier, maxRegion, marksSmall);
  const denseIn = new Int32Array(n);
  if (atSegScale) {
    const ids = new Map();
    for (let i = 0; i < n; i += 1) { if (!ids.has(merged[i])) ids.set(merged[i], ids.size); denseIn[i] = ids.get(merged[i]); }
  } else {
    const ids = new Map();
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const v = merged[Math.min(sh - 1, Math.floor((y * sh) / h)) * sw + Math.min(sw - 1, Math.floor((x * sw) / w))];
      if (!ids.has(v)) ids.set(v, ids.size);
      denseIn[y * w + x] = ids.get(v);
    }
  }
  const dense = absorbOrphans(rgba, denseIn, w, h, Math.max(8, Math.round(n * minRegionShare)), keepContrast, marks);

  // ---- what each surviving region is, from its own pixels -----------------------------------------------
  const ids = new Map();
  for (let i = 0; i < n; i += 1) if (!ids.has(dense[i])) ids.set(dense[i], ids.size);
  const nr = ids.size;
  const reg = new Int32Array(n);
  for (let i = 0; i < n; i += 1) reg[i] = ids.get(dense[i]);
  const size = new Int32Array(nr), box = new Int32Array(nr * 4);
  const sr = new Float64Array(nr), sg = new Float64Array(nr), sb = new Float64Array(nr), sumLum = new Float64Array(nr);
  const minL = new Float64Array(nr).fill(999), maxL = new Float64Array(nr);
  for (let r = 0; r < nr; r += 1) { box[r * 4] = w; box[r * 4 + 1] = h; box[r * 4 + 2] = -1; box[r * 4 + 3] = -1; }
  for (let i = 0; i < n; i += 1) {
    const r = reg[i], x = i % w, y = (i / w) | 0;
    size[r] += 1; sr[r] += rgba[i * 4]; sg[r] += rgba[i * 4 + 1]; sb[r] += rgba[i * 4 + 2];
    const pl = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    sumLum[r] += pl;
    if (pl < minL[r]) minL[r] = pl;
    if (pl > maxL[r]) maxL[r] = pl;
    if (x < box[r * 4]) box[r * 4] = x;
    if (y < box[r * 4 + 1]) box[r * 4 + 1] = y;
    if (x > box[r * 4 + 2]) box[r * 4 + 2] = x;
    if (y > box[r * 4 + 3]) box[r * 4 + 3] = y;
  }
  const mean = new Float64Array(nr * 3), luma = new Float64Array(nr);
  for (let r = 0; r < nr; r += 1) {
    mean[r * 3] = sr[r] / size[r]; mean[r * 3 + 1] = sg[r] / size[r]; mean[r * 3 + 2] = sb[r] / size[r];
    luma[r] = sumLum[r] / size[r];
  }
  // The lit half and the shadow half of every region, along the light direction: the photograph's own
  // shading, kept as one number per region.
  const face = new Float64Array(nr), midY = new Float64Array(nr);
  {
    const lit = new Float64Array(nr), dark = new Float64Array(nr);
    const litN = new Int32Array(nr), darkN = new Int32Array(nr);
    for (let i = 0; i < n; i += 1) {
      const r = reg[i], x = i % w, y = (i / w) | 0;
      midY[r] += y;
      const cx = (box[r * 4] + box[r * 4 + 2]) / 2, cy = (box[r * 4 + 1] + box[r * 4 + 3]) / 2;
      const p = (x - cx) * light.lx + (y - cy) * light.ly;
      const l = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
      if (p >= 0) { lit[r] += l; litN[r] += 1; } else { dark[r] += l; darkN[r] += 1; }
    }
    for (let r = 0; r < nr; r += 1) {
      midY[r] /= size[r];
      const a = litN[r] ? lit[r] / litN[r] : 0, b = darkN[r] ? dark[r] / darkN[r] : 0;
      const s = a + b;
      face[r] = s > 1 ? Math.max(-1, Math.min(1, ((a - b) / s) * 2)) * light.strength : 0;
    }
  }

  // ---- STAGE 3: ramp and tone -------------------------------------------------------------------------
  //
  // THE RAMP IS THE PHOTOGRAPH'S OWN COLOUR, with three named PRIORS laid over it. A prior decides only which
  // of the six ramps a region is painted from; it never names a thing, never moves a pixel, and is never
  // shown to the player. They exist because the ramps are chosen by hue and three of the things a courtyard
  // photograph is full of are not distinguished by hue alone:
  const SKY = 0, FOLIAGE = 1, METAL = 4;
  const SKY_ROLE = 1, FOLIAGE_ROLE = 2, PANE_ROLE = 3;

  // the frame's own value range, so a tone means the same thing in a bright yard and a dark one
  const sortedLuma = Float64Array.from(luma).sort();
  const loV = sortedLuma[Math.floor(nr * 0.05)], hiV = sortedLuma[Math.min(nr - 1, Math.floor(nr * 0.95))];
  const span = Math.max(12, hiV - loV);
  const norm = new Float64Array(nr);
  for (let r = 0; r < nr; r += 1) norm[r] = Math.max(0, Math.min(1, (luma[r] - loV) / span));

  // WHICH REGIONS ARE THINGS THE DETECTOR FOUND. The boxes arrive normalised; a region is marked when any of
  // its pixels falls inside one. This is not a material and not a name: it is the one thing the painter is
  // told about the player's world, and all it buys is that the thing is not painted the same colour as what
  // it stands on.
  const marked = new Uint8Array(nr);
  if (marks) for (let i = 0; i < n; i += 1) if (marks[i]) marked[reg[i]] = 1;

  // THE PIXEL'S OWN VALUE, for the dither below: the frame's own 2nd and 98th percentile, so one very bright
  // or very dark pixel cannot squash everything else into the middle of the scale.
  let pLo = 0, pHi = 255;
  {
    const hist = new Int32Array(256);
    for (let i = 0; i < n; i += 1) hist[Math.min(255, Math.max(0, Math.round(0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2])))] += 1;
    let acc = 0; const lowWant = n * 0.02, highWant = n * 0.98;
    for (let b = 0; b < 256; b += 1) { acc += hist[b]; if (acc >= lowWant) { pLo = b; break; } }
    acc = 0;
    for (let b = 0; b < 256; b += 1) { acc += hist[b]; if (acc >= highWant) { pHi = b; break; } }
    if (pHi - pLo < 24) { pLo = 0; pHi = 255; }
  }
  const pixNorm = new Float64Array(n);

  const ramp = new Int32Array(nr), role = new Int8Array(nr);
  // ROUGHNESS IS MEASURED INSIDE THE SURFACE, NOT ON ITS OUTLINE. The first version averaged the ink over
  // every pixel of the region, so a small flat shape with a long perimeter — a drawn window, a road sign —
  // scored as rough as a field, and the material dither fired on flat art. What "rough" means here is that
  // the PHOTOGRAPH has edges inside the shape: grass, gravel, leaves, a cloud bank. A boundary pixel is the
  // shape's own edge and says nothing about its material, so it does not count.
  const inkEnergy = new Float64Array(nr);
  {
    const inner = new Int32Array(nr);
    for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x, r = reg[i];
      if (reg[i - 1] === r && reg[i + 1] === r && reg[i - w] === r && reg[i + w] === r) { inkEnergy[r] += inkMap[i]; inner[r] += 1; }
    }
    for (let r = 0; r < nr; r += 1) inkEnergy[r] = inner[r] ? inkEnergy[r] / inner[r] : 0;
  }
  const roughCut = (() => { const s = Float64Array.from(inkEnergy).sort(); return s[Math.floor(nr * 0.75)]; })();
  const medianLuma = sortedLuma[nr >> 1];
  for (let r = 0; r < nr; r += 1) {
    const [hh, ss] = rgb2hsl(mean[r * 3], mean[r * 3 + 1], mean[r * 3 + 2]);
    const bw = box[r * 4 + 2] - box[r * 4] + 1, bh = box[r * 4 + 3] - box[r * 4 + 1] + 1;
    const fill = size[r] / Math.max(1, bw * bh);
    const cy = (box[r * 4 + 1] + box[r * 4 + 3]) / 2 / h;
    ramp[r] = rampFor([mean[r * 3], mean[r * 3 + 1], mean[r * 3 + 2]]).ramp;
    // (a) SKY is blue, bright, and reaches the top of the frame. All three, because "bright and at the top"
    //     alone turned the white cloud bank of the sunset photograph into blue sky — the failure that put
    //     the hue condition here.
    //     The ROLE is recorded and the RAMP is left to the colour: a grey overcast sky is metal-toned and a
    //     clear one is blue, and forcing the blue ramp on every bright top region is what turned the cloud
    //     bank of a sunset blue in the first revision. The role is what the material map and the tone rules
    //     read; the ramp stays the photograph's own colour.
    if (cy < 0.5 && luma[r] > medianLuma * 0.98 && hh > 168 && hh < 280 && ss > 0.05 && ramp[r] === SKY) { role[r] = SKY_ROLE; }
    // (b) FOLIAGE is green by hue, or it is ROUGH and in the upper two thirds: leaves are the one
    //     high-frequency thing in a yard, so a brown tree is still foliage. The position condition keeps the
    //     textured facade of a building — which is brick, not leaves — out of it.
    if ((hh > 58 && hh < 175 && ss > 0.14) || (cy < 0.62 && inkEnergy[r] >= roughCut && hh > 25 && hh < 175 && ss > 0.10)) { ramp[r] = FOLIAGE; role[r] = FOLIAGE_ROLE; continue; }
    // (c) A WINDOW is small, dark, roughly rectangular and set in something much lighter than itself: the same
    //     geometric rule frame.js uses, stated once here so that a pane is painted as a pane.
    if (size[r] < n * 0.02 && luma[r] < medianLuma * 0.85 && fill > 0.55 && bw > 2 && bh > 2) { ramp[r] = METAL; role[r] = PANE_ROLE; continue; }
  }

  const toneArr = new Int32Array(nr);
  for (let r = 0; r < nr; r += 1) {
    // THE VALUE COMES FIRST AND THE SHADING IS A SMALL TERM ON PURPOSE. `face` is what gives a flat shape its
    // volume, and it is bounded to a third of a tone so that it can never reorder two regions the photograph
    // says are different values: that ordering is what makes the photograph recognisable at all.
    let t = norm[r] * (STEPS - 1) + face[r] * faceWeight;
    if (atmosphere && role[r] !== PANE_ROLE && norm[r] > 0.35) {
      // distance: high in the frame and small is far away, and a far surface takes the lighter tone of its
      // own ramp. One step, because there are only four tones and the sky has to stay the lightest thing.
      const far = 0.68 * (1 - midY[r] / h) + 0.32 * (1 - Math.min(1, Math.sqrt(size[r] / n) * 3.2));
      if (far > 0.72) t += 1;
    }
    toneArr[r] = Math.max(0, Math.min(STEPS - 1, Math.round(t)));
    if (role[r] === PANE_ROLE) toneArr[r] = Math.min(1, toneArr[r]);
  }

  // ---- STAGE 3b: value separation ---------------------------------------------------------------------
  //
  // Two regions that touch must not be the same tone when the photograph says they are different values,
  // because a tone is the only thing separating them where no line is drawn: this is the "notan" half of the
  // style, and without it a wall and the house in front of it become one silhouette.
  // ONE pass over the neighbours builds the pair table, and both the value-separation pass and the line layer
  // read it. They used to build it twice, which is two million map operations on a courtyard for the same
  // answer. Both live in this scope because the line layer needs them after the separation block has closed.
  const pairs = new Map(), pairInk = new Map();
  {
    const addPair = (a, b, inkHere) => {
      if (a === b) return;
      const k = a < b ? a * nr + b : b * nr + a;
      pairs.set(k, (pairs.get(k) || 0) + 1);
      pairInk.set(k, (pairInk.get(k) || 0) + inkHere);
    };
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (x < w - 1) addPair(reg[i], reg[i + 1], inkMap[i]);
      if (y < h - 1) addPair(reg[i], reg[i + w], inkMap[i]);
    }
    const near = [...pairs.entries()].filter(([, len]) => len >= 3).map(([k, len]) => [Math.floor(k / nr), k % nr, len]);
    // An adjacency list, because the "is this tone already taken next door" question is asked once per
    // candidate move and the answer only depends on the neighbours of ONE region. Scanning the whole pair
    // table for each question is O(pairs^2) and was the last quadratic left in the transition.
    const adj = Array.from({ length: nr }, () => []);
    for (const [a, b] of near) { adj[a].push(b); adj[b].push(a); }
    const paint = new Float64Array(nr);
    for (let r = 0; r < nr; r += 1) paint[r] = 0.299 * table[ramp[r]][toneArr[r]][0] + 0.587 * table[ramp[r]][toneArr[r]][1] + 0.114 * table[ramp[r]][toneArr[r]][2];
    // The pairs are worked through in order of how badly the palette is failing to separate them: the
    // photograph's own difference, minus the difference the palette actually paints. A pair the photograph
    // divides and the palette does not is the pair that has to move.
    // A pair with a found thing on one side is worked through first and is separated even when the photograph
    // itself does not separate the two: a car the same grey as the road it is parked on is still a car.
    const want = (a, b) => (marked[a] !== marked[b] ? 1 : 0) + (Math.abs(luma[a] - luma[b]) / 255) - (Math.abs(paint[a] - paint[b]) / 255);
    near.sort((p, q) => want(q[0], q[1]) - want(p[0], p[1]));
    const taken = (r, t) => {
      for (const q of adj[r]) if (ramp[q] === ramp[r] && toneArr[q] === t) return true;
      return false;
    };
    for (const [a, b] of near) {
      const isThing = marked[a] !== marked[b];
      if (!isThing && Math.abs(luma[a] - luma[b]) / 255 < 0.09) continue;   // the photograph agrees: one value
      const apart = Math.abs(paint[a] - paint[b]) / 255;
      if (apart >= (isThing ? 0.03 : 0.075)) continue;                      // already told apart
      const dark = luma[a] < luma[b] ? a : b, lightr = dark === a ? b : a;
      if (toneArr[lightr] < STEPS - 1 && !taken(lightr, toneArr[lightr] + 1)) { toneArr[lightr] += 1; paint[lightr] = 0.299 * table[ramp[lightr]][toneArr[lightr]][0] + 0.587 * table[ramp[lightr]][toneArr[lightr]][1] + 0.114 * table[ramp[lightr]][toneArr[lightr]][2]; }
      else if (toneArr[dark] > 0 && !taken(dark, toneArr[dark] - 1)) { toneArr[dark] -= 1; paint[dark] = 0.299 * table[ramp[dark]][toneArr[dark]][0] + 0.587 * table[ramp[dark]][toneArr[dark]][1] + 0.114 * table[ramp[dark]][toneArr[dark]][2]; }
    }
  }

  // ---- STAGE 3d: THE PAINT -----------------------------------------------------------------------------
  //
  // EVERY PIXEL IS PLACED AGAINST THE PALETTE, and that is the whole look. A surface still decides the RAMP
  // for the parts of itself that have no colour of their own — a grey wall, grey asphalt, a white cloud are
  // grey, and letting each of their pixels pick a ramp from a two-degree hue difference would speckle them —
  // and a pixel that HAS a colour (chroma past 0.18) takes the ramp its own colour asks for. So:
  //
  //   ramp  = the pixel's own colour when it has one, otherwise its surface's
  //   tone  = the pixel's own value in the photograph, dithered between the two tones that bracket it
  //
  // Detail survives because a pixel is never rounded to its surface's average; the palette stays fixed because
  // a pixel can only ever be a tone of one of the eight ramps; gradients come out smooth because the ordered
  // threshold spends the two tones in proportion to the value between them; and grain cannot scatter the
  // picture because both choices are made from the fixed table, not from the photograph's palette.
  const idx = new Uint8Array(n);
  const scale = (STEPS - 1) / Math.max(24, pHi - pLo);
  for (let i = 0; i < n; i += 1) {
    const r = reg[i];
    const R = rgba[i * 4], G = rgba[i * 4 + 1], B = rgba[i * 4 + 2];
    const l = 0.299 * R + 0.587 * G + 0.114 * B;
    // ---- THE COLOUR SCRIPT ------------------------------------------------------------------------------
    //
    // What makes a small-palette game look AUTHORED rather than converted is that its colours obey one idea
    // about light. DVOR-8's idea is that every yard is the same hour: a shadow is violet and a highlight is
    // amber, whichever photograph it came from. The ramps already carry that inside themselves (the shadow end
    // of every ramp turns toward blue-violet, the light end toward yellow); this applies it to the PICTURE.
    //
    // Two rules, both bounded, and they only touch what has no colour of its own — a grey shadow, a white
    // cloud — because a coloured thing keeps its own ramp exactly as before:
    //   a grey pixel in the darkest third of the frame takes the DUSK ramp (the violet a shadow is made of)
    //   a grey pixel in the brightest tenth takes the SAND ramp (the amber of light on a wall)
    // The result is that a yard shot at noon and a yard shot at sunset still look like one game, and it costs
    // nothing that the photograph actually said: a red car is still a red car, a green tree still green.
    const own = pixelRampOf(R, G, B);
    let here = own < 0 ? ramp[r] : own;
    if (own < 0) {
      const nrm = (l - pLo) * scale / (STEPS - 1);
      // ONLY THE NEUTRAL SURFACES TAKE THE SCRIPT. The first version applied it to everything grey in the
      // darkest third of the frame and the whole of a dusk photograph came out violet — the road, the clouds,
      // the walls — which is a filter, not a colour script. What the convention actually asks for is that a
      // NEUTRAL shadow turns violet and a NEUTRAL highlight turns amber; a material keeps its own ramp, so a
      // green tree in shadow is still a green tree and a red car is still red.
      const neutral = here === RAMP_STONE || here === RAMP_METAL;
      // ...and the SKY is exempt from the highlight half: it is already the lightest thing in the frame, and
      // an amber rule applied to it turned an overcast sky cream, which is a sepia filter and not a script.
      if (neutral && nrm < 0.16) here = RAMP_DUSK;
      else if (neutral && nrm > 0.94) here = RAMP_SAND;
      else if (here === RAMP_SKY && nrm < 0.10) here = RAMP_DUSK;    // the deep end of a sky is violet, not black
    }
    let tone;
    if (maxL[r] - minL[r] < 8) {
      // A SURFACE THE PHOTOGRAPH ITSELF HAS NO DETAIL IN IS PAINTED FLAT. Without this the tone came from the
      // pixel's absolute value, and a flat mid-grey wall — whose value sits half way between two tones —
      // came out as a 50% checkerboard of both: measured on a test picture of two flat greys, one of them was
      // painted in two colours. A surface with no detail has nothing to dither between, so it takes its own
      // tone and stays one colour, which is also what keeps a wall a wall.
      tone = toneArr[r];
    } else {
      // THE DETAIL LADDER: BANDS WITH DITHERED SEAMS, not a screen over everything.
      //
      // Thresholding every pixel against the next tone up gives a picture where the whole sky is a 40% dot
      // screen — even, mechanical, and the single thing that made the first per-pixel draft look like a
      // halftone print. What a crafted small-palette picture does instead is QUANTISE to the nearest tone and
      // dither only where the value is genuinely between two of them: flat bands, with the transition spent on
      // the seam. So a dead zone of 0.22 of a tone on either side of the nearest one, and outside it a dither
      // whose density grows from nothing to one across the next 0.28. The mean is preserved — the density
      // carries exactly the distance that was rounded away — and the screen appears only where a gradient is.
      const t = Math.max(0, Math.min(STEPS - 1, (l - pLo) * scale + face[r] * faceWeight));
      const near = Math.round(t);
      const frac = t - near;
      const DEAD = 0.22, SPAN = 0.28;
      tone = near;
      if (Math.abs(frac) > DEAD) {
        const partner = near + (frac > 0 ? 1 : -1);
        if (partner >= 0 && partner < STEPS) {
          const density = Math.min(1, (Math.abs(frac) - DEAD) / SPAN);
          const x = i % w, y = (i / w) | 0;
          if (BAYER[((y & 7) << 3) | (x & 7)] < density * 64) tone = partner;
        }
      }
    }
    if (role[r] === PANE_ROLE) tone = Math.min(1, tone);
    else if (role[r] === SKY_ROLE) tone = Math.max(1, tone);
    idx[i] = here * STEPS + tone;
  }

  // AND A THING THE DETECTOR FOUND IS STILL PAINTED APART FROM ITS GROUND. With the paint per pixel this must
  // be said again in the new terms, because the value-separation stage that used to say it worked on one tone
  // per surface and the paint no longer reads that tone. Measured with the mark and without it, a thing whose
  // colour the palette maps to the same entry as its ground — a grey car on grey asphalt, which is the case
  // the marks exist for — came out exactly the colour of the road it stands on. So: a marked surface whose
  // dominant colour is also the dominant colour of an unmarked neighbour moves its own pixels one tone, in its
  // own ramp, away from the neighbour. One pass over the marked surfaces only.
  if (marks && nr > 1) {
    const paintCount = new Map();                      // region -> Map(index -> count)
    for (let i = 0; i < n; i += 1) {
      const r = reg[i];
      if (!paintCount.has(r)) paintCount.set(r, new Map());
      const m = paintCount.get(r);
      m.set(idx[i], (m.get(idx[i]) || 0) + 1);
    }
    const dominant = (r) => {
      const m = paintCount.get(r);
      if (!m) return -1;
      let best = -1, bestN = -1;
      for (const [k, c] of m) if (c > bestN) { bestN = c; best = k; }
      return best;
    };
    const boxOf = (r) => ({ x0: box[r * 4], y0: box[r * 4 + 1], x1: box[r * 4 + 2], y1: box[r * 4 + 3] });
    for (let r = 0; r < nr; r += 1) {
      if (!marked[r]) continue;
      const mine = dominant(r);
      if (mine < 0 || mine >= palette.length - 2) continue;
      let clash = false;
      const mineBox = boxOf(r);
      for (let q = 0; q < nr && !clash; q += 1) if (q !== r && !marked[q] && dominant(q) === mine && adjacent(mineBox, boxOf(q))) clash = true;
      if (!clash) continue;
      // the preferred direction is away from the middle, but a surface whose tone is already at the end of its
      // ramp has only one way to go: the other one. A single direction meant a marked thing at tone 0 was left
      // exactly the colour of its ground, which is the one case the marks exist for.
      const order = norm[r] >= 0.5 ? [1, -1] : [-1, 1];
      let to = -1;
      for (const mv of order) { const want2 = toneArr[r] + mv; if (want2 >= 0 && want2 < STEPS) { to = ramp[r] * STEPS + want2; break; } }
      if (to < 0) continue;
      for (let i = 0; i < n; i += 1) if (reg[i] === r) idx[i] = to;
    }
  }

  // ---- STAGE 4: the line layer, along the photograph's own edges ---------------------------------------
  //
  // The line is drawn where the PHOTOGRAPH has an edge, at the picture's own resolution, and nowhere else. It
  // used to be the boundary between two surfaces, which was right while a surface was one flat colour — the
  // border WAS the only structure there was. Now that every pixel is placed against the palette, the surface
  // boundary is the segmentation's opinion and it is coarse (the segmentation runs at a quarter of the pixels
  // to keep the transition quick), so drawing it would put a chunky, made-up border over a picture whose real
  // edges are already there. The ink map is computed at full resolution, so this is one pixel wide, follows
  // kerbs and rooflines, and never draws a line the photograph does not have.
  // AND THE LINE IS THE DARKEST TONE OF THE COLOUR IT SEPARATES, not one ink for the whole picture. This is the
  // pixel-art rule called selective outlining, and it is the difference between a drawing and a colouring book:
  // a single near-black contour over everything flattens a picture into a diagram, while a line in the darkest
  // tone of the surface's OWN ramp — a dark blue line on a blue sky, a dark red one on a brick wall — reads as
  // the surface turning away from the light. The shared ink is kept for one job only: a silhouette against the
  // sky, where there is nothing darker on either side to borrow a colour from.
  const OUT = palette.length - 2;
  const darkOf = new Int32Array(RAMPS.length);
  const lumOf = new Float64Array(palette.length);
  for (let k = 0; k < palette.length; k += 1) lumOf[k] = 0.299 * palette[k][0] + 0.587 * palette[k][1] + 0.114 * palette[k][2];
  for (let r = 0; r < RAMPS.length; r += 1) darkOf[r] = r * STEPS;              // tone 0 is the darkest of the ramp
  const skyRamp = 0;
  let outlinePixels = 0, inkPixels = 0, lineReads = 0;
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const i = y * w + x;
    if (inkMap[i] < inkLine) continue;
    // the two sides of this edge, and the darker of them, in the picture's own terms
    const mine = idx[i], ramp = Math.floor(mine / STEPS);
    let other = -1, darkest = mine;
    for (const j of [i - 1, i + 1, i - w, i + w]) {
      const v = idx[j];
      if (v === mine || v >= OUT) continue;
      if (other < 0 || lumOf[v] < lumOf[other]) other = v;
      if (lumOf[v] < lumOf[darkest]) darkest = v;
    }
    const againstSky = ramp === skyRamp || (other >= 0 && Math.floor(other / STEPS) === skyRamp);
    const line = darkOf[Math.floor(darkest / STEPS)];
    // THREE CASES, which is the whole of the outlining rule and the thing that makes a picture look drawn
    // rather than either flat or outlined:
    //   a silhouette, or a strong step in value, takes the INK — that is the crisp line the eye reads as shape
    //   ordinary interior structure takes the DARKEST TONE OF ITS OWN RAMP — a line that is a shade of the
    //     surface, which is what selective outlining means
    //   a line that would not actually be darker than what it crosses is not a line: the ink, or nothing
    const step = lumOf[mine] - lumOf[darkest];
    const useInk = againstSky || step >= 30 || lumOf[line] > lumOf[darkest] - 18 || lumOf[line] > 118;
    idx[i] = useInk ? OUT : line;
    outlinePixels += 1;
    if (useInk) inkPixels += 1;
    // A LINE MUST READ: it is a line only if it is darker than the pixel it replaced. Counted, not assumed,
    // because the whole point of selective outlining is that the line is a shade of the surface and not one
    // black contour over everything.
    if (lumOf[idx[i]] < lumOf[mine]) lineReads += 1;
  }

  return {
    idx, palette, outlinePixels, inkPixels, lineReads,
    regions: { label: reg, size, box, rampOf: ramp, toneOf: toneArr, nr, role, luma, ink: inkEnergy },
    light,
  };
}
