// The detector: a real object-detection model, run on the device. Nothing is uploaded.
//
// MediaPipe's ObjectDetector with EfficientDet-Lite, vendored in vendor/mediapipe so the game does not
// depend on a CDN being reachable from a balcony. It knows the 80 everyday things of the COCO set — cars,
// trucks, bicycles, benches — and does NOT know bins, trees, swings or doors. What it cannot name is not
// a target; this game does not invent things to hit.

import { FilesetResolver, ObjectDetector } from '../vendor/mediapipe/vision_bundle.js';
import { tilesFor, merge } from './objects.js';

export const DETECT_LONG = 1600;   // the photograph is searched at up to this size, not at the game's
let ready = null;

export function loadDetector(model = 'efficientdet_lite0') {
  ready ||= (async () => {
    const at = (path) => new URL(`../vendor/mediapipe/${path}`, import.meta.url).href;
    const fileset = await FilesetResolver.forVisionTasks(at('wasm'));
    return ObjectDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: at(`${model}.tflite`), delegate: 'CPU' },
      scoreThreshold: 0.2, maxResults: 25, runningMode: 'IMAGE',
    });
  })();
  return ready;
}

// source: a canvas holding the photograph. Returns boxes as fractions of the photograph, already merged.
// onProgress(done, total) is called between slices, and the page gets a turn to draw each time.
export async function detectAll(source, onProgress) {
  const detector = await loadDetector();
  const tiles = tilesFor(source.width, source.height);
  const slice = document.createElement('canvas');
  const found = [];
  for (let i = 0; i < tiles.length; i += 1) {
    const t = tiles[i];
    slice.width = t.w; slice.height = t.h;
    slice.getContext('2d').drawImage(source, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
    for (const d of detector.detect(slice).detections) {
      const b = d.boundingBox, c = d.categories[0];
      found.push({
        label: c.categoryName, score: c.score,
        x: (t.x + b.originX) / source.width, y: (t.y + b.originY) / source.height, w: b.width / source.width, h: b.height / source.height,
      });
    }
    onProgress?.(i + 1, tiles.length);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { all: found, kept: merge(found) };
}
