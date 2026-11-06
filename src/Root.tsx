// All compositions. Render one with:  npx remotion render src/index.ts <id> out/<name>.mp4
import { Composition, Still } from "remotion";
import { DemoAnchorDots, DemoPart, DemoReel, partLength } from "./demo/Reel";
import { SECTIONS, TOTAL } from "./demo/config";
import { PostRebuild } from "./demo/PostRebuild";
import { FPS, H, W } from "./kit";

const PARTS = Object.keys(SECTIONS) as (keyof typeof SECTIONS)[];

export const Root = () => (
  <>
    <Composition id="DemoReel" component={DemoReel} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{ guides: false }} />
    {PARTS.map((name, i) => (
      <Composition key={name} id={`DemoPart${i + 1}`} component={DemoPart} durationInFrames={partLength(name)} fps={FPS} width={W} height={H}
        defaultProps={{ name, guides: false }} />
    ))}
    <Still id="AnchorDots" component={DemoAnchorDots} width={W} height={H} />
    <Still id="PostRebuild" component={PostRebuild} width={W} height={H} defaultProps={{ ghost: 0 }} />
  </>
);
