#!/usr/bin/env python3
"""Recreate a designed post (a collage made in a design app) from the full-quality raw photos.

For every panel you give a ROUGH rectangle; the script
  1. snaps each edge to the real panel border in the post (strongest gradient within ±45 px),
  2. finds which window of the raw photo the panel shows (SIFT features + RANSAC similarity transform),
  3. writes layout.json: { size: [w, h], panels: [ { id, photo, box: [x, y, w, h] (post px), crop: [x, y, w, h]
     (fractions of the raw), inliers } ] }  → feed box/crop straight into <Stage post> + <Photo box crop>,
  4. writes a check image: the original post beside the rebuild. Compare them before trusting the numbers.

  .venv/bin/python tools/match.py spec.json [--out layout.json] [--check rebuild.jpg]

spec.json:
  { "post": "posts/1.png",                 # the designed post (paths relative to the spec file)
    "preview_width": 720,                  # optional: rects were read off a preview this wide
    "panels": [ { "id": "a", "photo": "photos/a.jpg", "rect": [x0, y0, x1, y1] }, ... ] }

Rough rects: open the post in Preview, read corners off the cursor (or at preview_width), ±40 px is fine.
Run tools/orient.py first so raws are upright: crops are fractions of the upright image (as browsers show it).
Low inliers (< 25) or a rebuild that doesn't match means text over the panel or a heavy filter starved the match:
the script retries against the whole post, but check those panels by eye.
"""
import argparse, json, os, sys
import cv2, numpy as np

R = cv2.IMREAD_COLOR  # applies EXIF orientation, like the browser


def snap(gx, gy, box, W, H, r=45):
    x0, y0, x1, y1 = box
    def best(lo, hi, score, cur):
        c = [(score(v), v) for v in range(max(lo, 0), min(hi, 10**9))]
        return max(c)[1] if c else cur
    span = lambda a, b: slice(int(a + (b - a) * 0.1), int(b - (b - a) * 0.1))
    nx0 = x0 if x0 <= 6 else best(x0 - r, x0 + r, lambda v: gx[span(y0, y1), min(v, W - 1)].mean(), x0)
    nx1 = x1 if x1 >= W - 6 else best(x1 - r, x1 + r, lambda v: gx[span(y0, y1), min(v, W - 1)].mean(), x1)
    ny0 = y0 if y0 <= 6 else best(y0 - r, y0 + r, lambda v: gy[min(v, H - 1), span(x0, x1)].mean(), y0)
    ny1 = y1 if y1 >= H - 6 else best(y1 - r, y1 + r, lambda v: gy[min(v, H - 1), span(x0, x1)].mean(), y1)
    return nx0, ny0, nx1, ny1


def affine(sift, d_raw, kp_raw, kq, dq, thresh):
    if dq is None or d_raw is None or len(kq) < 4: return None, None
    m = cv2.BFMatcher().knnMatch(d_raw, dq, k=2)
    good = [p[0] for p in m if len(p) == 2 and p[0].distance < 0.75 * p[1].distance]
    if len(good) < 4: return None, None
    src = np.float32([kp_raw[g.queryIdx].pt for g in good]); dst = np.float32([kq[g.trainIdx].pt for g in good])
    return cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=thresh)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec"); ap.add_argument("--out", default="layout.json"); ap.add_argument("--check", default="rebuild-check.jpg")
    a = ap.parse_args()
    spec = json.load(open(a.spec)); base = os.path.dirname(os.path.abspath(a.spec))
    post = cv2.imread(os.path.join(base, spec["post"]), R)
    if post is None: sys.exit(f"cannot read post {spec['post']}")
    H, W = post.shape[:2]
    K = W / spec["preview_width"] if spec.get("preview_width") else 1.0
    pg = cv2.cvtColor(post, cv2.COLOR_BGR2GRAY)
    fl = cv2.GaussianBlur(pg, (3, 3), 0).astype(np.float32)
    gx = np.abs(cv2.Sobel(fl, cv2.CV_32F, 1, 0)); gy = np.abs(cv2.Sobel(fl, cv2.CV_32F, 0, 1))
    sift = cv2.SIFT_create(6000)
    kp_post, d_post = sift.detectAndCompute(pg, None)
    panels, canvas = [], np.full((H, W, 3), 40, np.uint8)
    for q in spec["panels"]:
        box = [int(round(v * K)) for v in q["rect"]]; box[2] = min(box[2], W); box[3] = min(box[3], H)
        x0, y0, x1, y1 = snap(gx, gy, box, W, H)
        raw = cv2.imread(os.path.join(base, q["photo"]), R)
        if raw is None: sys.exit(f"cannot read {q['photo']}")
        rh, rw = raw.shape[:2]
        kp_raw, d_raw = sift.detectAndCompute(cv2.cvtColor(raw, cv2.COLOR_BGR2GRAY), None)
        mask = np.zeros_like(pg); mask[y0:y1, x0:x1] = 255
        kq, dq = sift.detectAndCompute(pg, mask)
        A, inl = affine(sift, d_raw, kp_raw, kq, dq, 3)
        if A is None or not (0.05 < np.hypot(A[0, 0], A[1, 0]) < 20):  # text over the panel can starve the masked match
            A, inl = affine(sift, d_raw, kp_raw, kp_post, d_post, 4)
        if A is None: print(f"{q['id']}: no match, skipped"); continue
        Ai = cv2.invertAffineTransform(A)
        (cx0, cy0), (cx1, cy1) = np.array([[x0, y0, 1], [x1, y1, 1]], np.float64) @ Ai.T
        crop = [round(float(v), 4) for v in (cx0 / rw, cy0 / rh, (cx1 - cx0) / rw, (cy1 - cy0) / rh)]
        panels.append({"id": q["id"], "photo": q["photo"], "box": [x0, y0, x1 - x0, y1 - y0], "crop": crop, "inliers": int(inl.sum())})
        print(q["id"], "box", panels[-1]["box"], "crop", crop, "inliers", panels[-1]["inliers"], "" if inl.sum() >= 25 else "  ← LOW: check by eye")
        # rebuild this panel from the raw (magenta = the crop ran off the raw)
        pad = 400
        padded = cv2.copyMakeBorder(raw, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(255, 0, 255))
        X0, Y0, X1, Y1 = int(cx0) + pad, int(cy0) + pad, int(cx1) + pad, int(cy1) + pad
        X0, Y0 = max(0, X0), max(0, Y0)
        piece = padded[Y0:Y1, X0:X1]
        if piece.size: canvas[y0:y1, x0:x1] = cv2.resize(piece, (x1 - x0, y1 - y0))
    json.dump({"size": [W, H], "panels": panels}, open(a.out, "w"), indent=1)
    s = 900 / H
    pair = np.hstack([cv2.resize(post, (int(W * s), 900)), np.full((900, 12, 3), 255, np.uint8), cv2.resize(canvas, (int(W * s), 900))])
    cv2.imwrite(a.check, pair)
    print(f"→ {a.out}  (check: {a.check}, original left, rebuild right)")


if __name__ == "__main__":
    main()
