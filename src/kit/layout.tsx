// Arrangements and entrances.
//   <InstaxPrint>  an instant print (white frame, thick bottom border) swoops in on an eased arc from off-frame,
//                  lands at a slight tilt with a small damped overshoot, then one slow continuous push to `pushEnd`
//                  that starts at zero velocity as the print comes to rest (no shrink-then-grow).
//   puzzleMotion() / <PuzzleGrid>  tiles fly in from outside (away from the grid centre) and spring into place,
//                  staggered, so a collage assembles like a puzzle.
//   panelPop()     a whole panel pops (1 → 1.07 → 1 in 9 f, ±1.5° tilt, lifted shadow): for close-ups without a clear subject.
import { Easing, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { Photo, type PhotoProps } from "./Photo";
import { eioSine, prog, quad, settleWave, spr, tfAbout, type SpringCfg } from "./motion";
import type { Box, Pt } from "./image";

export function InstaxPrint(p: {
  at: number; box: Box; children: ReactNode;
  /** travel frames (fast start, long deceleration) */
  len?: number;
  /** white border in frame px */
  border?: { side: number; top: number; bottom: number };
  tilt?: number;
  /** start offset and arc control point, relative to the landing spot (frame px) */
  from?: Pt; ctrl?: Pt;
  /** slow push after landing: until this frame, by `push` (0.06 = +6%) */
  pushEnd?: number; push?: number;
  paper?: string;
}) {
  const f = useCurrentFrame();
  const len = p.len ?? 16, t0 = p.at;
  const b = p.border ?? { side: 26, top: 26, bottom: 110 };
  const k = Easing.bezier(0.12, 0.9, 0.25, 1)(Math.min(1, Math.max(0, (f - t0) / len)));
  const u = 1 - k;
  const [dx, dy] = quad(k, p.from ?? [-760, 900], p.ctrl ?? [-460, -140], [0, 0]);
  const settle = settleWave(f, t0 + len - 4); // the tilt swings ~2° past and the print presses down 1.5%
  const tilt = p.tilt ?? -3;
  const r = tilt - 20 * Easing.out(Easing.cubic)(u) + 2.2 * settle;
  const land = t0 + len;
  const push = p.pushEnd ? 1 + (p.push ?? 0.06) * prog(f, land, p.pushEnd - land, eioSine) : 1;
  const sc = (1 - 0.015 * settle) * push;
  const bx = p.box, ox = bx.x + bx.w / 2, oy = bx.y + bx.h / 2;
  if (f < t0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${ox}px ${oy}px`, transform: `translate(${dx}px, ${dy}px) rotate(${r}deg) scale(${sc})` }}>
      <div style={{ position: "absolute", left: bx.x - b.side, top: bx.y - b.top, width: bx.w + 2 * b.side, height: bx.h + b.top + b.bottom,
        background: p.paper ?? "#FBFAF6", borderRadius: 5,
        boxShadow: `0 ${16 + 22 * u}px ${32 + 32 * u}px rgba(20,10,10,${0.45 - 0.2 * u}), 0 2px 4px rgba(20,10,10,${0.25 * k})` }} />
      {p.children}
    </div>
  );
}

/** entrance for tile i of a grid: returns an SVG transform (about the tile centre) and an opacity */
export const puzzleMotion = (f: number, box: Box, i: number, o: { at: number; stagger?: number; center: Pt; dist?: number; spring?: SpringCfg }) => {
  const a = o.at + i * (o.stagger ?? 4);
  const k = spr(f, a, o.spring ?? { damping: 14, stiffness: 110 });
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2, vx = cx - o.center[0], vy = cy - o.center[1], d = Math.hypot(vx, vy);
  const off = 1 - k, D = o.dist ?? 240;
  const dx = d < 10 ? 0 : (vx / d) * D * off, dy = d < 10 ? D * off : (vy / d) * D * off;
  return { tf: tfAbout(cx, cy, { dx, dy, r: (i % 2 ? 5 : -5) * off, s: 1 - 0.08 * off }), opacity: Math.min(1, Math.max(0, (f - a) / 5)), settled: k > 0.995 };
};

/** a whole-panel pop: { tf, shadow } for <Photo tf shadow> */
export const panelPop = (f: number, at: number, box: Box, side = 1) => {
  const t = f - at;
  if (t < 0 || t > 9) return { tf: undefined as string | undefined, shadow: 0 };
  const u = Easing.out(Easing.quad)(t / 9), bump = Math.sin(Math.PI * u);
  return { tf: tfAbout(box.x + box.w / 2, box.y + box.h / 2, { s: 1 + 0.07 * bump, r: side * 1.5 * Math.sin(2 * Math.PI * u) * (1 - u) }), shadow: bump };
};

/** tiles: Photo props; `order` = arrival order of tile keys (default: as listed) */
export function PuzzleGrid({ tiles, at, stagger = 4, center, order }: { tiles: PhotoProps[]; at: number; stagger?: number; center: Pt; order?: string[] }) {
  const f = useCurrentFrame();
  return <>{tiles.map((t) => {
    const i = order ? order.indexOf(t.k) : tiles.indexOf(t);
    const m = puzzleMotion(f, t.box, i, { at, stagger, center });
    return <Photo key={t.k} {...t} tf={[m.tf, t.tf ?? ""].join(" ")} opacity={m.opacity * (t.opacity ?? 1)} />;
  })}</>;
}
