#!/usr/bin/env python3
"""
Update public/images/accidental-ceo/accidental-ceo-front-back-01.png for the site.

1) Place or replace your mockup as:
      public/images/accidental-ceo/accidental-ceo-front-back-01.png

2) Run:  python3 scripts/accidental-ceo-front-back-transparent.py

   Optional:  python3 scripts/.../accidental-ceo-front-back-transparent.py <src> [dest]
   Default dest is the same as src (process in place).

If the image already has real transparency, it is re-saved as RGBA PNG unchanged
(except format). If it is fully opaque (e.g. black studio backdrop), only
black connected to the image edges is made transparent (flood fill).

Requires: python3 -m pip install pillow
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow: python3 -m pip install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "public/images/accidental-ceo/accidental-ceo-front-back-01.png"
THRESH = 18  # RGB <= this treated as "black" for flood fill from edges


def has_transparency(im: Image.Image) -> bool:
    im_rgba = im.convert("RGBA")
    data = im_rgba.getdata()
    step = max(1, len(data) // 50_000)
    for i in range(0, len(data), step):
        if data[i][3] < 255:
            return True
    return False


def flood_remove_edge_black(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()

    def is_bg(r: int, g: int, b: int, _a: int) -> bool:
        return r <= THRESH and g <= THRESH and b <= THRESH

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if not visited[y][x]:
                r, g, b, a = px[x, y]
                if is_bg(r, g, b, a):
                    visited[y][x] = True
                    q.append((x, y))

    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x]:
                r, g, b, a = px[x, y]
                if is_bg(r, g, b, a):
                    visited[y][x] = True
                    q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, a = px[nx, ny]
                if is_bg(r, g, b, a):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            if visited[y][x]:
                px[x, y] = (0, 0, 0, 0)

    return im


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else src

    if not src.is_file():
        print(
            f"Missing source: {src}\n"
            f"Add your file as: {DEFAULT_SRC}",
            file=sys.stderr,
        )
        sys.exit(1)

    im = Image.open(src)
    if has_transparency(im):
        im = im.convert("RGBA")
        mode = "transparency preserved from source"
    else:
        im = flood_remove_edge_black(im)
        mode = "edge-connected black removed (opaque source)"

    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "PNG")
    print(f"Wrote {out} ({im.size[0]}x{im.size[1]}, RGBA) — {mode}")


if __name__ == "__main__":
    main()
