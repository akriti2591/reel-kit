#!/usr/bin/env python3
"""Normalise photos for the reel: HEIC/PNG/JPG in, upright sRGB JPGs out (orientation baked into the pixels, no
EXIF orientation tag left behind), optionally downsized. Run it before mask.swift and match.py.

  .venv/bin/python tools/orient.py <in-folder-or-file> <out-folder> [--max 2000] [--rotate a=90 --rotate c=-90]
                                    [--names a,b,c,d]

  --max N        longest edge in px (default 2000; 0 keeps the size). Big phone photos slow renders down.
  --rotate k=D   extra clockwise rotation in degrees (90/180/270/-90) for a photo that's sideways even after EXIF
                 (keyed by output name without extension).
  --names        rename outputs in sorted input order (e.g. a,b,c,d for the demo).

Why this exists (gotchas):
  * Phones store many photos sideways plus an EXIF "Orientation" tag. Browsers (and so Remotion) honour the tag;
    some tools don't, so one photo ends up with two different "uprights" in different tools.
  * `sips -s format jpeg` (used here for HEIC) can DROP the orientation tag on conversion without rotating the
    pixels, so the JPG comes out sideways. We read the source's orientation first and apply it ourselves.
  * OpenCV's imread APPLIES EXIF orientation by default (unless you pass IMREAD_IGNORE_ORIENTATION). We rely on
    that for JPG/PNG input, then write pixels with no tag, so every later tool sees the same upright image.
Needs: macOS `sips` (built in) for HEIC, and the venv: python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
"""
import argparse, os, re, subprocess, sys, tempfile
import cv2

EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif"}
ROT = {90: cv2.ROTATE_90_CLOCKWISE, -270: cv2.ROTATE_90_CLOCKWISE, 180: cv2.ROTATE_180, -180: cv2.ROTATE_180,
       270: cv2.ROTATE_90_COUNTERCLOCKWISE, -90: cv2.ROTATE_90_COUNTERCLOCKWISE}


def sips_orientation(path):
    """EXIF orientation (1–8) as macOS sees it, or 1."""
    try:
        out = subprocess.run(["sips", "-g", "orientation", path], capture_output=True, text=True).stdout
        m = re.search(r"orientation:\s*(\d)", out)
        return int(m.group(1)) if m else 1
    except FileNotFoundError:
        return 1


def apply_orientation(img, o):
    """apply an EXIF orientation value to pixels"""
    if o == 2: return cv2.flip(img, 1)
    if o == 3: return cv2.rotate(img, cv2.ROTATE_180)
    if o == 4: return cv2.flip(img, 0)
    if o == 5: return cv2.flip(cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE), 1)
    if o == 6: return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    if o == 7: return cv2.flip(cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE), 1)
    if o == 8: return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return img


def sips_size(path):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", path], capture_output=True, text=True).stdout
    w = re.search(r"pixelWidth:\s*(\d+)", out); h = re.search(r"pixelHeight:\s*(\d+)", out)
    return (int(w.group(1)), int(h.group(1))) if w and h else None


def load_upright(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in (".heic", ".heif"):
        o = sips_orientation(path)
        with tempfile.TemporaryDirectory() as td:
            tmp = os.path.join(td, "x.jpg")
            subprocess.run(["sips", "-s", "format", "jpeg", path, "--out", tmp], check=True, capture_output=True)
            kept = sips_orientation(tmp)
            raw = cv2.imread(tmp, cv2.IMREAD_COLOR | cv2.IMREAD_IGNORE_ORIENTATION)  # pixels exactly as stored
            if kept != 1:  # sips kept the tag: the pixels are still unrotated
                return apply_orientation(raw, kept), f"heic (tag {o} kept by sips, applied)"
            if o == 1:
                return raw, "heic (no rotation)"
            # the tag was dropped: did sips rotate the pixels, or leave them sideways (the gotcha)?
            src = sips_size(path); h, w = raw.shape[:2]
            quarter = o in (5, 6, 7, 8)
            unrotated = src is not None and quarter and (w, h) == src
            if unrotated or not quarter:
                return apply_orientation(raw, o), f"heic (tag {o} dropped by sips, applied here: check it on a contact sheet)"
            return raw, f"heic (tag {o}, sips already rotated the pixels)"
    img = cv2.imread(path, cv2.IMREAD_COLOR)  # applies EXIF orientation
    return img, "jpg/png (EXIF applied by OpenCV)"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--max", type=int, default=2000)
    ap.add_argument("--rotate", action="append", default=[])
    ap.add_argument("--names", default="")
    a = ap.parse_args()
    files = [a.src] if os.path.isfile(a.src) else sorted(os.path.join(a.src, f) for f in os.listdir(a.src) if os.path.splitext(f)[1].lower() in EXTS)
    if not files: sys.exit(f"no photos in {a.src}")
    names = [n.strip() for n in a.names.split(",") if n.strip()]
    rot = {k: int(v) for k, v in (r.split("=") for r in a.rotate)}
    os.makedirs(a.out, exist_ok=True)
    for i, f in enumerate(files):
        name = names[i] if i < len(names) else os.path.splitext(os.path.basename(f))[0]
        img, how = load_upright(f)
        if img is None: print(f"skip {f}: unreadable"); continue
        if name in rot: img = cv2.rotate(img, ROT[rot[name]])
        h, w = img.shape[:2]
        if a.max and max(h, w) > a.max:
            k = a.max / max(h, w); img = cv2.resize(img, (round(w * k), round(h * k)), interpolation=cv2.INTER_AREA)
        dst = os.path.join(a.out, name + ".jpg")
        cv2.imwrite(dst, img, [cv2.IMWRITE_JPEG_QUALITY, 92])
        print(f"{os.path.basename(f)} → {dst}  {img.shape[1]}×{img.shape[0]}  [{how}]")


if __name__ == "__main__":
    main()
