#!/usr/bin/env python3
"""
Which candidate components can actually be DEPENDED ON by this project?

The rule the project already lives by is dependency-free ESM: anything shipped must be either vendored into
the repo, or loaded from a CDN at runtime, or implemented from a published algorithm. So every candidate is
checked for three things it is not allowed to fail: it exists at a stable URL, it states a licence this
project can use, and its size is known.

Run:  python3 tools/component-audit.py
"""

import json
import subprocess
import sys

# name, url, what it would be used for
CANDIDATES = [
    # --- downscaling ---------------------------------------------------------------------------------
    ("unfake.js (CDN)", "https://cdn.jsdelivr.net/npm/unfakejs/+esm",
     "Kopf content-adaptive downscaling + dominant-colour cell reduction, MIT, WASM in browser"),
    ("unfakejs on npm", "https://registry.npmjs.org/unfakejs",
     "the package record and its licence field"),
    ("unfake (Rust, GitHub)", "https://raw.githubusercontent.com/ArthurHub/unfake/main/README.md",
     "the source the JS port is built from"),
    # --- segmentation --------------------------------------------------------------------------------
    ("tfjs-models deeplab index", "https://raw.githubusercontent.com/tensorflow/tfjs-models/master/deeplab/src/index.ts",
     "Apache-2.0 header; the API surface"),
    ("tfjs-models deeplab config", "https://raw.githubusercontent.com/tensorflow/tfjs-models/master/deeplab/src/config.ts",
     "the ADE20K label list and the colormaps"),
    ("tfjs deeplab bundle", "https://cdn.jsdelivr.net/npm/@tensorflow-models/deeplab/dist/deeplab.min.js",
     "the loadable browser bundle"),
    ("tfjs core bundle", "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js",
     "the runtime it needs"),
    ("ADE20K model.json", "https://tfhub.dev/tensorflow/tfjs-model/deeplab/ade20k/1/default/1/model.json?tfjs-format=file",
     "the 150-class model graph"),
    # --- depth ---------------------------------------------------------------------------------------
    ("transformers.js", "https://cdn.jsdelivr.net/npm/@huggingface/transformers/+esm",
     "the loader for depth-anything-v2-small via ONNX"),
    ("depth-anything-v2-small ONNX", "https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model_quantized.onnx",
     "monocular depth, Apache-2.0 — size decides whether it is shippable"),
    # --- segmentation without a model ----------------------------------------------------------------
    ("SLIC WASM on npm", "https://registry.npmjs.org/@lightly-ai/slic",
     "model-free superpixels, O(N)"),
    ("opencv.js whitelist", "https://raw.githubusercontent.com/opencv/opencv/4.x/platforms/js/opencv_js.config.py",
     "proves LineSegmentDetector and HoughLines are in the default build"),
]


def probe(url):
    """Return (status, bytes). Uses curl so a redirect is followed and the real byte count is read."""
    try:
        out = subprocess.run(
            ["curl", "-sL", "--max-time", "45", "-o", "/dev/null",
             "-w", "%{http_code} %{size_download}", url],
            capture_output=True, text=True, check=False)
        code, size = out.stdout.strip().split()
        return int(code), int(size)
    except Exception as exc:                     # noqa: BLE001 - a probe failure is data, not a crash
        return 0, 0


def main():
    print(f"{'component':30} {'http':>5} {'bytes':>12}  verdict")
    print("-" * 78)
    rows = []
    for name, url, why in CANDIDATES:
        code, size = probe(url)
        ok = code == 200 and size > 0
        rows.append((name, url, code, size, ok, why))
        print(f"{name:30} {code:>5} {size:>12,}  {'OK' if ok else 'NOT AVAILABLE'}")
    print()
    print("REACHABLE:")
    for name, url, code, size, ok, why in rows:
        if ok:
            print(f"  {name:26} {size/1024/1024:6.2f} MB   {why}")
    print()
    print("NOT REACHABLE — these must not appear in any plan:")
    dead = [r for r in rows if not r[4]]
    for name, url, code, size, ok, why in dead:
        print(f"  {name:26} http {code}   {url}")
    if not dead:
        print("  (none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
