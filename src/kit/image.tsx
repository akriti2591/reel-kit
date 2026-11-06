// Image plumbing shared by Photo, StickerCutout and InstaxPrint.
// - useImageInfo(src): loads + decodes an image once per tab and HOLDS THE RENDER until it's ready (SVG <image>
//   doesn't do that on its own, so without this the first frame can paint an empty panel). A missing file resolves
//   to { ok: false } instead of crashing, so callers can draw a placeholder.
// - coverGeo(): where the full image must sit so a crop window (fractions of the image) covers a box.
// - Placeholder art: a soft panel with a bust silhouette, used when a photo is missing. The default demo anchors
//   (src/demo/config.ts) sit on this silhouette, so doodles still land on a "head".
import { continueRender, delayRender, getStaticFiles, random, staticFile } from "remotion";
import { useEffect, useRef, useState } from "react";

export type Box = { x: number; y: number; w: number; h: number };
/** crop window as fractions of the (orientation-corrected) image: [x, y, w, h] */
export type Crop = [number, number, number, number];
export type Pt = [number, number];
export type ImageInfo = { ok: boolean; w: number; h: number };

/** false if the assets dir is known and the file isn't in it (avoids 404 noise); undefined if we can't tell */
export const assetExists = (src: string): boolean | undefined => {
  try {
    const files = getStaticFiles();
    if (!files || files.length === 0) return undefined;
    return files.some((x) => x.src === src);
  } catch {
    return undefined;
  }
};

const pending = new Map<string, Promise<ImageInfo>>();
const known = new Map<string, ImageInfo>();
const load = (src: string) => {
  if (!pending.has(src) && assetExists(src) === false) {
    known.set(src, { ok: false, w: 0, h: 0 });
    pending.set(src, Promise.resolve(known.get(src)!));
  }
  if (!pending.has(src)) {
    pending.set(src, new Promise<ImageInfo>((res) => {
      const im = new Image();
      const done = (i: ImageInfo) => { known.set(src, i); res(i); };
      im.onload = () => im.decode().then(() => done({ ok: true, w: im.naturalWidth, h: im.naturalHeight }), () => done({ ok: true, w: im.naturalWidth, h: im.naturalHeight }));
      im.onerror = () => done({ ok: false, w: 0, h: 0 });
      im.src = src;
    }));
  }
  return pending.get(src)!;
};

export const useImageInfo = (src?: string): ImageInfo | null => {
  const [info, setInfo] = useState<ImageInfo | null>(() => (src ? known.get(src) ?? null : { ok: false, w: 0, h: 0 }));
  const [handle] = useState(() => (src && !known.has(src) ? delayRender(`image ${src}`, { timeoutInMilliseconds: 60000 }) : null));
  const released = useRef(false);
  useEffect(() => {
    if (!src) return;
    let live = true;
    load(src).then((i) => {
      if (live) setInfo(i);
      // two animation frames so the <image> has painted before the frame is captured
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (handle !== null && !released.current) { released.current = true; continueRender(handle); }
      }));
    });
    return () => { live = false; };
  }, [src, handle]);
  return info;
};

/** placement of the whole image so that `crop` (default: cover, centred on `focus`) fills `box` exactly */
export const coverGeo = (box: Box, nat: { w: number; h: number }, crop?: Crop, focus: Pt = [0.5, 0.4]): Box => {
  if (crop) {
    const sc = Math.max(box.w / (crop[2] * nat.w), box.h / (crop[3] * nat.h));
    const iw = nat.w * sc, ih = nat.h * sc;
    const cx = (crop[0] + crop[2] / 2) * iw, cy = (crop[1] + crop[3] / 2) * ih;
    return { x: box.x + box.w / 2 - cx, y: box.y + box.h / 2 - cy, w: iw, h: ih };
  }
  const sc = Math.max(box.w / nat.w, box.h / nat.h);
  const iw = nat.w * sc, ih = nat.h * sc;
  const x = Math.min(box.x, Math.max(box.x + box.w - iw, box.x + box.w / 2 - focus[0] * iw));
  const y = Math.min(box.y, Math.max(box.y + box.h - ih, box.y + box.h / 2 - focus[1] * ih));
  return { x, y, w: iw, h: ih };
};

/** a point given as fractions of a box → frame px */
export const inBox = (box: Box, p: Pt): Pt => [box.x + p[0] * box.w, box.y + p[1] * box.h];

