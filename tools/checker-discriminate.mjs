// CHECKER vs GLASS GRID — node-only study: which statistic separates a real checkered facade from a glass-grid facade
// that also satisfies the anti-phase rule? Reads ONLY dumps (no page, no chain, no Chrome).
//
// WHY THIS EXISTS: alternation() (anti-phase lattice) fires on both populations. Measured with the tower drawn as a
// grid, its instance fired and was painted white/blue (tower white 35.4%). A first discriminator used the LIGHT
// CLASS's mean luma with a bar of 160 and REJECTED the real checker (the judged frame's mid-rise patch measures 149,
// a glass grid's light class ~116). This tool measures the candidates on the two known dumps, prints them, and the
// rule chosen from the numbers goes into scenePlan's role decision.
//
// It re-derives the instances from the dump itself (the dumps carry no parse mask): the sky is the connected blue
// region touching the top rows, and a building is a connected component of non-sky pixels above the ground band.
import { readFileSync } from 'node:fs';
import { alternation } from '../src/criteria/FacadeRule.js';
import { firingWindows } from '../src/plan.js';

const DUMPS = [['RING (good frame)', '/tmp/chkH/canvas.json'], ['GRID (false positive)', '/tmp/grid-frame.json']];

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const sat = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };

function load(path) {
  const d = JSON.parse(readFileSync(path, 'utf8'));
  const v = d.px.split(',').map(Number);
  return { w: d.w, h: d.h, at: (x, y) => { const i = (y * d.w + x) * 3; return [v[i], v[i + 1], v[i + 2]]; } };
}

// THE INSTANCES ARE THE PLAN'S OWN BOXES. The dumps carry no parse mask, so the instances are taken from the scene
// plan (tools/plan-probe writes /tmp/plan.json from the ring-era run); the geometry is identical between the two
// dumps, which is what makes the comparison apples to apples: the same region, drawn as a ring and as a grid.
// CELL FLATNESS: inside a firing window, at the window's own pitch, what share of the cells is a SINGLE colour (>=95%
// of the cell)? A checker is painted as flat panels - one palette entry per cell - while a glass grid's cells carry
// glass, frame and sill, so its cells are mixed. This is measured on the window's own pixels, at its own pitch.
function cellFlatness(f, cx, cy, WIN, pitchX, pitchY) {
  const px = Math.max(2, pitchX | 0), py = Math.max(2, pitchY | 0);
  let flat = 0, cells = 0;
  for (let y = cy; y + py <= cy + WIN; y += py) {
    for (let x = cx; x + px <= cx + WIN; x += px) {
      const tally = new Map();
      for (let yy = 0; yy < py; yy += 1) for (let xx = 0; xx < px; xx += 1) {
        const [r, g, b] = f.at(x + xx, y + yy);
        const k = `${r},${g},${b}`;
        tally.set(k, (tally.get(k) || 0) + 1);
      }
      const top = Math.max(...tally.values());
      if (top / (px * py) >= 0.95) flat += 1;
      cells += 1;
    }
  }
  return cells ? flat / cells : 0;
}

// THE POPULATIONS, MEASURED WHERE THEY LIVE. The instances the plan produced cannot be rebuilt from a dump (they come
// from the parse mask), so the study finds the firing WINDOWS themselves - the same 32x32 scan the renderer runs - and
// groups them into clusters. On the ring dump the cluster is the true checker; on the grid dump it is the false
// positive. Each cluster's own pixels are then measured with the candidate statistics.
function firingClusters(f, { WIN = 32, step = 8, minS = 0.30 } = {}) {
  const { w, h, at } = f;
  const hits = [];
  for (let cy = 0; cy + WIN <= h; cy += step) {
    for (let cx = 0; cx + WIN <= w; cx += step) {
      const lums = new Float64Array(WIN * WIN);
      for (let yy = 0; yy < WIN; yy += 1) for (let xx = 0; xx < WIN; xx += 1) {
        const [r, g, b] = at(cx + xx, cy + yy); lums[yy * WIN + xx] = lum(r, g, b);
      }
      const res = alternation(lums, WIN, WIN);
      if (res.checkered && res.S >= minS) hits.push({ cx, cy, S: res.S, pitch: res.pitchX + 'x' + res.pitchY });
    }
  }
  // clusters by 8-px adjacency
  const key = new Set(hits.map((q) => `${q.cx},${q.cy}`));
  const seen = new Set();
  const clusters = [];
  for (const q0 of hits) {
    const k0 = `${q0.cx},${q0.cy}`;
    if (seen.has(k0)) continue;
    const stack = [q0]; seen.add(k0);
    const members = [];
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    while (stack.length) {
      const q = stack.pop(); members.push(q);
      x0 = Math.min(x0, q.cx); y0 = Math.min(y0, q.cy);
      x1 = Math.max(x1, q.cx + WIN); y1 = Math.max(y1, q.cy + WIN);
      for (const dy of [-8, 0, 8]) for (const dx of [-8, 0, 8]) {
        const k = `${q.cx + dx},${q.cy + dy}`;
        if (!key.has(k) || seen.has(k)) continue;
        seen.add(k); stack.push(hits.find((r) => `${r.cx},${r.cy}` === k));
      }
    }
    const px = [];
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) px.push(y * w + x);
    clusters.push({ px, x: x0, y: y0, w: x1 - x0, h: y1 - y0, planRole: `${members.length}w S~${(members.reduce((a, b) => a + b.S, 0) / members.length).toFixed(2)}` });
  }
  return clusters;
}

