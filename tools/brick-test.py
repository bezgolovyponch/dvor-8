#!/usr/bin/env python3
"""
Does the BRICK-BY-BRICK approach actually work on a real courtyard photograph?

The module we cannot use (SegFormer-B0/ADE20K) is unavailable for licence reasons. So it is decomposed into
its bricks, and each brick is an existing, published, model-free operator. This file tests whether the bricks,
assembled, recover the things the creator named: building, window, door, road, tree, sky.

THE DECOMPOSITION — what the module actually computes, lowest level first:

  a semantic segmenter answers ONE question per pixel: "which class is this?" It does that by
  (1) grouping pixels that look alike and are near each other      -> REGIONS
  (2) describing each region with numbers (colour, texture)        -> FEATURES
  (3) naming each region from those numbers                        -> LABELS
  (4) making the names agree across the picture and the world      -> CONSTRAINTS

Only (3) needs a trained model, and only because it must know that a particular set of statistics is called
"windowpane" rather than "door". Bricks (1), (2) and (4) are classical, published, licence-free, and fast.
And (3) can be replaced by GEOMETRY: a window is not primarily a colour, it is a rectilinear opening in a
wall, and rectilinearity is measurable without any model.

So the assembly tested here is:

  sky / ground split   <- the horizon from the vertical gradient profile
  structure lines      <- LSD-style gradient-level line growing (Grompone von Gioi et al., IPOL 2012)
  facade rectangles    <- windows and doors as rectangular openings bounded by structure lines
  surface regions      <- Felzenszwalb & Huttenlocher graph merging (IJCV 2004, k as in selective search)
  tree / vegetation    <- regions high in green chroma with high internal texture

Output: per-pixel labels, plus a set of rectangles marked breakable.

  python3 tools/brick-test.py photos-test/b.jpg /tmp/bricks-b.png
"""

import sys, math
import numpy as np
from PIL import Image, ImageDraw

W, H = 192, 256


def load(path):
    im = Image.open(path).convert('RGB')
    # centre-crop to the game's aspect, exactly as the game frames a yard
    ar, want = im.width / im.height, W / H
    if ar > want:
        sw = int(im.height * want); sx = (im.width - sw) // 2; box = (sx, 0, sx + sw, im.height)
    else:
        sh = int(im.width / want); sy = (im.height - sh) // 2; box = (0, sy, im.width, sy + sh)
    return im.crop(box).resize((W, H), Image.LANCZOS)


