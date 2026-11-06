// Finishing passes and small effects.
//   <Grain>        film grain (re-seeded on twos) + a soft vignette, over photos AND doodles so they feel like one image
//   <Glint>        a soft light sweep across a box, once
//   <TornPaperRip> a sheet of paper covers part of the frame along a hand-torn edge, trembles, then rips away
//                  left → right on `at` (put the reveal on the song's drop)
//   <SafeArea>     Instagram Reels UI zones overlay (render it in a debug prop, never in the final)
import { random, useCurrentFrame, Easing } from "remotion";
import { ei, prog } from "./motion";
import { H, PALETTE, W } from "./theme";
import type { Pt } from "./image";

export function Grain({ amount = 0.08, vignette = 0.32 }: { amount?: number; vignette?: number }) {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 8;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: amount, mixBlendMode: "overlay", pointerEvents: "none" }}>
        <filter id={`grain${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} /></filter>
        <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse at 50% 48%, transparent 60%, rgba(0,0,0,${vignette}) 100%)` }} />
    </>
  );
}

export function Glint(p: { x: number; y: number; w: number; h: number; at: number; len?: number; color?: string }) {
  const f = useCurrentFrame();
  const t = prog(f, p.at, p.len ?? 20);
  if (t <= 0 || t >= 1) return null;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h, overflow: "hidden", mixBlendMode: "screen", pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: -p.h, left: -p.w * 0.4 + t * p.w * 1.6, width: p.w * 0.35, height: p.h * 3, transform: "rotate(20deg)",
        background: `linear-gradient(90deg, transparent, ${p.color ?? "rgba(255,226,150,0.55)"}, transparent)` }} />
    </div>
  );
}

const tornEdge = (y0: number, amp: number, step: number, seed: string): Pt[] =>
  Array.from({ length: Math.ceil(W / step) + 3 }, (_, i) => [i * step - step, y0 + (random(`${seed}${i}`) - 0.5) * amp + Math.sin(i * 0.7) * amp * 0.3] as Pt);
const polyD = (p: Pt[]) => "M " + p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") + " Z";

/** paper covers everything below `edgeY` (frame px) until `at`, then tears off left → right in 5 f and falls.
 *  `trembleFrom`: a beat of anticipation (the sheet shivers) before the rip. `strip`: keep a torn strip at the edge. */
export function TornPaperRip({ at, edgeY, trembleFrom, strip = true, seed = "rip", color = PALETTE.paper2 }: { at: number; edgeY: number; trembleFrom?: number; strip?: boolean; seed?: string; color?: string }) {
  const f = useCurrentFrame();
  const top = tornEdge(edgeY - 40, 22, 12, `${seed}t`), bot = tornEdge(edgeY + 40, 32, 10, `${seed}b`);
  const coverD = polyD([...bot.map(([x, y]) => [x, y - 2] as Pt), [W + 40, H + 80], [-40, H + 80]]);
  const stripD = polyD([...top, ...[...bot].reverse()]);
  const t = prog(f, at, 5, Easing.in(Easing.quad));
  const xt = -20 + t * (W + 40);
  const trem = trembleFrom !== undefined && f >= trembleFrom && f < at ? [(random(`tr${Math.floor(f / 2)}`) - 0.5) * 3, (random(`ty${Math.floor(f / 2)}`) - 0.5) * 3] : [0, 0];
  const fall = prog(f, at + 5, 7, ei);
  const ang = -(10 + 48 * t) - 14 * fall;
  const sh = { filter: "url(#paper) drop-shadow(0 7px 8px rgba(25,25,25,0.4))" };
  const ids = { l: `ripL-${seed}`, r: `ripR-${seed}` };
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <clipPath id={ids.l}><rect x={-100} y={0} width={Math.max(0, xt + 100)} height={H + 400} /></clipPath>
        <clipPath id={ids.r}><rect x={xt} y={0} width={W + 400} height={H + 400} /></clipPath>
      </defs>
      {f < at + 12 ? <g transform={`translate(${trem[0]} ${trem[1]})`}>
        <g clipPath={`url(#${ids.r})`}><path d={coverD} fill={color} style={sh} /></g>
        {t > 0 ? <g transform={`translate(0 ${120 * t + 1200 * fall}) rotate(${ang} ${xt} ${edgeY + 40})`}><g clipPath={`url(#${ids.l})`}><path d={coverD} fill={color} style={sh} /></g></g> : null}
      </g> : null}
      {strip ? <path d={stripD} fill="#F1EFEA" style={sh} /> : null}
    </svg>
  );
}

/** Instagram Reels UI zones (approximate, reel px; the app changes them, so check a real upload): top bar,
 *  bottom caption/username/audio, right action rail. The green box is where key text and faces are safe. */
export function SafeArea({ show = true }: { show?: boolean }) {
  if (!show) return null;
  const z = "rgba(255,0,80,0.22)", line = "2px dashed rgba(255,0,80,0.8)";
  const lab = { position: "absolute", fontFamily: "sans-serif", fontSize: 24, color: "#fff", textShadow: "0 1px 2px #000" } as const;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 200, background: z, borderBottom: line }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 340, background: z, borderTop: line }} />
      <div style={{ position: "absolute", right: 0, top: 1050, width: 130, height: 530, background: z, borderLeft: line }} />
      <div style={{ ...lab, left: 20, top: 165 }}>header: keep clear above y≈200</div>
      <div style={{ ...lab, left: 20, top: 1545 }}>caption, username, audio: keep clear below y≈1580</div>
      <div style={{ ...lab, right: 10, top: 1010, textAlign: "right" }}>action rail</div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 200, bottom: 340, border: "2px solid rgba(0,255,200,0.6)" }} />
    </div>
  );
}
