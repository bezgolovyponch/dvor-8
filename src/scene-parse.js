// STAGE 1 + 2 OF THE METHOD SET (docs/METHODS.md): WHAT IS ON THE SCREEN, AND WHERE THE SKY IS.
//
// This replaces two rules this build invented and that never worked:
//   * "the sky is a colour test"  - it painted 55-57% sky on a frame whose photograph has 43%, over the city;
//   * "the facades are found by hue and straight runs" - it produced 1075 fragments of ~19 px.
//
// THE METHOD, published and on-device: semantic segmentation into a fixed class set. The model vendored in
// vendor/seg is SegFormer-B0 finetuned on Cityscapes, quantized to 4.4 MB, and its 19 classes are exactly the ones
// this game needs: road, sidewalk, building, wall, fence, pole, traffic light, traffic sign, vegetation, terrain,
// SKY, person, rider, car, truck, bus, train, motorcycle, bicycle.
//
// THE RULE THE PARSE MAKES POSSIBLE, and it is not mine: THE SKY IS EVERYTHING ABOVE THE HORIZON AND ABOVE THE
// BUILDING OUTLINES. Concretely: the sky's region is the `sky` class mask, PLUS the pixels a building hides, which
// is why a hole torn in a wall shows sky - and NEVER a pixel outside that. The horizon is the lower boundary of the
// sky class, per column, interpolated across the columns a building occludes.
let pipelinePromise = null;
const SEG_URL = '../vendor/seg/';
const TJS_URL = '../vendor/tjs/transformers.min.js';

/** Load the segmenter once. Returns null when the runtime or the model cannot be loaded - never a guess. */
export async function loadSceneParse() {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    const mod = await import(/* @vite-ignore */ TJS_URL);
    const { pipeline, env } = mod;
    env.allowRemoteModels = false;              // the model is ours, on disk, and nothing is fetched from the net
    env.allowLocalModels = true;
    env.localModelPath = '../vendor/';
    env.backends.onnx.wasm.wasmPaths = '../vendor/tjs/';
    const seg = await pipeline('image-segmentation', 'seg', { quantized: true });
    return seg;
  })().catch((error) => { console.warn('scene parse unavailable:', error && error.message); return null; });
  return pipelinePromise;
}

/** A canvas the model can eat: the photograph, 512 on its long side. */
function toInput(source, w, h) {
  const c = document.createElement('canvas');
  const scale = 512 / Math.max(w, h);
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d');
  g.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

/**
 * Run the parse and return per-class masks ON THE GAME FRAME (w x h game pixels), by nearest-neighbour resampling of
 * the model's own output - a mask is a fact about a region, so resampling it changes nothing but the grid size.
 * @returns {Promise<null | { masks: Record<string, Uint8Array>, horizon: Int32Array, w: number, h: number, classes: number }>}
 */
export async function sceneParse(source, w, h, sw, sh) {
  const seg = await loadSceneParse();
  if (!seg) return null;
  const input = toInput(source, sw, sh);
  const out = await seg(input);
  if (!out || !out.length) return null;
  const iw = input.width, ih = input.height;
  const masks = Object.create(null);
  // the pipeline returns {label, mask} per class, mask being a canvas at the input's size
  for (const part of out) {
    const label = String(part.label || '').toLowerCase();
    if (!label) continue;
    const mc = part.mask;
    const g = mc.getContext ? mc.getContext('2d') : null;
    const data = g ? g.getImageData(0, 0, mc.width, mc.height).data : null;
    if (!data) continue;
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
      const sy = Math.min(mc.height - 1, Math.floor((y / h) * mc.height));
      for (let x = 0; x < w; x += 1) {
        const sx = Math.min(mc.width - 1, Math.floor((x / w) * mc.width));
        const p = (sy * mc.width + sx) * 4;
        // the mask canvas is white where the class is present
        if (data[p] > 127) m[y * w + x] = 1;
      }
    }
    masks[label] = m;
  }
  // THE HORIZON, per column: the lowest row of the sky class. Columns a building occludes interpolate from their
  // neighbours, which is the whole reason the horizon is taken from the CLASS and not from a brightness edge.
  const sky = masks.sky || new Uint8Array(w * h);
  const horizon = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x += 1) {
    for (let y = h - 1; y >= 0; y -= 1) if (sky[y * w + x]) { horizon[x] = y; break; }
  }
  let last = -1;
  for (let x = 0; x < w; x += 1) { if (horizon[x] >= 0) { last = horizon[x]; } else if (last >= 0) horizon[x] = last; }
  for (let x = w - 1; x >= 0; x -= 1) { if (horizon[x] < 0 && x + 1 < w) horizon[x] = horizon[x + 1]; }
  return { masks, horizon, w, h, classes: Object.keys(masks).length, input: [iw, ih] };
}
