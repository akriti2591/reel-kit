// The demo's four sections. Each runs in its own local time (frame 0 = its first beat) and takes `solo`:
//   solo = false  → part of the full reel: exits into the next section (flick, scatter, whip)
//   solo = true   → a standalone part: no transitions in or out, popped cutouts stay popped, it builds and HOLDS.
import { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";
import {
  ClawSlashes, DizzyStars, DoodleLayer, Glint, Horns, Halo, Crown, InstaxPrint, MotionLines, Photo, PopText, PALETTE, RisingHearts,
  ScriptWrite, ShoutLines, StickerCutout, StickerText, Tag, TornPaperRip, Twinkle, Arrow, dimFilter, ei, eio, liftDim, panelPop, prog,
  puzzleMotion, shake, tfAbout, usePhotoPoint, type Box,
} from "../kit";
import { COPY, cut, DEFAULT_ANCHORS, G, photo, type Anchors, type PhotoKey } from "./config";

export const AnchorCtx = createContext<Record<PhotoKey, Anchors>>({ a: DEFAULT_ANCHORS, b: DEFAULT_ANCHORS, c: DEFAULT_ANCHORS, d: DEFAULT_ANCHORS });
/** anchors of photo k mapped to frame px for one placement */
const useAnchors = (k: PhotoKey, box: Box, focus?: [number, number]) => {
  const all = useContext(AnchorCtx)[k];
  const map = usePhotoPoint(photo(k), box, undefined, focus);
  return Object.fromEntries(Object.entries(all).map(([n, p]) => [n, map(p)])) as Record<keyof Anchors, [number, number]>;
};
const b = G.b;

// =====================================================================================================
// 1 · HOOK (B1–B6): two photos, one doodle each, the line, then the left photo lifts as a sticker.
// =====================================================================================================
const H_A: Box = { x: 50, y: 300, w: 480, h: 800 }, H_B: Box = { x: 550, y: 420, w: 480, h: 800 };
const HK = { horns: b(1), halo: b(2), line: b(3), lift: b(5), exit: b(7) };

const HookHorns = ({ seed }: { seed: string }) => {
  const A = useAnchors("a", H_A);
  return <Horns l={A.hornL} r={A.hornR} at={HK.horns} seed={seed} s={0.9} />;
};

export function HookBase() {
  const f = useCurrentFrame();
  const B = useAnchors("b", H_B);
  const dim = liftDim(f, HK.lift);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, filter: dimFilter(dim) }}>
        <Photo k="hookA" src={photo("a")} cut={cut("a")} box={H_A} bw occlude behind={f >= HK.lift ? null : <HookHorns seed="hh" />} label="photos/a.jpg" />
        <Photo k="hookB" src={photo("b")} box={H_B} push={{ at: HK.line, len: b(5), amount: 0.03 }} label="photos/b.jpg" front={<>
          <Halo c={B.halo} at={HK.halo} seed="hb" rx={210} ry={50} s={0.95} />
          <Twinkle x={B.face[0] - 150} y={B.face[1] + 10} at={HK.halo + 2} R={40} seed="t1" />
          <Twinkle x={B.face[0] + 160} y={B.face[1] - 40} at={HK.halo + 4} R={32} seed="t2" />
        </>} />
        <PopText x={62} y={222} at={HK.horns + 1} size={64} shadow="0 4px 0 rgba(226,59,59,0.55)">{COPY.left}</PopText>
        <PopText x={566} y={330} at={HK.halo + 1} size={64} color={PALETTE.gold} shadow="0 4px 0 rgba(168,114,46,0.6)">{COPY.right}</PopText>
      </div>
      <StickerText x={0} y={1290} at={HK.line} origin="50% 60%" style={{ width: 1080, textAlign: "center", fontSize: 96 }}>{COPY.hook}</StickerText>
    </>
  );
}

/** the cutout lift: stays popped when solo; flicks off up-right into the next section otherwise */
export function HookSticker({ solo }: { solo: boolean }) {
  return (
    <StickerCutout k="hookStk" src={photo("a")} cut={cut("a")} box={H_A} bw at={HK.lift}
      exit={solo ? undefined : { at: HK.exit, kind: "flick", len: 8 }} under={<HookHorns seed="hh" />} />
  );
}

