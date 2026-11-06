// Hand-drawn doodles with line boil. A Pen draws tapered ink strokes and filled lopsided shapes; every point is
// re-jittered in 3 variants cycled on twos (a 12 fps "boil"), so held drawings keep breathing like hand animation.
// <Doodle> pops a drawing in (spring + wiggle), boils it while held, and shrinks it out (`out`).
// Anchor doodles to the photo (pass frame px from your anchors, e.g. inBox(box, [0.5, 0.17])) and put them in a
// Photo's `behind`/`front` so they move with it. Check placement on a still with <AnchorDots> before animating.
// Units: shapes are drawn in local units scaled by DOODLE_UNIT (0.45), so at s = 1 a horn is ~80 px tall.
// Pieces: Horns, Halo, Crown, Heart / RisingHearts, Sparkle / Twinkle, Starburst, DizzyStars, Bats, Moon,
// MotionLines, ShoutLines, ClawSlashes, Arrow, Scribble.
import { Easing, random, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { prog, ei, pop, wig } from "./motion";
import { PALETTE } from "./theme";
import type { Pt } from "./image";

export const DOODLE_UNIT = 0.45;

// ---------- the pen ----------
const boilKey = (f: number) => Math.floor(f / 2) % 3; // 3 variants on twos
const jit = (pts: Pt[], seed: string, f: number, amp: number): Pt[] => {
  const k = boilKey(f);
  return pts.map(([x, y], i) => [x + (random(`${seed}x${k}${i}`) * 2 - 1) * amp, y + (random(`${seed}y${k}${i}`) * 2 - 1) * amp]);
};
// Catmull-Rom → cubic Bézier
const smooth = (p: Pt[], closed: boolean) => {
  if (p.length < 2) return "";
  const n = p.length, g = (i: number) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return closed ? d + " Z" : d;
};
const sample = (p: Pt[], per = 8): Pt[] => {
  const out: Pt[] = [], n = p.length, g = (i: number) => p[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)) as Pt);
    }
  }
  out.push(p[n - 1]);
  return out;
};
// a tapered ink stroke along a centreline, drawn on to fraction t
const taper = (c: Pt[], w: number, t: number) => {
  const pts = sample(c);
  const m = Math.max(2, Math.ceil(pts.length * t));
  const q = pts.slice(0, m);
  const L: Pt[] = [], R: Pt[] = [];
  q.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], z = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(z[1] - a[1]), ny = z[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    const u = i / (pts.length - 1);
    const hw = (w / 2) * (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.02)), 0.6));
    L.push([p[0] + nx * hw, p[1] + ny * hw]); R.push([p[0] - nx * hw, p[1] - ny * hw]);
  });
  const all = [...L, ...R.reverse()];
  return "M " + all.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") + " Z";
};

export type Pen = {
  f: number;
  /** a tapered stroke through pts; t = how much is drawn (0–1, eased) */
  line: (pts: Pt[], o?: { w?: number; color?: string; t?: number; amp?: number }) => ReactNode;
  /** a closed filled shape (smooth or `sharp` corners) */
  shape: (pts: Pt[], o?: { fill?: string; stroke?: string; w?: number; amp?: number; sharp?: boolean }) => ReactNode;
};
export const makePen = (f: number, seed: string, shadow: string): Pen => {
  let i = 0;
  return {
    f,
    line: (pts, o = {}) => {
      const k = `${seed}l${i++}`;
      const d = taper(jit(pts, k, f, o.amp ?? 4), o.w ?? 22, Easing.out(Easing.cubic)(Math.max(0, Math.min(1, o.t ?? 1))));
      return (
        <g key={k}>
          <path d={d} fill={shadow} opacity={0.28} transform="translate(5 6)" />
          <path d={d} fill={o.color ?? PALETTE.cream} />
        </g>
      );
    },
    shape: (pts, o = {}) => {
      const k = `${seed}s${i++}`;
      const j = jit(pts, k, f, o.amp ?? 4);
      const d = o.sharp ? "M " + j.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") + " Z" : smooth(j, true);
      return (
        <g key={k}>
          <path d={d} fill={shadow} opacity={0.28} transform="translate(5 6)" />
          <path d={d} fill={o.fill ?? "none"} stroke={o.stroke ?? "none"} strokeWidth={o.w ?? 10} strokeLinejoin="round" />
        </g>
      );
    },
  };
};

