// Fonts and a default palette. Two font families max: one bold grotesk for captions/labels, one script for
// "written" words. Both are Google Fonts (SIL Open Font License), loaded through @remotion/google-fonts so renders
// wait for them. Swap them to match the source design; don't add a third.
// Colours: sample them from YOUR photos (see COOKBOOK.md "Sample a palette"), then replace PALETTE.
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSacramento } from "@remotion/google-fonts/Sacramento";

export const sans = loadInter("normal", { weights: ["400", "500", "800"], subsets: ["latin"] }).fontFamily;
export const script = loadSacramento("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

export const W = 1080, H = 1920; // the reel frame

export const PALETTE = {
  red: "#E23B3B", // the one accent allowed on black-and-white photos
  redDeep: "#5A0A10", // tinted shadow on warm photos
  gold: "#E0A845", // halos, sparkles, glints
  goldDeep: "#A8722E", // gold outline so gold holds up on busy photos
  glow: "#F4D6A8", // lamp glow behind gold
  cream: "#FBF8F2", // text on warm photos
  paper: "#FFFDF8", // sticker borders, white doodles
  paper2: "#ECEAE5", // torn paper
  night: "#1B1A1A", // outline under white doodles, shadow on B/W photos
  bg: "#2F2B2B", // the charcoal behind everything
  ink: "#272223",
};
export type Palette = typeof PALETTE;
