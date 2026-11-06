// Timing and motion: the beat grid, easing presets and springs.
// Rule: nothing moves linearly. Every move is eased or sprung, and a move that follows another starts from rest
// (no velocity jumps). Write cues as beats (b(5), b(6.5)), never raw frames, so a new song is one constant.
import { Easing, interpolate, random, spring } from "remotion";

export const FPS = 30;

// ---------- beat grid ----------
// const G = beatGrid(120); G.b(1) === 0 (beat 1 starts the video), G.b(2.5) is the "and" after beat 2.
export const beatGrid = (bpm: number, fps = FPS) => {
  const fpb = (60 * fps) / bpm; // frames per beat
  return {
    bpm,
    fpb,
    /** first frame of beat n (1-based, fractional beats allowed) */
    b: (n: number) => Math.round((n - 1) * fpb),
    /** length of n beats in frames */
    beats: (n: number) => Math.round(n * fpb),
    /** half a beat (an 8th note) */
    half: Math.round(fpb / 2),
  };
};
export type BeatGrid = ReturnType<typeof beatGrid>;

// ---------- easing presets ----------
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** ease-out "expo-ish": fast start, long soft landing. The default for arrivals. */
export const eo = Easing.bezier(0.22, 1, 0.36, 1);
/** ease-in cubic: for exits (things leave accelerating). */
export const ei = Easing.in(Easing.cubic);
/** ease-in-out cubic: camera moves, settles, crossfades. */
export const eio = Easing.inOut(Easing.cubic);
/** ease-in-out sine: the gentlest start/stop, for slow pushes that begin after something lands. */
export const eioSine = Easing.inOut(Easing.sin);

/** 0 → 1 over [at, at + len], eased (never linear). */
export const prog = (f: number, at: number, len: number, e: (t: number) => number = eo) =>
  len <= 0 ? (f >= at ? 1 : 0) : interpolate(f, [at, at + len], [0, 1], { ...clamp, easing: e });

// ---------- springs ----------
export type SpringCfg = { damping: number; stiffness: number; mass?: number };
export const SPRING = {
  /** snappy pop with a visible overshoot (~1.2 at 4–5 f): doodles, panel pops */
  pop: { damping: 19, stiffness: 500, mass: 1 },
  /** bouncy text sticker: overshoot + settle in ~12 f */
  bounce: { damping: 11, stiffness: 190, mass: 1 },
  /** a heavy thing arriving: tiles, photos */
  land: { damping: 14, stiffness: 110, mass: 1 },
  /** a smooth settle with almost no overshoot */
  settle: { damping: 18, stiffness: 120, mass: 0.9 },
  /** quick lift for stickers */
  lift: { damping: 14, stiffness: 200, mass: 1 },
} satisfies Record<string, SpringCfg>;

/** spring value starting at frame `at` (0 before it). */
export const spr = (f: number, at: number, cfg: SpringCfg = SPRING.pop, fps = FPS) =>
  f < at ? 0 : spring({ frame: f - at, fps, config: { mass: 1, ...cfg } });

/** a pop: 0 → overshoot → 1 */
export const pop = (f: number, at: number) => spr(f, at, SPRING.pop);

/** a decaying wiggle in degrees (for things that just popped) */
export const wig = (f: number, at: number, deg = 6) => (f < at ? 0 : deg * Math.sin((f - at) * 1.3) * Math.exp(-(f - at) / 5));

/** a decaying camera shake: [dx, dy] in px */
export const shake = (f: number, at: number, len: number, amp: number): [number, number] => {
  if (f < at || f >= at + len) return [0, 0];
  const k = 1 - (f - at) / len;
  return [amp * k * (random(`sx${at}-${f}`) * 2 - 1), amp * k * (random(`sy${at}-${f}`) * 2 - 1)];
};

/** a damped sine for settles: starts at 0, swings, decays to 0 */
export const settleWave = (f: number, at: number, speed = 0.45, decay = 5) => (f < at ? 0 : Math.sin((f - at) * speed) * Math.exp(-(f - at) / decay));

// ---------- transforms ----------
/** an SVG transform string that scales/rotates about (cx, cy) and then offsets */
export const tfAbout = (cx: number, cy: number, o: { s?: number; r?: number; dx?: number; dy?: number }) =>
  `translate(${cx + (o.dx ?? 0)} ${cy + (o.dy ?? 0)}) rotate(${o.r ?? 0}) scale(${o.s ?? 1}) translate(${-cx} ${-cy})`;

/** quadratic Bézier point (for arcs: swoops, throws) */
export const quad = (t: number, a: [number, number], c: [number, number], z: [number, number]): [number, number] => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * z[0], u * u * a[1] + 2 * u * t * c[1] + t * t * z[1]];
};
