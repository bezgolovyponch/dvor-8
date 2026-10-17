#!/bin/sh
# THE EXTERNAL GATE, as one command: render the current canvas dump to a PNG with Pillow (published),
# then judge it with pixelmatch (published). Nothing here measures anything itself.
# usage: sh gates/external.sh <canvas.json> [reference.png]
set -e
DUMP="${1:?usage: sh gates/external.sh <canvas.json> [reference.png]}"
REF="${2:-reference/v10a-art.png}"
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
