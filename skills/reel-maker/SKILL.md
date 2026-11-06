---
name: reel-maker
description: Make Instagram Reels, TikToks or Shorts with motion graphics over photos or videos, using the reel-kit Remotion toolkit (beat-synced cuts, die-cut sticker cutouts, hand-drawn boiling doodles on faces, sticker text, instant-print swoops, puzzle grids, paper-rip reveals, frame-synced sound accents). Use when someone wants to turn photos, a photo dump or a designed carousel post into a reel, animate doodles or stickers over pictures, cut a slideshow to a song's beat, or export reel sections as separate videos.
---

# Reel maker

You are helping someone make a vertical reel (1080×1920, 30 fps) from their photos with **reel-kit**, a Remotion
toolkit. The kit, its tools and the human docs live at `${CLAUDE_PLUGIN_ROOT}`:
- `${CLAUDE_PLUGIN_ROOT}/COOKBOOK.md`: prerequisites, quick start, recipes, the rules. Read it before building.
- `${CLAUDE_PLUGIN_ROOT}/src/kit/`: the components (header comment in each file says what it does).
- `${CLAUDE_PLUGIN_ROOT}/src/demo/`: a complete working reel to copy patterns from.
- `${CLAUDE_PLUGIN_ROOT}/tools/`: orient.py, mask.swift, match.py, sfx-prep.py, sfx-have.ts, contact-sheet.sh, still.sh.

## Set up a project

If the current folder isn't already a reel-kit copy (no `src/kit/`), make one: copy the kit into a new project folder
the user names (exclude `.git`, `node_modules`, `out`, `.venv`):

```sh
rsync -a --exclude .git --exclude node_modules --exclude out --exclude .venv "${CLAUDE_PLUGIN_ROOT}/" <project>/
cd <project> && git init && npm install
python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
```

Never edit files inside `${CLAUDE_PLUGIN_ROOT}` itself. Check prerequisites (macOS 14+, Node 22.18+, ffmpeg, `swift`)
and render the placeholder demo once (`npm run render:demo`) to prove the toolchain works before using real photos.

## Privacy (non-negotiable)

- Process everything locally. Never upload the user's photos, cutouts or videos anywhere (no web services, no image
  hosts, no APIs), and never paste them into anything that leaves the machine.
- Keep media out of git: work in the gitignored `demo/photos`, `demo/cut`, `demo/sfx`, or a folder outside the repo via
  `REEL_ASSETS=/path`. Before any commit, run `git status` and confirm no media, `anchors.json` or `layout.json` with
  real coordinates is staged.
- Stock images: licensed for use in the video, not for redistribution. Don't commit or share the files.
- Don't put people's names or private details in code, comments or file names; use generic ids (a, b, c…).

## Workflow

### 1. Intake
Ask for, and wait for:
- **Photos** (or videos): how many, which go together, any that must not be used. If they have a designed post
  (a collage from a design app), get the exported post too: the reel should rebuild it from the raws.
- **Story**: what the reel says in one line; the captions or words they want (their wording, not yours).
- **Song**: title and where its drop is. (They add it in Instagram; you render without music.)
- **Where it goes**: one reel, or also each section as its own video.

### 2. Plan first, and show it before building anything
Write a short plan and get the user's yes:
- **Storyboard**: a table of beats → what appears (one new thing per beat), which photo, which doodle sits where on
  the person, which text, transitions between sections, the biggest moment on the drop, the ~2 s hold at the end.
- **Length and tempo**: BPM (tap it), total beats, seconds.
- **Palette**: sample 4–6 colours from their photos (ffmpeg area averages or a picker) plus one accent.
- **Fonts**: match the source design; two families max.
- **Music**: their song; where the drop lands (beat number).
- **SFX**: ≤ 5 accents, each tied to a visual, with the Firefly prompts from COOKBOOK.md "Sound effects".
Say honestly what might not work (busy backgrounds that will cut badly, too many words for the time, a drop that
doesn't line up).

### 3. Prepare media
- `tools/orient.py` (HEIC → upright JPG, rotation baked in), then look at the results: anything still sideways gets
  `--rotate`.
- `swift tools/mask.swift <photos-folder>` for cutouts; look at every cutout at 100%. Use only clean ones for stickers.
- Designed post → `tools/match.py` → `layout.json`; check the side-by-side image and the `PostRebuild` still with
  `ghost` before trusting it.

### 4. Anchor-dots check (before any animation)
Render the anchor-dots still (`AnchorDots` composition, or an equivalent for your layout), read the 10% grid, fix the
anchors (fractions of each photo: hairline for horns, above the head for halos and crowns, face centre, hands), and
re-render until every dot sits where its doodle belongs. Show the user the still.

### 5. Build with the kit
- Copy `src/demo/` as the starting point; one component per section, each taking `solo` so it works both inside the
  full reel and as a standalone part.
- Cues are beats (`G.b(n)`), never raw frames. Doodles go in a Photo's `behind`/`front`. Cutouts register exactly
  over their Photo. `<Defs />` once per composition, `<Grain />` on top.
- Run `npx tsc --noEmit` after edits.

### 6. Render, contact sheet, inspect
- Render to a **new versioned path** every time (`out/reel-v1.mp4`, `out/reel-v2.mp4`, `out/parts-v2/`); never
  overwrite an earlier render.
- `sh tools/contact-sheet.sh out/reel-vN.mp4` and Read the sheet image yourself. For motion, a dense sheet
  (`0.1 10`) around transitions. Check single frames with `tools/still.sh` (frame 0, each landing, the last frame).
- Look for: frame 0 complete (images loaded), doodles on the person, text clear of faces and the safe area
  (`guides` prop), nothing jumping or reverting, the hold at the end. Fix what you see before showing the user.

### 7. Feedback in batches
Show the user the contact sheet and the video path. Collect all their notes on a version, apply them together,
render the next version, and say what changed. Turn repeated feedback into a rule and follow it from then on.

## Rules (from real feedback; follow them unless the user says otherwise)
- Hold the finished frame ~2 s at the end; never jump back or revert at the end.
- Standalone parts have no inter-section transitions: ease in, build, hold, end.
- Popped cutouts stay popped.
- Every move eased or sprung, never linear; no velocity jumps (a push after a landing starts from rest).
- Let things settle before the next effect; one new thing per beat.
- Give collages breath, but keep sequences brisk.
- Text pops as die-cut stickers rather than typewriter flashes; 1–4 words per chunk; never over faces.
- Fonts match the source design; two families max.
- Colours sampled from the photos; on B/W photos the only colour is the accent.
- Doodles anchored to faces and poses, not floating; one idea per photo; our own lopsided doodles, no clip-art.
- SFX minimal and soft (≤ 5, under the song), frame-synced via the measured `lead`; no cartoon boings or record
  scratches by default.
- Keep key content in the Instagram safe area.
- Check the first frame renders fully (images loaded).
- Remotion's licence: free for individuals and companies of up to 3 people; bigger companies need a company licence.
  Mention it if the user is making this for a business.
