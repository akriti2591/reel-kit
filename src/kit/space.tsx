// Coordinate spaces and camera.
// By default every component works in frame px (1080 × 1920). To rebuild a designed post (e.g. a 4:5 carousel tile
// made in a design app) keep its own pixel space: wrap the pieces in <Stage post={{ w, h }}>, give boxes in POST px
// (straight from tools/match.py's layout.json), and the stage scales the post to the frame width and centres it.
// The stage also carries a camera (punch-in, pan, shake) and a dim/blur for "away from the world" moments.
import { createContext, useContext } from "react";
import type { CSSProperties, ReactNode } from "react";
import { H, W } from "./theme";

export const SpaceContext = createContext({ w: W, h: H });
export const useSpace = () => useContext(SpaceContext);

export type Camera = { k?: number; ox?: number; oy?: number; dx?: number; dy?: number; r?: number };

/** frame-px camera wrapper: scale `k` about (ox, oy), then offset; rotation in degrees */
export function Camera({ cam, children, style }: { cam?: Camera; children: ReactNode; style?: CSSProperties }) {
  const c = cam ?? {};
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${c.ox ?? W / 2}px ${c.oy ?? H / 2}px`,
      transform: `translate(${c.dx ?? 0}px, ${c.dy ?? 0}px) scale(${c.k ?? 1}) rotate(${c.r ?? 0}deg)`, ...style }}>{children}</div>
  );
}

/** post-space stage: children use post px. `dim` 0–1 darkens, blurs and desaturates the layer (under a lifted sticker). */
export function Stage(p: { post: { w: number; h: number }; cam?: Camera; dim?: number; children: ReactNode; over?: ReactNode; style?: CSSProperties }) {
  const S = W / p.post.w, OY = (H - p.post.h * S) / 2;
  const d = p.dim ?? 0;
  const layer = (kids: ReactNode, filter?: string) => (
    <div style={{ position: "absolute", inset: 0, filter }}>
      <div style={{ position: "absolute", left: 0, top: OY, width: p.post.w, height: p.post.h, transform: `scale(${S})`, transformOrigin: "0 0" }}>
        <SpaceContext.Provider value={p.post}>{kids}</SpaceContext.Provider>
      </div>
    </div>
  );
  return (
    <Camera cam={p.cam} style={p.style}>
      {layer(p.children, d > 0 ? `brightness(${1 - 0.45 * d}) blur(${8 * d}px) saturate(${1 - 0.3 * d})` : undefined)}
      {p.over ? layer(p.over) : null}
    </Camera>
  );
}

/** post px → frame px for a stage at camera scale 1 */
export const postToFrame = (post: { w: number; h: number }, x: number, y: number): [number, number] => {
  const S = W / post.w;
  return [x * S, (H - post.h * S) / 2 + y * S];
};

/** the same dim as Stage, for frame-px layers */
export const dimFilter = (d: number) => (d > 0 ? `brightness(${1 - 0.45 * d}) blur(${8 * d}px) saturate(${1 - 0.3 * d})` : undefined);