// =====================================================================================================
// 2 · GRID (B7–B13): four tiles assemble like a puzzle; one pop per beat, each with its doodle and a tag.
// =====================================================================================================
const GX = [40, 556], GY = [260, 900], GW = 484, GH = 620;
const TILES: { k: PhotoKey; box: Box }[] = [
  { k: "a", box: { x: GX[0], y: GY[0], w: GW, h: GH } }, { k: "b", box: { x: GX[1], y: GY[0], w: GW, h: GH } },
  { k: "c", box: { x: GX[0], y: GY[1], w: GW, h: GH } }, { k: "d", box: { x: GX[1], y: GY[1], w: GW, h: GH } },
];
const GRID_C: [number, number] = [540, 890];
const POPS: Record<PhotoKey, { at: number; cutout: boolean }> = {
  a: { at: b(3), cutout: true }, b: { at: b(4), cutout: false }, c: { at: b(5), cutout: false }, d: { at: b(6), cutout: true },
};
const ORDER: PhotoKey[] = ["b", "c", "a", "d"]; // arrival order
const SCATTER = b(8) - 6; // panels fly out to the corners, revealing the next section

function TileDoodles({ k, box, front, at }: { k: PhotoKey; box: Box; front: boolean; at: number }) {
  const A = useAnchors(k, box);
  if (k === "a" && front) return <><Twinkle x={A.face[0] - 120} y={A.face[1] - 70} at={at} R={46} seed="ga1" /><Twinkle x={A.face[0] + 125} y={A.face[1] - 20} at={at + 2} R={36} seed="ga2" /></>;
  if (k === "b" && front) return <RisingHearts x={A.above[0]} y={A.above[1] + 30} at={at} seed="gb" />;
  if (k === "c") return <DizzyStars c={[A.halo[0], A.halo[1] + 20]} at={at} seed="gc" rx={115} ry={26} period={G.beats(1)} front={front} />;
  if (k === "d" && front) return <><MotionLines x={A.hand[0]} y={A.hand[1]} at={at} seed="gd" side={-1} s={0.8} /><ShoutLines c={A.face} at={at + 2} seed="gds" spread={140} /></>;
  return null;
}

export function Grid({ solo }: { solo: boolean }) {
  const f = useCurrentFrame();
  const asm = solo ? 4 : 0; // standalone: the assembly IS the entrance (first frame is the empty background)
  const pAt = (k: PhotoKey) => POPS[k].at + (solo ? G.beats(1) : 0); // standalone: the puzzle settles before the first pop
  const sc = solo ? 0 : prog(f, SCATTER, 6, ei);
  const settle = G.beats(1); // in the full reel a pop-out settles back flush a beat later
  const up = (k: PhotoKey) => POPS[k].cutout && f >= pAt(k) && (solo || (f < pAt(k) + settle + 8 && f < SCATTER));
  return (
    <>
      {TILES.map(({ k, box }) => {
        const pz = puzzleMotion(f, box, ORDER.indexOf(k), { at: asm, stagger: 3, center: GRID_C });
        const pp = POPS[k].cutout ? { tf: undefined, shadow: 0 } : panelPop(f, pAt(k), box, k === "b" ? 1 : -1);
        const cx = box.x + box.w / 2, cy = box.y + box.h / 2, vx = Math.sign(cx - GRID_C[0]), vy = Math.sign(cy - GRID_C[1]);
        const fly = sc > 0 ? tfAbout(cx, cy, { dx: vx * 900 * sc, dy: vy * 1100 * sc, r: vx * vy * 8 * sc }) : "";
        return <Photo key={k} k={`grid-${k}`} src={photo(k)} cut={cut(k)} box={box} occlude={k === "c"} label={photo(k)}
          tf={[pz.tf, pp.tf ?? "", fly].join(" ")} opacity={pz.opacity} shadow={pp.shadow} dim={up(k) ? 0.3 : 0}
          behind={<TileDoodles k={k} box={box} at={pAt(k)} front={false} />} front={up(k) ? null : <TileDoodles k={k} box={box} at={pAt(k)} front />} />;
      })}
      {TILES.filter(({ k }) => up(k)).map(({ k, box }) => (
        <StickerCutout key={k} k={`gridStk-${k}`} src={photo(k)} cut={cut(k)} box={box} at={pAt(k)} origin="bottom" lift={10} scale={0.07}
          settleAt={solo ? undefined : pAt(k) + settle} extra={<TileDoodles k={k} box={box} at={pAt(k)} front />} />
      ))}
      {sc > 0 ? null : TILES.map(({ k, box }) => (
        <Tag key={k} x={box.x + 18} y={box.y + box.h - 74} at={pAt(k) + 1}>{COPY.tags[k]}</Tag>
      ))}
      {sc > 0 ? null : <DoodleLayer><Arrow seed="ga" at={pAt("a") + 3} pts={[[TILES[0].box.x + 250, TILES[0].box.y + GH - 60], [TILES[0].box.x + 330, TILES[0].box.y + GH - 110], [TILES[0].box.x + 360, TILES[0].box.y + GH - 190]]} /></DoodleLayer>}
    </>
  );
}

