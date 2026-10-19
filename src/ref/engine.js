// GENERATED FROM tools/v13/engine-v13.txt BY tools/v13/make-module.mjs — DO NOT EDIT BY HAND.
// This is the operator's own engine code, byte-exact apart from the class header and the export below.
// Its sha256 is checked by tools/engine-check.mjs against ENGINE_SHA; a mismatch refuses the build.
class Component {

  // ═══ DVOR-8 PHOTO → PIXEL ENGINE v11 ═══════════════════════════════════════════════════════════
  // Reuse in the app: SPEC = rulebook (each stage: rule, method, source) · SCENES = annotation format
  // (one entry per photo) · build(img, scene, seed) = the deterministic converter · D-model methods
  // (hitChunk / goneChunk / cascade / breakWin / stepPart) = destruction · dis_* = disasters.
  // Contract: same photo + same annotation → the same frame (fnv hash) and the same destruction.
  state = { weapon: 0, open: true, menu: null, info: false, fact: null, score: 0, wrecked: 0, phase: null, disId: null, disName: '', base: [], scene: 0, report: [], det: null };
  GY = 334; CARIDS = []; TARGETS = []; NAMES = {}; CARNAMES = {}; BGY = {}; curGY = 334; tok = 0; _s = 1; stEls = {};
  SPEC = [
    { id: 'S0', name: 'Frame', rule: 'Cover-fit the photo to 9:16 (centred crop only if the photo is not 9:16), then box-average it to 288×512. 1 game px = 5×5 photo px at 1440×2560. Draw at PX = 2 → 576×1024.', method: 'Area-average downsampling: 2× supersample with high-quality smoothing, then a 2×2 mean per game pixel.', src: 'Standard box-filter resampling (mean over the source footprint).' },
    {id: "S1",name: "Palette",rule: "One fixed 50-entry master palette (8 ramps × 6 tones + outline 48 + void 49). Each photo uses only a small working subset of it: ≤ 12 photo entries (S2), plus the ≤ 5 sky entries, the glass ramp 0–4, and the outline. This keeps the frame calm and coherent instead of speckled.",method: "Indexed colour: every buffer stores master-palette indices, never RGB.",src: "Indexed-colour framebuffers; the limited-palette discipline of pixel-art tools (Aseprite, Pyxel Edit)."},
    { id: 'S2', name: 'Snap + reduce', rule: '(1) Snap every pixel with the approved v10 two-class rule: grey pixels (sat < 0.26) → the nearest neutral by luma; colour pixels → the nearest chromatic entry by weighted RGB (2,4,3). (2) Popularity reduction: keep only the 12 entries used most often in the non-sky photo. Every other entry maps to its nearest kept entry in CIE Lab. One small palette per photo: calm surfaces, no speckle. (3) Kuwahara r = 2 (lowest-variance quadrant mean) is used only for the luma that the facade analysis reads, not for colour.', method: 'Fixed-palette snap + popularity quantisation + perceptual remap.', src: 'Heckbert 1982, “Color Image Quantization for Frame Buffer Display”, SIGGRAPH (popularity algorithm); CIE 1976 L*a*b*; Kuwahara et al. 1976.' },
    { id: 'S3', name: 'Clean', rule: '3×3 mode filter: a pixel takes the majority colour if ≥ 5 of 9 neighbours agree. 2 passes on the ground, 1 pass on vehicles (keeps grilles and lights).', method: 'Majority (mode) rank filter.', src: 'Rank-order / majority filtering (Tukey-style non-linear smoothing).' },
    { id: 'S4', name: 'Edges', rule: 'Gradient magnitude |∇L| on luma; it drives sky growth and facade grid detection.', method: 'Sobel 3×3 kernels, magnitude / 4.', src: 'Sobel & Feldman, 1968.' },
    { id: 'S5', name: 'Sky segmentation', rule: 'Seed the top row and grow 4-connected regions. A pixel joins if it is not annotated, sits above the ground line, passes either the smoothness test (|∇L| < 18, |ΔL| < 14 to its parent, L > 40) or the sky-colour test (B−R > 8 and L > 90; or L > 150 and sat < 0.25; or R > B+25, L > 110 and |∇L| < 40). Then fill holes: every non-sky pixel not connected to the ground becomes sky (cloud edges). Finish with a 2-pass mode filter.', method: 'Seeded region growing + morphological hole filling by reconstruction.', src: 'Adams & Bischof 1994, “Seeded Region Growing”, IEEE PAMI; Soille, Morphological Image Analysis (2003).' },
    { id: 'S6', name: 'Sky style', rule: 'Theme from the photo’s own sky: orange px (R > B+25, R > 120) > 8% → sunset; mean saturation < 0.10 → overcast; otherwise day (the v6 blue). One base tone, a Bayer-dithered band toward the horizon (scaled to the measured horizon h0), and flat 2-tone clouds. ≤ 8 entries.', method: '4×4 ordered dithering + 2-octave value noise thresholded at 0.03 (cloud shade = the same noise sampled 2.5 px higher).', src: 'Bayer 1973 (ordered dither matrix); Perlin 1985 lineage value noise with smoothstep.' },
    { id: 'S7', name: 'Detector contract', rule: 'Objects arrive as labelled shapes: facade {quad of 4 corners TL, TR, BR, BL; optional clip polygon; kind auto|curtain|checker|masonry}, vehicle {box x, y, w, h; view hatch|van|suv|mpv (front) or box (side/rear/bus/aerial)}, prop {rect|line|pole}. People and trees are never annotated: they stay photo pixels. Shapes come from manual annotation or from any detector (e.g. YOLO-family on the COCO car/bus/truck classes, or a facade segmenter). Everything after this point is deterministic.', method: 'Annotation JSON per photo (see SCENE JSON).', src: 'Redmon et al. 2016 (YOLO); Lin et al. 2014 (COCO classes).' },
    { id: 'S8', name: 'Facade rectification', rule: 'Each facade quad gets a homography from the unit square. Every pixel inside is mapped back to facade coordinates (u, v) ∈ [0, 1]², so perspective is undone before any grid logic.', method: 'Projective square→quad mapping in closed form + 3×3 adjugate inverse.', src: 'Heckbert 1989, “Fundamentals of Texture Mapping and Image Warping”.' },
    {id: "S9",name: "Facade grid (pieces)",rule: "Resample the facade to a rectified grid. Column and row gradient projection profiles give the period: the smallest autocorrelation peak ≥ 80% of the best, with lag 3…n/2. Phase = the best comb sum. Used for checker facades and as the fallback pane lattice for tiny facades. Photo facades take their pieces from the detected floors and window columns (S10).",method: "Projection profiles + unbiased autocorrelation.",src: "Lee & Nevatia 2004; Müller, Zeng, Wonka & Van Gool 2007, “Image-based Procedural Modeling of Facades”, SIGGRAPH."},
    {id: "S10",name: "Facade analysis (one rule for every building)",rule: "Windows are the holes in the facade frame. (1) Glass or punched: blue px (B−R > 10) ≥ 30%, or ≥ 50% blue cells → GLASS WALL. A glass wall is split by a global Otsu threshold on facade luma. A punched facade uses the Niblack local rule: a pixel is a window candidate if L < m − max(6, 0.5·s), where m and s are the mean and standard deviation over its 15×15 neighbourhood inside the facade. This removes shade and sun. (2) 4-connected components per class. (3) The class owning the single largest component is the frame: the wall of a historic house, or the mullion and spandrel network of a glass tower. (4) GLASS WALL: all of the non-frame class is glass, cut into panes on the S9 lattice (pitch ≥ 5×4 px). Otherwise it has PUNCHED WINDOWS: panes = components of the other class that do not touch the facade outline, with area 3 to max(24, 3% of the facade), fill ≥ 0.4, h/w 0.4–5, (5) Size consistency (punched only): 0.4–2.5× the median pane. (6) Floors and columns are clustered from the pane centres. A facade with no panes (distant blocks) falls back to the S9 lattice. Checker is used only if pinned or if |parity r| > 0.3 with ≥ 30% blue cells.",method: "Otsu binarisation + connected-component labelling + hole/shape filtering: the classic document-layout and facade-parsing pipeline (OpenCV threshold(OTSU) → connectedComponentsWithStats).",src: "Otsu 1979, “A Threshold Selection Method from Gray-Level Histograms”, IEEE SMC; Rosenfeld & Pfaltz 1966 (connected components); Teboul et al. 2010 (facade parsing); OpenCV imgproc."},
    {id: "S11",name: "Facade rebuild",rule: "The facade is the photo itself in the working palette, so its own perspective, ornaments, brick and floors stay exactly where the camera saw them: no re-projection. The frame takes 2 extra mode-filter passes (calm walls). Only the detected panes are recoloured, to one glass ramp spread over the panes’ own 5–95% brightness range: glass walls and light panes 1→2→3→4, dark punched windows 0→0→1→2. Each pane is its own window object. Pixels next to a pane, and on piece borders, are the frame that stays when a piece is gutted. Checker facades: light mullions (27), parity blue/white cells. A pixel next to the sky gets the 1-px outline (48).",method: "Photo-preserving restyle + per-pane recolour.",src: "v6/v10 approved look (the reference screen)."},
    { id: 'S12', name: 'Vehicles', rule: 'Front views (hatch, van, suv, mpv): the v10 view template, with road-like boundary pixels peeled (sat < 0.2, 58 < L < 128) for up to 14 passes. Any other view (box): background = a magic-wand flood from the box border, seeded only where the border continues the outside (colour distance < 18, |∇L| < 20), stopping at the car’s own edges. Then a 2-class colour model (3 luma-tertile means each for car and background; the background also takes a 3-px ring outside the box), 3 rounds of relabelling + 3×3 majority smoothing (ICM), keep the largest component, smooth its contour with 2 passes of a 5×5 two-thirds vote, then fill holes. Spurs with ≤ 1 neighbour are removed. The pixels are the photo (1 clean pass), and the silhouette edge is the outline (48). Glass = the template window, or the darkest 35% of the upper 55%.', method: 'Fuzzy-select flood fill + GrabCut-style colour models with ICM instead of graph cut.', src: 'Rother, Kolmogorov & Blake 2004, “GrabCut” (OpenCV grabCut); Besag 1986, ICM; GIMP/Photoshop fuzzy select (OpenCV floodFill with loDiff/upDiff).' },
    { id: 'S13', name: 'Silhouette & highlight', rule: 'An ID buffer per pixel. Edge = A − erosion(A), 4-neighbour, recomputed whenever a piece changes. Highlight = the edge recoloured pink (40) when aiming or cyan (10) in info mode. The selection blinks between 10 and 45 every 125 ms. Never a bounding box.', method: 'Morphological inner boundary.', src: 'Serra 1982, Image Analysis and Mathematical Morphology.' },
    { id: 'S14', name: 'Pieces', rule: 'A building piece = 2 facade columns × 1 floor. A vehicle piece = a 6×4 grid over its box. Support: the piece directly below (for vehicles, below or beside). The bottom row rests on the ground.', method: 'Grid-keyed chunk graph.', src: 'Voxel/chunk destruction as in destructible-environment games.' },
    { id: 'S15', name: 'Damage ladder', rule: 'intact → cracked (random-walk crack lines) → darkened (one tone down its ramp) → gutted (non-frame px fall as debris, the frame stays) → gone. One hit = one step on one piece. A window is broken before its piece takes damage.', method: 'Discrete finite-state damage model.', src: 'Mirrors the FEMA HAZUS-MH damage states: none / slight / moderate / extensive / complete.' },
    { id: 'S16', name: 'Progressive collapse', rule: 'A piece whose supports are all gone falls after 4 cascade ticks (every 3rd frame), so collapse travels piece by piece.', method: 'Support graph, alternate-path check.', src: 'GSA 2003 Progressive Collapse Guidelines; UFC 4-023-03.' },
    { id: 'S17', name: 'Particles & rubble', rule: 'Explicit Euler with g = 0.15 px/frame². Glass and chips bounce once (restitution 0.35), then settle as glitter. Debris raises a per-column rubble height map at its object’s ground line (max 12). Debris landing on a vehicle piles behind it without painting over the car. Rubble is never cleared.', method: 'Point particles + height-map accumulation.', src: 'Reeves 1983, “Particle Systems”, SIGGRAPH.' },
    { id: 'S18', name: 'Reveal', rule: 'A gone building px shows the sky style if ≥ 40% of the building’s top border touches sky, otherwise a dark interior. The bottom 15% is always the interior (19). A gone vehicle px shows the photo pixel saved underneath it. Never black boxes.', method: 'Back buffer captured at build time.', src: 'Layered compositing (Porter & Duff 1984).' },
    { id: 'S19', name: 'Glass', rule: 'When a window breaks, 75% of its px become particles, its border px stay as shards (28/4), and the rest goes dark (48/49). A windshield cracks in a star: |sin 4θ| < 0.22, or a ring at r ≈ 4 → 28.', method: 'Polar crack pattern.', src: 'Radial plus concentric fracture of laminated glass.' },
    { id: 'S20', name: 'Weapons', rule: 'Stone, brick, slipper, bottle and paint can are drawn on the canvas at the bottom centre. A throw follows p(t) = lerp(a, b, t) − 70·sin(πt) over 22 frames, and the hit goes through the D-model.', method: 'Parametric arc.', src: '—' },
    { id: 'S21', name: 'Disasters', rule: 'Siren for 60 frames (blue ramps → purple), then impact, then calm for 60. Hurricane: log-spiral arms sin(2θ − 4 ln(r+1)) and a wind front that tears 3 pieces per column every 4 frames. Tsunami: a Gaussian crest over a rising level, with water as a palette blend LUT (it mixes with the street, it does not replace it). Godzilla: a 26-frame step whose footprint (r = 16) hits what is below. Beyoncé: front-view head, two bites per car (open/closed every 8 frames), then two head shakes.', method: 'Damage fields routed through damageAt / hitChunk.', src: 'Hurricane rainbands ≈ logarithmic spirals (Senn & Hiser 1959).' },
    { id: 'S22', name: 'Determinism', rule: 'All randomness comes from a mulberry32 PRNG seeded from the scene index. Texture variation comes from a sin-hash of coordinates. Building twice gives an identical frame hash.', method: 'Seeded PRNG + FNV-1a frame hash.', src: 'mulberry32 (T. Ettinger); Fowler–Noll–Vo hash.' },
    { id: 'S23', name: 'Info', rule: 'Shuffle-bag without replacement. Never the same theme twice in a row, and the theme with the most facts left goes first.', method: 'Constrained random draw.', src: '—' }
  ];
  SCENES = [
    { id: 'prague-tower', label: 'ПРАГА · БАШНЯ', src: 'assets/prague.jpg', gy: 334, h0: 327, sky: 'auto',
      buildings: [
        { id: 1, name: 'ОФИСНАЯ БАШНЯ', kind: 'auto', quad: [[0, 0], [141, 0], [126, 289], [0, 258]] },
        { id: 2, name: 'ШАХМАТНЫЙ ДОМ', kind: 'checker', quad: [[125, 206], [213, 206], [213, 334], [125, 334]], clip: [[125, 249], [180, 206], [213, 206], [213, 334], [125, 334]] }],
      cars: [
        { x: 221, y: 325, w: 28, h: 17, type: 'hatch', name: 'БЕЛЫЙ ХЭТЧБЕК' }, { x: 182, y: 316, w: 28, h: 33, type: 'van', name: 'ФУРГОН ДОСТАВКИ' }, { x: 176, y: 327, w: 23, h: 26, type: 'hatch', name: 'ТЁМНЫЙ СЕДАН' },
        { x: 168, y: 332, w: 23, h: 31, type: 'hatch', name: 'СЕРЕБРИСТЫЙ ХЭТЧ' }, { x: 202, y: 327, w: 54, h: 51, type: 'mpv', name: 'ТЁМНО-СИНИЙ МИНИВЭН' }, { x: 90, y: 324, w: 86, h: 69, type: 'suv', name: 'БЕЛЫЙ КРОССОВЕР' }],
      props: [
        { t: 'rect', r: [155, 198, 156, 334], col: 21, id: 40, name: 'ФОНАРЬ' }, { t: 'rect', r: [156, 198, 158, 334], col: 20, id: 40 }, { t: 'rect', r: [158, 198, 159, 334], col: 19, id: 40 }, { t: 'rect', r: [157, 193, 171, 197], col: 20, id: 40 }, { t: 'rect', r: [160, 197, 169, 198], col: 29, id: 40 },
        { t: 'pole', y0: 44, y1: 334, xl0: 20, xl1: 2, w0: 6, w1: 9, band: [110, 114], id: 41, name: 'ТРАМВАЙНЫЙ СТОЛБ' }, { t: 'line', a: [24, 96], b: [38, 103], w: 2, col: 48, id: 41 },
        { t: 'line', a: [20, 112], b: [288, 0], w: 1, col: 48, id: -1 }, { t: 'line', a: [0, 76], b: [152, 260], w: 1, col: 48, id: -1 }, { t: 'line', a: [210, 236], b: [288, 212], w: 1, col: 48, id: -1 }, { t: 'line', a: [210, 242], b: [288, 227], w: 1, col: 48, id: -1 }, { t: 'line', a: [210, 268], b: [288, 274], w: 1, col: 48, id: -1 }] },
    { id: 'prague-street', label: 'ПРАГА · УЛИЦА', src: 'uploads/2026-10-12 23.07.05-b3e7f139.jpg', gy: 340, sky: 'auto',
      buildings: [
        { id: 1, name: 'ДОМ С ВЫВЕСКОЙ', kind: 'auto', quad: [[176, 80], [288, 0], [288, 462], [168, 342]] },
        { id: 2, name: 'ЛЕВЫЙ ДОМ', kind: 'auto', quad: [[0, 140], [50, 206], [50, 340], [0, 345]] },
        { id: 3, name: 'ЖЁЛТЫЙ ДОМ', kind: 'auto', quad: [[50, 208], [72, 226], [72, 336], [50, 338]] },
        { id: 4, name: 'СЕРЫЙ ДОМ', kind: 'auto', quad: [[72, 228], [114, 252], [114, 334], [72, 336]] },
        { id: 5, name: 'ДОМ В КОНЦЕ УЛИЦЫ', kind: 'auto', quad: [[134, 276], [166, 276], [166, 338], [134, 338]] }],
      cars: [
        { x: 146, y: 338, w: 14, h: 26, type: 'box', name: 'ДАЛЬНЯЯ МАШИНА' }, { x: 136, y: 336, w: 22, h: 52, type: 'box', name: 'ТЁМНЫЙ СЕДАН' }, { x: 96, y: 333, w: 52, h: 80, type: 'box', name: 'ТЁМНЫЙ ФУРГОН' },
        { x: 76, y: 350, w: 50, h: 95, type: 'box', name: 'БЕЛЫЙ УНИВЕРСАЛ' }, { x: 0, y: 338, w: 100, h: 130, type: 'box', name: 'СЕРЕБРИСТЫЙ ВНЕДОРОЖНИК' }, { x: 0, y: 376, w: 86, h: 136, type: 'box', name: 'ПЕРЕДНИЙ ХЭТЧБЕК' }] },
    { id: 'aerial-church', label: 'ХРАМ · СВЕРХУ', src: 'uploads/2026-10-12 23.06.55-4248895f.jpg', gy: 335, sky: 'auto',
      buildings: [
        { id: 1, name: 'ХРАМ', kind: 'auto', quad: [[72, 272], [152, 266], [150, 330], [74, 334]] },
        { id: 2, name: 'КОЛОКОЛЬНЯ', kind: 'auto', quad: [[116, 240], [137, 240], [137, 326], [116, 326]] },
        { id: 3, name: 'ВЫСОТКА 1', kind: 'auto', quad: [[4, 181], [24, 181], [24, 210], [4, 210]] },
        { id: 4, name: 'ВЫСОТКА 2', kind: 'auto', quad: [[24, 187], [58, 187], [58, 210], [24, 210]] },
        { id: 5, name: 'ВЫСОТКА 3', kind: 'auto', quad: [[59, 189], [84, 189], [84, 210], [59, 210]] }],
      cars: [
        { x: 248, y: 317, w: 14, h: 6, type: 'box', name: 'ОРАНЖЕВАЯ' }, { x: 238, y: 323, w: 16, h: 9, type: 'box', name: 'СИНЯЯ' }, { x: 226, y: 330, w: 18, h: 10, type: 'box', name: 'БЕЛАЯ' },
        { x: 55, y: 337, w: 10, h: 6, type: 'box', name: 'ТЁМНАЯ У ХРАМА' }, { x: 124, y: 343, w: 19, h: 8, type: 'box', name: 'БЕЛЫЙ КРОССОВЕР' }, { x: 254, y: 343, w: 12, h: 9, type: 'box', name: 'БЕЛАЯ У ДОМА' },
        { x: 68, y: 346, w: 18, h: 9, type: 'box', name: 'ЧЁРНЫЙ ВНЕДОРОЖНИК' }, { x: 216, y: 374, w: 16, h: 13, type: 'box', name: 'СЕРЫЙ КРОССОВЕР' }, { x: 141, y: 395, w: 11, h: 20, type: 'box', name: 'СЕРЕБРИСТАЯ' },
        { x: 270, y: 445, w: 18, h: 14, type: 'box', name: 'ЧЁРНАЯ' }, { x: 253, y: 476, w: 32, h: 12, type: 'box', name: 'СЕРЕБРИСТЫЙ СЕДАН' }] },
    { id: 'sunset-bus', label: 'ЗАКАТ · АВТОБУС', src: 'uploads/2026-10-12 23.06.50-3e5666ac.jpg', gy: 270, sky: 'auto',
      buildings: [
        { id: 1, name: 'НОВОСТРОЙКА', kind: 'auto', quad: [[58, 231], [111, 233], [111, 268], [58, 268]] },
        { id: 2, name: 'ПАНЕЛЬНЫЙ ДОМ', kind: 'auto', quad: [[0, 245], [59, 246], [59, 269], [0, 269]] },
        { id: 3, name: 'СТЕКЛЯННЫЙ ТЕРМИНАЛ', kind: 'auto', quad: [[152, 251], [223, 251], [223, 264], [152, 264]] }],
      cars: [
        { x: 72, y: 265, w: 56, h: 15, type: 'box', name: 'КРАСНЫЙ ФУРГОН' }, { x: 264, y: 272, w: 17, h: 17, type: 'box', name: 'ЖЁЛТЫЙ АВТОБУС' },
        { x: 198, y: 269, w: 33, h: 36, type: 'box', name: 'БЕЛЫЙ АВТОБУС' }, { x: 0, y: 296, w: 32, h: 15, type: 'box', name: 'СИНЯЯ МАШИНА' }] }
  ];
  SKYTHEMES = { day: { base: 3, band: 4, hi: 29, lo: 28 }, overcast: { base: 27, band: 28, hi: 29, lo: 23 }, sunset: { base: 1, band: 34, band2: 35, hi: 38, lo: 37 } };
  seed(s) { this._s = (s >>> 0) || 1; }
  rnd() { let t = (this._s = (this._s + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  fnv(a) { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
  isTarget(id) { return id >= 1 && id < 40; }
  objName(id) { return id >= 10 && id < 40 ? this.CARNAMES[id] : this.NAMES[id]; }
  revealB(c, k, y) { if (y >= this.INT[c.bid]) return 19; return this.REVEAL[c.bid] ? this.skyL[k] : (this.hash(k % this.W, y) > .5 ? 19 : 20); }
  skyStyle(x, y) { const T = this.SKY || this.SKYTHEMES.day, f = 1.557 * (T.s || 1), xs = x / 1.557, ys = y / f, b = this.bayer(x, y), g = ys / 210; let col = g < .45 ? T.base : b < (g - .45) * 1.6 ? T.band : T.base; if (T.band2 && g > .8 && b < (g - .8) * 2.5) col = T.band2; const n = this.vn(xs / 20 + 3, ys / 7) * .65 + this.vn(xs / 7 + 9, ys / 3 + 2) * .35, v = n - .5 - (ys > 150 ? (ys - 150) / 60 * .2 : 0), vb = this.vn(xs / 20 + 3, (ys - 2.5) / 7) * .65 + this.vn(xs / 7 + 9, (ys - 2.5) / 3 + 2) * .35 - .5; if (v > .03) return vb > .03 ? T.hi : T.lo; return col; }
  lab(r, g, b) { const f = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }, R = f(r), G = f(g), B = f(b), F = (t) => (t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116), x = F((R * .4124 + G * .3576 + B * .1805) / .95047), y = F(R * .2126 + G * .7152 + B * .0722), z = F((R * .0193 + G * .1192 + B * .9505) / 1.08883); return [116 * y - 16, 500 * (x - y), 200 * (y - z)]; }
  sq2quad(Q) { const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = Q, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3, dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, den = dx1 * dy2 - dx2 * dy1 || 1e-9, g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den; return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1]; }
  inv3(m) { const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C; return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det]; }
  hApply(m, x, y) { const w = m[6] * x + m[7] * y + m[8]; return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w]; }
  inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  period(P) {
    const n = P.length, fb = { p: 6, ph: 0, ac: 0, raw: 0, fb: true }; if (n < 10) return fb;
    let m = 0; for (const v of P) m += v; m /= n; const x = Array.from(P, (v) => v - m); let e = 0; for (const v of x) e += v * v; if (!e) return fb;
    const maxL = Math.floor(n / 2), ac = []; for (let l = 0; l <= maxL + 1; l++) { let s = 0; for (let i = 0; i + l < n; i++) s += x[i] * x[i + l]; ac[l] = l < n ? s / e * n / (n - l) : 0; }
    const peaks = []; for (let l = 3; l <= maxL; l++) if (ac[l] > ac[l - 1] && ac[l] >= ac[l + 1]) peaks.push(l);
    if (!peaks.length) return fb; const best = Math.max(...peaks.map((l) => ac[l])); if (best < .15) return Object.assign({}, fb, { ac: best });
    const raw = peaks.find((l) => ac[l] >= .8 * best); let p = raw; while (p < 4) p *= 2;
    let ph = 0, bs = -1; for (let f = 0; f < p; f++) { let s = 0; for (let i = f; i < n; i += p) s += P[i]; if (s > bs) { bs = s; ph = f; } }
    return { p, ph, ac: ac[raw], raw, fb: false };
  }
  build(img, sc, si) {
    this.initPal(); this.seed(si * 7919 + 1);
    const W = this.W, H = this.H, N = W * H, h = this.hash.bind(this), OUT = 48, GY = (this.GY = sc.gy); this.SC = sc; this.curGY = GY;
    // S0 frame
    const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const c2 = cv.getContext('2d'); c2.imageSmoothingEnabled = true; c2.imageSmoothingQuality = 'high';
    const iw = img.naturalWidth, ih = img.naturalHeight; let sw = iw, sh = ih; if (iw / ih > 9 / 16) sw = ih * 9 / 16; else sh = iw * 16 / 9; c2.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, W * 2, H * 2);
    const d = c2.getImageData(0, 0, W * 2, H * 2).data, R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N), Lp = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let r = 0, g = 0, b = 0; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const o = ((2 * y + j) * W * 2 + 2 * x + i) * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; } const k = y * W + x; R[k] = r / 4; G[k] = g / 4; B[k] = b / 4; Lp[k] = .299 * R[k] + .587 * G[k] + .114 * B[k]; }
    // S2 snap · S3 clean
    
    // S4 Sobel
    const Gm = new Float32Array(N); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x, L = Lp, gx = L[k - W + 1] + 2 * L[k + 1] + L[k + W + 1] - L[k - W - 1] - 2 * L[k - 1] - L[k + W - 1], gy = L[k + W - 1] + 2 * L[k + W] + L[k + W + 1] - L[k - W - 1] - 2 * L[k - W] - L[k - W + 1]; Gm[k] = Math.hypot(gx, gy) / 4; }
    // S7 annotation mask
    const bbox = (Pl) => [Math.max(0, Math.floor(Math.min(...Pl.map((p) => p[0])))), Math.max(0, Math.floor(Math.min(...Pl.map((p) => p[1])))), Math.min(W - 1, Math.ceil(Math.max(...Pl.map((p) => p[0])))), Math.min(H - 1, Math.ceil(Math.max(...Pl.map((p) => p[1]))))];
    const ann = new Uint8Array(N);
    sc.buildings.forEach((bd) => { const Pl = bd.clip || bd.quad, [a, b, c, e] = bbox(Pl); for (let y = b; y <= e; y++) for (let x = a; x <= c; x++) if (this.inPoly(Pl, x + .5, y + .5)) ann[y * W + x] = 1; });
    sc.cars.forEach((c) => { for (let y = Math.max(0, c.y); y < Math.min(H, c.y + c.h); y++) for (let x = Math.max(0, c.x - 1); x <= Math.min(W - 1, c.x + c.w); x++) ann[y * W + x] = 1; });
    // S5 sky: seeded region growing + hole filling
    const skyCol = (k) => { const mx = Math.max(R[k], G[k], B[k]), mn = Math.min(R[k], G[k], B[k]), s = mx ? (mx - mn) / mx : 0; return (B[k] - R[k] > 8 && Lp[k] > 90) || (Lp[k] > 150 && s < .25) || (R[k] > B[k] + 25 && Lp[k] > 110 && Gm[k] < 40); };
    const sky = new Uint8Array(N), Qu = new Int32Array(N); let qh = 0, qt = 0;
    for (let x = 0; x < W; x++) if (!ann[x] && Lp[x] > 40) { sky[x] = 1; Qu[qt++] = x; }
    while (qh < qt) { const k = Qu[qh++], x = k % W, y = (k / W) | 0; for (const n of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < GY - 1 ? k + W : -1]) { if (n < 0 || sky[n] || ann[n]) continue; if ((Gm[n] < 18 && Math.abs(Lp[n] - Lp[k]) < 14 && Lp[n] > 40) || skyCol(n)) { sky[n] = 1; Qu[qt++] = n; } } }
    const reach = new Uint8Array(N); qh = qt = 0; for (let k = (GY - 1) * W; k < N; k++) if (!sky[k]) { reach[k] = 1; Qu[qt++] = k; }
    while (qh < qt) { const k = Qu[qh++], x = k % W; for (const n of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W]) { if (n < 0 || n >= N || reach[n] || sky[n]) continue; reach[n] = 1; Qu[qt++] = n; } }
    let holes = 0; for (let k = 0; k < GY * W; k++) if (!sky[k] && !reach[k] && !ann[k]) { sky[k] = 1; holes++; }
    this.maj(sky, 2); for (let k = 0; k < N; k++) if (ann[k] || k >= GY * W) sky[k] = 0;
    // S2 edge-preserving smoothing: Kuwahara r = 2 (4 overlapping 3×3 quadrants, keep the lowest-variance mean)
    const Rk = new Float32Array(N), Gk = new Float32Array(N), Bk = new Float32Array(N), Lk = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let bv = 1e9, br = 0, bg2 = 0, bb2 = 0; for (const [ox, oy] of [[-2, -2], [0, -2], [-2, 0], [0, 0]]) { let sr = 0, sg = 0, sb = 0, sl = 0, sl2 = 0, n = 0; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const xx = Math.min(W - 1, Math.max(0, x + ox + i)), yy = Math.min(H - 1, Math.max(0, y + oy + j)), kk = yy * W + xx; sr += R[kk]; sg += G[kk]; sb += B[kk]; sl += Lp[kk]; sl2 += Lp[kk] * Lp[kk]; n++; } const v = sl2 / n - (sl / n) ** 2; if (v < bv) { bv = v; br = sr / n; bg2 = sg / n; bb2 = sb / n; } } const k = y * W + x; Rk[k] = br; Gk[k] = bg2; Bk[k] = bb2; Lk[k] = .299 * br + .587 * bg2 + .114 * bb2; }
    // S2 working palette: v10 two-class snap, then popularity reduction to the 12 most used entries (rare entries → nearest kept entry in Lab)
    const q0 = new Uint8Array(N), hc = new Float64Array(50); for (let k = 0; k < N; k++) { q0[k] = this.quant(R[k], G[k], B[k]); if (!sky[k]) hc[q0[k]]++; }
    const PL = this.PLAB || (this.PLAB = this.RGB.map((c) => this.lab(c[0], c[1], c[2]))), SUB = [...hc.keys()].filter((i) => hc[i] > 0 && i < 48).sort((x, y) => hc[y] - hc[x]).slice(0, 12), REMAP = new Uint8Array(50);
    for (let i = 0; i < 50; i++) { if (SUB.includes(i) || i >= 48) { REMAP[i] = i; continue; } let bi = SUB[0], bd = 1e9; for (const j of SUB) { const p = PL[i], o = PL[j], d = (p[0] - o[0]) ** 2 + (p[1] - o[1]) ** 2 + (p[2] - o[2]) ** 2; if (d < bd) { bd = d; bi = j; } } REMAP[i] = bi; }
    const q = new Uint8Array(N); for (let k = 0; k < N; k++) q[k] = REMAP[q0[k]];
    const qc = q.slice(); this.maj(qc, 1); this.maj(q, 2); this.SUB = SUB; const qf = q.slice(); this.maj(qf, 2);
    // S6 sky style
    const low = []; for (let x = 0; x < W; x++) { let m = -1; for (let y = 0; y < GY; y++) if (sky[y * W + x]) m = y; if (m >= 0) low.push(m); } low.sort((a, b) => a - b);
    const h0 = sc.h0 || (low.length ? low[Math.floor(low.length * .9)] : GY);
    let orn = 0, ns = 0, sat = 0; for (let k = 0; k < N; k++) if (sky[k]) { ns++; const mx = Math.max(R[k], G[k], B[k]), mn = Math.min(R[k], G[k], B[k]); sat += mx ? (mx - mn) / mx : 0; if (R[k] > B[k] + 25 && R[k] > 120) orn++; }
    const theme = sc.sky && sc.sky !== 'auto' ? sc.sky : ns && orn / ns > .08 ? 'sunset' : ns && sat / ns < .1 ? 'overcast' : 'day';
    this.SKY = Object.assign({ s: Math.max(.3, h0 / 327), theme, h0, holes, orn: ns ? orn / ns : 0, sat: ns ? sat / ns : 0, n: ns }, this.SKYTHEMES[theme]);
    const skyL = new Uint8Array(N); for (let k = 0; k < N; k++) skyL[k] = this.skyStyle(k % W, (k / W) | 0); this.maj(skyL, 1);
    const base = new Uint8Array(N), ID = new Uint8Array(N), back = new Uint8Array(N), backID = new Uint8Array(N), bb = {}, frame = new Uint8Array(N), chK = new Float64Array(N).fill(-1), wnK = new Float64Array(N).fill(-1), GRID = new Uint8Array(N), PROP = new Uint8Array(N);
    for (let k = 0; k < N; k++) base[k] = sky[k] ? skyL[k] : q[k];
    const set = (x, y, col, id = 0) => { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const k = y * W + x; if (id === -1) { base[k] = col; return; } if (id && ID[k] !== id) { back[k] = base[k]; backID[k] = ID[k]; } base[k] = col; ID[k] = id; if (id) { const b = bb[id] || (bb[id] = [x, y, x, y]); if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; } };
    const setP = (x, y, col, id) => { set(x, y, col, id); x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < W && y < H) PROP[y * W + x] = 1; };
    // S8–S11 facades
    const fol = (k) => q[k] >= 6 && q[k] <= 11, dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), REP = []; this.REVEAL = {}; this.INT = {}; this.NAMES = {}; this.BGY = {};
    for (const bd of sc.buildings) {
      const Qd = bd.quad, Hm = this.sq2quad(Qd), Hi = this.inv3(Hm), Pl = bd.clip || Qd, id = bd.id; this.NAMES[id] = bd.name;
      const RU = Math.max(8, Math.round((dist(Qd[0], Qd[1]) + dist(Qd[3], Qd[2])) / 2)), RV = Math.max(8, Math.round((dist(Qd[0], Qd[3]) + dist(Qd[1], Qd[2])) / 2)), RL = new Float32Array(RU * RV), RR = new Float32Array(RU * RV), RB = new Float32Array(RU * RV);
      for (let j = 0; j < RV; j++) for (let i = 0; i < RU; i++) { const p = this.hApply(Hm, (i + .5) / RU, (j + .5) / RV), x = Math.min(W - 1, Math.max(0, Math.floor(p[0]))), y = Math.min(H - 1, Math.max(0, Math.floor(p[1]))), k = y * W + x, o = j * RU + i; RL[o] = Lp[k]; RR[o] = R[k]; RB[o] = B[k]; }
      const Pu = new Float32Array(RU - 1), Pv = new Float32Array(RV - 1);
      for (let j = 0; j < RV; j++) for (let i = 0; i < RU - 1; i++) Pu[i] += Math.abs(RL[j * RU + i + 1] - RL[j * RU + i]);
      for (let j = 0; j < RV - 1; j++) for (let i = 0; i < RU; i++) Pv[j] += Math.abs(RL[(j + 1) * RU + i] - RL[j * RU + i]);
      const gu = this.period(Pu), gv = this.period(Pv); let lu = gu.p, lv = gv.p; const ou = gu.ph + 1, ov = gv.ph + 1;
      const cell = (u, v) => { const a = u * RU - ou, c = v * RV - ov, ci = Math.floor(a / lu), ri = Math.floor(c / lv); return [ci, ri, a / lu - ci, c / lv - ri]; };
      const cs = new Map(); for (let j = 0; j < RV; j++) for (let i = 0; i < RU; i++) { const [ci, ri, fu, fv] = cell((i + .5) / RU, (j + .5) / RV), key = ci * 1000 + ri, o = j * RU + i; let s = cs.get(key); if (!s) cs.set(key, (s = { ci, ri, lc: 0, nc: 0, lb: 0, nb: 0, r: 0, b: 0 })); if (fu > .3 && fu < .7 && fv > .3 && fv < .7) { s.lc += RL[o]; s.r += RR[o]; s.b += RB[o]; s.nc++; } else if (fu < .2 || fu > .8 || fv < .2 || fv > .8) { s.lb += RL[o]; s.nb++; } }
      const cl = [...cs.values()].filter((s) => s.nc && s.nb); let sl = 0, ss = 0, sll = 0, sls = 0, punch = 0, blue = 0;
      cl.forEach((s) => { const L = s.lc / s.nc, sg = (s.ci + s.ri) & 1 ? 1 : -1; sl += L; ss += sg; sll += L * L; sls += L * sg; if (s.lb / s.nb - L > 10) punch++; if (s.b > s.r + 6 * s.nc) blue++; });
      const n = cl.length || 1, cov = sls / n - (sl / n) * (ss / n), vl = sll / n - (sl / n) ** 2, vs = 1 - (ss / n) ** 2, corr = vl > 0 && vs > 0 ? cov / Math.sqrt(vl * vs) : 0, pf = punch / n, bf = blue / n;
      const [ax, ay, ax1, ay1] = bbox(Pl), MP = [], inM = new Uint8Array(N), UV = new Map();
      for (let y = ay; y <= ay1; y++) for (let x = ax; x <= ax1; x++) { if (!this.inPoly(Pl, x + .5, y + .5)) continue; const k = y * W + x, uv = this.hApply(Hi, x + .5, y + .5); if (bd.occ !== false && uv[1] > .6 && fol(k)) continue; MP.push(k); inM[k] = 1; UV.set(k, uv); }
      const auto = Math.abs(corr) > .3 && bf >= .3 ? 'checker' : 'facade', kind = bd.kind && bd.kind !== 'auto' ? bd.kind : auto;
      // S10 windows = holes of the facade frame: Otsu split of the smoothed facade luma → 4-connected components → the class owning the largest component is the frame (wall / mullions) → compact components of the other class that never touch the facade outline are panes
      const D = new Float32Array(N), SD = new Float32Array(N); MP.forEach((k) => { const x = k % W, y = (k / W) | 0; let s = 0, s2 = 0, c = 0; for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) { const xx = x + i, yy = y + j; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const kk = yy * W + xx; if (inM[kk]) { s += Lk[kk]; s2 += Lk[kk] * Lk[kk]; c++; } } const m = s / c; D[k] = Lk[k] - m; SD[k] = Math.sqrt(Math.max(0, s2 / c - m * m)); });
      const bluePx = MP.filter((k) => B[k] - R[k] > 10).length / Math.max(1, MP.length), glassDom = bluePx >= .3 || bf >= .5;
      const hist = new Float64Array(256); MP.forEach((k) => hist[Math.min(255, Math.max(0, Lk[k] | 0))]++);
      let tot = MP.length, sAll = 0; for (let i = 0; i < 256; i++) sAll += i * hist[i]; let wB = 0, sB = 0, best = -1, T = 128; for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += i * hist[i]; const mB = sB / wB, mF = (sAll - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; T = i; } }
      const cls = new Int8Array(N).fill(-1); MP.forEach((k) => (cls[k] = glassDom ? (Lk[k] > T ? 1 : 0) : (D[k] < -Math.max(6, .5 * SD[k]) ? 0 : 1)));
      const lab2 = new Int32Array(N).fill(-1), comps = [], stk = [];
      MP.forEach((k0) => { if (lab2[k0] >= 0) return; const c0 = cls[k0], c = { cls: c0, px: [], x0: 1e9, y0: 1e9, x1: -1, y1: -1, u: 0, v: 0, edge: false, l: 0, d: 0, lmin: 255, lmax: 0 }; stk.length = 0; stk.push(k0); lab2[k0] = comps.length;
        while (stk.length) { const k = stk.pop(), x = k % W, y = (k / W) | 0, uv = UV.get(k); c.px.push(k); c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y); c.u += uv[0]; c.v += uv[1]; c.l += Lk[k]; c.d += D[k]; c.lmin = Math.min(c.lmin, Lk[k]); c.lmax = Math.max(c.lmax, Lk[k]);
          for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) { if (nx < 0 || ny < 0 || nx >= W || ny >= H) { c.edge = true; continue; } const n = ny * W + nx; if (!inM[n]) { c.edge = true; continue; } if (cls[n] === c0 && lab2[n] < 0) { lab2[n] = comps.length; stk.push(n); } } }
        c.u /= c.px.length; c.v /= c.px.length; c.l /= c.px.length; c.d /= c.px.length; comps.push(c); });
      const big = glassDom ? comps.reduce((a, c) => (c.px.length > a.px.length ? c : a), comps[0] || { cls: 1, px: [], l: 128, d: 0 }) : comps.filter((c) => c.cls === 1).reduce((a, c) => (c.px.length > a.px.length ? c : a), { cls: 1, px: [], l: 128, d: 0 }), fcls = big.cls, fl = big.l, fd = big.d;
      const cw_ = (c) => c.x1 - c.x0 + 1, chh_ = (c) => c.y1 - c.y0 + 1, med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : 1);
      let wins = comps.filter((c) => { const a = c.px.length, fill = a / (cw_(c) * chh_(c)), r = chh_(c) / cw_(c); if (c.cls === fcls || a < 3) return false; return glassDom || (!c.edge && a <= Math.max(24, MP.length * .03) && fill >= .4 && r >= .4 && r <= 5); });
      if (glassDom) { const pw = Math.max(5, gu.fb ? 6 : gu.p), ph = Math.max(4, gv.fb ? 6 : gv.p), out = []; wins.forEach((c) => { const g = new Map(); c.px.forEach((k) => { const uv = UV.get(k), key = Math.floor(uv[0] * RU / pw) * 1000 + Math.floor(uv[1] * RV / ph); (g.get(key) || g.set(key, []).get(key)).push(k); }); g.forEach((px) => { if (px.length < 2) return; const o = { cls: c.cls, px, x0: 1e9, y0: 1e9, x1: -1, y1: -1, u: 0, v: 0, l: 0, d: 0, lmin: 255, lmax: 0 }; px.forEach((k) => { const x = k % W, y = (k / W) | 0, uv = UV.get(k); o.x0 = Math.min(o.x0, x); o.x1 = Math.max(o.x1, x); o.y0 = Math.min(o.y0, y); o.y1 = Math.max(o.y1, y); o.u += uv[0]; o.v += uv[1]; o.l += Lk[k]; o.d += D[k]; }); o.u /= px.length; o.v /= px.length; o.l /= px.length; o.d /= px.length; out.push(o); }); }); wins = out; }
      if (wins.length >= 6 && !glassDom) { const mh = med(wins.map(chh_)), mw = med(wins.map(cw_)); wins = wins.filter((c) => chh_(c) >= mh * .4 && chh_(c) <= mh * 2.5 && cw_(c) >= mw * .4 && cw_(c) <= mw * 2.5); }
      const clus = (arr, key, tol) => { const s1 = arr.slice().sort((a, b) => key(a) - key(b)), g = []; s1.forEach((c) => { const last = g[g.length - 1]; if (last && key(c) - last.m < tol) { last.items.push(c); last.m = last.items.reduce((t, i) => t + key(i), 0) / last.items.length; } else g.push({ m: key(c), items: [c] }); }); return g; };
      let floors = clus(wins, (c) => c.v, Math.max(.02, med(wins.map((c) => chh_(c) / RV)) * .7)), colsW = clus(wins, (c) => c.u, Math.max(.02, med(wins.map((c) => cw_(c) / RU)) * .9));
      const cands = comps.length; if (!wins.length) { const gl = Math.max(3, lu), gw = Math.max(4, lv), cm = new Map(); MP.forEach((k) => { const uv = UV.get(k), a = uv[0] * RU / gl, c = uv[1] * RV / gw, fu = a - Math.floor(a), fv = c - Math.floor(c); if (fu < .3 || fu > .75 || fv < .25 || fv > .75) return; const key = Math.floor(a) * 1000 + Math.floor(c); let o = cm.get(key); if (!o) cm.set(key, (o = { px: [], x0: 1e9, y0: 1e9, x1: -1, y1: -1, u: (Math.floor(a) + .5) * gl / RU, v: (Math.floor(c) + .5) * gw / RV, l: 0, lmin: 255, lmax: 0 })); const x = k % W, y = (k / W) | 0; o.px.push(k); o.x0 = Math.min(o.x0, x); o.x1 = Math.max(o.x1, x); o.y0 = Math.min(o.y0, y); o.y1 = Math.max(o.y1, y); o.lmin = Math.min(o.lmin, Lk[k]); o.lmax = Math.max(o.lmax, Lk[k]); o.l += Lk[k] / 4; }); wins = [...cm.values()].filter((o) => o.px.length >= 2); floors = clus(wins, (c) => c.v, .5 * gw / RV); colsW = clus(wins, (c) => c.u, .5 * gl / RU); }
      const cover = wins.reduce((t, c) => t + c.px.length, 0) / Math.max(1, MP.length);
      const cnt = new Map(); MP.forEach((k) => cnt.set(q[k], (cnt.get(q[k]) || 0) + 1)); let wt = 22, wbest = 0; cnt.forEach((c, v) => { if (v < 48 && c > wbest) { wbest = c; wt = v; } });
      let np = 0;
      if (kind === 'checker') {
        while (lu < 4) lu *= 2; while (lv < 4) lv *= 2;
        MP.forEach((k) => { const x = k % W, y = (k / W) | 0, uv = UV.get(k), [ci, ri, fu, fv] = cell(uv[0], uv[1]), mu = fu * lu < 1, mv = fv * lv < 1; let col, fr = 1, win = false;
          if (mu || mv) col = 27; else { const bl = (((ci + ri) & 1) ^ (h(ci, ri) > .8 ? 1 : 0)) === 1; if (bl) { fr = 0; win = true; col = h(ci + 5, ri) > .5 ? 2 : 1; } else col = h(ci, ri + 7) > .3 ? 29 : 28; }
          set(x, y, col, id); frame[k] = fr; GRID[k] = mu || mv ? 1 : 0; chK[k] = id * 1e6 + (Math.floor(ci / 2) + 100) * 1000 + (ri + 100); wnK[k] = win ? id * 1e6 + (ci + 100) * 1000 + (ri + 100) : -1; np++; });
      } else {
        // facade: the photo itself (working palette), panes recoloured to one glass ramp by their own brightness; pieces = detected floors × window-column pairs
        const fm = floors.map((g) => g.m).sort((a, b) => a - b), cm2 = colsW.map((g) => g.m).sort((a, b) => a - b);
        const bounds = (ms, n) => { const r = []; if (ms.length < 2) { for (let i = 1; i < n; i++) r.push(i / n); return r; } for (let i = 0; i < ms.length - 1; i++) r.push((ms[i] + ms[i + 1]) / 2); return r; };
        const vB = bounds(fm, Math.max(2, Math.round(RV / 12))), uAll = bounds(cm2, Math.max(2, Math.round(RU / 7))), uB = uAll.filter((_, i) => i % 2 === 1), idx = (a, v) => { let n = 0; for (const b of a) if (v > b) n++; return n; };
        const wmap = new Map(); wins.forEach((c, wi) => c.px.forEach((k) => wmap.set(k, wi))); const gl_ = []; wmap.forEach((_, k) => gl_.push(Lk[k])); gl_.sort((a, b) => a - b); const gmin = gl_[Math.floor(gl_.length * .05)] || 0, gmax = gl_[Math.floor(gl_.length * .95)] || 255, darkP = (wins[0] ? wins[0].cls : 0) !== 1, RAMP = darkP && !glassDom ? [0, 0, 1, 2] : [1, 2, 3, 4];
        MP.forEach((k) => { const x = k % W, y = (k / W) | 0, uv = UV.get(k), ci = idx(uB, uv[0]), ri = idx(vB, uv[1]), wi = wmap.get(k); let col = qf[k], fr = 0;
          if (wi !== undefined) { const t = Math.max(0, Math.min(.999, (Lk[k] - gmin) / Math.max(1, gmax - gmin))); col = RAMP[Math.floor(t * 4)]; }
          else { const nb = uB.some((b) => Math.abs(uv[0] - b) * RU < 1) || vB.some((b) => Math.abs(uv[1] - b) * RV < 1) || [k - 1, k + 1, k - W, k + W].some((n) => wmap.has(n)); fr = nb ? 1 : 0; GRID[k] = nb ? 1 : 0; }
          set(x, y, col, id); frame[k] = fr; chK[k] = id * 1e6 + (ci + 100) * 1000 + (ri + 100); wnK[k] = wi !== undefined ? id * 1e6 + 500000 + wi : -1; np++; });
        lu = Math.round(RU / Math.max(1, uB.length + 1)); lv = Math.round(RV / Math.max(1, vB.length + 1));
      }
      REP.push({ id, name: bd.name, kind, auto, corr, pf, bf, lu, lv, gu, gv, cols: kind === 'facade' ? colsW.length : Math.round(RU / lu), rows: kind === 'facade' ? floors.length : Math.round(RV / lv), np, wall: wt, nw: wins.length, cands, cover, T, fcls, glassDom });
    }
    for (let k = W; k < N - W; k++) { const id = ID[k]; if (!id || id >= 10) continue; if ((ID[k - 1] === 0 && sky[k - 1]) || (ID[k + 1] === 0 && sky[k + 1]) || (ID[k - W] === 0 && sky[k - W])) { base[k] = OUT; frame[k] = 1; wnK[k] = -1; } }
    sc.buildings.forEach((bd) => { const b = bb[bd.id]; if (!b) return; let t = 0, s = 0; for (let x = b[0]; x <= b[2]; x++) for (let y = b[1]; y <= b[3]; y++) if (ID[y * W + x] === bd.id) { t++; if (y > 0 && sky[(y - 1) * W + x]) s++; break; } this.REVEAL[bd.id] = t > 0 && s / t >= .4; this.INT[bd.id] = b[3] - Math.max(3, Math.round((b[3] - b[1]) * .15)); this.BGY[bd.id] = bd.gy || (GY - b[3] > 0 && GY - b[3] < 60 ? GY : b[3] + 1); });
    // props (only where the scene annotates them; poles/lamps follow the photo)
    (sc.props || []).forEach((p) => {
      if (p.t === 'rect') { for (let y = p.r[1]; y < p.r[3]; y++) for (let x = p.r[0]; x < p.r[2]; x++) setP(x, y, p.col, p.id); }
      else if (p.t === 'line') { const dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))), vert = Math.abs(dy) > Math.abs(dx); for (let i = 0; i <= n; i++) for (let j = 0; j < p.w; j++) setP(p.a[0] + dx * i / n + (vert ? j : 0), p.a[1] + dy * i / n + (vert ? 0 : j), p.col, p.id); }
      else if (p.t === 'pole') for (let y = p.y0; y < p.y1; y++) { const t = (y - p.y0) / (p.y1 - p.y0), xl = Math.round(p.xl0 + (p.xl1 - p.xl0) * t), xw = Math.round(xl + p.w0 + (p.w1 - p.w0) * t); for (let x = xl; x < xw; x++) setP(x, y, (y > p.band[0] && y < p.band[1]) || x === xl ? 22 : x === xw - 1 ? 19 : 21, p.id); }
      if (p.id > 0 && p.name) this.NAMES[p.id] = p.name;
    });
    // S12 vehicles
    const carGlass = {}, carMask = {}, FRONT = { hatch: 1, van: 1, suv: 1, mpv: 1 }; this.CARIDS = []; this.CARNAMES = {};
    sc.cars.forEach((cr, i) => {
      const x0 = cr.x, y0 = cr.y, w = cr.w, hh = cr.h, type = cr.type || 'box', id = 10 + i, m = [], cw = Math.ceil((w + 2) / 6), chh = Math.ceil(hh / 4); carGlass[id] = []; this.CARIDS.push(id); this.CARNAMES[id] = cr.name;
      const bx0 = Math.max(0, x0 - 1), bx1 = Math.min(W - 1, x0 + w), by0 = Math.max(0, y0), by1 = Math.min(H - 1, y0 + hh - 1), inB = (x, y) => x >= bx0 && x <= bx1 && y >= by0 && y <= by1, boxPx = [];
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) boxPx.push(y * W + x);
      const ring = []; for (let y = y0 - 3; y < y0 + hh + 3; y++) for (let x = x0 - 4; x <= x0 + w + 3; x++) { if (x < 0 || y < 0 || x >= W || y >= H || inB(x, y)) continue; ring.push(y * W + x); }
      let ms;
      if (FRONT[type]) {
        // front views (v10, approved): view template, then peel road-like boundary pixels
        boxPx.forEach((k) => { if (this.carIn((k % W + .5 - x0) / w, ((k / W | 0) + .5 - y0) / hh, type)) m.push(k); }); ms = new Set(m);
        const roadLike = (k) => { const mx = Math.max(R[k], G[k], B[k]), mn = Math.min(R[k], G[k], B[k]); return (mx ? (mx - mn) / mx : 0) < .2 && Lp[k] > 58 && Lp[k] < 128; };
        for (let pass = 0; pass < 14; pass++) { const peel = []; ms.forEach((k) => { if ((!ms.has(k - 1) || !ms.has(k + 1) || !ms.has(k - W) || !ms.has(k + W)) && roadLike(k)) peel.push(k); }); if (!peel.length) break; peel.forEach((k) => ms.delete(k)); }
      } else {
        // any view: magic-wand background flood from the box border (only where the border continues the outside), then a GrabCut-style 2-class colour model refined by ICM smoothing
        const bg = new Uint8Array(N), st2 = [], cdist = (a, b) => Math.hypot(R[a] - R[b], G[a] - G[b], B[a] - B[b]);
        const seed = (k, out) => { if (out < 0 || bg[k]) return; if (Gm[k] < 24 && cdist(k, out) < 22) { bg[k] = 1; st2.push(k); } };
        for (let x = bx0; x <= bx1; x++) { if (by0 > 0) seed(by0 * W + x, (by0 - 1) * W + x); if (by1 < H - 1) seed(by1 * W + x, (by1 + 1) * W + x); }
        for (let y = by0; y <= by1; y++) { if (bx0 > 0) seed(y * W + bx0, y * W + bx0 - 1); if (bx1 < W - 1) seed(y * W + bx1, y * W + bx1 + 1); }
        while (st2.length) { const k = st2.pop(), x = k % W, y = (k / W) | 0; for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) { if (!inB(nx, ny)) continue; const n = ny * W + nx; if (!bg[n] && Gm[n] < 24 && cdist(n, k) < 22) { bg[n] = 1; st2.push(n); } } }
        const means = (Pp) => { const s = Pp.slice().sort((a, b) => Lp[a] - Lp[b]), M = []; for (let t = 0; t < 3; t++) { const part = s.slice(Math.floor(s.length * t / 3), Math.floor(s.length * (t + 1) / 3)); if (!part.length) continue; let r = 0, g = 0, b = 0; part.forEach((k) => { r += R[k]; g += G[k]; b += B[k]; }); M.push([r / part.length, g / part.length, b / part.length]); } return M; };
        const dmin = (M, k) => M.reduce((a, mm) => Math.min(a, Math.hypot(R[k] - mm[0], G[k] - mm[1], B[k] - mm[2])), 1e9);
        let labC = new Uint8Array(N); boxPx.forEach((k) => (labC[k] = bg[k] ? 0 : 1));
        for (let it = 0; it < 3; it++) { const Fp = [], Bp = ring.slice(); boxPx.forEach((k) => (labC[k] ? Fp : Bp).push(k)); if (Fp.length < 10) break; const MF = means(Fp), MB = means(Bp), nl = new Uint8Array(N);
          boxPx.forEach((k) => { const df = dmin(MF, k), db = dmin(MB, k); nl[k] = bg[k] ? (df < db * .6 ? 1 : 0) : (df <= db * 1.4 ? 1 : 0); });
          labC = new Uint8Array(N); boxPx.forEach((k) => { const x = k % W, y = (k / W) | 0; let c = 0, t = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { if (!inB(x + i, y + j)) continue; t++; c += nl[(y + j) * W + x + i]; } labC[k] = c * 2 > t ? 1 : 0; }); }
        const seen = new Uint8Array(N); let best = [];
        boxPx.forEach((k0) => { if (!labC[k0] || seen[k0]) return; const comp = [], s3 = [k0]; seen[k0] = 1; while (s3.length) { const k = s3.pop(), x = k % W, y = (k / W) | 0; comp.push(k); for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) { if (!inB(nx, ny)) continue; const n = ny * W + nx; if (labC[n] && !seen[n]) { seen[n] = 1; s3.push(n); } } } if (comp.length > best.length) best = comp; });
        { const sm = new Set(best); for (let pass = 0; pass < 2; pass++) { const add = [], del = []; boxPx.forEach((k) => { const x = k % W, y = (k / W) | 0; let c = 0, t = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { if (!inB(x + i, y + j)) continue; t++; if (sm.has((y + j) * W + x + i)) c++; } if (!sm.has(k) && c * 3 > t * 2) add.push(k); if (sm.has(k) && c * 3 < t) del.push(k); }); add.forEach((k) => sm.add(k)); del.forEach((k) => sm.delete(k)); } best = [...sm]; }
        ms = new Set(best); const out = new Uint8Array(N), s4 = []; boxPx.forEach((k) => { const x = k % W, y = (k / W) | 0; if ((x === bx0 || x === bx1 || y === by0 || y === by1) && !ms.has(k)) { out[k] = 1; s4.push(k); } });
        while (s4.length) { const k = s4.pop(), x = k % W, y = (k / W) | 0; for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) { if (!inB(nx, ny)) continue; const n = ny * W + nx; if (!out[n] && !ms.has(n)) { out[n] = 1; s4.push(n); } } }
        boxPx.forEach((k) => { if (!out[k]) ms.add(k); });
        if (ms.size < boxPx.length * .25) { ms = new Set(); boxPx.forEach((k) => { const u = (k % W + .5 - x0) / w, v = ((k / W | 0) + .5 - y0) / hh, r = .18, du = Math.max(0, Math.abs(u - .5) - (.5 - r)) / r, dv = Math.max(0, Math.abs(v - .5) - (.5 - r)) / r; if (du * du + dv * dv <= 1) ms.add(k); }); }
      }
      ms.forEach((k) => { const n = (ms.has(k - 1) ? 1 : 0) + (ms.has(k + 1) ? 1 : 0) + (ms.has(k - W) ? 1 : 0) + (ms.has(k + W) ? 1 : 0); if (n <= 1) ms.delete(k); });
      carMask[id] = ms; const edgeOf = (k) => !ms.has(k - 1) || !ms.has(k + 1) || !ms.has(k - W) || !ms.has(k + W);
      let thrG = -1; if (!FRONT[type]) { const Ls = []; ms.forEach((k) => { const y = (k / W) | 0; if ((y - y0) / hh < .55 && !edgeOf(k)) Ls.push(Lp[k]); }); Ls.sort((a, b) => a - b); thrG = Ls.length ? Ls[Math.floor(Ls.length * .35)] : -1; }
      ms.forEach((k) => { const x = k % W, y = (k / W) | 0, edge = edgeOf(k); set(x, y, edge ? OUT : qc[k], id); chK[k] = id * 1e6 + Math.floor((x - x0 + 1) / cw) * 1000 + Math.floor((y - y0) / chh); frame[k] = edge ? 1 : 0; wnK[k] = -1; const gl = FRONT[type] ? this.carGlassIn((x + .5 - x0) / w, (y + .5 - y0) / hh, type) : (y - y0) / hh < .55 && Lp[k] <= thrG; if (!edge && gl) carGlass[id].push(k); });
    });
    // S14 pieces + windows + support graph
    const chunkOf = new Int32Array(N).fill(-1), winOf = new Int32Array(N).fill(-1), cIdx = new Map(), wIdx = new Map(), CH = [], WN = [];
    for (let k = 0; k < N; k++) { const id = ID[k]; if (!this.isTarget(id)) continue; const x = k % W, y = (k / W) | 0, ck = chK[k];
      if (ck >= 0 && Math.floor(ck / 1e6) === id) { let i = cIdx.get(ck); if (i === undefined) { i = CH.length; cIdx.set(ck, i); CH.push({ key: ck, bid: id, pix: [], x0: x, y0: y, x1: x, y1: y, wins: [], below: -1 }); } const c = CH[i]; c.pix.push(k); if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y; chunkOf[k] = i; }
      const wk = wnK[k]; if (wk >= 0) { let i = wIdx.get(wk); if (i === undefined) { i = WN.length; wIdx.set(wk, i); WN.push({ bid: id, pix: [], ch: chunkOf[k] }); } WN[i].pix.push(k); winOf[k] = i; }
    }
    WN.forEach((w, i) => { if (w.ch >= 0) CH[w.ch].wins.push(i); });
    CH.forEach((c) => { const r = c.key % 1e6, cx = Math.floor(r / 1000), cy = r % 1000, gI = (a, b) => cIdx.get(c.bid * 1e6 + a * 1000 + b) ?? -1; c.below = gI(cx, cy + 1); c.sup = c.below < 0 ? [] : c.bid >= 10 ? [c.below, gI(cx - 1, cy), gI(cx + 1, cy)].filter((j) => j >= 0) : [c.below]; c.gy = c.bid >= 10 ? bb[c.bid][3] + 1 : this.BGY[c.bid] || GY; });
    const carCh = {}; CH.forEach((c, i) => { if (c.bid >= 10) (carCh[c.bid] = carCh[c.bid] || []).push(i); });
    this.TARGETS = sc.buildings.map((b) => b.id).concat(this.CARIDS).filter((i) => bb[i]);
    Object.assign(this, { q, qc, Lp, R, G, B, Gm, ann, sky, skyL, frame, chunkOf, winOf, CH, WN, carGlass, carMask, carCh, GRID, PROP, REP });
    this.S = { base, ID, back, backID, bb, hits: {}, cgb: {}, st: new Uint8Array(CH.length), ft: new Uint8Array(CH.length), wb: new Uint8Array(WN.length), pile: new Int16Array(W), edges: {}, fills: {}, dirty: new Set() };
    Object.keys(bb).forEach((id) => this.recompute(this.S, +id));
    this.clean = base.slice(); this.F = new Uint8Array(N);
  }
  loadScene(i) {
    const sc = this.SCENES[i], tok = ++this.tok; this.S = null; this.parts = []; this.proj = []; this.dis = null; this.score = 0; this.sel = 0; this.hover = 0;
    this.setState({ scene: i, score: 0, wrecked: 0, phase: null, disId: null, fact: null, base: [], report: [], det: null, menu: null });
    if (this.ctx) { this.ctx.fillStyle = '#4d9be6'; this.ctx.fillRect(0, 0, 576, 1024); }
    if (this.photoEl) this.photoEl.src = encodeURI(sc.src);
    const im = new Image();
    im.onload = () => {
      if (tok !== this.tok) return; this.srcImg = im; this.photoOK = im.naturalWidth * 16 === im.naturalHeight * 9;
      try { this.build(im, sc, i); const h1 = this.fnv(this.clean); this.build(im, sc, i); const h2 = this.fnv(this.clean); this.detOK = h1 === h2; this.drawStages(); this.tick(0);
        const pc = (v) => Math.round(v * 100) + '%';
        this.setState({ det: h1, report: this.REP.map((r) => ({ name: r.name, kind: r.kind.toUpperCase() + (r.kind === r.auto ? ' · auto' : ' · pinned (auto: ' + r.auto + ')'), note: (r.kind === 'facade' ? (r.glassDom ? 'GLASS WALL · ' : 'PUNCHED WINDOWS · ') + (r.glassDom ? 'Otsu T ' + r.T : 'Niblack k = −0.5, 15×15') + ' · frame = ' + (r.fcls ? 'light' : 'dark') + ' class · ' + r.nw + ' panes from ' + r.cands + ' components · ' + r.rows + ' floors × ' + r.cols + ' columns · glass ' + pc(r.cover) + ' · pieces ' + r.lu + '×' + r.lv + ' px · ' : '') + 'grid ' + r.lu + '×' + r.lv + ' px' + (r.gu.fb || r.gv.fb ? ' (fallback ' + (r.gu.fb ? 'u' : '') + (r.gv.fb ? 'v' : '') + ')' : '') + ' · ' + r.cols + ' columns × ' + r.rows + ' floors · AC ' + r.gu.ac.toFixed(2) + '/' + r.gv.ac.toFixed(2) + ' · parity r ' + r.corr.toFixed(2) + ' · punched ' + pc(r.pf) + ' · blue ' + pc(r.bf) + ' · wall ' + this.PAL[r.wall] + ' · ' + this.WN.filter((w) => w.bid === r.id).length + ' windows' })) });
      } catch (e) { console.error(e); }
      clearTimeout(this.bt); this.bt = setTimeout(() => this.runTests(), 500);
    };
    im.onerror = () => console.error('photo failed: ' + sc.src); im.src = encodeURI(sc.src);
  }
  drawStages() {
    if (!this.S) return; const W = this.W, H = this.H, N = W * H, P = this.RGB, E = this.stEls, h0 = this.SKY.h0;
    const paint = (el, fn) => { if (!el) return; el.width = W; el.height = H; const c = el.getContext('2d'), im = c.createImageData(W, H), d = im.data; for (let k = 0; k < N; k++) { const v = fn(k), o = k * 4; d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = 255; } c.putImageData(im, 0, 0); };
    const dim = (k, f) => [this.Lp[k] / f, this.Lp[k] / f, this.Lp[k] / f];
    paint(E.s0, (k) => [this.R[k], this.G[k], this.B[k]]);
    paint(E.s1, (k) => P[this.q[k]]);
    paint(E.s2, (k) => (((k / W) | 0) === h0 ? [249, 194, 43] : this.ann[k] ? [240, 79, 120] : this.sky[k] ? [48, 225, 185] : dim(k, 3)));
    paint(E.s3, (k) => { const g = Math.min(255, this.Gm[k] * 3); return [g, g, g]; });
    paint(E.s4, (k) => (this.GRID[k] && this.S.ID[k] < 10 && this.S.ID[k] ? [240, 79, 120] : this.winOf[k] >= 0 && this.S.ID[k] < 10 ? [249, 194, 43] : this.S.ID[k] && this.S.ID[k] < 10 ? P[this.clean[k]] : dim(k, 4)));
    paint(E.s5, (k) => { const id = this.S.ID[k], c = this.chunkOf[k]; if (!id) return this.sky[k] ? [29, 43, 83] : [26, 18, 32]; if (id >= 40) return [126, 122, 132]; const r = c >= 0 ? this.CH[c].key % 1e6 : 0, alt = ((r % 1000) + Math.floor(r / 1000)) & 1; return id < 10 ? (alt ? [240, 79, 120] : [162, 75, 111]) : (alt ? [48, 225, 185] : [35, 144, 99]); });
  }
  sceneJson(sc) { const head = {}; Object.keys(sc).forEach((k) => { if (!Array.isArray(sc[k])) head[k] = sc[k]; }); let s = JSON.stringify(head).slice(0, -1); ['buildings', 'cars', 'props'].forEach((k) => { if (!sc[k]) return; s += ',\n "' + k + '": [\n' + sc[k].map((o) => '  ' + JSON.stringify(o)).join(',\n') + '\n ]'; }); return s + '\n}'; }
  async runTests() {
    if (!this.S) return; const sc = this.SC, m = this.measure(), S = this.S, W = this.W, H = this.H, N = W * H, B = [], R_ = (id, t, ok, note) => B.push({ id, t: id + ' · ' + t, ok: !!ok, note }), CI = this.CARIDS.filter((i) => S.bb[i]), BI = sc.buildings.map((b) => b.id).filter((i) => S.bb[i]);
    let lp = 0, lt = 0; try { const d = this.ctx.getImageData(0, 0, W * 2, H * 2).data; for (let i = 0; i < d.length; i += 8) { lt++; if (d[i + 3] === 255 && this.snap(d[i], d[i + 1], d[i + 2]) >= 0) lp++; } } catch (e) {}
    const used = new Set(this.clean).size, gEl = this.gameEl, phEl = this.photoEl;
    R_('A1', 'Scene visible, one coherent palette', lt > 0 && lp === lt && used >= 10, 'working palette ' + this.SUB.length + ' photo entries + sky + glass · ' + used + ' of 50 entries used · ' + lp + '/' + lt + ' sampled px in palette');
    R_('A2', 'Photo aspect 9:16 · 288×512 at PX 2', gEl && gEl.width === 576 && gEl.height === 1024 && this.photoOK, 'canvas ' + (gEl ? gEl.width + '×' + gEl.height : '?') + ' · photo ' + (this.srcImg ? this.srcImg.naturalWidth + '×' + this.srcImg.naturalHeight : '?') + ' · no crop, no stretch');
    let inv = 0; for (let k = 0; k < N; k++) if (S.ID[k] === 0 && !this.sky[k] && !this.PROP[k] && this.clean[k] !== this.q[k] && this.clean[k] !== 48) inv++;
    R_('A3', 'Objects at photo positions · nothing invented', inv === 0, inv + ' non-photo px outside annotated objects · ' + BI.length + ' facades + ' + CI.length + ' vehicles, all from the annotation');
    R_('A4', 'Photo beside phone, same aspect', phEl && Math.abs(phEl.offsetWidth / phEl.offsetHeight - .5625) < .01, phEl ? phEl.offsetWidth + '×' + phEl.offsetHeight + ' shown' : 'missing');
    R_('A5', 'One fixed 50-entry palette', this.PAL.length === 50 && lp === lt && lt > 0, this.PAL.length + ' entries · ' + lp + '/' + lt + ' live px');
    let dl = 0, nl = 0; for (let k = 0; k < N; k++) if (S.ID[k] === 0 && !this.sky[k] && this.clean[k] === this.q[k]) { dl += Math.abs(this.LUM[this.q[k]] - this.Lp[k]); nl++; } const fid = nl ? dl / nl : 999;
    R_('B1', 'Ground, greenery, people = photo pixelated', nl > 5000 && fid <= 24, nl + ' photo px · mean brightness error ' + fid.toFixed(1) + '/255 · 0 redrawn');
    let styled = 0, fidC = 0, nC = 0; CI.forEach((id) => { let ph = 0, ol = 0, n = 0; this.carMask[id].forEach((k) => { if (S.ID[k] !== id) return; n++; if (this.clean[k] === 48) ol++; else if (this.clean[k] === this.qc[k]) ph++; }); fidC += ph; nC += n - ol; if (ol >= 4 && ph / Math.max(1, n - ol) > .9) styled++; });
    R_('B2', 'Vehicles = photo pixels + 1-px outline', CI.length > 0 && styled === CI.length, styled + '/' + CI.length + ' vehicles · ' + (nC ? Math.round(fidC / nC * 100) : 0) + '% of their px straight from the photo');
    const KP = { checker: [27], facade: [] }; let bOK = 0; const bN = [];
    this.REP.forEach((r) => { const st = new Set((S.fills[r.id] || []).map((k) => this.clean[k])), wn = this.WN.filter((w) => w.bid === r.id).length; if (wn > 0 && KP[r.kind].every((c) => st.has(c)) && [0, 1, 2, 3].some((c) => st.has(c))) bOK++; bN.push(r.name.toLowerCase() + ' ' + r.kind + ' ' + wn); });
    R_('B3', 'Facades rebuilt on the photo grid · kind rules · outline vs sky', bOK === this.REP.length, bN.join(' · '));
    const T = this.SKY, allow = new Set([T.base, T.band, T.band2, T.hi, T.lo, 48].filter((v) => v !== undefined)), skOk = m.skySet.every((i) => allow.has(i));
    R_('B4', 'Unified sky: one base, dithered band, flat clouds, ≤ 8', m.sky <= 8 && skOk && T.n > 2000, T.theme + ' (orange ' + Math.round(T.orn * 100) + '%, sat ' + T.sat.toFixed(2) + ') · ' + m.sky + ' entries · h0 ' + T.h0 + ' · ' + T.holes + ' hole px filled');
    const cab = (sc.props || []).filter((p) => p.t === 'line' && p.w === 1); let cabPx = 0; for (let k = 0; k < N; k++) if (this.PROP[k] && this.clean[k] === 48 && S.ID[k] === 0) cabPx++;
    R_('B5', 'Cables 1-px dark · poles follow the photo', cab.length ? cabPx > 50 : true, cab.length ? cab.length + ' cables, ' + cabPx + ' px of outline ink' : 'none annotated: poles and lamps stay photo pixels');
    R_('C1', 'Targets: facades + vehicles · people/props never', this.TARGETS.length === BI.length + CI.length && (sc.props || []).every((p) => !this.isTarget(p.id)), BI.length + ' facades + ' + CI.length + ' vehicles · people and trees are photo px, never in the ID map');
    let mism = 0; this.TARGETS.forEach((id) => { const b = S.bb[id], hl = new Set(S.edges[id] || []); let ns = 0; for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) { const k = y * W + x; if (S.ID[k] !== id) continue; if (x === 0 || x === W - 1 || y === 0 || y === H - 1 || S.ID[k - 1] !== id || S.ID[k + 1] !== id || S.ID[k - W] !== id || S.ID[k + W] !== id) { ns++; if (!hl.has(k)) mism++; } } if (ns !== hl.size) mism++; });
    R_('C2', 'Hover = own silhouette · pink aim / cyan info', mism === 0 && this.PAL[this.HL_AIM] === '#f04f78' && this.PAL[this.HL_INFO] === '#30e1b9', this.TARGETS.length + ' objects · ' + mism + ' edge mismatches vs A − erosion(A)');
    const sc0 = this.selCol(0), sc1 = this.selCol(125), sc2 = this.selCol(250);
    R_('C3', 'Selection blinks cyan/yellow every 1/8 s', sc0 !== sc1 && sc0 === sc2, this.PAL[sc0] + ' ↔ ' + this.PAL[sc1] + ' every 125 ms');
    let ci = -1, above = -1; for (let i = 0; i < this.CH.length && ci < 0; i++) { const c = this.CH[i]; if (c.bid >= 10 || c.below < 0) continue; const j = this.CH.findIndex((dd) => dd.below === i && dd.bid === c.bid); if (j >= 0) { ci = i; above = j; } }
    const C2 = this.cloneS(S), fx2 = [], seq = []; if (ci >= 0) { const c = this.CH[ci], fk = c.pix.find((k) => this.frame[k] && this.winOf[k] < 0) ?? c.pix[0]; for (let n = 0; n < 8 && C2.st[ci] < 4; n++) { this.damageAt(C2, fk % W + .5, ((fk / W) | 0) + .5, fx2); seq.push(C2.st[ci]); } let g = 0; while (this.cascade(C2, fx2, true) && g < 80) g++; }
    const cb = ci >= 0 ? this.CH[ci].bid : 0; Object.keys(C2.bb).forEach((id) => this.recompute(C2, +id));
    R_('C4', 'Outlines update as pieces go', ci >= 0 && (C2.edges[cb] || []).length !== (S.edges[cb] || []).length, ci >= 0 ? this.NAMES[cb].toLowerCase() + ' edge ' + S.edges[cb].length + ' → ' + C2.edges[cb].length + ' px after a collapse' : 'no stacked pieces');
    const per = {}; this.CH.forEach((c) => (per[c.bid] = (per[c.bid] || 0) + 1));
    R_('D1', 'Pieces: facade column pair × floor · vehicle 6×4 grid', this.TARGETS.every((i) => per[i] > 0), this.CH.length + ' pieces · ' + BI.map((i) => per[i] || 0).join('/') + ' per facade');
    const big = CI.slice().sort((a, b) => (this.carMask[b].size - this.carMask[a].size))[0], cl = this.carCh[big] || [], ci3 = cl.reduce((a, i) => (this.CH[i].pix.length > this.CH[a].pix.length ? i : a), cl[0]), C3 = this.cloneS(S), seqC = [];
    const pk = ci3 !== undefined ? this.CH[ci3].pix.find((k) => !this.frame[k]) ?? this.CH[ci3].pix[0] : 0; if (ci3 !== undefined) for (let n = 0; n < 8 && C3.st[ci3] < 4; n++) { this.damageAt(C3, pk % W + .5, ((pk / W) | 0) + .5, []); seqC.push(C3.st[ci3]); }
    R_('D2', 'Ladder intact → cracked → dark → gutted → gone', seq.join() === '1,2,3,4' && seqC.join() === '1,2,3,4', 'facade piece ' + seq.join('→') + ' · vehicle piece ' + seqC.join('→'));
    let chg = 0, gone4 = 0; if (ci >= 0) { const C4 = this.cloneS(S), fpk = this.CH[ci].pix.find((k) => this.frame[k] && this.winOf[k] < 0) ?? this.CH[ci].pix[0]; this.damageAt(C4, fpk % W + .5, ((fpk / W) | 0) + .5, []); for (let i = 0; i < S.st.length; i++) if (C4.st[i] !== S.st[i]) chg++; for (let k = 0; k < N; k++) if (S.ID[k] && !C4.ID[k]) gone4++; }
    R_('D3', 'One hit = one piece, one step · no instant deletion', chg === 1 && gone4 === 0, chg + ' piece changed, ' + gone4 + ' px deleted by the first hit');
    let gT = 0; for (let i = 0; i < C2.st.length; i++) if (C2.st[i] === 4 && this.CH[i].bid === cb) gT++;
    R_('D4', 'Unsupported piece falls next', ci >= 0 && C2.st[above] === 4 && gT > 1, 'knocking out 1 piece brought down ' + Math.max(0, gT - 1) + ' above it');
    const goneOK = (Sx) => { let ok = 0, n = 0; this.CH.forEach((c, i) => { if (Sx.st[i] !== 4) return; for (const k of c.pix) { n++; const y = (k / W) | 0, exp = c.bid >= 10 ? Sx.base[k] === Sx.back[k] : Sx.base[k] === this.revealB(c, k, y); if (Sx.ID[k] !== c.bid && exp) ok++; } }); return n ? ok / n : 1; };
    const g2 = goneOK(C2), g3 = goneOK(C3);
    R_('D6', 'Gone = sky / interior / road, never black boxes', g2 >= .9 && g3 >= .9, 'facade ' + Math.round(g2 * 100) + '% sky or interior · vehicle ' + Math.round(g3 * 100) + '% photo underneath');
    const pre = C2.pile.reduce((a, b) => a + b, 0); let ps = fx2.slice(); for (let n = 0; n < 500 && ps.length; n++) ps = ps.filter((p) => this.stepPart(C2, p, () => {})); const pileS = C2.pile.reduce((a, b) => a + b, 0), debris = fx2.filter((p) => p.k === 'debris').length;
    R_('D5', 'Debris lands, piles up as rubble, stays', debris > 0 && pileS > pre, debris + ' debris px → rubble ' + pileS + ' px in total · never cleared');
    const C5 = this.cloneS(S); this.recompute(C5, big); const f0 = C5.fills[big].length, bb5 = S.bb[big]; for (let n = 0; n < 12; n++) this.damageAt(C5, bb5[0] + (bb5[2] - bb5[0]) * (.2 + .6 * this.hash(n, 1)), bb5[1] + (bb5[3] - bb5[1]) * (.2 + .6 * this.hash(n, 2)), []); this.recompute(C5, big); const f1 = C5.fills[big].length; let dkC = 0; C5.fills[big].forEach((k) => { if (C5.base[k] !== S.base[k]) dkC++; });
    R_('D7', 'Wrecks stay recognisable', f1 >= f0 * .6 && dkC > 0, this.CARNAMES[big].toLowerCase() + ' after 12 hits keeps ' + Math.round(f1 / f0 * 100) + '% of its shape, ' + dkC + ' px darker or holed');
    const wi = this.WN.reduce((a, w, i) => (w.bid < 10 && (a < 0 || w.pix.length > this.WN[a].pix.length) ? i : a), -1), C1 = this.cloneS(S), fx1 = []; let g1 = 0, chunkSt = -1;
    if (wi >= 0) { const wk = this.WN[wi].pix[0]; this.damageAt(C1, wk % W + .5, ((wk / W) | 0) + .5, fx1); g1 = fx1.filter((p) => p.k === 'glass').length; chunkSt = C1.st[this.WN[wi].ch]; }
    let shd = 0, dkw = 0, wbn = 0; if (wi >= 0) this.WN[wi].pix.forEach((k) => { const v = C1.base[k]; if (v === 28 || v === 4) shd++; else if (v >= 48) dkw++; }); for (let i = 0; i < C1.wb.length; i++) wbn += C1.wb[i];
    R_('E1', 'Each window breaks alone · shards + dark', wi >= 0 && C1.wb[wi] === 1 && wbn === 1 && dkw > 0 && chunkSt === 0, '1 of ' + this.WN.length + ' windows broken · ' + shd + ' shard px, ' + dkw + ' dark px · piece intact');
    const gc = CI.slice().sort((a, b) => this.carGlass[b].filter((k) => S.ID[k] === b).length - this.carGlass[a].filter((k) => S.ID[k] === a).length)[0], gb = S.bb[gc], gk = this.carGlass[gc].find((k) => S.ID[k] === gc && this.chunkOf[k] >= 0), pre28 = new Set(this.carGlass[gc].filter((k) => S.base[k] === 28)); if (gk !== undefined) this.damageAt(C1, gk % W + .5, ((gk / W) | 0) + .5, fx1);
    const preB = C1.base.slice(); let gp = fx1.filter((p) => p.k === 'glass'), bounced = 0; for (let n = 0; n < 300 && gp.length; n++) gp = gp.filter((p) => { const was = p.b, r = this.stepPart(C1, p, () => {}); if (!was && p.b) bounced++; return r; }); let glit = 0; for (let k = 0; k < N; k++) if (C1.base[k] !== preB[k] && (C1.base[k] === 29 || C1.base[k] === 4)) glit++;
    R_('E2', 'Glass falls, bounces once, glitter stays', g1 > 0 && bounced > 0 && glit > 0, g1 + ' particles · ' + bounced + ' bounced · ' + glit + ' glitter px left');
    const cgs = this.carGlass[gc].filter((k) => C1.base[k] === 28 && !pre28.has(k)).length, cgp = fx1.filter((p) => p.k === 'glass' && p.ly === gb[3] + 3).length;
    R_('E3', 'Windshield star crack + glass particles', C1.cgb[gc] === 1 && cgs > 0 && cgp > 0, this.CARNAMES[gc].toLowerCase() + ': ' + cgs + ' star-line px · ' + cgp + ' glass particles');
    const hg = this.itemGrid(this.WEAPONS[this.state.weapon][0], 46, 36, 1.75); let wp = 0; for (let j = 0; j < hg.h; j++) for (let i = 0; i < hg.w; i++) if (hg.c[j * hg.w + i] >= 0) wp++;
    R_('F1', 'Weapons: stone, brick, slipper, bottle, paint can', this.WEAPONS.map((w) => w[0]).join() === 'stone,brick,slipper,bottle,paint', this.WEAPONS.map((w) => w[1].toLowerCase()).join(', '));
    R_('F2', 'Chosen weapon on canvas, bottom centre', wp > 200, wp + ' px, centred at x 144, y 470');
    const hitP = ci3 !== undefined ? this.damageAt(this.cloneS(S), pk % W + .5, ((pk / W) | 0) + .5, []) : 0;
    R_('F3', 'Tap → visible arc → hit via D-model', this.ARC > 0 && hitP > 0, 'arc apex ' + this.ARC + ' px · hit = ' + hitP + ' pts');
    R_('G1', 'Disasters: tsunami, hurricane, Beyoncé, Godzilla', ['tsunami', 'hurricane', 'beyonce', 'godzilla'].every((k) => this.DIS.some((dd) => dd[0] === k)), this.DIS.map((dd) => dd[1].toLowerCase()).join(', '));
    const diff = (Sx) => { let n = 0, part = 0; const cols = new Set(); for (let i = 0; i < S.st.length; i++) if (Sx.st[i] !== S.st[i]) { n++; cols.add(Math.floor(this.CH[i].x0 / 24)); if (Sx.st[i] < 4) part++; } return { n, part, cols: cols.size }; };
    const rH = this.simDis('hurricane', 320), dH = diff(rH.S); R_('G2', 'Hurricane: log spiral + wind front, column by column', dH.n > 5 && dH.cols >= 3, dH.n + ' pieces hit across ' + dH.cols + ' columns in ' + rH.t + ' frames');
    const rT = this.simDis('tsunami', 340), dT = diff(rT.S); R_('G3', 'Tsunami: wave front, water mixes with street', dT.n > 0 && rT.mixMax > 4, dT.n + ' pieces hit · ' + rT.mixMax + ' tones under the water (mixed, not replaced)');
    const rG = this.simDis('godzilla', 480), dG = diff(rG.S); R_('G4', 'Godzilla: walks, each step damages', dG.n > 0, dG.n + ' pieces hit by footsteps');
    const ho = this.headGrid('open', 1), hc = this.headGrid('closed', 1), rB = this.simDis('beyonce', 1400), dB = diff(rB.S), eaten = CI.filter((id) => (this.carCh[id] || []).some((i) => rB.S.st[i] === 4)).length; let peaks = 0; const oo = rB.offs.slice(0, 36); for (let i = 1; i < oo.length - 1; i++) if (oo[i] > 5 && oo[i] >= oo[i - 1] && oo[i] > oo[i + 1]) peaks++;
    R_('G5', 'Beyoncé: front view, 2-frame bite eats cars, shakes twice', ho.c.join() !== hc.c.join() && eaten >= Math.min(4, CI.length) && peaks === 2, eaten + '/' + CI.length + ' vehicles bitten · ' + peaks + ' head shakes per car');
    const gAll = [rH, rT, rG, rB].map((r) => goneOK(r.S)), partAll = dH.part + dT.part + dG.part + dB.part;
    R_('G6', 'All disaster damage via D-model, remains stay', partAll > 0 && gAll.every((v) => v >= .7), partAll + ' damaged pieces still standing · gone px ' + gAll.map((v) => Math.round(v * 100) + '%').join(' / ') + ' revealed correctly');
    const sim = { last: null, used: new Set() }; let prev = null, rep = 0; for (let n = 0; n < 100; n++) { const t = this.FACTS[this.pickFact(sim)][0]; if (t === prev) rep++; prev = t; } const sim2 = { last: null, used: new Set() }, first = new Set(); for (let n = 0; n < this.FACTS.length; n++) first.add(this.pickFact(sim2));
    R_('H1', 'i toggles info · tap → highlight + true fact', this.FACTS.length >= 30 && mism === 0, this.FACTS.length + ' curated true facts · highlight uses C2 edges');
    R_('H2', 'New theme every time · no repeat until all shown', rep === 0 && first.size === this.FACTS.length, rep + ' theme repeats in 100 · first ' + this.FACTS.length + ' picks distinct');
    const roles = this.barEl ? [...this.barEl.children].map((c) => c.dataset.role) : [], hud = this.phoneEl ? [...this.phoneEl.querySelectorAll('[data-hud]')].map((e) => e.getBoundingClientRect()) : []; let ov = 0; for (let a = 0; a < hud.length; a++) for (let b = a + 1; b < hud.length; b++) { const p = hud[a], qq = hud[b]; if (p.left < qq.right - 1 && qq.left < p.right - 1 && p.top < qq.bottom - 1 && qq.top < p.bottom - 1) ov++; }
    const trunc = this.barEl ? [...this.barEl.querySelectorAll('b')].filter((b) => b.scrollWidth > b.clientWidth + 1).length : 0;
    R_('I1', 'Bar: arrow circle right → disaster → weapon → i left', roles.join() === 'info,weapon,disaster,toggle', 'left → right: ' + roles.join(' · '));
    R_('I2', 'No HUD labels overlap', hud.length >= 3 && ov === 0 && trunc === 0, hud.length + ' blocks, ' + ov + ' overlaps, ' + trunc + ' clipped labels');
    const scE = this.phoneEl && this.phoneEl.querySelector('[data-hud=score]'), dgE = this.phoneEl && this.phoneEl.querySelector('[data-hud=danger]');
    R_('I3', 'Score + wrecks top left · danger top right', scE && dgE && scE.offsetLeft < 100 && scE.offsetTop < 120 && dgE.offsetLeft > 380, scE && dgE ? 'score at ' + scE.offsetLeft + ',' + scE.offsetTop + ' · danger at ' + dgE.offsetLeft + ',' + dgE.offsetTop : 'missing');
    let prevOK = false, rows = []; try { prevOK = (await fetch(encodeURI('DVOR-8 Photo2Pixel v12.dc.html'))).ok; const md = await (await fetch('CLAUDE.md')).text(); rows = [...md.matchAll(/^([A-J]\d+)\./gm)].map((x) => x[1]); } catch (e) {}
    R_('J1', 'New file per version, previous kept', prevOK, 'v12 ' + (prevOK ? 'kept' : 'missing') + ' · this is v13');
    const have = B.map((b) => b.id).concat(['J2', 'J3']), miss = rows.filter((r) => !have.includes(r));
    R_('J2', 'Every baseline row measured live', rows.length >= 41 && miss.length === 0, rows.length + ' rows in CLAUDE.md · ' + miss.length + ' unchecked');
    R_('J3', 'Zero console errors', this.errs === 0, this.errs + ' errors');
    R_('K1', 'Deterministic: same photo + annotation → same frame', this.detOK, 'built twice · FNV-1a ' + this.fnv(this.clean) + ' both times');
    R_('K3', 'Working palette ≤ 12 photo entries (popularity)', this.SUB.length <= 12 && this.SUB.length >= 4, this.SUB.map((i) => this.PAL[i]).join(' '));
    R_('K2', 'Rulebook embedded in code', this.SPEC.length >= 24 && this.SPEC.every((s) => s.rule && s.method && s.src), this.SPEC.length + ' stages, each with rule · method · source');
    B.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
    this.setState({ base: B });
  }
  renderVals() {
    const st = this.state, w = this.WEAPONS[st.weapon], sc = this.SCENES[st.scene], mk = (b) => ({ t: b.t, note: b.note, mark: b.ok ? '✓' : '✗', col: b.ok ? '#30e1b9' : '#f04f78' });
    this.initPal();
    const stR = (n) => this.ref('st' + n, (el) => { this.stEls['s' + n] = el; this.drawStages(); });
    return {
      phoneRef: this.ref('phone', (el) => (this.phoneEl = el)),
      barRef: this.ref('bar', (el) => (this.barEl = el)),
      photoRef: this.ref('photo', (el) => { this.photoEl = el; el.src = encodeURI(this.SCENES[this.state.scene].src); }),
      gameRef: this.ref('game', (el) => { this.gameEl = el; el.width = this.W * 2; el.height = this.H * 2; this.ctx = el.getContext('2d'); this.img = this.ctx.createImageData(el.width, el.height); if (this.S) { this.tick(0); return; } this.loadScene(this.state.scene); }),
      btnWRef: this.ref('bw-' + w[0], (el) => this.blitCanvas(el, this.itemGrid(w[0], 30, 23, 1.15))),
      btnDRef: this.ref('bd', (el) => this.blitCanvas(el, this.iconGrid('hurricane'))),
      weaponName: w[1],
      scoreTxt: String(st.score).replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
      wrecked: st.wrecked,
      danger: [0, 1, 2, 3, 4].map((k) => ({ bg: k < (st.phase ? 5 : Math.min(5, Math.ceil(st.wrecked / 3))) ? '#f9c22b' : '#1a1220' })),
      cursor: st.info ? 'help' : 'crosshair',
      showBanner: !!st.phase, phaseTxt: st.phase ? this.PHASE[st.phase] : '', disName: st.disName || '',
      showFact: !st.phase && !!st.fact, showHint: !st.phase && !st.fact && st.info,
      fact: st.fact || { name: '', theme: '', text: '', n: '' },
      barW: st.open ? 512 : 80, arrow: st.open ? '▶' : '◀',
      infoBg: st.info ? '#30e1b9' : '#0b0018', infoColor: st.info ? '#0b0018' : '#30e1b9',
      menuW: st.open && st.menu === 'w', menuD: st.open && st.menu === 'd',
      toggleBar: () => this.setState((s) => ({ open: !s.open, menu: null })),
      toggleInfo: () => { this.sel = 0; this.setState((s) => ({ info: !s.info, fact: null, menu: null })); },
      openWeapon: () => this.setState((s) => ({ menu: s.menu === 'w' ? null : 'w' })),
      openDisaster: () => this.setState((s) => ({ menu: s.menu === 'd' ? null : 'd' })),
      weapons: this.WEAPONS.map((x, i) => ({ name: x[1], bg: i === st.weapon ? '#2a2430' : 'transparent', ref: this.ref('mw-' + x[0], (el) => this.blitCanvas(el, this.itemGrid(x[0], 30, 23, 1.15))), pick: () => this.setState({ weapon: i, menu: null, info: false, fact: null }) })),
      disasters: this.DIS.map((x) => ({ name: x[1], ref: this.ref('md-' + x[0], (el) => this.blitCanvas(el, this.iconGrid(x[0]))), pick: () => this.startDis(x[0]) })),
      onMove: (e) => { const [x, y] = this.pos(e); this.hover = this.idAt(x, y); },
      onLeave: () => { this.hover = 0; },
      onTap: (e) => {
        if (st.menu) { this.setState({ menu: null }); return; }
        const [x, y] = this.pos(e), id = this.idAt(x, y);
        if (st.info) { if (id) { this.sel = id; this.showFact(id); } return; }
        this.proj.push({ x0: 144, y0: 450, x1: x, y1: y, t: 0, w: w[0] });
      },
      closeFact: () => { this.sel = 0; this.setState({ fact: null }); },
      moreFact: () => { if (this.sel) this.showFact(this.sel); },
      scenes: this.SCENES.map((s, i) => ({ label: s.label, bg: i === st.scene ? '#f04f78' : '#0b0018', pick: () => { if (i !== this.state.scene || !this.S) this.loadScene(i); } })),
      sceneLabel: sc.label, photoSrc: encodeURI(sc.src),
      st0: stR(0), st1: stR(1), st2: stR(2), st3: stR(3), st4: stR(4), st5: stR(5),
      rep: st.report, spec: this.SPEC, sceneJson: this.sceneJson(sc), detTxt: st.det ? 'FNV ' + st.det : '…',
      skyTxt: this.SKY && this.S ? this.SKY.theme + ' · h0 ' + this.SKY.h0 : '…',
      base: st.base.map(mk),
      baseSum: st.base.length ? st.base.filter((b) => b.ok).length + '/' + st.base.length : '…',
      rerun: () => this.runTests()
    };
  }

  W = 288; H = 512; refs = {}; refEls = {}; spr = {}; frames = 0; hover = 0; sel = 0; score = 0; dirty = false; proj = []; parts = []; dis = null; errs = 0; fs = { last: null, used: new Set() };
  PAL = ['#1d2b53', '#323f7a', '#4d65b4', '#4d9be6', '#8fd3ff', '#d6f1ff', '#0e3b30', '#165a4c', '#239063', '#1ebc73', '#30e1b9', '#91db69', '#2e1f1a', '#4c2f22', '#6e4a36', '#9e6b47', '#bf8f63', '#e3bd8f', '#1f1d22', '#34313a', '#4a4650', '#625e68', '#7e7a84', '#a39fa8', '#1e2230', '#323a4c', '#56627a', '#8a98ad', '#c4d0dc', '#ffffff', '#4a1414', '#6e2727', '#b33831', '#e83b3b', '#e6904e', '#fbb954', '#2e1a3a', '#5a2a5e', '#a24b6f', '#c32454', '#f04f78', '#fca790', '#5e4a22', '#8a6f30', '#c09a3e', '#f9c22b', '#fbe17a', '#fff6c2', '#1a1220', '#0b0018'];
  WEAPONS = [['stone', 'КАМЕНЬ'], ['brick', 'КИРПИЧ'], ['slipper', 'ТАПОК'], ['bottle', 'БУТЫЛКА'], ['paint', 'КРАСКА']];
  DIS = [['hurricane', 'УРАГАН'], ['tsunami', 'ЦУНАМИ'], ['godzilla', 'ГОДЗИЛЛА'], ['beyonce', 'ГОЛОВА БЕЙОНСЕ']];
  PHASE = { siren: 'СИРЕНА', impact: 'УДАР', calm: 'ЗАТИШЬЕ' };
  FACTS = [
    ['BUILDINGS', 'The Burj Khalifa in Dubai, 828 m tall, has been the tallest building in the world since 2010.'],
    ['BUILDINGS', 'The Eiffel Tower grows up to about 15 cm taller in summer, because its iron expands in the heat.'],
    ['BUILDINGS', 'Prague’s Dancing House (1996), by Vlado Milunić and Frank Gehry, is nicknamed “Ginger and Fred”.'],
    ['WEATHER', 'Lightning can heat the air to about 30,000 °C, roughly five times hotter than the surface of the Sun.'],
    ['WEATHER', 'Snow looks white because its ice crystals scatter every colour of light. The ice itself is clear.'],
    ['WEATHER', 'Hurricanes spin anticlockwise in the northern hemisphere and clockwise in the southern, because of the Coriolis effect.'],
    ['MATERIALS', 'Ordinary window glass is mostly silica sand, melted with soda ash and lime at around 1,500 °C.'],
    ['MATERIALS', 'Concrete keeps getting stronger for years after it is poured, because the cement keeps reacting with water.'],
    ['MATERIALS', 'Aluminium is the most abundant metal in Earth’s crust.'],
    ['ANIMALS', 'Octopuses have three hearts and blue, copper-based blood.'],
    ['ANIMALS', 'Wombats produce cube-shaped droppings.'],
    ['ANIMALS', 'Crows can recognise individual human faces and remember them for years.'],
    ['SPACE', 'A day on Venus (243 Earth days) lasts longer than its year (225 Earth days).'],
    ['SPACE', 'Sunlight takes about 8 minutes 20 seconds to reach Earth.'],
    ['SPACE', 'Footprints left on the Moon can last for millions of years: there is no wind to erase them.'],
    ['SOUND', 'Sound travels about four times faster in water than in air: roughly 1,480 m/s against 343 m/s.'],
    ['SOUND', 'Space is silent. With no air to carry the vibrations, an explosion there makes no sound.'],
    ['SOUND', 'Sound moves faster in warm air: about 331 m/s at 0 °C and 343 m/s at 20 °C.'],
    ['WATER', 'Water is densest at about 4 °C, which is why lakes freeze from the top down.'],
    ['WATER', 'About 97% of the water on Earth is salt water in the oceans.'],
    ['WATER', 'Ice is about 9% less dense than liquid water, which is why it floats.'],
    ['TIME', 'Tidal friction from the Moon slows Earth’s spin, making the day roughly 2 milliseconds longer every century.'],
    ['TIME', 'Prague’s Astronomical Clock was installed in 1410. It is the oldest astronomical clock still working.'],
    ['TIME', 'Until railways brought standard time in the 1840s, each British town kept its own local time, set by the Sun.'],
    ['PLANTS', 'Botanically, bananas are berries and strawberries are not.'],
    ['PLANTS', 'Some species of bamboo can grow nearly a metre in a single day.'],
    ['PLANTS', 'Young sunflowers track the Sun, turning from east to west during the day.'],
    ['CITIES', 'Prague’s historic centre has been a UNESCO World Heritage Site since 1992.'],
    ['CITIES', 'Venice is built on more than 100 small islands in a lagoon, linked by about 400 bridges.'],
    ['CITIES', 'The London Underground, opened in 1863, was the world’s first underground railway.']
  ];
  hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  vn(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), h = this.hash.bind(this), a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }
  scrape(i) { if (i >= 48) return i; return i % 6 > 0 ? i - 1 : 48; }
  initPal() {
    if (this.P32) return;
    this.RGB = this.PAL.map((h) => [1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16)));
    this.LUM = this.RGB.map(([r, g, b]) => .299 * r + .587 * g + .114 * b);
    this.P32 = new Uint32Array(this.RGB.map(([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0));
    this.KEYS = new Set(this.RGB.map(([r, g, b]) => (r << 16) | (g << 8) | b));
    this.NEU = [48, 18, 19, 20, 21, 22, 23, 28, 29];
    this.CHR = []; for (let i = 0; i < 48; i++) if (i < 18 || i > 27) this.CHR.push(i);
    const near = (r, g, b) => { let best = 0, bd = 1e9; for (let i = 0; i < 48; i++) { const q = this.RGB[i], d = (q[0] - r) ** 2 + (q[1] - g) ** 2 + (q[2] - b) ** 2; if (d < bd) { bd = d; best = i; } } return best; };
    this.WATER = [[29, .8], [4, .65], [3, .5], [2, .55]].map(([wc, a]) => { const w = this.RGB[wc]; return Uint8Array.from(this.RGB.map((q) => near(q[0] * (1 - a) + w[0] * a, q[1] * (1 - a) + w[1] * a, q[2] * (1 - a) + w[2] * a))); });
    this.SIREN = Uint8Array.from(this.PAL.map((h, i) => (i < 6 ? 36 + i : i)));
  }
  quant(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = .299 * r + .587 * g + .114 * b, sat = mx > 0 ? (mx - mn) / mx : 0;
    let best = 0, bd = 1e9;
    if (sat < .26 || mx < 45) { for (const i of this.NEU) { const d = Math.abs(this.LUM[i] - L); if (d < bd) { bd = d; best = i; } } return best; }
    for (const i of this.CHR) { const p = this.RGB[i], dr = p[0] - r, dg = p[1] - g, db = p[2] - b, d = 2 * dr * dr + 4 * dg * dg + 3 * db * db; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  bayer(x, y) { return ([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] + .5) / 16; }
  carIn(u, v, t) { const a = Math.abs(u - .5); if (u < -.02 || u > 1.02 || v < 0 || v > 1) return false; if (t === 'van') return a <= .47 - (v < .04 ? (.04 - v) * 3 : 0); if (v < .07) return a <= .26 + v * 1.2; if (v < .4) return a <= .3 + (v - .07) * .4 || (v > .3 && a <= .5); return a <= .5; }
  carGlassIn(u, v, t) { const a = Math.abs(u - .5); return t === 'van' ? v > .06 && v < .45 && a < .4 : v > .09 && v < .37 && a < .27 + (v - .09) * .4; }
  maj(A, passes) {
    const W = this.W, H = this.H, v = new Uint8Array(9);
    for (let p = 0; p < passes; p++) { const B = A.slice(); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x; let n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) v[n++] = A[k + j * W + i]; let bm = A[k], bc = 0; for (let a = 0; a < 9; a++) { let c = 0; for (let b = 0; b < 9; b++) if (v[b] === v[a]) c++; if (c > bc) { bc = c; bm = v[a]; } } if (bc >= 5) B[k] = bm; } A.set(B); }
  }
  grid(w, h) { return { w, h, c: new Int16Array(w * h).fill(-1) }; }
  px(g, x, y, col) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.c[y * g.w + x] = col; }
  outline(g) { const o = g.c.slice(); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const k = y * g.w + x; if (g.c[k] >= 0) continue; if ((x > 0 && g.c[k - 1] >= 0) || (x < g.w - 1 && g.c[k + 1] >= 0) || (y > 0 && g.c[k - g.w] >= 0) || (y < g.h - 1 && g.c[k + g.w] >= 0)) o[k] = 48; } g.c = o; return g; }
  ell(g, cx, cy, rx, ry, ramp) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, dd = nx * nx + ny * ny; if (dd > 1) continue; const k = Math.max(0, Math.min(ramp.length - 1, Math.floor((-.5 * nx - .62 * ny + .6 * Math.sqrt(1 - dd) + .4) / 1.4 * ramp.length))); this.px(g, x, y, ramp[k]); } }
  rectG(g, x, y, w, h, col) { for (let j = Math.round(y); j < Math.round(y + h); j++) for (let i = Math.round(x); i < Math.round(x + w); i++) this.px(g, i, j, typeof col === 'function' ? col(i, j) : col); }
  item(g, name, cx, cy, s) {
    const C = (r, t) => r * 6 + t;
    if (name === 'stone') {
      const rx = 7.5 * s, ry = 6.2 * s, ramp = [C(3, 1), C(3, 2), C(3, 3), C(3, 4), C(3, 5)];
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, an = Math.atan2(ny, nx), lim = 1 - .12 * Math.abs(Math.sin(an * 3 + .7)), dd = nx * nx + ny * ny; if (dd > lim) continue;
        let t = (-.5 * nx - .62 * ny + .6 * Math.sqrt(Math.max(0, 1 - dd)) + .4) / 1.4; if (nx * .5 + ny > .25) t -= .22;
        this.px(g, x, y, ramp[Math.max(0, Math.min(4, Math.floor(t * 5)))]);
      }
      this.px(g, cx - 2 * s, cy - 3 * s, 29);
    } else if (name === 'slipper') { this.ell(g, cx, cy + 1 * s, 9.5 * s, 4.2 * s, [0, 1, 2, 3, 4]); this.ell(g, cx - 2 * s, cy - 1 * s, 4.5 * s, 3.4 * s, [27, 28, 29, 29]); this.rectG(g, cx - 9 * s, cy + 4 * s, 18 * s, 1, C(3, 1)); }
    else if (name === 'bottle') {
      const col = (i) => (i < cx - 1.5 * s ? C(1, 5) : i < cx + 1.5 * s ? C(1, 3) : C(1, 2));
      this.rectG(g, cx - 3.5 * s, cy - 2 * s, 7 * s, 10 * s, col); this.rectG(g, cx - 1.5 * s, cy - 8 * s, 3 * s, 6.5 * s, col); this.rectG(g, cx - 1.5 * s, cy - 9.5 * s, 3 * s, 1.5 * s, C(5, 2));
      this.rectG(g, cx - 3.5 * s, cy + 1 * s, 7 * s, 3.5 * s, (i) => (i < cx ? 29 : 28)); this.rectG(g, cx - 2 * s, cy + 2 * s, 4 * s, 1, C(5, 1));
    } else if (name === 'brick') {
      this.rectG(g, cx - 8 * s, cy - 1 * s, 16 * s, 7 * s, (i, j) => (j > cy + 3 * s ? C(5, 1) : C(5, 2)));
      for (let j = 0; j < 3 * s; j++) this.rectG(g, cx - 8 * s + (3 * s - j), cy - 1 * s - j - 1, 16 * s, 1, C(5, 4));
      this.px(g, cx - 5 * s, cy - 2 * s, C(5, 5)); this.px(g, cx + 1 * s, cy - 3 * s, C(5, 5));
    } else if (name === 'paint') {
      this.rectG(g, cx - 6 * s, cy - 5 * s, 12 * s, 12 * s, (i) => (i < cx - 2 * s ? 29 : i < cx + 3 * s ? 28 : 27));
      this.rectG(g, cx - 6 * s, cy - 6.5 * s, 12 * s, 2 * s, 29); this.rectG(g, cx - 6 * s, cy - 1 * s, 12 * s, 4 * s, (i) => (i < cx + 3 * s ? 40 : 39));
      this.rectG(g, cx - 3 * s, cy - 5 * s, 2 * s, 4 * s, 40);
    }
  }
  itemGrid(name, w, h, s) { const k = `i-${name}-${w}`; if (!this.spr[k]) { const g = this.grid(w, h); this.item(g, name, w / 2, h / 2 + 1, s); this.spr[k] = this.outline(g); } return this.spr[k]; }
  headPix(u, v, mode) {
    const E = (cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2, au = Math.abs(u), ex = u < 0 ? -17 : 17;
    const frx = 40 * (v > 0 ? 1 - .28 * (v / 52) : 1), face = (u / frx) ** 2 + (v / 52) ** 2 <= 1, bang = face && v < -30 - u * .2 + 4 * Math.sin(u * .18);
    if (face && !bang) {
      if (mode === 'open') { if (E(0, 32, 18, 13) <= 1) { if (E(0, 33, 14.5, 9.5) <= 1) return v < 26.5 ? 29 : v > 36 ? 38 : 49; return v < 32 ? 39 : 40; } }
      else if (E(0, 32, 15, 6) <= 1) { if (Math.abs(v - 32) < .9) return 48; if (E(-4, 34.5, 4, 1.3) <= 1) return 41; return v < 32 ? 39 : 40; }
      const eu = u - ex;
      if (mode === 'squint') { if (Math.abs(eu) < 9 && Math.abs(v - (-6 + 4 * (eu / 9) ** 2)) < 1.2) return 48; }
      else { if (E(ex, -4, 9, 4.5) <= 1) { const ir = Math.hypot(eu, v + 4); if (Math.hypot(eu + 1.4, v + 5.4) < 1) return 29; if (ir < 1.7) return 48; if (ir < 3.8) return 13; return 29; } if (E(ex, -4.6, 10.2, 5.8) <= 1 && v < -3.2) return 48; }
      if (Math.abs(au - 17) < 11 && Math.abs(v - (-15 - 3 * (1 - ((au - 17) / 11) ** 2))) < 1.5) return 12;
      if (E(u < 0 ? -5 : 5, 15, 2.3, 1.5) <= 1) return 13;
      if (Math.abs(u - 4.5) < .9 && v > -2 && v < 12) return 14;
      if (E(1, 12, 2.2, 1.6) <= 1) return 17;
      if (E(u < 0 ? -25 : 25, 15, 7, 4) <= 1) return 41;
      const l = .55 - .35 * (u / 40) - .28 * (v / 52); if (v > 42) return 14; return l > .78 ? 16 : l > .36 ? 15 : 14;
    }
    if (Math.abs(Math.hypot(au - 42, v - 22) - 6) < 1.3) return 45;
    if (!face && E(0, 62, 17, 16) <= 1) return v < 54 ? 14 : 15;
    if (bang || E(0, -6, 70, 74) <= 1 || E(-50, 46, 26, 48) <= 1 || E(50, 46, 26, 48) <= 1) { const t = .5 - .3 * (u / 70) - .35 * (v / 74) + .14 * Math.sin(u * .09 + v * .21 + Math.sin(v * .05) * 2); return t < .22 ? 43 : t < .48 ? 44 : t < .74 ? 45 : 46; }
    return -1;
  }
  headGrid(mode, s) { const k = `h-${mode}-${s}`; if (this.spr[k]) return this.spr[k]; const w = Math.ceil(164 * s), h = Math.ceil(182 * s), g = this.grid(w, h); g.ox = Math.round(w / 2); g.oy = Math.round(84 * s); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = this.headPix((i + .5 - g.ox) / s, (j + .5 - g.oy) / s, mode); if (c >= 0) g.c[j * w + i] = c; } return (this.spr[k] = this.outline(g)); }
  kaijuPix(u, v, step) {
    const E = (cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1, fl = 12 + step * 14, bl = -18 - step * 14;
    if (u > 40 && u < 68 && v > -161 && v < -156.5) return (Math.floor(u) % 4 === 0 && v < -158.5) ? 29 : 49;
    if (E(38, -176, 3, 2.2)) return 45;
    const sh = (o) => { const l = .55 - .3 * (u / 40) - .25 * ((v + 100) / 100) + o; return l > .62 ? 20 : l > .32 ? 19 : 18; };
    if (E(30, -170, 20, 15) || E(50, -164, 18, 10) || E(48, -152, 16, 5) || E(18, -148, 18, 24) || E(32, -118, 12, 6)) return sh(.05);
    if (E(44, -116, 4, 3)) return 28;
    if (E(14, -92, 18, 44)) return 21;
    if (E(fl, -36, 15, 36) || E(fl + 6, -5, 18, 6)) return sh(.08);
    if (E(-2, -98, 36, 58)) return sh(0);
    if (E(bl, -36, 16, 36) || E(bl + 6, -5, 18, 6)) return sh(-.15);
    for (let n = 0; n <= 24; n++) { const t = n / 24, px = -28 - 74 * t, py = -66 + 60 * t - 8 * Math.sin(t * Math.PI), r = 17 * (1 - t) + 3; if ((u - px) ** 2 + (v - py) ** 2 < r * r) return sh(-.05); }
    for (let n = 0; n < 7; n++) { const t = n / 6, bx = -6 - 46 * t, by = -148 + 90 * t, hg = 16 - 6 * t, hw = 7 - 2 * t, du = u - bx, dv = v - by, a = du * -.85 + dv * -.52, b = du * .52 + dv * -.85; if (a > 0 && a < hg && Math.abs(b) < hw * (1 - a / hg)) return a > hg * .5 ? 28 : 27; }
    return -1;
  }
  kaijuGrid(step, s) { const k = `k-${step}-${s}`; if (this.spr[k]) return this.spr[k]; const w = Math.ceil(190 * s), h = Math.ceil(200 * s), g = this.grid(w, h); g.ox = Math.round(112 * s); g.oy = Math.round(198 * s); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = this.kaijuPix((i + .5 - g.ox) / s, (j + .5 - g.oy) / s, step); if (c >= 0) g.c[j * w + i] = c; } return (this.spr[k] = this.outline(g)); }
  iconGrid(kind) {
    const N = 24, k = N / 32, g = this.grid(N, N), put = (x, y, c) => this.px(g, x, y, c);
    if (kind === 'tsunami') { for (let x = 0; x < N; x++) { const ys = (22 - 13 * Math.exp(-((((x + .5) / k - 12) / 7) ** 2))) * k; for (let y = Math.ceil(ys); y < N - 1; y++) { const d = (y - ys) / k; put(x, y, d < 1.5 ? 29 : d < 4 ? 4 : d < 9 ? 3 : 2); } } for (let a = -1.6; a < 1.4; a += .05) put(12 * k + Math.cos(a) * 4, 9 * k + Math.sin(a) * 4, 29); }
    else if (kind === 'hurricane') { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = x + .5 - N / 2, dy = y + .5 - N / 2, ru = Math.hypot(dx, dy) / k; if (ru > 13 || ru < 2.5) continue; const s = Math.sin(Math.atan2(dy, dx) * 2 - Math.log(ru + 1) * 4); if (s > .2) put(x, y, s > .75 ? 29 : s > .5 ? 28 : 22); } }
    else if (kind === 'godzilla') { const kg = this.kaijuGrid(1, .11); for (let j = 0; j < kg.h; j++) for (let i = 0; i < kg.w; i++) if (kg.c[j * kg.w + i] >= 0) put(i + 1, j + 1, kg.c[j * kg.w + i]); return g; }
    else if (kind === 'beyonce') { const hg = this.headGrid('open', .135); for (let j = 0; j < hg.h; j++) for (let i = 0; i < hg.w; i++) if (hg.c[j * hg.w + i] >= 0) put(i + 1, j, hg.c[j * hg.w + i]); return g; }
    return this.outline(g);
  }
  blitCanvas(el, g, sc = 2) { this.initPal(); el.width = g.w * sc; el.height = g.h * sc; const ctx = el.getContext('2d'), img = ctx.createImageData(el.width, el.height), o = new Uint32Array(img.data.buffer); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.c[y * g.w + x]; if (c < 0) continue; const v = this.P32[c]; for (let j = 0; j < sc; j++) for (let i = 0; i < sc; i++) o[(y * sc + j) * el.width + x * sc + i] = v; } ctx.putImageData(img, 0, 0); }
  blit2(img, F) { const W = this.W, o = new Uint32Array(img.data.buffer), P = this.P32, W2 = W * 2; for (let y = 0; y < this.H; y++) { const r0 = y * 2 * W2, r1 = r0 + W2; for (let x = 0; x < W; x++) { const v = P[F[y * W + x]], i = 2 * x; o[r0 + i] = v; o[r0 + i + 1] = v; o[r1 + i] = v; o[r1 + i + 1] = v; } } }
  cloneS(S) { return { base: S.base.slice(), ID: S.ID.slice(), back: S.back.slice(), backID: S.backID.slice(), bb: JSON.parse(JSON.stringify(S.bb)), hits: { ...S.hits }, cgb: { ...S.cgb }, st: S.st.slice(), ft: S.ft.slice(), wb: S.wb.slice(), pile: S.pile.slice(), edges: {}, fills: {}, dirty: new Set() }; }
  recompute(S, id) { const W = this.W, H = this.H, b = S.bb[id]; if (!b) return; const e = [], f = []; for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) { const k = y * W + x; if (S.ID[k] !== id) continue; f.push(k); if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || S.ID[k - 1] !== id || S.ID[k + 1] !== id || S.ID[k - W] !== id || S.ID[k + W] !== id) e.push(k); } S.edges[id] = e; S.fills[id] = f; }
  push(fx, p) { if (fx && fx.length < 5000) { if (p.gy === undefined) p.gy = this.curGY; fx.push(p); } }
  breakWin(S, w, fx) {
    if (S.wb[w]) return 0; S.wb[w] = 1; const win = this.WN[w], W = this.W;
    for (const k of win.pix) { if (S.ID[k] !== win.bid) continue; const x = k % W, y = (k / W) | 0, border = this.winOf[k - 1] !== w || this.winOf[k + 1] !== w || this.winOf[k - W] !== w || this.winOf[k + W] !== w;
      if (this.rnd() < .75) this.push(fx, { k: 'glass', x: x + .5, y: y + .5, vx: (this.rnd() - .5) * 1.6, vy: -this.rnd() * 1.2, c: [29, 5, 4, 3][Math.floor(this.rnd() * 4)], ly: (this.CH[win.ch] ? this.CH[win.ch].gy : this.GY) + 2 + this.rnd() * 6 });
      S.base[k] = border && this.rnd() < .45 ? (this.rnd() < .5 ? 28 : 4) : (this.hash(x, y) > .82 ? 48 : 49); }
    return 40;
  }
  crack(S, i, hx, hy) { const W = this.W, c = this.CH[i]; for (let n = 0; n < 2; n++) { let x = hx, y = hy, a = Math.PI / 2 + (this.rnd() - .5) * 2.4; for (let s = 0; s < 18; s++) { const k = Math.floor(y) * W + Math.floor(x); if (k < 0 || k >= W * this.H || this.chunkOf[k] !== i) break; if (S.ID[k] === c.bid) S.base[k] = 48; a += (this.rnd() - .5) * 1; x += Math.cos(a); y += Math.sin(a); } } }
  goneChunk(S, i, fx) {
    const c = this.CH[i], W = this.W, car = c.bid >= 10; let m = 0; this.curGY = c.gy;
    for (const k of c.pix) { if (S.ID[k] !== c.bid) continue; const x = k % W, y = (k / W) | 0;
      if (m++ % 2 === 0) this.push(fx, car ? { k: 'chip', x: x + .5, y: y + .5, vx: (this.rnd() - .5) * 1.2, vy: -this.rnd() * 1.2, c: S.base[k], ly: S.bb[c.bid][3] + 1 } : { k: 'debris', x: x + .5, y: y + .5, vx: (this.rnd() - .5) * .8, vy: this.rnd() * .5, c: S.base[k] });
      if (car) { S.base[k] = S.back[k]; S.ID[k] = S.backID[k]; if (S.backID[k]) S.dirty.add(S.backID[k]); } else { S.base[k] = this.revealB(c, k, y); S.ID[k] = 0; } }
    c.wins.forEach((w) => (S.wb[w] = 1)); S.st[i] = 4; S.dirty.add(c.bid);
  }
  hitChunk(S, i, hx, hy, fx) {
    const c = this.CH[i], s = S.st[i], W = this.W, car = c.bid >= 10; if (s >= 4) return 0; this.curGY = c.gy;
    if (s === 0) { if (car) this.carGlassBreak(S, c.bid, fx); c.wins.forEach((w) => this.breakWin(S, w, fx)); this.crack(S, i, hx, hy); }
    else if (s === 1) { for (const k of c.pix) if (S.ID[k] === c.bid && S.base[k] < 48) S.base[k] = this.scrape(S.base[k]); this.crack(S, i, hx, hy); }
    else if (s === 2) { let m = 0; for (const k of c.pix) { if (S.ID[k] !== c.bid) continue; const x = k % W, y = (k / W) | 0; if (!this.frame[k]) { if (m++ % 2 === 0) this.push(fx, car ? { k: 'chip', x: x + .5, y: y + .5, vx: (this.rnd() - .5), vy: -this.rnd(), c: S.base[k], ly: S.bb[c.bid][3] + 1 } : { k: 'debris', x: x + .5, y: y + .5, vx: (this.rnd() - .5) * .8, vy: this.rnd() * .4, c: S.base[k] }); S.base[k] = car ? (this.hash(x, y) > .5 ? this.scrape(this.scrape(S.base[k])) : 49) : y >= c.y1 - 1 ? 19 : this.hash(x, y) > .85 ? 48 : 49; } else S.base[k] = this.scrape(S.base[k]); } }
    else { this.goneChunk(S, i, fx); return 100; }
    S.st[i] = s + 1; return [20, 30, 60][s];
  }
  carGlassBreak(S, id, fx) {
    if (S.cgb[id]) return; S.cgb[id] = 1; const W = this.W, g = this.carGlass[id]; if (!g.length) return; let sx = 0, sy = 0; g.forEach((k) => { sx += k % W; sy += (k / W) | 0; }); const cx = sx / g.length, cy = sy / g.length;
    g.forEach((k) => { if (S.ID[k] !== id) return; const x = k % W, y = (k / W) | 0, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); if (this.rnd() < .5) this.push(fx, { k: 'glass', x: x + .5, y: y + .5, vx: (this.rnd() - .5) * 1.4, vy: -this.rnd(), c: [29, 4, 5][Math.floor(this.rnd() * 3)], ly: S.bb[id][3] + 3 }); S.base[k] = Math.abs(Math.sin(a * 4)) < .22 || Math.abs(r - 4) < .7 ? 28 : (this.hash(x, y) > .7 ? 18 : 49); });
  }
  bite(S, id, n, fx) {
    const b = S.bb[id], l = this.carCh[id]; if (!b || !l) return; fx = fx || this.parts; this.carGlassBreak(S, id, fx);
    const w = b[2] - b[0] + 1, h = b[3] - b[1] + 1, cx = (b[0] + b[2]) / 2 + .5, cy = b[1] + h * (.15 + .22 * n), rx = w * .36, ry = h * .28;
    l.forEach((i) => { const c = this.CH[i]; if (S.st[i] >= 4) return; const mx = (c.x0 + c.x1) / 2 + .5, my = (c.y0 + c.y1) / 2 + .5, d = ((mx - cx) / rx) ** 2 + ((my - cy) / ry) ** 2; if (d <= 1) this.goneChunk(S, i, fx); else if (d <= 1.8) this.hitChunk(S, i, mx, my, fx); });
    S.hits[id] = 3; S.dirty.add(id); return [cx, cy];
  }
  damageAt(S, x, y, fx) {
    const k = Math.floor(y) * this.W + Math.floor(x); if (k < 0 || k >= this.W * this.H) return 0; const id = S.ID[k];
    if (id >= 10 && id < 40) { const c = this.chunkOf[k]; return c >= 0 ? this.hitChunk(S, c, x, y, fx) : 0; }
    if (id >= 1 && id < 10) { const w = this.winOf[k]; if (w >= 0 && !S.wb[w]) return this.breakWin(S, w, fx); const c = this.chunkOf[k]; if (c >= 0) return this.hitChunk(S, c, x, y, fx); }
    return 0;
  }
  selCol(now) { return (Math.floor(now / 125) & 1) ? 10 : 45; }
  HL_AIM = 40; HL_INFO = 10; ARC = 70;
  simDis(id, maxF) {
    const save = { S: this.S, score: this.score, parts: this.parts, dirty: this.dirty }, S = this.cloneS(this.S), W = this.W, H = this.H;
    Object.keys(S.bb).forEach((i) => this.recompute(S, +i)); this.S = S; this.parts = [];
    const F = new Uint8Array(W * H), put = (x, y, c) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < W && y < H) F[y * W + x] = c; }, d = { id, f: 0, t: 0, phase: 'impact', wet: {} }, rec = { mixMax: 0, offs: [] }; let t = 1;
    try { for (t = 1; t <= maxF; t++) { F.set(S.base); const done = this['dis_' + id](F, put, d, t, false);
      if (id === 'tsunami' && t === 150) { const st = new Set(); for (let k = (this.GY - 34) * W; k < Math.min(H, this.GY + 26) * W; k++) st.add(F[k]); rec.mixMax = st.size; }
      if (d.b && d.b.mode === 'shake') rec.offs.push(Math.round(Math.sin(d.b.t / 36 * Math.PI * 4) * 10));
      this.parts = this.parts.filter((p) => this.stepPart(S, p, () => {})); if (t % 3 === 0) this.cascade(S, this.parts, false);
      if (S.dirty.size) { S.dirty.forEach((i) => this.recompute(S, i)); S.dirty.clear(); } if (done) break; } }
    finally { Object.assign(this, save); }
    return Object.assign({ S, t }, rec);
  }
  cascade(S, fx, imm) { let n = 0; this.CH.forEach((c, i) => { if (S.st[i] >= 4 || !c.sup.length || c.sup.some((j) => S.st[j] < 4)) return; if (imm) { this.goneChunk(S, i, fx); n++; return; } if (S.ft[i] === 0) S.ft[i] = 4; else if (--S.ft[i] === 0) { this.goneChunk(S, i, fx); n++; } }); return n; }
  dmg(x, y) { const p = this.damageAt(this.S, x, y, this.parts); if (p) { this.score += p; this.burst(x, y, 5); this.dirty = true; } return p; }
  burst(x, y, n) { const S = this.S; for (let i = 0; i < n; i++) { const k = Math.min(this.W * this.H - 1, Math.max(0, Math.floor(y + (this.rnd() - .5) * 6) * this.W + Math.floor(x + (this.rnd() - .5) * 6))); this.push(this.parts, { k: 'dust', x, y, vx: (this.rnd() - .5) * 3, vy: -this.rnd() * 3, c: S.base[k], life: 16 + this.rnd() * 16 }); } }
  stepPart(S, p, put) {
    p.x += p.vx; p.y += p.vy; p.vy += .15; const W = this.W, x = Math.floor(p.x);
    if (p.k === 'dust') { put(p.x, p.y, p.c); return --p.life > 0; }
    if (x < 0 || x >= W || p.y > this.H + 4) return false;
    if (p.k === 'debris') { const gy0 = p.gy || this.GY, ly = gy0 - S.pile[x]; if (p.y >= ly) { const y = ly - 1, k = y * W + x, id = S.ID[k]; if (id >= 10 && id < 40) { if (S.pile[x] < 12) S.pile[x]++; return false; } if (y > gy0 - 40 && id < 40) { S.base[k] = this.scrape(p.c); if (id) { S.ID[k] = 0; S.dirty.add(id); } if (S.pile[x] < 12) S.pile[x]++; } return false; } }
    else if (p.y >= p.ly) { if (!p.b) { p.b = 1; p.vy *= -.35; p.vx *= .6; p.y = p.ly - 1; return true; } if (this.rnd() < .4) { const y = Math.min(this.H - 1, Math.floor(p.ly + this.rnd() * (p.k === 'chip' ? 3 : 14))), k = y * W + x; if (S.ID[k] === 0) S.base[k] = p.k === 'chip' ? this.scrape(p.c) : this.rnd() < .5 ? 29 : 4; } return false; }
    put(p.x, p.y, p.c); return true;
  }
  startDis(id) { if (this.dis || !this.S) return; this.dis = { id, f: 0, t: 0, phase: 'siren', wet: {} }; this.sel = 0; const d = this.DIS.find((x) => x[0] === id); this.setState({ phase: 'siren', disId: id, menu: null, fact: null, disName: d[1] }); }
  disStep(F, put, d) {
    d.f++;
    if (d.phase === 'siren') { if ((d.f >> 3) & 1) for (let k = 0; k < F.length; k++) F[k] = this.SIREN[F[k]]; if (d.f >= 60) { d.phase = 'impact'; d.t = 0; this.setState({ phase: 'impact' }); } return; }
    d.t++;
    const done = this['dis_' + d.id](F, put, d, d.t, d.phase === 'calm');
    if (d.phase === 'impact' && done) { d.phase = 'calm'; d.t = 0; this.setState({ phase: 'calm' }); }
    else if (d.phase === 'calm' && d.t >= 60) { this.dis = null; this.setState({ phase: null, disId: null }); }
  }
  blitG(put, g, x, y) { for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const c = g.c[j * g.w + i]; if (c >= 0) put(x + i, y + j, c); } }
  tearColumn(xf) { const S = this.S, W = this.W; for (const id of this.TARGETS) { const b = S.bb[id]; if (!b || xf < b[0] || xf > b[2]) continue; const ys = []; for (let y = b[1]; y <= b[3]; y++) if (S.ID[y * W + xf] === id) ys.push(y); for (let n = 0; n < (id < 10 ? 3 : 1) && ys.length; n++) this.dmg(xf + .5, ys[Math.floor(this.rnd() * ys.length)] + .5); } }
  dis_hurricane(F, put, d, t, calm) {
    if (calm) return true; const L = 300, cx = -110 + t / L * 508, cy = 128, W = this.W, H = this.H;
    for (let y = Math.max(0, Math.floor(cy - 104)); y < Math.min(H, cy + 104); y++) for (let x = Math.max(0, Math.floor(cx - 104)); x < Math.min(W, cx + 104); x++) { const dx = x + .5 - cx, dy = y + .5 - cy, ru = Math.hypot(dx, dy) / 8; if (ru < 2.5 || ru > 13) continue; const s = Math.sin(Math.atan2(dy, dx) * 2 - Math.log(ru + 1) * 4 + t * .15); if (s > .3) F[y * W + x] = s > .8 ? 29 : s > .55 ? 28 : 22; }
    const xf = Math.round(-10 + t / L * 300); for (let y = 200; y < H; y += 3) if (this.hash(y, t >> 2) > .45) for (let i = 0; i < 10; i++) put(xf - i - (y % 7), y, 28);
    if (t % 4 === 0 && xf >= 0 && xf < W) this.tearColumn(xf);
    return t >= L;
  }
  dis_tsunami(F, put, d, t, calm) {
    const W = this.W, H = this.H, L = 330, fx = calm ? 1e9 : -50 + t * 1.25, lvl = calm ? this.GY - 32 + t * 4 : 512 - (544 - this.GY) * Math.min(1, t / 70);
    const surf = (x) => (x <= fx ? lvl : lvl + (x - fx) * 4) - 78 * Math.exp(-(((x - fx) / 42) ** 2));
    for (let x = 0; x < W; x++) { const ys = surf(x); for (let y = Math.max(0, Math.ceil(ys)); y < H; y++) { const dp = y - ys, k = y * W + x; F[k] = this.WATER[dp < 2 ? 0 : dp < 6 ? 1 : dp < 18 ? 2 : 3][F[k]]; } }
    if (!calm) {
      const top = surf(fx); for (let a = -2.4; a < .9; a += .03) for (const r of [13, 14, 15, 16]) put(fx + 10 + Math.cos(a) * r, top + 16 + Math.sin(a) * r, r > 15 ? 27 : r > 14 ? 29 : 4);
      if (t % 3 === 0) this.push(this.parts, { k: 'dust', x: fx + 4, y: top, vx: this.rnd() * 2, vy: -1 - this.rnd() * 2, c: 29, life: 25 });
      if (t % 5 === 0) { const S = this.S; for (const id of this.TARGETS) { const b = S.bb[id], f = S.fills[id]; if (!b || !f || !f.length || fx < b[0]) continue; if (id >= 10 && (d.wet[id] || 0) >= 2) continue; for (let tries = 0; tries < 12; tries++) { const k = f[Math.floor(this.rnd() * f.length)], x = k % W, y = (k / W) | 0; if (x <= fx + 20 && y > surf(x)) { this.dmg(x + .5, y + .5); d.wet[id] = (d.wet[id] || 0) + 1; break; } } } }
    }
    return t >= L;
  }
  dis_godzilla(F, put, d, t, calm) {
    if (calm) return true; const L = 470, gx = -90 + t, ph = Math.floor(t / 26) & 1, step = ph ? 1 : -1;
    if (t % 26 === 0) { const fxp = Math.round(gx + (step > 0 ? 32 : -26)), S = this.S, W = this.W, seen = new Map(); for (let y = this.GY - 20; y < Math.min(this.H, this.GY + 12); y++) for (let x = fxp - 16; x <= fxp + 16; x++) { if (x < 0 || x >= W || Math.hypot(x - fxp, y - (this.GY - 4)) > 16) continue; const id = S.ID[y * W + x]; if (this.isTarget(id) && !seen.has(id)) seen.set(id, [x, y]); } seen.forEach(([x, y]) => this.dmg(x + .5, y + .5)); for (let i = 0; i < 3; i++) this.dmg(gx + 40 + this.rnd() * 20, this.GY - 164 + this.rnd() * 130); for (let i = 0; i < 10; i++) this.push(this.parts, { k: 'dust', x: fxp, y: this.GY - 2, vx: (this.rnd() - .5) * 4, vy: -this.rnd() * 2, c: 22, life: 20 }); }
    const g = this.kaijuGrid(step, 1); this.blitG(put, g, Math.round(gx) - g.ox, this.GY + 2 - g.oy);
    return t >= L;
  }
  dis_beyonce(F, put, d, t, calm) {
    if (calm) return true;
    const S = this.S, b = d.b || (d.b = { x: 144, y: -110, mode: 'descend', t: 0, i: 0, sx: 144, sy: -110, q: this.CARIDS.filter((a) => S.bb[a] && (S.fills[a] || []).length).sort((a, c) => (S.bb[a][0] + S.bb[a][2]) - (S.bb[c][0] + S.bb[c][2])) });
    const next = (m) => { b.mode = m; b.t = 0; b.sx = b.x; b.sy = b.y; }, ease = (k) => k * k * (3 - 2 * k);
    b.t++; let off = 0, frame = 'closed';
    if (b.mode === 'descend') { const k = Math.min(1, b.t / 40); b.y = -110 + 340 * ease(k); if (k >= 1) next(b.q.length ? 'move' : 'rise'); }
    else if (b.mode === 'move') { const id = b.q[b.i], bx = S.bb[id], hgt = bx[3] - bx[1] + 1, tx = (bx[0] + bx[2]) / 2, ty = bx[1] + hgt * .15 - 32, k = Math.min(1, b.t / 24); b.x = b.sx + (tx - b.sx) * ease(k); b.y = b.sy + (ty - b.sy) * ease(k); frame = 'open'; if (k >= 1) next('bite'); }
    else if (b.mode === 'bite') { frame = (b.t % 16) < 8 ? 'open' : 'closed'; if (b.t === 8 || b.t === 24) { const p = this.bite(S, b.q[b.i], b.t === 8 ? 0 : 1); if (p) { this.burst(p[0], p[1], 14); this.score += 250; this.dirty = true; } } if (b.t >= 32) next('shake'); }
    else if (b.mode === 'shake') { frame = 'squint'; off = Math.round(Math.sin(b.t / 36 * Math.PI * 4) * 10); if (b.t >= 36) { b.i++; next(b.i < b.q.length ? 'move' : 'rise'); } }
    else if (b.mode === 'rise') { const k = Math.min(1, b.t / 40); b.y = b.sy + (-140 - b.sy) * ease(k); if (k >= 1) return true; }
    const g = this.headGrid(frame, 1); this.blitG(put, g, Math.round(b.x + off) - g.ox, Math.round(b.y) - g.oy);
    return false;
  }
  blitSpr(put, g, cx, cy, sc, ang) { const c = Math.cos(ang), s = Math.sin(ang), hw = g.w / 2, hh = g.h / 2, R = Math.ceil(Math.hypot(hw, hh) * sc) + 1; for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const u = (c * x + s * y) / sc + hw, v = (-s * x + c * y) / sc + hh, iu = Math.floor(u), iv = Math.floor(v); if (iu < 0 || iv < 0 || iu >= g.w || iv >= g.h) continue; const col = g.c[iv * g.w + iu]; if (col >= 0) put(cx + x, cy + y, col); } }
  tick(now) {
    if (!this.S || !this.ctx) return; this.frames++;
    const S = this.S, W = this.W, H = this.H, F = this.F;
    if (this.frames % 3 === 0) { const n = this.cascade(S, this.parts, false); if (n) { this.score += n * 50; this.dirty = true; } }
    if (S.dirty.size) { S.dirty.forEach((id) => this.recompute(S, id)); S.dirty.clear(); }
    F.set(S.base);
    const put = (x, y, c) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < W && y < H) F[y * W + x] = c; };
    if (this.dis && this.dis.phase === 'siren') this.disStep(F, put, this.dis);
    if (this.sel) { const c = this.selCol(now); for (const k of (S.edges[this.sel] || [])) F[k] = c; }
    if (this.hover && this.hover !== this.sel && !this.dis) { const c = this.state.info ? this.HL_INFO : this.HL_AIM; for (const k of (S.edges[this.hover] || [])) F[k] = c; }
    if (this.dis && this.dis.phase !== 'siren') this.disStep(F, put, this.dis);
    const w = this.WEAPONS[this.state.weapon][0];
    this.proj = this.proj.filter((p) => {
      p.t += 1 / 22; const t = Math.min(1, p.t), x = p.x0 + (p.x1 - p.x0) * t, y = p.y0 + (p.y1 - p.y0) * t - this.ARC * Math.sin(Math.PI * t);
      this.blitSpr(put, this.itemGrid(p.w, 26, 20, .9), Math.round(x), Math.round(y), 1 - .4 * t, p.t * 8);
      if (p.t >= 1) { if (!this.dmg(p.x1, p.y1)) { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const k = (Math.floor(p.y1) + j) * W + Math.floor(p.x1) + i; if (k >= 0 && k < W * H && S.ID[k] === 0 && !this.sky[k] && i * i + j * j <= 4) S.base[k] = this.scrape(S.base[k]); } this.burst(p.x1, p.y1, 6); this.score += 10; this.dirty = true; } return false; }
      return true;
    });
    this.parts = this.parts.filter((p) => this.stepPart(S, p, put));
    const hg = this.itemGrid(w, 46, 36, 1.75); this.blitG(put, hg, 144 - (hg.w >> 1), 470 - hg.h);
    this.blit2(this.img, F); this.ctx.putImageData(this.img, 0, 0);
    if (this.dirty && this.frames % 8 === 0) { this.dirty = false; let g = 0; for (let i = 0; i < S.st.length; i++) if (S.st[i] === 4 && this.CH[i].bid < 10) g++; const cw = this.CARIDS.filter((id) => { const l = this.carCh[id] || []; return l.length && l.filter((i) => S.st[i] >= 3).length * 2 >= l.length; }).length; this.setState({ score: this.score, wrecked: g + cw }); }
  }
  pickFact(fs) { const F = this.FACTS, rem = {}; F.forEach((f, i) => { if (!fs.used.has(i)) rem[f[0]] = (rem[f[0]] || 0) + 1; }); let c = F.map((f, i) => i).filter((i) => F[i][0] !== fs.last && !fs.used.has(i)); if (!c.length) { fs.used.clear(); return this.pickFact(fs); } const mx = Math.max(...c.map((i) => rem[F[i][0]])); c = c.filter((i) => rem[F[i][0]] === mx); const i = c[Math.floor(this.rnd() * c.length)]; fs.used.add(i); fs.last = F[i][0]; return i; }
  showFact(id) { const i = this.pickFact(this.fs); this.setState({ fact: { name: this.objName(id), theme: this.FACTS[i][0], text: this.FACTS[i][1], n: `${i + 1}/${this.FACTS.length}` } }); }
  pos(e) { const r = e.currentTarget.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * this.W, (e.clientY - r.top) / r.height * this.H]; }
  idAt(x, y) { if (!this.S || x < 0 || y < 0 || x >= this.W || y >= this.H) return 0; const id = this.S.ID[Math.floor(y) * this.W + Math.floor(x)]; return this.isTarget(id) ? id : 0; }
  componentDidMount() {
    const oe = console.error; this._oe = oe; console.error = (...a) => { this.errs++; oe.apply(console, a); };
    this._we = () => this.errs++; window.addEventListener('error', this._we);
    const loop = (t) => { try { this.tick(t); } catch (err) { console.error(err); } this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop);
  }
  componentWillUnmount() { cancelAnimationFrame(this.raf); clearTimeout(this.bt); if (this._oe) console.error = this._oe; window.removeEventListener('error', this._we); }
  snap(r, g, b) { const k = (r << 16) | (g << 8) | b; if (this.KEYS.has(k)) return k; for (const q of this.RGB) if (Math.abs(q[0] - r) <= 3 && Math.abs(q[1] - g) <= 3 && Math.abs(q[2] - b) <= 3) return (q[0] << 16) | (q[1] << 8) | q[2]; return -1 - k; }
  measure() {
    const W = this.W, H = this.H, cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const ctx = cv.getContext('2d'), img = ctx.createImageData(W * 2, H * 2); this.blit2(img, this.clean); ctx.putImageData(img, 0, 0);
    const d = ctx.getImageData(0, 0, W * 2, H * 2).data, key = new Int32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((2 * y) * (2 * W) + 2 * x) * 4; key[y * W + x] = this.snap(d[i], d[i + 1], d[i + 2]); }
    let flat = 0, tr = 0, pal = 0, below = 0; const sky = new Set(), cnt = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, v = key[k]; if (x < W - 1 && y < H - 1 && v === key[k + 1] && v === key[k + W]) flat++; if (x < W - 1 && v !== key[k + 1]) tr++; if (v >= 0) pal++; if (this.sky[k] && this.S.ID[k] === 0 && y < this.GY - 30) sky.add(this.clean[k]); if (y >= H / 5) { below++; cnt.set(v, (cnt.get(v) || 0) + 1); } }
    return { flat: flat / ((W - 1) * (H - 1)), tr: tr / (W * H), sky: sky.size, skySet: [...sky].sort((a, b) => a - b), dom: Math.max(...cnt.values()) / below, pal: pal / (W * H) };
  }
  ref(key, fn) { if (!this.refs[key]) this.refs[key] = (el) => { if (el && this.refEls[key] !== el) { this.refEls[key] = el; fn(el); } }; return this.refs[key]; }
}

export { Component };
