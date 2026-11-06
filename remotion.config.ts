// Remotion CLI config. The assets dir (Remotion's "public dir") holds your media: photos/, cut/, sfx/, anchors.json.
// Default: ./demo. Point it at any folder without touching the repo:
//   REEL_ASSETS=/path/to/my-assets npx remotion render src/index.ts DemoReel out/demo.mp4
// (or pass --public-dir=/path/to/my-assets on the command line).
import { Config } from "@remotion/cli/config";

Config.setPublicDir(process.env.REEL_ASSETS ?? "demo");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