export type DoodleProps = {
  x: number; y: number; at: number; seed: string;
  s?: number; rot?: number; out?: number;
  /** shadow tone: "warm" (deep red) for colour photos, "cool" (night) for B/W */
  tone?: "warm" | "cool";
  glow?: boolean;
  /** skip the pop (for things that draw on instead) */
  noPop?: boolean;
  children: (pen: Pen, t: number) => ReactNode;
};
/** An SVG group: pops in at `at`, boils while held, shrinks out over 4 f at `out`. Render inside an <svg>. */
export function Doodle(p: DoodleProps) {
  const f = useCurrentFrame();
  if (f < p.at) return null;
  const sIn = p.noPop ? 1 : pop(f, p.at);
  const sOut = p.out !== undefined ? 1 - prog(f, p.out, 4, ei) : 1;
  if (sOut <= 0.001) return null;
  const sc = (p.s ?? 1) * DOODLE_UNIT * sIn * sOut;
  const r = (p.rot ?? 0) + (p.noPop ? 0 : wig(f, p.at));
  const pen = makePen(f, p.seed, p.tone === "cool" ? PALETTE.night : PALETTE.redDeep);
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${r}) scale(${sc})`} filter={p.glow ? "url(#glow)" : undefined}>
      {p.children(pen, f - p.at)}
    </g>
  );
}
/** a full-frame <svg> wrapper for doodles placed outside a Photo */
export const DoodleLayer = ({ children }: { children: ReactNode }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>{children}</svg>
);

// ---------- geometry helpers ----------
export const ring = (rx: number, ry: number, a0: number, a1: number, n = 18, wob = 0): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    const k = 1 + wob * Math.sin(i * 2.1);
    return [Math.cos(a) * rx * k, Math.sin(a) * ry * k] as Pt;
  });
export const starPts = (points: number, R: number, r: number): Pt[] =>
  Array.from({ length: points * 2 }, (_, i) => {
    const a = (i * Math.PI) / points - Math.PI / 2, rr = i % 2 ? R * r : R;
    return [Math.cos(a) * rr, Math.sin(a) * rr] as Pt;
  });
export const heartPts = (s: number): Pt[] =>
  ([[0, 30], [-24, 8], [-44, -14], [-40, -38], [-20, -46], [0, -30], [20, -46], [40, -38], [44, -14], [24, 8]] as Pt[]).map(([x, y]) => [x * s, y * s]);
export const hornPts = (side: 1 | -1): Pt[] =>
  ([[-50, 14], [-60, -36], [-66, -92], [-56, -138], [-34, -170], [-8, -180], [8, -168], [-6, -156], [-18, -134], [-16, -96], [-2, -56], [22, -18], [48, 14]] as Pt[])
    .map(([x, y]) => [x * side, y]);
const crownPts: Pt[] = [[-88, 34], [88, 34], [96, -46], [46, -4], [0, -72], [-46, -4], [-96, -46]];
const batPts: Pt[] = [[0, -14], [-14, -26], [-30, -10], [-56, -30], [-92, -22], [-78, -4], [-64, 10], [-44, 4], [-28, 20], [-10, 8], [0, 24], [10, 8], [28, 20], [44, 4], [64, 10], [78, -4], [92, -22], [56, -30], [30, -10], [14, -26]];
const moonPts: Pt[] = [...ring(70, 70, Math.PI * 0.35, Math.PI * 1.65, 12), ...ring(56, 56, Math.PI * 1.55, Math.PI * 0.45, 10).map(([x, y]) => [x + 32, y - 6] as Pt)];

/** radial strokes (starburst / joy lines) */
export const burst = (pen: Pen, n: number, r0: number, r1: number, o: { w?: number; color?: string; t?: number; a0?: number; spread?: number } = {}) =>
  Array.from({ length: n }, (_, i) => {
    const a = (o.a0 ?? -Math.PI / 2) + (i - (n - 1) / 2) * (o.spread ?? (2 * Math.PI) / n);
    return pen.line([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * (r0 + r1) * 0.5 + 2, Math.sin(a) * (r0 + r1) * 0.5], [Math.cos(a) * r1, Math.sin(a) * r1]],
      { w: o.w ?? 18, color: o.color, t: o.t });
  });

// ---------- pieces (each takes frame-px x/y and a seed) ----------
type Common = { at: number; seed: string; s?: number; rot?: number; out?: number };

/** a pair of devil horns: l / r are the horn bases in frame px (sit them ON the hair/hood edge) */
export const Horns = ({ l, r, at, seed, s = 1, tilt = 14, out, gap = 1, fill = PALETTE.red }: { l: Pt; r: Pt; at: number; seed: string; s?: number; tilt?: number; out?: number; gap?: number; fill?: string }) => (
  <>
    {([[l, 1, -tilt, 0], [r, -1, tilt, gap]] as const).map(([p, side, rot, d]) => (
      <Doodle key={side} x={p[0]} y={p[1]} at={at + d} s={s} rot={rot} out={out} seed={`${seed}${side}`} tone="cool">{(pen) => <>
        {pen.shape(hornPts(side), { fill, stroke: "#9e2a22", w: 9, amp: 3 })}
        {pen.line([[-36 * side, -10], [-48 * side, -70], [-40 * side, -120], [-24 * side, -150]], { w: 9, color: "rgba(255,240,230,0.55)", amp: 2 })}
      </>}</Doodle>
    ))}
  </>
);

/** a gold halo that doesn't quite close; c = centre (frame px), rx/ry in local units */
export const Halo = ({ c, at, seed, rx = 250, ry = 62, rot = -6, out, s = 1 }: Common & { c: Pt; rx?: number; ry?: number }) => (
  <Doodle x={c[0]} y={c[1]} at={at} rot={rot} out={out} seed={seed} s={s} glow>
    {(pen, t) => {
      const pts = ring(rx, ry, Math.PI * 0.78, Math.PI * 0.78 + Math.PI * 1.88, 22, 0.03);
      const d = Math.min(1, t / 5);
      return <>{pen.line(pts, { w: 34, color: PALETTE.goldDeep, t: d, amp: 3 })}{pen.line(pts, { w: 22, color: PALETTE.gold, t: d, amp: 3 })}
        {pen.line(ring(rx * 0.92, ry * 0.7, Math.PI * 1.15, Math.PI * 1.6, 6), { w: 7, color: "rgba(255,246,220,0.85)", t: d, amp: 2 })}</>;
    }}
  </Doodle>
);

export const Crown = ({ x, y, at, seed, s = 1, rot = -10, out }: Common & { x: number; y: number }) => (
  <Doodle x={x} y={y} at={at} s={s} rot={rot} out={out} seed={seed} glow>{(pen) => <>
    {pen.shape(crownPts, { fill: PALETTE.gold, stroke: PALETTE.goldDeep, w: 8, amp: 2.5, sharp: true })}
    {([[-96, -46], [0, -72], [96, -46]] as Pt[]).map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy - 8} r={12} fill={PALETTE.cream} stroke={PALETTE.goldDeep} strokeWidth={4} />)}
    {pen.line([[-70, 16], [70, 16]], { w: 7, color: "rgba(255,246,220,0.8)", amp: 2 })}
  </>}</Doodle>
);

export const Heart = ({ pen, s = 1, fill = "#C73326" }: { pen: Pen; s?: number; fill?: string }) => <>{pen.shape(heartPts(s), { fill, stroke: PALETTE.redDeep, w: 6, amp: 2 })}</>;

/** n hearts that pop one by one and drift up from (x, y) */
export const RisingHearts = ({ x, y, at, seed, n = 3, stagger = 4, rise = 60, out, fill }: Common & { x: number; y: number; n?: number; stagger?: number; rise?: number; fill?: string }) => {
  const f = useCurrentFrame();
  return <>{Array.from({ length: n }, (_, i) => {
    const a = at + i * stagger, dx = (i - (n - 1) / 2) * 40;
    const up = rise * prog(f, a, 14) + Math.max(0, f - a - 14) * 0.5; // eased rise, then a slow drift (no stop)
    return <Doodle key={i} x={x + dx} y={y - up} at={a} s={i % 2 ? 0.85 : 1.1} rot={(i - 1) * 12} out={out} seed={`${seed}${i}`}>{(pen, t) =>
      <g transform={`translate(${6 * Math.sin(t / 4 + i)} 0)`}><Heart pen={pen} fill={fill} /></g>}</Doodle>;
  })}</>;
};

export const Sparkle = ({ pen, R = 60, fill = PALETTE.gold, stroke = PALETTE.goldDeep }: { pen: Pen; R?: number; fill?: string; stroke?: string }) =>
  <>{pen.shape(starPts(4, R, 0.2), { fill, stroke, w: 5, amp: 2, sharp: true })}</>;

/** a sparkle that keeps twinkling (scale + slow spin) while held */
export const Twinkle = ({ x, y, at, seed, R = 50, out, fill = PALETTE.gold, glow = true }: Common & { x: number; y: number; R?: number; fill?: string; glow?: boolean }) => (
  <Doodle x={x} y={y} at={at} seed={seed} out={out} glow={glow}>
    {(pen, t) => <g transform={`scale(${1 + 0.18 * Math.sin(t / 2.2 + x)}) rotate(${t * 1.5})`}><Sparkle pen={pen} R={R} fill={fill} /></g>}
  </Doodle>
);

/** radial glint lines drawn on around a point (jewellery, a reveal) */
export const Starburst = ({ x, y, at, seed, n = 9, r0 = 120, r1 = 190, color = PALETTE.gold, out, s = 1 }: Common & { x: number; y: number; n?: number; r0?: number; r1?: number; color?: string }) => (
  <Doodle x={x} y={y} at={at} seed={seed} out={out} s={s} glow>{(pen, t) => <>{burst(pen, n, r0, r1, { w: 16, color, t: Math.min(1, t / 4) })}</>}</Doodle>
);

/** stars orbiting a head (cartoon dizzy). Render once with front={false} in a Photo's `behind` and once with
 *  front in `front` so the back half of the orbit passes behind the head. One turn per `period` frames. */
export const DizzyStars = ({ c, at, seed, rx = 120, ry = 32, period = 15, front, n = 3 }: { c: Pt; at: number; seed: string; rx?: number; ry?: number; period?: number; front: boolean; n?: number }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = pop(f, at);
  return <>{Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * (f - at)) / period + (i * 2 * Math.PI) / n - Math.PI / 2;
    const depth = Math.sin(a);
    if ((depth >= 0) !== front) return null;
    return <Doodle key={i} x={c[0] + Math.cos(a) * rx} y={c[1] + depth * ry} at={at} s={(0.75 + 0.3 * depth) * s} seed={`${seed}${i}`} tone="cool" noPop>{(pen) =>
      pen.shape(starPts(5, 70, 0.45), { fill: i === 1 ? PALETTE.red : PALETTE.paper, stroke: PALETTE.night, w: 6, amp: 2, sharp: true })}</Doodle>;
  })}</>;
};

/** bats flapping across from `from` to `to` (frame px) over `len` frames, staggered */
export const Bats = ({ from, to, at, seed, len = 50, n = 2, s = 1, out }: Common & { from: Pt; to: Pt; len?: number; n?: number }) => {
  const f = useCurrentFrame();
  return <>{Array.from({ length: n }, (_, i) => {
    const a = at + i * 4, k = Math.max(0, f - a) / len; // constant cruise is fine for flight; the flap carries the motion
    const x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k + i * 60 - Math.sin(k * 6 + i) * 22;
    return <Doodle key={i} x={x} y={y} at={a} s={s * (i ? 0.7 : 1)} seed={`${seed}${i}`} tone="cool" noPop out={out}>{(pen) =>
      <g transform={`scale(1 ${1 + 0.45 * Math.sin((f + i * 3) * 1.4)})`}>{pen.shape(batPts, { fill: PALETTE.paper, stroke: PALETTE.night, w: 5, amp: 2 })}</g>}</Doodle>;
  })}</>;
};

export const Moon = ({ x, y, at, seed, s = 1.4, rot = -15, out }: Common & { x: number; y: number }) => (
  <Doodle x={x} y={y} at={at} s={s} rot={rot} seed={seed} tone="cool" out={out}>{(pen) => pen.shape(moonPts, { fill: PALETTE.paper, stroke: PALETTE.night, w: 6, amp: 2 })}</Doodle>
);

/** "whoosh" arcs beside a moving hand; side 1 = arcs to the right of the point */
export const MotionLines = ({ x, y, at, seed, side = 1, color = PALETTE.cream, out, s = 1 }: Common & { x: number; y: number; side?: 1 | -1; color?: string }) => (
  <Doodle x={x} y={y} at={at} seed={seed} noPop out={out} s={s}>{(pen, t) => <>
    {[0, 1, 2].map((k) => {
      const a0 = side > 0 ? -1.35 : Math.PI + 0.35, a1 = side > 0 ? -0.35 : Math.PI + 1.35;
      return pen.line(ring(110 + k * 40, 130 + k * 40, a0, a1, 6), { w: 13, color, t: Math.min(1, (t - k) / 4) });
    })}
  </>}</Doodle>
);

/** shout / surprise lines either side of a face: c = face centre */
export const ShoutLines = ({ c, at, seed, spread = 150, color = PALETTE.red, out }: Common & { c: Pt; spread?: number; color?: string }) => (
  <>{([-1, 1] as const).map((sd) => (
    <Doodle key={sd} x={c[0] + sd * 4} y={c[1]} at={at} seed={`${seed}${sd}`} tone="cool" out={out}>{(pen, t) => <>
      {burst(pen, 3, spread, spread + 70, { a0: sd > 0 ? 0 : Math.PI, spread: 0.42, w: 14, color, t: Math.min(1, t / 3) })}</>}</Doodle>
  ))}</>
);

/** three claw slashes drawn on one after another */
export const ClawSlashes = ({ x, y, at, seed, color = PALETTE.red, out, s = 1, rot = 0 }: Common & { x: number; y: number; color?: string }) => (
  <Doodle x={x} y={y} at={at} seed={seed} noPop tone="cool" out={out} s={s} rot={rot}>{(pen, t) => <>
    {[0, 1, 2].map((k) => pen.line([[-40 + k * 62, -120], [-60 + k * 62, 0], [-95 + k * 62, 120]], { w: 24, color, t: Math.min(1, (t - k * 1.5) / 3) }))}
  </>}</Doodle>
);

/** a hand-drawn arrow through pts (frame px); draws on over `len` frames, head appears at the end */
export const Arrow = ({ pts, at, seed, len = 6, color = PALETTE.cream, w = 14, out }: { pts: Pt[]; at: number; seed: string; len?: number; color?: string; w?: number; out?: number }) => {
  // placed at the origin; pts are divided by DOODLE_UNIT so they stay in frame px
  const local = pts.map(([x, y]) => [x / DOODLE_UNIT, y / DOODLE_UNIT] as Pt);
  return (
    <Doodle x={0} y={0} at={at} seed={seed} noPop out={out}>{(pen, t) => {
      const k = Math.min(1, t / len);
      const n = local.length, a = local[n - 2], z = local[n - 1];
      const ang = Math.atan2(z[1] - a[1], z[0] - a[0]), L = 46;
      const head = (d: number): Pt[] => [[z[0] + Math.cos(ang + Math.PI + d) * L, z[1] + Math.sin(ang + Math.PI + d) * L], z];
      return <>
        {pen.line(local, { w: w / DOODLE_UNIT, color, t: Math.min(1, k * 1.25) })}
        {k > 0.8 ? pen.line(head(0.55), { w: w / DOODLE_UNIT, color }) : null}
        {k > 0.8 ? pen.line(head(-0.55), { w: w / DOODLE_UNIT, color }) : null}
      </>;
    }}</Doodle>
  );
};

/** a fast scribbled underline from (x, y), `width` frame px long */
export const Scribble = ({ x, y, at, seed, width = 200, color = PALETTE.red, len = 5 }: { x: number; y: number; at: number; seed: string; width?: number; color?: string; len?: number }) => {
  const u = width / DOODLE_UNIT;
  const pts: Pt[] = [[4, 22], [u * 0.32, 12], [u * 0.64, 16], [u * 0.97, 6], [u * 0.9, 30], [u * 0.53, 40], [u * 0.13, 44], [u * 0.3, 52], [u * 0.7, 50], [u, 40]];
  return <Doodle x={x} y={y} at={at} seed={seed} noPop>{(pen, t) => pen.line(pts, { w: 16, color, t: Math.min(1, t / len), amp: 3 })}</Doodle>;
};

