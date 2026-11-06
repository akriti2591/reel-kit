// The demo's knobs: photos, anchors, copy, tempo, sound. Swap these and the demo re-cuts itself.
//
// PHOTOS: drop 4 portrait photos of a person (head and shoulders visible, roughly 3:4) into the assets dir as
//   photos/a.jpg  photos/b.jpg  photos/c.jpg  photos/d.jpg
// and (optional) their cutouts from tools/mask.swift as cut/a.png … cut/d.png. Missing files render as placeholder
// panels, so the demo always renders.
//
// ANCHORS are fractions of each photo ([0, 0] top-left, [1, 1] bottom-right of the WHOLE photo). The defaults sit on
// the placeholder silhouette and are close for a centred head-and-shoulders portrait. To fit your photos:
//   1. npx remotion still src/index.ts AnchorDots out/stills/anchor-dots.png
//   2. read the 10% grid, write the fixes to <assets>/anchors.json (kept out of git), e.g.
//        { "a": { "hornL": [0.41, 0.17], "hornR": [0.6, 0.17] }, "c": { "face": [0.48, 0.3] } }
//   3. re-render the still until every dot sits where its doodle belongs.
import { beatGrid, type Pt, type SfxFile, type Hit } from "../kit";

export const BPM = 120; // tap your song's tempo and change this one number
export const G = beatGrid(BPM);

export type PhotoKey = "a" | "b" | "c" | "d";
export const KEYS: PhotoKey[] = ["a", "b", "c", "d"];
export const photo = (k: PhotoKey) => `photos/${k}.jpg`;
export const cut = (k: PhotoKey) => `cut/${k}.png`;

export type Anchors = {
  /** bases of the left / right horn, on the hair line */
  hornL: Pt; hornR: Pt;
  /** centre of a halo or crown, just above the head */
  halo: Pt;
  /** centre of the face */
  face: Pt;
  /** where hearts start rising (above the head) */
  above: Pt;
  /** a hand, a shoulder or an elbow: motion lines, claws */
  hand: Pt;
};
export const DEFAULT_ANCHORS: Anchors = {
  hornL: [0.385, 0.25], hornR: [0.615, 0.25],
  halo: [0.5, 0.17], face: [0.5, 0.34], above: [0.5, 0.12], hand: [0.18, 0.72],
};

/** the copy: short, generic, one idea per line. Replace with yours (match the source design's wording) */
export const COPY = {
  left: "monday",
  right: "friday",
  hook: "same person.",
  tags: { a: "+ sparkle", b: "+ heart eyes", c: "+ dizzy", d: "+ attitude" } as Record<PhotoKey, string>,
  before: "before coffee",
  after: "after",
  script: "obviously",
};

// ---------- sound (files are yours: see COOKBOOK.md "SFX") ----------
// len / lead in frames, as printed by tools/sfx-prep.py. These defaults fit typical short accents; re-measure yours.
export const SFX_FILES: Record<string, SfxFile> = {
  "ting.wav": { len: 20, lead: 0 },
  "swoosh.wav": { len: 17, lead: 5 },
  "pop.wav": { len: 7, lead: 0 },
  "sticker_peel.wav": { len: 24, lead: 9 },
  "paper_rip.wav": { len: 27, lead: 4 },
  "soft_slam.wav": { len: 27, lead: 0 },
};

// section starts in the full reel (frames) and lengths as standalone parts (beats; ~2 s hold at the end)
export const SECTIONS = {
  hook: { at: G.b(1), part: 9 },
  grid: { at: G.b(7), part: 11 },
  rip: { at: G.b(14), part: 8 },
  print: { at: G.b(18), part: 8 },
};
export const TOTAL = G.b(26); // 25 beats = 12.5 s at 120 BPM

// the full reel's accents: ≤ 5, each on a visual (frames are reel frames)
export const REEL_HITS: Hit[] = [
  ["ting.wav", G.b(1), 0.24], // horns pop
  ["sticker_peel.wav", G.b(5), 0.24], // the cutout lifts
  ["pop.wav", SECTIONS.grid.at + G.b(3), 0.2], // first pop-out in the grid
  ["paper_rip.wav", SECTIONS.rip.at + G.b(3), 0.3], // the rip (put this on the drop)
  ["swoosh.wav", SECTIONS.print.at + 7, 0.22], // the print swoops in (peaks at its fastest frame)
];
// each standalone part: only its own moments (frames are section-local)
export const PART_HITS: Record<keyof typeof SECTIONS, Hit[]> = {
  hook: [["ting.wav", G.b(1), 0.24], ["ting.wav", G.b(2), 0.2], ["sticker_peel.wav", G.b(5), 0.24]],
  grid: [["pop.wav", G.b(4), 0.2], ["pop.wav", G.b(7), 0.18]], // pops are a beat later standalone
  rip: [["paper_rip.wav", G.b(3), 0.3], ["soft_slam.wav", G.b(3), 0.16]],
  print: [["swoosh.wav", 7, 0.22], ["ting.wav", G.b(3), 0.18]],
};
