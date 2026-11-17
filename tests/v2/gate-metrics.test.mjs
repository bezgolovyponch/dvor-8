import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  outlineClosure,
  strayOutline,
  carShapeIoU,
  edgeContrast,
  splitBuildings,
  greenShare,
  paneBand,
  coloursMetric,
  orphanPct,
  skyIoU
} from '../../tools/gate-metrics.mjs';

const W = 10, H = 10, N = W * H;
const W6 = 6, H6 = 6, N6 = W6 * H6;

function makeObjMask(coords, id = 1, W = 10, H = 10) {
  const arr = new Uint8Array(W * H).fill(0);
  for (const [x, y] of coords) arr[y * W + x] = id;
  return arr;
}

function makeFrameData(coords, r, g, b, bg = [0, 0, 0], W = 10, H = 10) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = bg[0];
    data[i * 4 + 1] = bg[1];
    data[i * 4 + 2] = bg[2];
    data[i * 4 + 3] = 255;
  }
  for (const [x, y] of coords) {
    const k = y * W + x;
    data[k * 4] = r;
    data[k * 4 + 1] = g;
    data[k * 4 + 2] = b;
  }
  return data;
}

const labFn = (r, g, b) => [r / 255 * 100, (g - 128) / 255 * 128, (b - 128) / 255 * 128];

test('outlineClosure: 8x8 square (64px) fully outlined -> 1', () => {
  const coords = [];
  for (let x = 1; x <= 8; x++) for (let y = 1; y <= 8; y++) coords.push([x, y]);
  const objMask = makeObjMask(coords, 1, W, H);
  const isOutline = new Uint8Array(N).fill(0);
  for (let x = 0; x <= 9; x++) { isOutline[0 * W + x] = 1; isOutline[9 * W + x] = 1; }
  for (let y = 0; y <= 9; y++) { isOutline[y * W + 0] = 1; isOutline[y * W + 9] = 1; }
  const res = outlineClosure(objMask, isOutline, W, H);
  assert.equal(res.length, 1);
  assert.equal(res[0].value, 1);
});

test('outlineClosure: object < 60 pixels skipped', () => {
  const objMask = makeObjMask([[1,1],[2,1],[1,2],[2,2]], 1, W, H);
  const isOutline = new Uint8Array(N).fill(1);
  const res = outlineClosure(objMask, isOutline, W, H);
  assert.equal(res.length, 0);
});

test('strayOutline: outline pixel in middle of object -> G2 > 0', () => {
  const outlineMask = new Uint8Array(N6).fill(0);
  outlineMask[2 * W6 + 2] = 1;
  const objectEdgeMask = new Uint8Array(N6).fill(0);
  const skyMask = new Uint8Array(N6).fill(0);
  const val = strayOutline(outlineMask, objectEdgeMask, skyMask, W6, H6);
  assert.equal(val, 1);
});

test('strayOutline: outline pixel next to edge -> G2 = 0', () => {
  const outlineMask = new Uint8Array(N6).fill(0);
  outlineMask[1 * W6 + 1] = 1;
  const objectEdgeMask = new Uint8Array(N6).fill(0);
  objectEdgeMask[1 * W6 + 2] = 1;
  const skyMask = new Uint8Array(N6).fill(0);
  const val = strayOutline(outlineMask, objectEdgeMask, skyMask, W6, H6);
  assert.equal(val, 0);
});

test('strayOutline: outline on sky boundary skipped', () => {
  const outlineMask = new Uint8Array(N6).fill(0);
  outlineMask[0] = 1;
  const objectEdgeMask = new Uint8Array(N6).fill(0);
  const skyMask = new Uint8Array(N6).fill(0);
  skyMask[0] = 1;
  const val = strayOutline(outlineMask, objectEdgeMask, skyMask, W6, H6);
  assert.equal(val, 0);
});

test('carShapeIoU: identical masks -> 1', () => {
  const spriteMask = [{ bbox: [0,0,3,3], pixels: [0,1,6,7] }];
  const carClassMask = new Uint8Array(N6).fill(0);
  for (const k of [0,1,6,7]) carClassMask[k] = 5;
  const val = carShapeIoU(spriteMask, carClassMask);
  assert.equal(val, 1);
});

test('carShapeIoU: no overlap -> 0', () => {
  const spriteMask = [{ bbox: [0,0,3,3], pixels: [0,1,6,7] }];
  const carClassMask = new Uint8Array(N6).fill(0);
  carClassMask[2] = 5;
  carClassMask[3] = 5;
  const val = carShapeIoU(spriteMask, carClassMask);
  assert.equal(val, 0);
});

test('carShapeIoU: median of multiple cars', () => {
  const spriteMask = [
    { bbox: [0,0,2,2], pixels: [0,1] },
    { bbox: [3,3,2,2], pixels: [20,21] },
    { bbox: [0,3,2,2], pixels: [18,19] }
  ];
  const carClassMask = new Uint8Array(N6).fill(0);
  carClassMask[0] = 5; carClassMask[1] = 5;
  carClassMask[20] = 5;
  const val = carShapeIoU(spriteMask, carClassMask);
  const ious = [1, 0.5, 0].sort((a,b)=>a-b);
  assert.equal(val, ious[1]);
});

test('edgeContrast: simple case', () => {
  const frameData = makeFrameData([[1,1],[1,2]], 255, 0, 0, [0, 0, 255], W, H);
  const objMask = makeObjMask([[1,1],[1,2]], 1, W, H);
  const isOutline = new Uint8Array(N).fill(0);
  const val = edgeContrast(frameData, objMask, isOutline, labFn, W, H);
  assert.ok(val >= 0);
});

