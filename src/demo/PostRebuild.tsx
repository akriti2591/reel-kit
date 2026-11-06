// Recipe "photo post → reel", step 1: rebuild a designed post from the raw photos with tools/match.py's
// layout.json (put it in the assets dir as layout.json; the photo paths in it are relative to the assets dir).
// Everything inside <Stage> is in the post's own px. Without a layout.json it shows a sample 2-panel post.
// Props: ghost (0–1) overlays the original post ("post.png" in the assets dir) to check the crops line up.
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Defs, PALETTE, Photo, Stage, assetExists, useJsonAsset, type Crop } from "../kit";

type Layout = { size: [number, number]; panels: { id: string; photo: string; box: [number, number, number, number]; crop: Crop }[] };
const SAMPLE: Layout = {
  size: [1080, 1350],
  panels: [
    { id: "a", photo: "photos/a.jpg", box: [40, 60, 650, 780], crop: [0.13, 0.15, 0.67, 0.6] },
    { id: "b", photo: "photos/b.jpg", box: [560, 560, 500, 720], crop: [0.1, 0.05, 0.83, 0.9] },
  ],
};

export function PostRebuild({ ghost = 0 }: { ghost?: number }) {
  const L = useJsonAsset<Layout>("layout.json", SAMPLE);
  const [w, h] = L.size;
  const hasPost = assetExists(staticFile("post.png")) === true;
  return (
    <AbsoluteFill style={{ background: PALETTE.bg }}>
      <Defs />
      <Stage post={{ w, h }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: PALETTE.cream }} />
        {L.panels.map((p) => (
          <Photo key={p.id} k={`post-${p.id}`} src={p.photo} box={{ x: p.box[0], y: p.box[1], w: p.box[2], h: p.box[3] }} crop={p.crop} label={p.photo} />
        ))}
        {ghost > 0 && hasPost ? <Img src={staticFile("post.png")} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, opacity: ghost }} /> : null}
      </Stage>
    </AbsoluteFill>
  );
}
