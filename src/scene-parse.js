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
    // PATHS ARE ABSOLUTE, because transformers.js resolves the local model path against the PAGE, not the module:
    // a relative '../vendor/' resolved to /vendor/ and the model was never found. The game is served under /game.
    env.allowRemoteModels = false;              // the model is ours, on disk, and nothing is fetched from the net
    env.allowLocalModels = true;
    env.localModelPath = '/game/vendor/';
    // THE EXACT FILE, NAMED. Left to itself the runtime guesses among several builds (threaded / simd / plain) and a
    // wrong guess is a silent hang, not a 404. The threaded build is named explicitly; single-threaded variants are
    // vendored beside it as fallbacks.
    // THE PLAIN THREADED BUILD, not the jsep one: jsep means the JavaScript Execution Provider (WebGPU/WebNN), which
    // this browser does not offer, and pairing its wasm with the bundle's glue threw "ie[e] is not a function".
    // THE BUILD THAT MATCHES THE GLUE, version for version. transformers.js 3.0.2 bundles
    // onnxruntime-web@1.21.0-dev.20241024-d9ca84ef96, read from its own package metadata; feeding it a 1.20.1 wasm
    // threw "no available backend found ... e is not a function". Both variants of THAT version are vendored, and the
    // plain (non-jsep) one is named, because jsep means WebGPU/WebNN which this browser does not offer.
    // THE DIRECTORY, BOTH HALVES. This ort-web version loads its wasm through an .mjs glue it fetches from
    // wasmPaths, so the path must be the FOLDER containing ort-wasm-simd-threaded.mjs and ort-wasm-simd-threaded.wasm
    // - naming only the .wasm left the glue unfound and the backend reported "no available backend found".
    env.backends.onnx.wasm.wasmPaths = '/game/vendor/tjs/';
    // SINGLE-THREADED, ALWAYS. The threaded WASM backend needs SharedArrayBuffer, which a browser only grants to a
    // cross-origin-isolated page (COOP/COEP). Without it the runtime neither runs nor errors - it HANGS, which is
    // exactly what the probe did for a minute. One thread is slower and always works.
    env.backends.onnx.wasm.numThreads = 1;
    const seg = await pipeline('image-segmentation', 'seg', { quantized: true });
    return seg;
  })().catch((error) => {
    // THE ERROR IS KEPT, NOT SWALLOWED: a parse that fails silently is worse than no parse at all.
    if (typeof window !== 'undefined') window.__parseError = String((error && error.stack) || error);
    console.warn('scene parse unavailable:', error && error.message);
    return null;
  });
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
  // THE PIPELINE TAKES AN IMAGE SOURCE, NOT A CANVAS ELEMENT: handing it a canvas throws "Unsupported input type:
  // object". A data URL is unambiguous and needs no network round trip.
  const out = await seg(input.toDataURL('image/png'));
  if (!out || !out.length) return null;
  const iw = input.width, ih = input.height;
  const masks = Object.create(null);
  // the pipeline returns {label, mask} per class, mask being a canvas at the input's size
  for (const part of out) {
    const label = String(part.label || '').toLowerCase();
    if (!label) continue;
    // THE MASK IS A RawImage WITH ITS OWN BUFFER (transformers.js), not a canvas: `part.mask.data` is RGBA and
    // `part.mask.width/height` are its own size - asking a RawImage for getContext() silently yielded zero classes.
    const mimg = part.mask;
    const data = mimg && mimg.data ? mimg.data : null;
    const mw = (mimg && mimg.width) || iw, mh = (mimg && mimg.height) || ih;
    if (!data) continue;
    const stride = (mimg && mimg.channels) || 4;
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
      const sy = Math.min(mh - 1, Math.floor((y / h) * mh));
      for (let x = 0; x < w; x += 1) {
        const sx = Math.min(mw - 1, Math.floor((x / w) * mw));
        const p = (sy * mw + sx) * stride;
        // one channel or RGBA: present means a non-zero first channel
        if (data[p] > 0) m[y * w + x] = 1;
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