test('splitBuildings: two touching buildings same colour -> 1', () => {
  const objMask = new Uint8Array(N6).fill(0);
  for (const [x,y] of [[1,1],[2,1],[1,2],[2,2]]) objMask[y*W6+x] = 1;
  for (const [x,y] of [[3,1],[4,1],[3,2],[4,2]]) objMask[y*W6+x] = 2;
  const frameData = makeFrameData([[1,1],[2,1],[1,2],[2,2],[3,1],[4,1],[3,2],[4,2]], 100, 100, 100, [0,0,0], W6, H6);
  const val = splitBuildings(objMask, frameData, W6, H6);
  assert.equal(val, 1);
});

test('splitBuildings: two touching buildings different colour -> 0', () => {
  const objMask = new Uint8Array(N6).fill(0);
  for (const [x,y] of [[1,1],[2,1],[1,2],[2,2]]) objMask[y*W6+x] = 1;
  for (const [x,y] of [[3,1],[4,1],[3,2],[4,2]]) objMask[y*W6+x] = 2;
  const frameData = new Uint8ClampedArray(N6 * 4);
  for (const [x,y] of [[1,1],[2,1],[1,2],[2,2]]) { const k=y*W6+x; frameData[k*4]=100; frameData[k*4+1]=100; frameData[k*4+2]=100; }
  for (const [x,y] of [[3,1],[4,1],[3,2],[4,2]]) { const k=y*W6+x; frameData[k*4]=200; frameData[k*4+1]=50; frameData[k*4+2]=50; }
  const val = splitBuildings(objMask, frameData, W6, H6);
  assert.equal(val, 0);
});

test('splitBuildings: non-touching buildings -> 0', () => {
  const objMask = new Uint8Array(N6).fill(0);
  for (const [x,y] of [[1,1],[2,1]]) objMask[y*W6+x] = 1;
  for (const [x,y] of [[4,1],[5,1]]) objMask[y*W6+x] = 2;
  const frameData = makeFrameData([[1,1],[2,1],[4,1],[5,1]], 100, 100, 100, [0,0,0], W6, H6);
  const val = splitBuildings(objMask, frameData, W6, H6);
  assert.equal(val, 0);
});

test('greenShare: all green pixels match palette -> 1', () => {
  const cls = new Uint8Array(N6).fill(0);
  for (const [x,y] of [[1,1],[2,1],[1,2],[2,2]]) cls[y*W6+x] = 2;
  const paletteRGB = new Array(48).fill([0,0,0]);
  paletteRGB[6] = [50, 100, 50];
  const frameData = makeFrameData([[1,1],[2,1],[1,2],[2,2]], 50, 100, 50, [0,0,0], W6, H6);
  const val = greenShare(cls, frameData, paletteRGB, W6, H6);
  assert.equal(val, 1);
});

test('greenShare: no green pixels -> 1', () => {
  const cls = new Uint8Array(N6).fill(0);
  const paletteRGB = new Array(48).fill([0,0,0]);
  const frameData = new Uint8ClampedArray(N6 * 4);
  const val = greenShare(cls, frameData, paletteRGB, W6, H6);
  assert.equal(val, 1);
});

test('greenShare: half match -> 0.5', () => {
  const cls = new Uint8Array(N6).fill(0);
  cls[1*W6+1] = 2; cls[2*W6+1] = 2;
  const paletteRGB = new Array(48).fill([0,0,0]);
  paletteRGB[6] = [50, 100, 50];
  const frameData = new Uint8ClampedArray(N6 * 4);
  let k = 1*W6+1; frameData[k*4]=50; frameData[k*4+1]=100; frameData[k*4+2]=50;
  k = 2*W6+1; frameData[k*4]=200; frameData[k*4+1]=50; frameData[k*4+2]=50;
  const val = greenShare(cls, frameData, paletteRGB, W6, H6);
  assert.equal(val, 0.5);
});

test('paneBand: no rebuilt -> pass', () => {
  const res = paneBand([]);
  assert.equal(res.pass, true);
  assert.equal(res.count, 0);
});

test('paneBand: all in band -> pass', () => {
  const res = paneBand([{share:0.3}, {share:0.35}, {share:0.28}]);
  assert.equal(res.pass, true);
  assert.equal(res.share, 1);
});

test('paneBand: less than half in band -> fail', () => {
  const res = paneBand([{share:0.3}, {share:0.1}, {share:0.1}]);
  assert.equal(res.pass, false);
  assert.equal(res.share, 1/3);
});

test('coloursMetric: counts unique colours', () => {
  const frameData = new Uint8ClampedArray(N * 4).fill(0);
  frameData[0] = 10; frameData[1] = 20; frameData[2] = 30;
  frameData[4] = 10; frameData[5] = 20; frameData[6] = 30;
  frameData[8] = 40; frameData[9] = 50; frameData[10] = 60;
  const val = coloursMetric(frameData, W, H);
  assert.equal(val, 3);
});

test('orphanPct: single pixel different from neighbours', () => {
  const frameData = new Uint8ClampedArray(N * 4).fill(100);
  const k = 1 * W + 1;
  frameData[k * 4] = 200; frameData[k * 4 + 1] = 200; frameData[k * 4 + 2] = 200;
  const val = orphanPct(frameData, W, H);
  assert.ok(val > 0);
});

test('skyIoU: perfect match -> 1', () => {
  const compSky = new Uint8Array(N6).fill(1);
  const seg = new Uint8Array(N6).fill(0);
  const val = skyIoU(compSky, seg, W6, H6);
  assert.equal(val, 1);
});

test('skyIoU: no overlap -> 0', () => {
  const compSky = new Uint8Array(N6).fill(0);
  compSky[0] = 1;
  const seg = new Uint8Array(N6).fill(1);
  const val = skyIoU(compSky, seg, W6, H6);
  assert.equal(val, 0);
});