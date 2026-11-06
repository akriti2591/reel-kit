# reel-kit

A Remotion toolkit (and Claude Code plugin) for making Instagram Reels out of photos: a beat grid so every cut lands
on the music, die-cut sticker cutouts made locally with Apple Vision, hand-drawn doodles that boil and sit on faces,
sticker text, instant-print swoops, puzzle grids and paper-rip reveals, frame-synced sound accents, plus tools to
fix photo orientation, rebuild a designed post from its raw photos, trim generated sound effects and review renders
on contact sheets. It ships with a ~12 s demo reel that renders with placeholders until you add your own photos.
macOS only (the cutout tool uses Apple Vision); everything runs locally.

## Install

**As a plain repo**

```sh
git clone <this-repo-url> reel-kit && cd reel-kit
npm install
npm run render:demo        # → out/demo.mp4
```

**As a Claude Code plugin** (adds the `reel-maker` skill, which walks Claude through intake, planning, anchors,
building, rendering and review with this kit):

```
/plugin marketplace add <path-to-this-folder-or-git-url>
/plugin install reel-kit@reel-kit-marketplace
```

Then ask Claude something like "make an Instagram reel from the photos in ~/Pictures/trip".

## Next

Read [COOKBOOK.md](COOKBOOK.md): prerequisites, quick start, using your own photos, recipes (photo post → reel,
cutout sticker transition, doodles on faces, instant print, puzzle grid, sticker text, cutting to a BPM, exporting
sections, the review loop), the rules that made it look good, sound-effect prompts, and licences.

Remotion is free for individuals and companies of up to 3 people; larger companies need a Remotion company licence.
