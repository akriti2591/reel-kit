# reel-kit cookbook

How to turn photos (or a designed photo post) into an Instagram Reel with hand-made-looking motion graphics:
die-cut sticker cutouts, boiling doodles that sit on people, sticker text, instant prints, puzzle collages, a paper
rip on the drop, all cut to a song's beat. Everything runs locally on a Mac. Nothing is uploaded.

- [Prerequisites](#prerequisites)
- [Quick start: render the demo](#quick-start-render-the-demo)
- [Use your own photos](#use-your-own-photos)
- [Recipes](#recipes)
- [Rules that made it good](#rules-that-made-it-good)
- [Sound effects](#sound-effects)
- [Reference: the kit](#reference-the-kit) · [the tools](#reference-the-tools)
- [Licences](#licences)

## Prerequisites

| Need | Why | Get it |
|---|---|---|
| macOS 14 (Sonoma) or later | Apple Vision cutouts (`tools/mask.swift`) | |
| Node.js 22.18+ (LTS) | Remotion, and `node tools/*.ts` runs TypeScript directly | nodejs.org or `brew install node` |
| ffmpeg | contact sheets, sound prep | `brew install ffmpeg` |
| Xcode Command Line Tools | the `swift` command for the cutout tool | `xcode-select --install` |
| Python 3 + a venv | orient, match, sfx-prep (OpenCV + NumPy) | see below |
| Adobe Firefly (optional) | generating the sound effects | firefly.adobe.com, "Generate sound effects" |
| Claude Code (optional) | the `reel-maker` skill drives the whole workflow for you | see README.md |

Python venv, once, in the repo folder:

```sh
python3 -m venv .venv
.venv/bin/pip install -r tools/requirements.txt     # opencv-python-headless, numpy
```

## Quick start: render the demo

```sh
npm install
npm run render:demo                                 # → out/demo.mp4 (12.5 s, 1080×1920, 30 fps)
sh tools/contact-sheet.sh out/demo.mp4              # → out/demo-sheet.jpg, a frame every 0.5 s
```

With no photos in `demo/photos/`, every photo renders as a soft placeholder panel with a silhouette, so the demo
always works. Open `out/demo-sheet.jpg` to see all of it at a glance. `npm run studio` opens Remotion Studio to scrub
through it.

Other compositions:

```sh
npx remotion render src/index.ts DemoPart1 out/part1.mp4   # each section as its own video: DemoPart1 … DemoPart4
npx remotion still src/index.ts AnchorDots out/stills/anchor-dots.png
npx remotion still src/index.ts PostRebuild out/stills/post.png
npx remotion render src/index.ts DemoReel out/demo-guides.mp4 --props='{"guides":true}'   # with the safe-area overlay
```

## Use your own photos

The demo wants four portrait photos of one person (head and shoulders visible, roughly 3:4). Stock photos work well
(for example licensed Adobe Stock images). Your media never goes in git: `demo/photos/`, `demo/cut/`, sound files and
`anchors.json` are gitignored, and stock licences don't allow redistributing the files anyway.

```sh
# 1. upright JPGs named a–d (HEIC is fine; EXIF rotation is baked in; long edge 2000 px)
.venv/bin/python tools/orient.py ~/Downloads/my-photos demo/photos --names a,b,c,d
# 2. cutouts for the stickers (→ demo/cut/a.png …)
swift tools/mask.swift demo/photos
# 3. check where the doodles will sit
npx remotion still src/index.ts AnchorDots out/stills/anchor-dots.png
# 4. fix anchors in demo/anchors.json (fractions of each photo; see below), re-run 3 until the dots are right
# 5. render and review
npm run render:demo && sh tools/contact-sheet.sh out/demo.mp4
```

Keep your media outside the repo entirely by pointing the kit at any folder with the same layout
(`photos/`, `cut/`, `sfx/`, `anchors.json`):

```sh
REEL_ASSETS=~/reels/my-assets npx remotion render src/index.ts DemoReel out/mine-v1.mp4
```

**Anchors.** A doodle is only as good as its anchor. Anchors are fractions of the whole photo (`[0, 0]` is the
top-left, `[1, 1]` the bottom-right), so one anchor works wherever the photo appears, at any crop. The defaults in
`src/demo/config.ts` fit the placeholder silhouette. Override any of them per photo in `<assets>/anchors.json`:

```json
{ "a": { "hornL": [0.37, 0.13], "hornR": [0.63, 0.13], "halo": [0.5, 0.07] },
  "d": { "face": [0.38, 0.27], "hand": [0.42, 0.55] } }
```

The `AnchorDots` still shows each photo whole with a 10% grid and every anchor labelled, so you read the numbers
straight off it.

Change the copy, tempo and sounds in `src/demo/config.ts` (`COPY`, `BPM`, `REEL_HITS`).

## Recipes

### Photo post → reel

You made a collage post in a design app and want the reel to rebuild it from the full-quality originals, then
animate it.

1. Export the post as PNG; keep the raw photos. Run `tools/orient.py` on the raws.
2. Write `spec.json` with a rough rectangle per panel (read corners off Preview; ±40 px is fine):
   ```json
   { "post": "post.png", "panels": [
       { "id": "a", "photo": "photos/a.jpg", "rect": [40, 60, 690, 840] },
       { "id": "b", "photo": "photos/b.jpg", "rect": [560, 560, 1060, 1280] } ] }
   ```
3. `.venv/bin/python tools/match.py spec.json --out layout.json --check rebuild.jpg`. It snaps each rectangle to the
   real panel border, finds each photo's exact crop with SIFT feature matching, and writes `layout.json` plus a
   side-by-side check image. A panel with low inliers (under ~25) needs checking by eye: text over a photo or a heavy
   filter can starve the match.
4. Put `layout.json` and `post.png` in the assets dir and render the `PostRebuild` still with `--props='{"ghost":0.5}'`.
   The original is overlaid at 50%, so any misaligned crop shows as a double image.
5. Build the reel inside `<Stage post={{ w, h }}>` with each panel as `<Photo box crop>` in post px. The post stays
   recognisable, and everything you add moves with it.

Keep the source design's panel combinations and spirit. Re-crop only for headroom (room for a doodle above a head),
not to change who is in the frame.

### Cutout sticker transition

The subject lifts off the photo as a die-cut vinyl sticker, wobbles, and is flicked away to reveal the next section.

```tsx
<Photo k="p1" src="photos/a.jpg" cut="cut/a.png" box={BOX} occlude behind={<Horns … />} />   {/* underneath */}
<StickerCutout k="s1" src="photos/a.jpg" cut="cut/a.png" box={BOX} at={G.b(5)}
  exit={{ at: G.b(7), kind: "flick" }} under={<Horns … />} />                              {/* on top */}
```

- Same `box`/`crop`/`focus` for both, so the sticker starts exactly registered and the lift is the only change.
- Dim what's underneath while it's up (`liftDim` + `dimFilter`, or `<Stage dim>`): it reads as "lifted away from the
  world".
- Doodles passed as `under`/`extra` get the white border too, so horns lift with the head.
- `exit: "flick"` throws it off up-right; `"expand"` grows and fades it. Leave `exit` out in a standalone part:
  **popped cutouts stay popped.**
- Pick photos whose subject separates cleanly (dark clothes on a light wall are ideal). Loose hair against a busy
  background looks cut, not wispy; two people close together merge into one shape (`--person` helps). Check every
  cutout at 100% before you build on it. Two full sticker transitions per reel is the ceiling.
- Smaller "pop-outs" inside a grid: `origin="bottom" lift={10} scale={0.07}` so the person grows out of their panel.

### Doodle on a head or face

```tsx
const A = usePhotoPoint("photos/a.jpg", BOX);      // anchor fractions → frame px for this placement
<Photo k="p" src="photos/a.jpg" cut="cut/a.png" box={BOX} occlude
  behind={<Horns l={A([0.39, 0.2])} r={A([0.61, 0.2])} at={G.b(1)} seed="h" />}   {/* fractions of the photo */}
  front={<Halo c={A([0.5, 0.12])} at={G.b(2)} seed="halo" />} />
```

- `behind` + `occlude` draws the cutout again over the doodle, so horn bases tuck behind the hair.
- Put doodles in the Photo's `behind`/`front`: they then move with pushes, pops and shakes.
- One idea per photo, sitting on the person, with empty space left alone.
- Every held doodle boils (3 jittered variants on twos). Keep the jitter at a few px; more looks nervous.
- Colour: gold and cream on warm photos; white plus one accent red on black-and-white photos.

### Instant print swoop

```tsx
<InstaxPrint at={1} box={BOX} pushEnd={durationInFrames} push={0.06}>
  <Photo k="pr" src="photos/a.jpg" box={BOX} front={<Crown … />} />
  <ScriptWrite x={BOX.x + 30} y={BOX.y + BOX.h + 2} at={G.b(4)} size={92} color={PALETTE.ink}>obviously</ScriptWrite>
</InstaxPrint>
```

It arrives on an eased arc from the bottom-left (fast start, long landing), swings ~2° past its tilt and settles,
then pushes in slowly until the end, starting from zero velocity. No shrink-then-grow. Write on the thick bottom
border like a pen on a real print. It is its own entrance, so a part that starts with it needs no fade-in.

### Puzzle grid

`puzzleMotion(f, box, i, { at, stagger, center })` gives each tile a transform: it flies in from outside (away from
the grid centre) and springs into place, staggered. Then one pop per beat: `panelPop` for close-ups, a
`StickerCutout` pop-out for photos with a clear person, each with its doodle and a `Tag`. Let the grid settle
before the first pop.

### Sticker text

```tsx
<StickerText x={0} y={1290} at={G.b(3)} style={{ width: 1080, textAlign: "center", fontSize: 96 }}>same person.</StickerText>
```

A die-cut white outline and a soft shadow make it read on any photo. It pops on a spring with a small rotation
settling to zero. Prefer it to typewriter reveals. Use `PopText` for short bold labels and `slam` for the one big
word on the drop; `boil` makes an accent word breathe like the doodles.

### Cut to a song's BPM

1. Pick the song first. Tap its tempo (any BPM tapper) and set `BPM` in `src/demo/config.ts`. Every cue is a beat
   number (`G.b(5)`, `G.b(6.5)`), so the whole reel re-times itself. Over ~140 BPM, cut on every other beat.
2. Put the biggest moment (the rip, the slam) on the song's drop. If the drop isn't where you planned, move that
   one beat number.
3. Render **without music**. Add the song in Instagram's editor (it's licensed there and shows the audio credit).
   Drag the song so a strong downbeat hits 0:00. Mixer: music 100%, original audio (your accents) about 60%.
4. Keep sound effects to ≤ 5 soft accents under the song (volumes 0.15–0.35). The song does the rest.

### Export each section as its own video

Each section takes `solo`. In the full reel it hands over to the next one (flick, scatter, whip); as a standalone
part (`DemoPart1…4`) it has no transitions in or out, eases in from the background for one beat (unless it has its
own entrance, like the print or the puzzle), builds one thing at a time, then holds its finished state for about two
seconds and simply ends.

```sh
for i in 1 2 3 4; do npx remotion render src/index.ts DemoPart$i out/parts-v1/part$i.mp4; done
```

### Review loop

- **Versioned outputs.** Render to a new name every round (`out/demo-v3.mp4`, `out/parts-v4/`); never overwrite a
  previous render, so you can compare and go back. `tools/still.sh` versions stills for you.
- **Contact sheet first.** `sh tools/contact-sheet.sh out/demo-v3.mp4` (every 0.5 s) to see the whole edit. For motion,
  `sh tools/contact-sheet.sh out/demo-v3.mp4 0.1 10` (every 3rd frame) shows whether things settle, overshoot or jump.
- **Frame by frame** on the moments that matter: `sh tools/still.sh DemoReel 75` renders one frame at full size.
  Check frame 0 (must be complete, images loaded), every landing, and the last frame.
- **Safe area.** Render once with `--props='{"guides":true}'` and check nothing important sits under Instagram's UI.
- **Feedback in batches.** Collect every note on a version, fix them all, render the next version.

## Rules that made it good

Distilled from many rounds of feedback on real reels.

**Timing and motion**
- Hold the finished frame about 2 s at the end. Never jump back or revert at the end of a part.
- Standalone parts have no inter-section transitions: ease in, build, hold, end.
- Popped cutouts stay popped (in a standalone part).
- Every move is eased or sprung, never linear, and never with a velocity jump: a slow push that follows a landing
  starts from rest.
- Let each thing settle before the next effect starts. One new thing per beat.
- Give collages room to breathe (a calm settle, a held grid), but keep sequences brisk (one pop per beat).
- Cut on the beat. The biggest moment goes on the drop.

**Type**
- Text pops as die-cut stickers (or bold chunks that pop), not typewriter flashes.
- Match the source design's fonts; two families max (here: Inter for bold captions, Sacramento for written words).
- 1–4 words per chunk. Never over a face, never in the Instagram UI zones.

**Look**
- Colours are sampled from the photos (an ffmpeg area average or a colour picker on the posts), plus one accent.
- On black-and-white photos, the only colour is the accent red.
- Doodles are anchored to faces and poses (horns on the hairline, a halo tilted with the head, sparks starting at a
  fingertip), never floating. One idea per photo.
- The same grain and vignette go over photos and doodles, and shadows are tinted to the photo, so it reads as one
  image.
- Our own lopsided doodles only: no clip-art, emoji packs or neon glow; no glitch, 3D-cube or preset transitions.

**Sound**
- Minimal and soft: ≤ 5 accents, under the song.
- Frame-synced through the measured `lead`, so the audible hit lands on the visual frame.
- No cartoon boings or record scratches by default; they date fast and fight the music.

**Craft**
- Keep key content in the safe area (top ~200 px, bottom ~340 px, and the right-hand action rail are covered by
  Instagram's UI).
- Check that the first frame renders fully, with images loaded (the kit holds each frame until its images are
  decoded; still look at frame 0).
- Check anchors on a still before animating anything.
- Plan first and show the plan (storyboard, palette, fonts, music, SFX) before building.

## Sound effects

The song carries the audio; these are quiet accents under it. Generate them (for example with Adobe Firefly's sound
effects), then trim and measure:

```sh
.venv/bin/python tools/sfx-prep.py ~/Downloads/firefly-sfx demo/sfx    # trims, fades, normalises; prints len/lead
node tools/sfx-have.ts                                                  # → demo/sfx/have.json (what can play)
```

Firefly returns at least about a second per sound, often with silence around it. `sfx-prep` measures onset, peak and
end from the waveform, trims to the sound, fades it, peak-normalises it, and prints the `len` and `lead` frames for
each file. Paste them into `SFX_FILES` in `src/demo/config.ts`: use the onset for clicks/pops/tings and the peak for
swells (whoosh, peel, rip). A cue's frame is the frame of its visual; the file starts `lead` frames earlier.

Prompts that worked (keep them dry and short; play them soft):

| File | Prompt |
|---|---|
| `ting.wav` | a single light glassy ting, small and bright, soft attack, short natural decay, no reverb tail |
| `swoosh.wav` | a soft airy whoosh, gentle, close, rising then falling, no low end |
| `pop.wav` | single crisp bubbly pop, soft, dry, close, no reverb |
| `sticker_peel.wav` | vinyl sticker peeled quickly off glossy paper, crisp |
| `paper_rip.wav` | thick paper torn fast in one long rip, close |
| `soft_slam.wav` | punchy tight deep hit, short, without tail (played softly) |

Sound files are gitignored. Ship prompts, not generations.

## Reference: the kit

All in `src/kit/` (import from `"../kit"`). Frame px unless you're inside a `<Stage>`.

| Piece | What it does |
|---|---|
| `beatGrid(bpm)` | `b(n)` beat → frame, `beats(n)`, `half` (an 8th) |
| `eo`, `ei`, `eio`, `eioSine`, `prog`, `spr`, `SPRING`, `pop`, `wig`, `shake`, `settleWave`, `tfAbout`, `quad` | easing presets, springs and motion helpers (never linear) |
| `Photo` | a photo panel: exact crop window or cover+focus, B/W, drain/bloom, landing, slow push, occlusion, doodle slots; placeholder if missing |
| `StickerCutout`, `liftMotion`, `liftDim` | die-cut sticker lift with border, tinted shadow, wobble, settle/stay/flick/expand |
| `InstaxPrint` | instant print swoop on an arc, settle, continuous push |
| `puzzleMotion`, `PuzzleGrid`, `panelPop` | tiles spring into place, staggered; whole-panel pop |
| `Doodle`, `makePen`, `DoodleLayer` | hand-drawn strokes and shapes with line boil; pop in, shrink out |
| `Horns`, `Halo`, `Crown`, `Heart`, `RisingHearts`, `Sparkle`, `Twinkle`, `Starburst`, `DizzyStars`, `Bats`, `Moon`, `MotionLines`, `ShoutLines`, `ClawSlashes`, `Arrow`, `Scribble` | the doodle set |
| `StickerText`, `PopText`, `ScriptWrite`, `DrawPath`, `Tag`, `boilT` | type: die-cut pop, bold chunk/slam, written script, drawn path, label, text boil |
| `Glint`, `Grain`, `TornPaperRip`, `SafeArea` | light sweep, grain + vignette, paper rip reveal, Instagram UI overlay |
| `Stage`, `Camera`, `postToFrame`, `dimFilter` | post-space stage, camera punch/pan/shake, dim/blur |
| `SfxTrack`, `cuesFor` | sound cues with lead, fades, have-list gating |
| `AnchorDots`, `usePhotoPoint`, `useImageInfo`, `useJsonAsset`, `assetExists` | debug dots, anchor mapping, render-holding image loads, optional JSON assets |
| `Defs`, `PALETTE`, `sans`, `script` | SVG filters (render once per composition), palette, the two fonts |

## Reference: the tools

| Tool | Use |
|---|---|
| `tools/orient.py` | HEIC/JPG/PNG → upright JPGs, EXIF rotation baked in, optional resize and rename |
| `tools/mask.swift` | Apple Vision cutouts (RGBA PNG, same size as the photo), one file or a folder |
| `tools/match.py` | recreate a designed post: border-snapped boxes + SIFT crops → layout.json + check image |
| `tools/sfx-prep.py` | trim/fade/normalise generated sounds; print `len`/`lead` frames |
| `tools/sfx-have.ts` | write `sfx/have.json` listing the sounds present |
| `tools/contact-sheet.sh` | tile a frame every N seconds into one image |
| `tools/still.sh` | render one frame, versioned (never overwrites) |

Orientation gotchas (why `orient.py` exists): phones store many photos sideways with an EXIF orientation tag.
Browsers, and so Remotion, honour the tag. `sips` conversion from HEIC can drop the tag without rotating the
pixels, so the JPG comes out sideways. OpenCV's `imread` applies the tag unless told not to
(`IMREAD_IGNORE_ORIENTATION`). Bake the rotation into the pixels once and every tool agrees.

## Licences

- **Remotion** has its own licence: free for individuals and for companies of up to 3 people; larger companies need
  a company licence (remotion.pro). Check remotion.dev/license before using it commercially.
- **Inter** and **Sacramento** are Google Fonts under the SIL Open Font License (OFL).
- **Your media**: stock photo licences generally allow use in your video but not redistributing the files, so they
  stay out of the repo. The same goes for generated sound files.
