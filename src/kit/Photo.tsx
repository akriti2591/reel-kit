// <Photo>: one photo panel in frame px. Shows an exact crop window of the raw (e.g. from tools/match.py's
// layout.json) or a "cover" fit around a focus point; optional black-and-white, drain to B/W or bloom back to colour,
// a landing move, and a slow push that starts from rest. Doodles go in `behind` / `front` and share the panel's
// transform, so pushes and shakes move them too. With `occlude` and a mask (`cut`), the subject is drawn again over
// `behind`, so e.g. horn bases tuck behind the hair. A missing photo renders a placeholder panel, never a crash.
import { staticFile, useCurrentFrame } from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { coverGeo, geoFor, PlaceholderArt, svgId, useImageInfo, type Box, type Crop, type Pt } from "./image";
import { eioSine, prog, spr, SPRING } from "./motion";
import { useSpace } from "./space";

export type PhotoProps = {
  /** unique key (used for SVG ids) */
  k: string;
  /** asset path inside the assets dir, e.g. "photos/a.jpg" */
  src?: string;
  /** cutout PNG (same size as the photo) for occlusion, e.g. "cut/a.png" */
  cut?: string;
  box: Box;
  crop?: Crop;
  focus?: Pt;
  bw?: boolean;
  /** frame where colour drains to B/W (24 f) */
  drainAt?: number;
  /** frame where B/W blooms back to colour (40 f) */
  bloomAt?: number;
  /** frame where the panel lands (springs in from `from`); omit to be there from the start */
  landAt?: number;
  from?: "up" | "down" | "left" | "right" | "none";
  /** slow push: amount (0.04 = +4%) from `at` over `len` frames */
  push?: { at: number; len: number; amount?: number };
  dim?: number;
  opacity?: number;
  /** extra SVG transform on the whole panel (pops, scatter, puzzle) */
  tf?: string;
  /** 0–1 lifted shadow under the panel */
  shadow?: number;
  occlude?: boolean;
  behind?: ReactNode;
  front?: ReactNode;
  radius?: number;
  label?: string;
  style?: CSSProperties;
};

export function Photo(p: PhotoProps) {
  const f = useCurrentFrame();
  const { w: W, h: H } = useSpace();
  const info = useImageInfo(p.src ? staticFile(p.src) : undefined);
  const cutInfo = useImageInfo(p.occlude && p.cut ? staticFile(p.cut) : undefined);
  const bx = p.box;
  let grey = p.bw ? 1 : 0;
  if (p.drainAt !== undefined) grey = prog(f, p.drainAt, 24);
  if (p.bloomAt !== undefined) grey = 1 - prog(f, p.bloomAt, 40);
  const filt = grey > 0 ? `grayscale(${grey}) contrast(${1 + 0.12 * grey})` : undefined;

  const land = p.landAt === undefined ? 1 : spr(f, p.landAt, SPRING.settle);
  const d = 70 * (1 - land);
  const [lx, ly] = { up: [0, d], down: [0, -d], left: [d, 0], right: [-d, 0], none: [0, 0] }[p.from ?? "up"];
  const push = p.push ? 1 + (p.push.amount ?? 0.04) * prog(f, p.push.at, p.push.len, eioSine) : 1;
  const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2;
  const inner = `translate(${cx} ${cy}) scale(${push}) translate(${-cx} ${-cy})`;
  const cid = svgId("clip", p.k);
  const visible = p.landAt === undefined || f >= p.landAt;
  if (!visible) return null;
  const g = info?.ok ? coverGeo(bx, info, p.crop, p.focus) : null;
  const vg = geoFor(info, bx, p.crop, p.focus);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible",
      opacity: (p.opacity ?? 1) * Math.min(1, land * 1.6), ...p.style }}>
      <defs><clipPath id={cid}><rect x={bx.x} y={bx.y} width={bx.w} height={bx.h} rx={p.radius ?? 0} /></clipPath></defs>
      <g transform={`translate(${lx} ${ly}) ${p.tf ?? ""}`}>
        {p.shadow ? <rect x={bx.x} y={bx.y} width={bx.w} height={bx.h} fill="#000" opacity={0.35 * p.shadow}
          style={{ filter: `blur(${14 * p.shadow}px)` }} transform={`translate(0 ${11 * p.shadow})`} /> : null}
        <g clipPath={`url(#${cid})`}>
          <g transform={inner}>
            {g ? <image href={staticFile(p.src!)} x={g.x} y={g.y} width={g.w} height={g.h} preserveAspectRatio="none" style={{ filter: filt }} />
              : info ? <PlaceholderArt box={bx} img={vg} seed={p.k} label={p.label} bw={grey > 0.5} /> : null}
          </g>
          {p.dim ? <rect x={bx.x} y={bx.y} width={bx.w} height={bx.h} fill="#000" opacity={p.dim} /> : null}
        </g>
        <g transform={inner}>
          {p.behind}
          {p.occlude && g && cutInfo?.ok ? (
            <g clipPath={`url(#${cid})`}>
              <image href={staticFile(p.cut!)} x={g.x} y={g.y} width={g.w} height={g.h} preserveAspectRatio="none" style={{ filter: filt }} />
            </g>
          ) : null}
          {p.front}
        </g>
      </g>
    </svg>
  );
}