# ---------------------------------------------------------------- BRICK 1: regions
def felzenszwalb(img, k=50.0, sigma=0.8, min_size=20):
    """Felzenszwalb & Huttenlocher, IJCV 2004: 'ability to preserve detail in low-variability image regions
    while ignoring detail in high-variability regions.' Parameter k, renamed `scale` in scikit-image; the
    selective-search paper uses k = 50. Greedy merging of an 8-connected pixel graph by colour difference."""
    a = np.asarray(img, dtype=np.float64)
    # light smoothing first, as the reference implementation does (sigma)
    if sigma > 0:
        r = max(1, int(sigma * 2))
        pad = np.pad(a, ((r, r), (r, r), (0, 0)), mode='edge')
        acc = np.zeros_like(a)
        n = 0
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                acc += pad[r + dy:r + dy + H, r + dx:r + dx + W]
                n += 1
        a = acc / n
    parent = list(range(W * H))
    size = [1] * (W * H)
    diff = [0.0] * (W * H)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    edges = []
    for y in range(H):
        for x in range(W):
            i = y * W + x
            for dx, dy in ((1, 0), (0, 1), (1, 1), (-1, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H:
                    j = ny * W + nx
                    d = float(np.abs(a[y, x] - a[ny, nx]).sum())
                    edges.append((d, i, j))
    edges.sort(key=lambda e: e[0])

    for d, i, j in edges:
        ri, rj = find(i), find(j)
        if ri == rj:
            continue
        # merge if the difference is smaller than the internal variation of both, plus k / size
        if d <= min(diff[ri] + k / size[ri], diff[rj] + k / size[rj]):
            if size[ri] < size[rj]:
                ri, rj = rj, ri
            parent[rj] = ri
            size[ri] += size[rj]
            diff[ri] = max(diff[ri], d, diff[rj])

    # absorb regions below min_size into their most similar neighbour
    lab = np.array([find(i) for i in range(W * H)], dtype=np.int64).reshape(H, W)
    out = np.zeros((H, W), dtype=np.int64)
    remap, nxt = {}, 0
    for y in range(H):
        for x in range(W):
            r = lab[y, x]
            if r not in remap:
                remap[r] = nxt; nxt += 1
            out[y, x] = remap[r]
    return out, a


# ---------------------------------------------------------------- BRICK 2: structure lines
def gradient_levels(gray):
    """Grompone von Gioi et al. (IPOL 2012) grow line support regions from the LEVEL-LINE of the gradient
    angle. This is the first stage of LSD: quantise the gradient angle, then connected components."""
    gy, gx = np.gradient(gray)
    mag = np.hypot(gx, gy)
    ang = np.arctan2(gy, gx)                      # -pi..pi
    # the level-line angle is perpendicular to the gradient, quantised to 1/32 of a turn (LSD's own choice)
    ll = (ang + math.pi / 2) % math.pi
    q = np.floor(ll / (math.pi / 32)).astype(np.int64) % 32
    return mag, q


# ---------------------------------------------------------------- BRICK 3: region features and labels
def region_features(regions, a):
    """The middle of the decomposition. A semantic segmenter does not classify PIXELS, it classifies REGIONS,
    and this is the step that was missing: measure every region once, then label it from those measurements.

    Four features per region, all classical and all free:
      colour     mean R, G, B
      texture    mean local gradient magnitude INSIDE the region  (how busy it is)
      position   mean y (high in the frame is sky; low is ground)
      contact    which frame edges the region touches (a region on the bottom edge is ground; one touching
                 the top edge may be sky)
    The labels then come from STRUCTURE, not from a colour threshold, which is why this does not need to be
    retuned for every photograph the way a brightness cutoff does."""
    n = regions.max() + 1
    flat = regions.ravel()
    gray = a.mean(axis=2)
    gy, gx = np.gradient(gray)
    mag = np.hypot(gx, gy)

    count = np.bincount(flat, minlength=n).astype(np.float64)
    count[count == 0] = 1
    feat = {}
    for ch in range(3):
        feat['c%d' % ch] = np.bincount(flat, weights=a[:, :, ch].ravel(), minlength=n) / count
    feat['tex'] = np.bincount(flat, weights=mag.ravel(), minlength=n) / count
    ys = np.repeat(np.arange(H), W)
    feat['y'] = np.bincount(flat, weights=ys.astype(np.float64), minlength=n) / count
    feat['n'] = count

    lab2d = regions
    touches = {}
    for name, line in (('top', lab2d[0, :]), ('bottom', lab2d[H - 1, :]),
                       ('left', lab2d[:, 0]), ('right', lab2d[:, W - 1])):
        t = np.zeros(n, dtype=bool)
        t[np.unique(line)] = True
        touches[name] = t
    feat['touch'] = touches
    feat['area_frac'] = count / float(W * H)
    return feat


def label_regions(regions, a, feat):
    """Name each region. Order matters: sky and vegetation are decided by appearance, ground by appearance AND
    a structural fact (it must reach the bottom of the frame and fill a lot of it), and everything else in the
    facade band becomes wall."""
    n = regions.max() + 1
    gray = a.mean(axis=2)
    gmean = gray.mean()
    sky_lab = np.zeros(n, dtype=bool)
    veg_lab = np.zeros(n, dtype=bool)
    gnd_lab = np.zeros(n, dtype=bool)

    for i in range(n):
        if feat['n'][i] < 4:
            continue
        r, g, b = feat['c0'][i], feat['c1'][i], feat['c2'][i]
        y, tex = feat['y'][i], feat['tex'][i]
        t = feat['touch']
        touches_top = bool(t['top'][i]); touches_bottom = bool(t['bottom'][i])
        # SKY: blue leads, it is bright, it is high in the frame, it is smooth, and it reaches the top
        if b > r * 1.15 and b > g * 1.08 and g > gmean * 0.85 and y < H * 0.5 and tex < 9.0 and touches_top:
            sky_lab[i] = True
            continue
        # VEGETATION: green leads and the region is internally busy — leaves are texture
        if g > r * 1.02 and g > b * 1.02 and tex > 6.0 and feat['n'][i] > 20:
            veg_lab[i] = True
            continue
        # GROUND: it must actually reach the bottom edge of the frame and be a large share of the picture.
        # This is what a brightness rule cannot express, and why the first attempt labelled the BUILDING as
        # ground: the building is dark, but it does not touch the bottom of the frame.
        if touches_bottom and feat['area_frac'][i] > 0.03 and y > H * 0.55 and tex < 22.0:
            gnd_lab[i] = True
            continue
    return sky_lab, veg_lab, gnd_lab


def paint(regions, mask_lab):
    return mask_lab[regions]


# ---------------------------------------------------------------- BRICK 4: facade rectangles
def facade_rectangles(a, horizon):
    """A window or a door is a RECTANGULAR opening in a wall: a locally-uniform area enclosed by stronger
    edges than its own interior. This is the geometric core of the learning-free window detectors (Recky &
    Leberl, ICPR 2010; Ali et al., ICIAP 2007), with no model and no training.

    Two things had to be measured rather than assumed, both from photographs:
      - the threshold must be LOCAL. A global 'darker than the 25th percentile' test marks half of a
        courtyard, because the ground is dark and large. A window is darker than the WALL BESIDE IT.
      - the search is confined to the facade band, between the skyline and the ground, because there is no
        wall below the horizon to put a window in."""
    gray = a.mean(axis=2)
    top = max(0, horizon - 26)                     # a little above the skyline: roofs, chimneys
    bot = min(H, horizon + int(H * 0.34))          # down to the car roofs
    gy, gx = np.gradient(gray)
    mag = np.hypot(gx, gy)
    seen = np.zeros((H, W), dtype=bool)
    rects = []
    for y0 in range(top, bot, 2):
        for x0 in range(0, W, 2):
            if seen[y0, x0]:
                continue
            # compare this pixel with the local surroundings, not with the whole picture
            win = gray[max(0, y0 - 10):y0 + 11]
            if win.size == 0:
                continue
            local = float(np.median(win))
            if gray[y0, x0] > local - 8:            # a window is darker than the wall it sits in
                continue
            stack = [(y0, x0)]
            seen[y0, x0] = True
            px = []
            while stack:
                y, x = stack.pop()
                px.append((y, x))
                if len(px) > 2200:
                    break
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if top <= ny < bot and 0 <= nx < W and not seen[ny, nx] and gray[ny, nx] <= local - 8:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(px) < 18:
                continue
            ys = [p[0] for p in px]; xs = [p[1] for p in px]
            y1, y2, x1, x2 = min(ys), max(ys), min(xs), max(xs)
            bw, bh = x2 - x1 + 1, y2 - y1 + 1
            if bw < 4 or bh < 4 or bw > W // 2 or bh > (bot - top) // 2:
                continue
            if not (0.55 <= bw / float(bh) <= 3.4):    # windows are taller than wide, doors much taller
                continue
            fill = len(px) / float(bw * bh)
            if fill < 0.55:
                continue
            inside = float(np.mean(mag[y1:y2 + 1, x1:x2 + 1]))
            ring = []
            for x in range(max(0, x1 - 1), min(W, x2 + 2)):
                for y in (y1 - 1, y2 + 1):
                    if top <= y < bot:
                        ring.append(mag[y, x])
            for y in range(max(top, y1 - 1), min(bot, y2 + 2)):
                for x in (x1 - 1, x2 + 1):
                    if 0 <= x < W:
                        ring.append(mag[y, x])
            if not ring or float(np.mean(ring)) < inside * 1.25 + 1.0:
                continue
            rects.append((x1, y1, bw, bh, fill, float(np.mean(ring))))
    rects.sort(key=lambda r: -(r[2] * r[3]))
    kept = []
    for r in rects:
        x1, y1, bw, bh = r[0], r[1], r[2], r[3]
        if any(k[0] - 1 <= x1 and k[1] - 1 <= y1 and k[0] + k[2] + 1 >= x1 + bw and k[1] + k[3] + 1 >= y1 + bh
               for k in kept):
            continue
        kept.append(r)
    return kept[:26]


# ---------------------------------------------------------------- BRICK 5: vegetation
def vegetation(a, regions):
    """Trees are where the GREEN channel leads and the region is internally busy. Both are measured, neither
    is learned: green dominance is chroma, internal business is texture."""
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    greenish = (g > r * 1.02) & (g > b * 1.02)
    gray = a.mean(axis=2)
    gy, gx = np.gradient(gray)
    m = np.hypot(gx, gy)
    busy = np.zeros((H, W))
    k = 3
    for y in range(H):
        for x in range(W):
            y1, y2 = max(0, y - k), min(H, y + k + 1)
            x1, x2 = max(0, x - k), min(W, x + k + 1)
            busy[y, x] = m[y1:y2, x1:x2].std()
    busy = busy > np.percentile(busy, 60)
    return greenish & busy


# ---------------------------------------------------------------- assemble
def main():
    src = sys.argv[1] if len(sys.argv) > 1 else 'photos-test/b.jpg'
    out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/bricks.png'
    img = load(src)
    regions, a = felzenszwalb(img, k=300.0)
    gray = a.mean(axis=2)
    feat = region_features(regions, a)
    sky_lab, veg_lab, gnd_lab = label_regions(regions, a, feat)
    sky, ground, veg = paint(regions, sky_lab), paint(regions, gnd_lab), paint(regions, veg_lab)
    # the facade band is everything that is not sky or ground; windows are searched there
    row = int(np.percentile(feat['y'][sky_lab], 90)) if sky_lab.any() else 0
    rects = facade_rectangles(a, row)
    veg = vegetation(a, regions)
    mag, q = gradient_levels(gray)

    nreg = regions.max() + 1
    print(f'{src}  ->  {W}x{H}')
    print(f'  regions (Felzenszwalb k=50)      {nreg:>5}   median size {int(np.median(np.bincount(regions.ravel())))} px')
    print(f'  horizon row                      {row:>5}   ({100*row/H:.0f}% down)')
    print(f'  sky pixels                       {sky.sum():>5}   ({100*sky.mean():.1f}%)')
    print(f'  ground pixels                    {ground.sum():>5}   ({100*ground.mean():.1f}%)')
    print(f'  vegetation pixels                {veg.sum():>5}   ({100*veg.mean():.1f}%)')
    print(f'  facade rectangles (windows/doors){len(rects):>5}')
    for r in rects[:8]:
        print(f'      x={r[0]:>3} y={r[1]:>3} {r[2]:>3}x{r[3]:<3} fill {r[4]:.2f} edge {r[5]:.1f}')

    # ---- picture: original | labels | rectangles | lines ----
    K = 2
    sheet = Image.new('RGB', (W * K * 4 + 30, H * K + 26), (18, 5, 46))
    dr = ImageDraw.Draw(sheet)

    def put(im, i, label):
        sheet.paste(im.resize((W * K, H * K), Image.NEAREST), (6 + i * (W * K + 6), 20))
        dr.text((8 + i * (W * K + 6), 6), label, fill=(255, 210, 63))

    put(img, 0, 'PHOTO')

    # labels: sky blue, vegetation green, rest the photo darkened
    lab = img.copy()
    px = np.asarray(lab).copy()
    px[sky] = (px[sky] * 0.45 + np.array([90, 170, 255]) * 0.55).astype(np.uint8)
    px[veg] = (px[veg] * 0.45 + np.array([60, 200, 90]) * 0.55).astype(np.uint8)
    px[ground] = (px[ground] * 0.55 + np.array([255, 140, 40]) * 0.45).astype(np.uint8)
    put(Image.fromarray(px), 1, 'SKY / GROUND / TREE')

    # rectangles
    rect = img.copy()
    rd = ImageDraw.Draw(rect)
    for (x1, y1, bw, bh, fill, edge) in rects:
        rd.rectangle([x1, y1, x1 + bw - 1, y1 + bh - 1], outline=(255, 60, 160), width=1)
    put(rect, 2, 'WINDOWS/DOORS')

    # structure lines: the gradient level-line quantisation, drawn as ink
    st = np.zeros((H, W, 3), dtype=np.uint8)
    st[...] = (18, 5, 46)
    strong = mag > np.percentile(mag, 88)
    st[strong] = (240, 240, 255)
    st[~strong] = (np.asarray(img)[~strong] * 0.35).astype(np.uint8)
    put(Image.fromarray(st), 3, 'STRUCTURE LINES')

    sheet.save(out)
    print(f'  wrote {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
