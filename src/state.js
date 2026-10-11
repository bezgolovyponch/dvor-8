// The world state. Plain data, no rendering, no DOM.
//
// Everything the player can see is one of five layers, and the layer decides both the parallax speed and
// the saturation band. Those two numbers come from the pinned environment standard:
//
//   Sky       0.05x   saturation 20-30%
//   Far       0.15x   40-60%
//   Mid       0.40x   60-80%
//   Near      0.75x   80-100%
//   Yard      1.00x   80-100%   the gameplay layer, where the objects live
//
// A layer is not a drawing decision, it is the depth a thing occupies. Putting an object in the wrong
// layer is what makes a 2D scene look flat, so the layer is stored in the data rather than chosen at
// draw time.

export const LAYERS = [
  { id: 'sky',  name: 'небо',    speed: 0.05, sat: [0.20, 0.30] },
  { id: 'far',  name: 'дали',    speed: 0.15, sat: [0.38, 0.52] },
  { id: 'mid',  name: 'крыши',   speed: 0.40, sat: [0.58, 0.74] },
  { id: 'near', name: 'близкое', speed: 0.75, sat: [0.80, 0.88] },
  { id: 'yard', name: 'двор',    speed: 1.00, sat: [0.92, 1.00] },
];

export const layerById = (id) => LAYERS.find((l) => l.id === id) || LAYERS[LAYERS.length - 1];

// What an object can be. Each kind states its silhouette class, because the standard's first rule is
// silhouette-first: a thing must be identifiable from its black shape alone before any detail is added.
export const KINDS = {
  bench:    { label: 'скамейка',   layer: 'yard', w: 46, h: 16, breaks: 3, silhouette: 'long and low, legs visible' },
  bin:      { label: 'бак',        layer: 'yard', w: 22, h: 30, breaks: 2, silhouette: 'tapered box on a base' },
  crate:    { label: 'ящик',       layer: 'yard', w: 20, h: 18, breaks: 2, silhouette: 'square with cross braces' },
  bush:     { label: 'куст',       layer: 'yard', w: 34, h: 22, breaks: 2, silhouette: 'round mass, uneven top' },
  puddle:   { label: 'лужа',       layer: 'yard', w: 40, h: 8,  breaks: 1, silhouette: 'flat ellipse, broken edge' },
  pram:     { label: 'коляска',    layer: 'yard', w: 26, h: 26, breaks: 2, silhouette: 'basket on a wide axle' },
  scooter:  { label: 'самокат',    layer: 'yard', w: 24, h: 26, breaks: 2, silhouette: 'thin T on two small wheels' },
  sign:     { label: 'табличка',   layer: 'yard', w: 18, h: 34, breaks: 2, silhouette: 'post with a flat head' },
  window:   { label: 'окно',       layer: 'mid',  w: 16, h: 20, breaks: 1, silhouette: 'rectangle in a wall grid' },
  roof:     { label: 'крыша',      layer: 'mid',  w: 60, h: 24, breaks: 2, silhouette: 'sloped ridge' },
  tree:     { label: 'дерево',     layer: 'near', w: 30, h: 56, breaks: 3, silhouette: 'trunk with a broken crown' },
  pipe:     { label: 'труба',      layer: 'near', w: 12, h: 40, breaks: 2, silhouette: 'vertical with an elbow' },
};

// The world. `destroyed` is a count of hits taken: a thing is gone when it reaches its `breaks`.
export function makeWorld(seed = 'двор-1') {
  return {
    seed,
    time: 'day',
    filter: 'sober',   // how the viewer sees the yard; a look, never a rule (docs/filters.md)
    objects: [],
    inventory: { rocks: 6 },
    scanned: 0,
    destroyed: 0,
    log: [],
  };
}

export function hitObject(world, id) {
  const obj = world.objects.find((o) => o.id === id);
  if (!obj || obj.gone) return { hit: false, reason: 'нет цели' };
  obj.hits += 1;
  const broke = obj.hits >= (KINDS[obj.kind]?.breaks || 2);
  if (broke) {
    obj.gone = true;
    world.destroyed += 1;
    world.log.push(`разбито: ${KINDS[obj.kind]?.label || obj.kind}`);
  } else {
    world.log.push(`попадание: ${KINDS[obj.kind]?.label || obj.kind}`);
  }
  return { hit: true, broke, obj };
}

export function spendRock(world) {
  if (world.inventory.rocks <= 0) return false;
  world.inventory.rocks -= 1;
  return true;
}

export function scanObject(world, id) {
  const obj = world.objects.find((o) => o.id === id);
  if (!obj || obj.scanned) return false;
  obj.scanned = true;
  world.scanned += 1;
  world.log.push(`распознано: ${KINDS[obj.kind]?.label || obj.kind}`);
  return true;
}