// THE ROLE TABLE: the named instances with BOTH rules - the old one (one patch's S on the whole box) and the new one
// (the lattice count), so the edit's effect is visible on the same boxes.
const BOXES = [
  ['mid-rise (true checker)', [160, 201, 209, 258]],
  ['tower, full box', [0, 0, 131, 342]],
  ['tower, grid-firing slice', [0, 0, 47, 278]],
];
function roleTable(f, label) {
  const { at, w } = f;
  for (const [name, [x0, y0, x1, y1]] of BOXES) {
    const bw = x1 - x0, bh = y1 - y0;
    const lums = new Float64Array(bw * bh);
    for (let y = 0; y < bh; y += 1) for (let x = 0; x < bw; x += 1) {
      const [r, g, b] = at(x0 + x, y0 + y); lums[y * bw + x] = lum(r, g, b);
    }
    const one = alternation(lums, bw, bh);
    const lat = firingWindows(lums, bw, bh);
    // the best firing window inside the box, and its cells' flatness
    let bestFlat = 0, bestS = 0;
    for (let cy = 0; cy + 32 <= bh; cy += 4) for (let cx = 0; cx + 32 <= bw; cx += 4) {
      const patch = new Float64Array(32 * 32);
      for (let yy = 0; yy < 32; yy += 1) for (let xx = 0; xx < 32; xx += 1) patch[yy * 32 + xx] = lums[(cy + yy) * bw + (cx + xx)];
      const r = alternation(patch, 32, 32);
      if (r.checkered && r.S >= 0.30) {
        const fl = cellFlatness(f, x0 + cx, y0 + cy, 32, r.pitchX, r.pitchY);
        if (fl > bestFlat) { bestFlat = fl; bestS = r.S; }
      }
    }
    console.log(`  ${label.padEnd(22)} ${name.padEnd(26)} old: ${(one.checkered && one.S >= 0.30 ? 'checker' : 'not').padEnd(8)} (S ${one.S.toFixed(2)})   lattice ${String(lat).padStart(2)}   best-window flatness ${bestFlat.toFixed(2)} (S ${bestS.toFixed(2)})`);
  }
}
function instances(f) { return firingClusters(f); }

// Otsu on the instance's own luminance, then the class statistics the discriminator candidates need
function stats(f, inst) {
  const { at } = f;
  const n = inst.px.length;
  const hist = new Array(256).fill(0);
  const vals = [];
  for (const p of inst.px) { const [r, g, b] = at(p % f.w, (p / f.w) | 0); const l = lum(r, g, b); vals.push(l); hist[Math.max(0, Math.min(255, Math.round(l)))] += 1; }
  let total = 0; for (let t = 0; t < 256; t += 1) total += t * hist[t];
  let wB = 0, sumB = 0, best = -1, thr = 128;
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t]; if (!wB) continue;
    const wF = n - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (total - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }
  const cls = { dark: [], light: [] };
  let i = 0;
  for (const p of inst.px) {
    const [r, g, b] = at(p % f.w, (p / f.w) | 0);
    cls[vals[i] <= thr ? 'dark' : 'light'].push([r, g, b]); i += 1;
  }
  const agg = (list) => {
    if (!list.length) return { n: 0, luma: 0, med: 0, sat: 0, satHi: 0 };
    const ls = list.map(([r, g, b]) => lum(r, g, b)).sort((a, b) => a - b);
    const ss = list.map(([r, g, b]) => sat(r, g, b));
    return { n: list.length, luma: ls.reduce((a, b) => a + b, 0) / ls.length, med: ls[ls.length >> 1],
      sat: ss.reduce((a, b) => a + b, 0) / ss.length, satHi: ss.filter((s) => s > 0.35).length / ss.length };
  };
  const D = agg(cls.dark), L = agg(cls.light);
  // the anti-phase rule on the instance's box patch
  const patch = new Float64Array(inst.w * inst.h);
  for (let yy = 0; yy < inst.h; yy += 1) for (let xx = 0; xx < inst.w; xx += 1) {
    const [r, g, b] = at(inst.x + xx, inst.y + yy); patch[yy * inst.w + xx] = lum(r, g, b);
  }
  const chk = alternation(patch, inst.w, inst.h);
  return { S: chk.S, pitch: `${chk.pitchX}x${chk.pitchY}`, dark: D, light: L,
    gap: L.luma - D.luma, lightSat: L.sat, lightSatHi: L.satHi, lightLuma: L.luma, lightMed: L.med };
}

const rowsAll = [];
console.log('ROLE DECISION — old rule (whole-box patch S>=0.30) vs the candidates:\n');
for (const [label, path] of DUMPS) {
  const f = load(path);
  roleTable(f, label);
  console.log('');
  for (const inst of instances(f)) {
    const st = stats(f, inst);
    rowsAll.push({ dump: label, box: `${inst.x},${inst.y},${inst.x + inst.w},${inst.y + inst.h}`, planRole: inst.planRole, area: inst.px.length, ...st });
  }
}
console.log('FIRING CLUSTERS (the populations the rule sees):');
console.log(`${'dump'.padEnd(22)} ${'box'.padEnd(18)} ${'windows'.padStart(8)} ${'S'.padStart(5)} ${'D_luma'.padStart(7)} ${'L_luma'.padStart(7)} ${'L_med'.padStart(6)} ${'gap'.padStart(6)} ${'L_sat'.padStart(6)} ${'L_sat>.35'.padStart(9)}`);
for (const r of rowsAll) {
  console.log(`${r.dump.padEnd(22)} ${r.box.padEnd(18)} ${String(r.planRole).padStart(8)} ${r.S.toFixed(2).padStart(5)} ${r.dark.luma.toFixed(0).padStart(7)} ${r.light.luma.toFixed(0).padStart(7)} ${r.light.med.toFixed(0).padStart(6)} ${r.gap.toFixed(0).padStart(6)} ${r.light.sat.toFixed(2).padStart(6)} ${(100 * r.lightSatHi).toFixed(0).padStart(8)}%`);
}
