#!/usr/bin/env python3
"""Serves the game to a phone on the same Wi-Fi, and tells the browser to keep nothing.

    python3 tools/serve.py [port]

`python3 -m http.server` works too, but a phone browser then keeps old copies of the modules, and a
build that was changed looks unchanged. This is the same server with one header added.
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Fresh(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4310
    root = Path(__file__).resolve().parent.parent
    ThreadingHTTPServer(('0.0.0.0', port), partial(Fresh, directory=str(root))).serve_forever()
