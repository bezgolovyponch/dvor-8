import { FACADE_LABEL } from './lattice.js';

const TJS_URL = '../../vendor/tjs/transformers.min.js';
let pipelinePromise = null;

export function loadFacadeParse() {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    const { pipeline, env } = await import(TJS_URL);
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = new URL('../../vendor/', import.meta.url).href;
    env.backends.onnx.wasm.wasmPaths = new URL('../../vendor/tjs/', import.meta.url).href;
    env.backends.onnx.wasm.numThreads = 1;
    return pipeline('image-segmentation', 'facade', { quantized: true });
  })().catch((error) => {
    console.warn('facade parse unavailable:', error && error.message);
    return null;
  });
  return pipelinePromise;
}

export async function parseFacade(canvas) {
  const seg = await loadFacadeParse();
  if (!seg) return null;
  const w = canvas.width, h = canvas.height, out = await seg(canvas.toDataURL('image/png'));
  if (!out || !out.length) return null;
  const lbl = new Uint8Array(w * h).fill(FACADE_LABEL.background);
  for (const part of out) {
    const id = FACADE_LABEL[String(part.label || '').toLowerCase()];
    const m = part.mask;
    if (id === undefined || !m || !m.data) continue;
    const mw = m.width, mh = m.height, stride = m.channels || 1;
    for (let y = 0; y < h; y += 1) {
      const sy = Math.min(mh - 1, Math.floor((y / h) * mh));
      for (let x = 0; x < w; x += 1) if (m.data[(sy * mw + Math.min(mw - 1, Math.floor((x / w) * mw))) * stride] > 0) lbl[y * w + x] = id;
    }
  }
  return lbl;
}
