// <StickerCutout>: the subject of a photo lifts off as a die-cut vinyl sticker: alpha mask (tools/mask.swift), a warm
// white border grown from the mask (dilate + blur + threshold rounds the corners), a soft tinted shadow and a tight
// contact shadow. Motion: lift (spring overshoot 1 → ~1.09 → 1.06, up ~30 px), a decaying wobble on twos, then a
// gentle breathe. Then one of: stays popped (default; use this in standalone parts), settles back flush
// (`settleAt`), or exits (`exit`: "flick" off-frame or "expand" + fade, for a transition to the next section).
// Register it exactly over the same <Photo> (same box/crop/focus) so the lift starts invisible.
// `under` / `extra` are drawn inside the sticker, so the border wraps doodles too (horns that lift with the head).
// Missing mask → the whole panel becomes the sticker; missing photo → the placeholder silhouette does.
import { staticFile, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { coverGeo, geoFor, PlaceholderCut, svgId, useImageInfo, type Box, type Crop, type Pt } from "./image";
import { ei, eio, prog, spr, tfAbout } from "./motion";
import { PALETTE } from "./theme";
import { useSpace } from "./space";

/** the lift motion on its own (frames from `at`) */
export const liftMotion = (f: number, at: number, o: { lift?: number; scale?: number; border?: number } = {}) => {
  const t = f - at;
  const s = 1 + (o.scale ?? 0.06) * spr(t, 0, { damping: 9, stiffness: 320 }); // overshoots ≈ +50%, settles
  const ly = -(o.lift ?? 30) * spr(t, 0, { damping: 14, stiffness: 200 });
  // wobble: decaying sine, then a 0.5° breathe once it has settled
  const rot = -5 * Math.sin(t * 0.8) * Math.exp(-t / 7) + (t > 12 ? 0.5 * Math.sin((t - 12) / 3) * Math.min(1, (t - 12) / 6) : 0);
  return { s, ly, rot, border: (o.border ?? 12) * prog(f, at, 4) };
};

/** how much to dim/blur what's under a lifted sticker ("away from the world"): 0 → 1 over 5 f */
export const liftDim = (f: number, at: number, until?: number) => prog(f, at, 5) * (until === undefined ? 1 : 1 - prog(f, until, 4));

export type StickerCutoutProps = {
  k: string;
  src?: string;
  cut?: string;
  box: Box;
  crop?: Crop;
  focus?: Pt;
  bw?: boolean;
  /** lift frame */
  at: number;
  /** settle back flush from this frame (8 f, eased); omit to stay popped */
  settleAt?: number;
  /** leave: "flick" (thrown off up-right) or "expand" (grows and fades) */
  exit?: { at: number; kind: "flick" | "expand"; len?: number; dx?: number; dy?: number };
  /** pivot: "center" for transitions, "bottom" for pop-outs that grow out of their panel */
  origin?: "center" | "bottom";
  border?: number;
  lift?: number;
  scale?: number;
  /** shadow tint: night for B/W photos, a deep warm tone for colour */
  tint?: string;
  under?: ReactNode;
  extra?: ReactNode;
  /** clip the cutout to the panel box (die-cut bust: straight edges where it meets the frame) */
  clipToBox?: boolean;
};

export function StickerCutout(p: StickerCutoutProps) {
  const f = useCurrentFrame();
  const { w: W, h: H } = useSpace();
  const info = useImageInfo(p.src ? staticFile(p.src) : undefined);
  const cutInfo = useImageInfo(p.cut ? staticFile(p.cut) : undefined);
  if (f < p.at || !info) return null;
  if (p.exit && f >= p.exit.at + (p.exit.len ?? 8)) return null;

  let m = liftMotion(f, p.at, { lift: p.lift, scale: p.scale, border: p.border });
  if (p.settleAt !== undefined) {
    const k = prog(f, p.settleAt, 8, eio);
    m = { s: 1 + (m.s - 1) * (1 - k), ly: m.ly * (1 - k), rot: m.rot * (1 - k), border: m.border * (1 - k) };
  }
  const bx = p.box;
  const cx = bx.x + bx.w / 2, cy = p.origin === "bottom" ? bx.y + bx.h : bx.y + bx.h / 2;
  let extraS = 1, dx = 0, dy = 0, er = 0, op = 1;
  if (p.exit) {
    const x = prog(f, p.exit.at, p.exit.len ?? 8, ei);
    if (p.exit.kind === "flick") { dx = (p.exit.dx ?? 350) * x; dy = (p.exit.dy ?? -1500) * x; er = 18 * x; }
    else { extraS = 1 + x * (3.2 / m.s - 1); op = 1 - x; }
  }
  const tf = tfAbout(cx, cy, { s: m.s * extraS, r: m.rot + er, dx, dy: m.ly + dy });
  const g = info.ok ? coverGeo(bx, info, p.crop, p.focus) : null;
  const filt = p.bw ? "grayscale(1) contrast(1.12)" : undefined;
  const fid = svgId("sf", p.k), cid = svgId("sc", p.k);
  const r = Math.max(0.6, m.border);
  const pad = 300;
  const tint = p.tint ?? (p.bw ? PALETTE.night : PALETTE.redDeep);

  let body: ReactNode;
  if (g && cutInfo?.ok) body = <image href={staticFile(p.cut!)} x={g.x} y={g.y} width={g.w} height={g.h} preserveAspectRatio="none" style={{ filter: filt }} />;
  else if (g) body = <image href={staticFile(p.src!)} x={g.x} y={g.y} width={g.w} height={g.h} preserveAspectRatio="none" style={{ filter: filt }} />;
  else body = <PlaceholderCut img={geoFor(info, bx, p.crop, p.focus)} seed={p.k} />;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: op }}>
      <defs>
        <clipPath id={cid}><rect x={bx.x} y={bx.y} width={bx.w} height={bx.h} /></clipPath>
        <filter id={fid} filterUnits="userSpaceOnUse" x={bx.x - pad} y={bx.y - pad} width={bx.w + 2 * pad} height={bx.h + 2 * pad}>
          <feMorphology in="SourceAlpha" operator="dilate" radius={r} result="d" />
          <feGaussianBlur in="d" stdDeviation="2" result="db" />
          <feComponentTransfer in="db" result="dt"><feFuncA type="linear" slope="5" intercept="-2" /></feComponentTransfer>
          <feFlood floodColor={PALETTE.paper} result="w" />
          <feComposite in="w" in2="dt" operator="in" result="border" />
          <feGaussianBlur in="dt" stdDeviation="12" result="sb" />
          <feOffset in="sb" dy="11" result="so" />
          <feFlood floodColor={tint} floodOpacity="0.4" />
          <feComposite in2="so" operator="in" result="shadow" />
          <feGaussianBlur in="dt" stdDeviation="1.5" result="cb" />
          <feOffset in="cb" dy="2" result="co" />
          <feFlood floodColor={tint} floodOpacity="0.35" />
          <feComposite in2="co" operator="in" result="contact" />
          <feMerge><feMergeNode in="shadow" /><feMergeNode in="contact" /><feMergeNode in="border" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g transform={tf}>
        <g filter={`url(#${fid})`}>
          {p.under}
          <g clipPath={p.clipToBox === false ? undefined : `url(#${cid})`}>{body}</g>
          {p.extra}
        </g>
      </g>
    </svg>
  );
}