/** Missing photos are treated as a 3:4 portrait, so crops, anchors and the placeholder silhouette still line up. */
export const VIRTUAL = { w: 3, h: 4 };
/** where the image (real or virtual) sits for a panel */
export const geoFor = (info: ImageInfo | null, box: Box, crop?: Crop, focus?: Pt) => coverGeo(box, info?.ok ? info : VIRTUAL, crop, focus);

/** Anchors are fractions of the PHOTO (as displayed, orientation-corrected), so one anchor works for every panel,
 *  crop and size the photo appears in. This hook maps them to frame px for one placement. */
export const usePhotoPoint = (src: string | undefined, box: Box, crop?: Crop, focus?: Pt) => {
  const info = useImageInfo(src ? staticFile(src) : undefined);
  const g = geoFor(info, box, crop, focus);
  return (p: Pt): Pt => [g.x + p[0] * g.w, g.y + p[1] * g.h];
};

// ---------- placeholder (no photo yet) ----------
const TONES = [["#6d625c", "#4a423e"], ["#5f6a6e", "#3e4649"], ["#72665a", "#4b4239"], ["#6a5f6b", "#463e47"]];
export const tonesFor = (seed: string) => TONES[Math.floor(random(`tone-${seed}`) * TONES.length) % TONES.length];

/** bust silhouette inside an image rect: head centred at (0.5, 0.34), radius 0.17·w; shoulders below.
 *  The demo's default anchors (src/demo/config.ts) are measured on this shape. */
export const silhouettePath = (b: Box) => {
  const cx = b.x + b.w / 2, hy = b.y + 0.34 * b.h, r = 0.17 * b.w;
  const neckY = hy + r * 0.95, sh = b.y + b.h * 0.6, bot = b.y + b.h + 2;
  return [
    `M ${cx - r} ${hy}`,
    `a ${r} ${r * 1.12} 0 1 1 ${2 * r} 0`,
    `a ${r} ${r * 1.12} 0 1 1 ${-2 * r} 0 Z`,
    `M ${cx - r * 0.45} ${neckY - 4} L ${cx + r * 0.45} ${neckY - 4}`,
    `C ${cx + r * 0.5} ${sh - b.h * 0.04}, ${cx + b.w * 0.36} ${sh - b.h * 0.02}, ${cx + b.w * 0.4} ${sh + b.h * 0.05}`,
    `L ${cx + b.w * 0.46} ${bot} L ${cx - b.w * 0.46} ${bot} L ${cx - b.w * 0.4} ${sh + b.h * 0.05}`,
    `C ${cx - b.w * 0.36} ${sh - b.h * 0.02}, ${cx - r * 0.5} ${sh - b.h * 0.04}, ${cx - r * 0.45} ${neckY - 4} Z`,
  ].join(" ");
};

/** a soft toned panel with the silhouette; `img` is the virtual image rect (geoFor), `box` the panel */
export function PlaceholderArt({ box, img, seed, label, bw }: { box: Box; img: Box; seed: string; label?: string; bw?: boolean }) {
  const [a, z] = tonesFor(seed);
  const gid = svgId("ph", seed);
  return (
    <g style={{ filter: bw ? "grayscale(1)" : undefined }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={a} /><stop offset="1" stopColor={z} />
        </linearGradient>
      </defs>
      <rect x={Math.min(box.x, img.x)} y={Math.min(box.y, img.y)} width={Math.max(box.w, img.w)} height={Math.max(box.h, img.h)} fill={`url(#${gid})`} />
      <path d={silhouettePath(img)} fill="rgba(255,250,240,0.16)" />
      {label ? (
        <text x={box.x + 16} y={box.y + box.h - 18} fontFamily="sans-serif" fontSize={Math.max(14, Math.min(26, box.w * 0.04))} fill="rgba(255,250,240,0.5)">{label}</text>
      ) : null}
    </g>
  );
}

/** the silhouette as a "cutout" (used by StickerCutout when there's no photo) */
export const PlaceholderCut = ({ img, seed }: { img: Box; seed: string }) => {
  const [a] = tonesFor(seed);
  return (
    <g>
      <path d={silhouettePath(img)} fill={a} />
      <path d={silhouettePath(img)} fill="rgba(255,250,240,0.2)" />
    </g>
  );
};

/** sanitised id for SVG defs */
export const svgId = (prefix: string, k: string) => `${prefix}-${k.replace(/[^a-zA-Z0-9_-]/g, "")}`;
