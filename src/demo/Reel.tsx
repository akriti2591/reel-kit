// The demo compositions: the full reel, each section as a standalone part, and the anchor-dots debug still.
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";
import { AnchorDots, cuesFor, Defs, eio, Grain, PALETTE, prog, SafeArea, SfxTrack, useJsonAsset, type Pt } from "../kit";
import { AnchorCtx, Grid, HookBase, HookSticker, Print, Rip } from "./sections";
import { DEFAULT_ANCHORS, G, KEYS, PART_HITS, photo, REEL_HITS, SECTIONS, SFX_FILES, TOTAL, type Anchors, type PhotoKey } from "./config";

/** defaults + <assets>/anchors.json (optional, per photo, partial) */
function WithAnchors({ children }: { children: ReactNode }) {
  const over = useJsonAsset<Partial<Record<PhotoKey, Partial<Anchors>>>>("anchors.json", {});
  const merged = Object.fromEntries(KEYS.map((k) => [k, { ...DEFAULT_ANCHORS, ...(over[k] ?? {}) }])) as Record<PhotoKey, Anchors>;
  return <AnchorCtx.Provider value={merged}>{children}</AnchorCtx.Provider>;
}
const useHave = () => useJsonAsset<string[]>("sfx/have.json", []);

/** shows a section's first frame early (frozen) so the next section is already there under an exit */
const HoldIn = ({ at, early = 0, children }: { at: number; early?: number; children: ReactNode }) => {
  const f = useCurrentFrame();
  if (f < at - early) return null;
  return <Sequence from={f < at ? f : at} layout="none">{children}</Sequence>;
};

export type ReelProps = { guides?: boolean };

export function DemoReel({ guides = false }: ReelProps) {
  const have = useHave();
  const S = SECTIONS;
  return (
    <AbsoluteFill style={{ background: PALETTE.bg, overflow: "hidden" }}>
      <Defs />
      <WithAnchors>
        <Sequence from={S.hook.at} durationInFrames={S.grid.at} layout="none"><HookBase /></Sequence>
        <Sequence from={S.grid.at} durationInFrames={S.rip.at - S.grid.at} layout="none"><Grid solo={false} /></Sequence>
        <HoldIn at={S.rip.at} early={6}><Sequence durationInFrames={S.print.at - S.rip.at} layout="none"><Rip solo={false} /></Sequence></HoldIn>
        <Sequence from={S.print.at} layout="none"><Print len={TOTAL - S.print.at} /></Sequence>
        <Sequence from={S.hook.at} durationInFrames={S.grid.at + 10} layout="none"><HookSticker solo={false} /></Sequence>
      </WithAnchors>
      <Grain />
      <SafeArea show={guides} />
      <SfxTrack cues={cuesFor(REEL_HITS, SFX_FILES, have)} />
    </AbsoluteFill>
  );
}

// ---------- standalone parts ----------
// Each part: one beat of the still first frame easing in from the background (unless the section has its own
// entrance), then the section builds one thing at a time and HOLDS its finished state to the end. No transitions in or out.
type PartName = keyof typeof SECTIONS;
export const LEAD_IN = G.beats(1);
export const partLength = (n: PartName) => LEAD_IN + G.beats(SECTIONS[n].part);
const PART_BODY: Record<PartName, (len: number) => ReactNode> = {
  hook: () => <><HookBase /><HookSticker solo /></>,
  grid: () => <Grid solo />,
  rip: () => <Rip solo />,
  print: (len) => <Print len={len} />,
};

export function DemoPart({ name, guides = false }: { name: PartName; guides?: boolean }) {
  const f = useCurrentFrame();
  const have = useHave();
  const swoops = name === "print" || name === "grid"; // these build their own entrance (swoop, puzzle): no fade
  const lead = swoops ? 0 : LEAD_IN;
  const fin = swoops ? 1 : prog(f, 0, 14, eio);
  const len = partLength(name) - lead;
  return (
    <AbsoluteFill style={{ background: PALETTE.bg, overflow: "hidden" }}>
      <Defs />
      <WithAnchors>
        <AbsoluteFill style={{ opacity: fin, transform: `scale(${1.025 - 0.025 * fin})` }}>
          {/* during the lead-in the section is frozen on its first frame */}
          <Sequence from={f < lead ? f : lead} layout="none">{PART_BODY[name](len)}</Sequence>
        </AbsoluteFill>
      </WithAnchors>
      <Grain />
      <SafeArea show={guides} />
      <Sequence from={lead} layout="none"><SfxTrack cues={cuesFor(PART_HITS[name], SFX_FILES, have)} /></Sequence>
    </AbsoluteFill>
  );
}

// ---------- debug: anchor dots ----------
export function DemoAnchorDots() {
  return (
    <WithAnchors>
      <AnchorCtx.Consumer>{(anchors) => (
        <AnchorDots photos={KEYS.map((k) => ({ k, src: photo(k) }))} anchors={anchors as unknown as Record<string, Record<string, Pt>>} />
      )}</AnchorCtx.Consumer>
    </WithAnchors>
  );
}
