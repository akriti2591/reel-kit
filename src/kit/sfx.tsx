// Sound accents, tucked under a song the creator adds in Instagram (licensed there, with the audio credit).
// A hit is [file, visualFrame, volume]: the frame of the VISUAL the sound belongs to. Each file has a measured
// `lead` (frames from the file's start to its audible hit; tools/sfx-prep.py prints it) and `len`, so the file starts
// `lead` frames early and the hit lands exactly on the visual. Every cue fades in over 2 f and eases out over the back
// 40% of the file, so nothing clicks or stops dead. A sound only plays if it is listed in the `have` list
// (sfx/have.json, written by `node tools/sfx-have.ts`), so a missing file is silent instead of a failed render.
// Keep it to ≤ 5 accents per reel, soft (0.15–0.35), and let the song do the rest.
import { Audio, Easing, interpolate, Sequence, staticFile } from "remotion";
import { clamp } from "./motion";

export type SfxFile = { len: number; lead: number };
export type Hit = [file: string, visual: number, vol: number];
export type Cue = { file: string; from: number; len: number; vol: number };

/** hits → cues, keeping only files we have; `from`/`to` crop to a section and shift it to start at 0 */
export const cuesFor = (hits: Hit[], files: Record<string, SfxFile>, have: string[], range?: { from: number; to: number }): Cue[] =>
  hits
    .filter(([file, visual]) => files[file] && have.includes(file) && (!range || (visual >= range.from && visual < range.to)))
    .map(([file, visual, vol]) => ({ file, from: visual - files[file].lead - (range?.from ?? 0), len: files[file].len, vol }));

export function SfxTrack({ cues, dir = "sfx" }: { cues: Cue[]; dir?: string }) {
  return <>{cues.map((c, i) => (
    <Sequence key={`${c.file}-${i}`} from={c.from} durationInFrames={c.len} layout="none">
      <Audio src={staticFile(`${dir}/${c.file}`)} volume={(fr) => c.vol * interpolate(fr, [0, 2], [0, 1], clamp) *
        interpolate(fr, [c.len * 0.6, c.len], [1, 0], { ...clamp, easing: Easing.inOut(Easing.sin) })} />
    </Sequence>
  ))}</>;
}
