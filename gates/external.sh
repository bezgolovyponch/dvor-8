#!/bin/sh
# THE EXTERNAL GATE, as one command: render the current canvas dump to a PNG with Pillow (published),
# then judge it with pixelmatch (published). Nothing here measures anything itself.
# usage: sh gates/external.sh <canvas.json> [reference.png]
set -e
DUMP="${1:?usage: sh gates/external.sh <canvas.json> [reference.png]}"
REF="${2:-reference/v10a-art-canvas.png}"   # MEASURED, 2026-10-16: v10a-art.png is 288x512 but 56,573 distinct colours,
# entropy 12.859 bpp - a resampled screenshot, so pixelmatch can never reach 0 against it and every share is diluted.
# v10a-art-canvas.png: 48 colours, entropy 5.349. Compare like with like (the registry names this file as the input).
# STILL A PREMISE: even its 48 values are ~1-LSB noise around ~35 real colours, so a "palette-exact" claim must be
# proven on OUR side (index buffer + table); the reference is only usable after snapping to its own dominant colours.
python3 -c "
from PIL import Image; import json, sys
d=json.load(open('$DUMP'))
Image.frombytes('RGB',(d['w'],d['h']),bytes(int(v) for v in d['px'].split(','))).save('/tmp/ours.png')
im=Image.open('$REF').convert('RGB'); px=list(im.getdata())
flat=sum(1 for y in range(im.size[1]-1) for x in range(im.size[0]-1) if px[y*im.size[0]+x]==px[y*im.size[0]+x+1]==px[(y+1)*im.size[0]+x])
print(f'REFERENCE PREMISES: $REF {im.size[0]}x{im.size[1]} · {len(set(px))} distinct colours · {100*flat/((im.size[0]-1)*(im.size[1]-1)):.1f}% flat')
print('NOTE: palette art has ~50 colours; a reference with thousands is not 1:1 and every share read from it is approximate.')
"
node gates/frame-diff.mjs /tmp/ours.png "$REF"