// =====================================================================================================
// 3 · RIP (B14–B17): the top photo with its line; paper hides the bottom; it rips on the drop.
// =====================================================================================================
const R_C: Box = { x: 0, y: 200, w: 1080, h: 680 }, R_D: Box = { x: 0, y: 880, w: 1080, h: 700 };
const R_FOCUS: [number, number] = [0.5, 0.3]; // wide panels of portrait photos: keep the head in, not the middle
const RP = { line: b(1) + 2, tremble: b(2.5), rip: b(3), shout: b(3.5), claw: b(4), whip: b(5) - 6 };

export function Rip({ solo }: { solo: boolean }) {
  const f = useCurrentFrame();
  const D = useAnchors("d", R_D, R_FOCUS);
  const [sx, sy] = shake(f, RP.rip, 8, 10);
  const whip = solo ? 0 : prog(f, RP.whip, 6, eio);
  const whipping = whip > 0 && whip < 1;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${sx}px, ${sy - 1920 * whip}px)`, filter: whipping ? "url(#vblur)" : undefined }}>
      <Photo k="ripD" src={photo("d")} box={R_D} focus={R_FOCUS} bw label={photo("d")} front={<>
        <ShoutLines c={D.face} at={RP.shout} seed="rs" spread={170} />
        <ClawSlashes x={D.face[0] + 250} y={D.face[1] + 30} at={RP.claw} seed="rc" s={0.9} rot={8} />
      </>} />
      <Photo k="ripC" src={photo("c")} box={R_C} focus={R_FOCUS} label={photo("c")} push={{ at: 0, len: RP.rip, amount: 0.03 }} />
      <TornPaperRip at={RP.rip} edgeY={R_D.y} trembleFrom={RP.tremble} />
      <StickerText x={56} y={238} at={RP.line} origin="20% 60%" rot={-4} style={{ fontSize: 76 }}>{COPY.before}</StickerText>
      <PopText x={620} y={1440} at={RP.rip} size={120} slam color={PALETTE.red} boil="after"
        shadow="0 4px 0 rgba(25,25,25,0.55), 0 0 2px rgba(25,25,25,0.6)">{COPY.after}</PopText>
    </div>
  );
}

// =====================================================================================================
// 4 · PRINT (B18–B25): an instant print swoops in, a crown pops on, the script word writes on the border; hold.
// =====================================================================================================
const P_BOX: Box = { x: 200, y: 380, w: 680, h: 880 };
const PR = { in: 1, crown: b(3), sparkle: b(3.5), script: b(4), glint: b(5) };

export function Print({ len }: { len: number }) {
  const A = useAnchors("a", P_BOX);
  return (
    <InstaxPrint at={PR.in} box={P_BOX} pushEnd={len} push={0.06}>
      <Photo k="print" src={photo("a")} box={P_BOX} label={photo("a")} front={<>
        <Crown x={A.halo[0]} y={A.halo[1]} at={PR.crown} seed="pc" s={0.95} />
        <Twinkle x={A.halo[0] + 150} y={A.halo[1] + 40} at={PR.sparkle} R={44} seed="ps1" />
        <Twinkle x={A.halo[0] - 160} y={A.halo[1] + 90} at={PR.sparkle + 3} R={34} seed="ps2" />
      </>} />
      <Glint x={P_BOX.x} y={P_BOX.y} w={P_BOX.w} h={P_BOX.h} at={PR.glint} len={18} />
      <ScriptWrite x={P_BOX.x + 30} y={P_BOX.y + P_BOX.h + 2} at={PR.script} len={14} size={92} color={PALETTE.ink}
        style={{ textShadow: "none" }}>{COPY.script}</ScriptWrite>
    </InstaxPrint>
  );
}

