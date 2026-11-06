// Type. All positions are frame px (HTML, absolutely positioned).
//   <StickerText>  a phrase as a die-cut sticker (white outline + soft shadow, filter #txtstk) that POPS: spring with
//                  overshoot, a small rotation settling to 0. Prefer this to typewriter reveals.
//   <PopText>      bold caption chunk that pops (or `slam`s from 1.6×), optional boil on accent words.
//   <ScriptWrite>  a script word revealed left → right like it's being written (clip reveal, eased in-out).
//   <DrawPath>     any SVG path drawn on along its length (underlines, circles, a thread).
//   <Tag>          a small rounded label that pops.
//   boilT()        a CSS transform that "boils" text on twos like the doodles (accent words only).
import { random, useCurrentFrame } from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { ei, eioSine, prog, spr, SPRING } from "./motion";
import { PALETTE, sans, script } from "./theme";

export const boilT = (f: number, seed: string, amp = 1.6, rot = 0.7) => {
  const k = Math.floor(f / 2) % 3;
  const r = (n: string) => random(`${seed}${n}${k}`) * 2 - 1;
  return `translate(${(r("x") * amp).toFixed(2)}px, ${(r("y") * amp).toFixed(2)}px) rotate(${(r("r") * rot).toFixed(2)}deg)`;
};

const outK = (f: number, out?: number) => (out !== undefined ? 1 - prog(f, out, 4, ei) : 1);

export function StickerText(p: { x: number; y: number; at: number; children: ReactNode; origin?: string; rot?: number; out?: number; boil?: string; color?: string; style?: CSSProperties }) {
  const f = useCurrentFrame();
  if (f < p.at) return null;
  const k = spr(f, p.at, SPRING.bounce);
  const o = Math.min(1, (f - p.at) / 3) * outK(f, p.out);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, color: p.color ?? PALETTE.night, filter: "url(#txtstk)", opacity: o, whiteSpace: "nowrap",
      fontFamily: sans, fontWeight: 800, lineHeight: 1,
      transform: `scale(${(0.35 + 0.65 * k) * (p.out !== undefined ? 0.6 + 0.4 * o : 1)}) rotate(${(p.rot ?? -5) * (1 - k)}deg)${p.boil ? " " + boilT(f, p.boil) : ""}`,
      transformOrigin: p.origin ?? "50% 60%", ...p.style }}>{p.children}</div>
  );
}

export function PopText(p: { x: number; y: number; at: number; size: number; children: ReactNode; color?: string; weight?: number; font?: string;
  out?: number; slam?: boolean; origin?: string; shadow?: string; boil?: string; style?: CSSProperties }) {
  const f = useCurrentFrame();
  if (f < p.at) return null;
  const sc = p.slam ? 1 + 0.6 * (1 - prog(f, p.at, 4)) : 0.55 + 0.45 * spr(f, p.at, SPRING.pop);
  const o = outK(f, p.out);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, whiteSpace: "pre", fontFamily: p.font ?? sans, fontWeight: p.weight ?? 800,
      fontSize: p.size, lineHeight: 0.95, letterSpacing: "-0.03em", color: p.color ?? PALETTE.cream,
      transform: `scale(${sc * o})${p.boil ? " " + boilT(f, p.boil) : ""}`, transformOrigin: p.origin ?? "left center",
      textShadow: p.shadow ?? "0 3px 0 rgba(40,10,12,0.3)", ...p.style }}>{p.children}</div>
  );
}

export function ScriptWrite(p: { x: number; y: number; at: number; len?: number; size: number; children: ReactNode; color?: string; out?: number; font?: string; style?: CSSProperties }) {
  const f = useCurrentFrame();
  if (f < p.at) return null;
  const t = prog(f, p.at, p.len ?? 12, eioSine); // the pen accelerates in and slows at the end
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, whiteSpace: "nowrap", fontFamily: p.font ?? script, fontSize: p.size, lineHeight: 1.1,
      color: p.color ?? PALETTE.cream, clipPath: `inset(-60% ${100 - t * 100}% -40% -10%)`, opacity: outK(f, p.out),
      textShadow: "0 3px 12px rgba(0,0,0,0.35)", ...p.style }}>{p.children}</div>
  );
}

export function DrawPath(p: { d: string; at: number; len?: number; color?: string; width?: number; opacity?: number; glow?: boolean }) {
  const f = useCurrentFrame();
  const t = prog(f, p.at, p.len ?? 18);
  if (t <= 0) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: p.opacity ?? 1, overflow: "visible" }}>
      <path d={p.d} pathLength={1} stroke={p.color ?? PALETTE.gold} strokeWidth={p.width ?? 4} fill="none" strokeLinecap="round"
        strokeDasharray="1 1" strokeDashoffset={1 - t} style={p.glow ? { filter: `drop-shadow(0 0 6px ${p.color ?? PALETTE.gold})` } : undefined} />
    </svg>
  );
}

export function Tag(p: { children: ReactNode; x: number; y: number; at: number; dark?: boolean; size?: number; out?: number; origin?: string }) {
  const f = useCurrentFrame();
  if (f < p.at) return null;
  const s = spr(f, p.at, { damping: 14, stiffness: 180 }) * outK(f, p.out);
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, transform: `scale(${s})`, transformOrigin: p.origin ?? "left center", opacity: Math.min(1, s * 2),
      fontFamily: sans, fontWeight: 800, fontSize: p.size ?? 34, letterSpacing: "-0.01em", padding: "10px 22px", borderRadius: 999,
      background: p.dark ? "rgba(27,26,26,0.85)" : "rgba(251,248,242,0.95)", color: p.dark ? PALETTE.cream : PALETTE.ink,
      boxShadow: "0 6px 18px rgba(0,0,0,0.35)", whiteSpace: "nowrap" }}>{p.children}</div>
  );
}
