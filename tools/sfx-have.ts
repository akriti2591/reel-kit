// List the sound files present in an sfx folder → <folder>/have.json, so the reel only cues sounds that exist
// (a cue for a missing file would fail the render; with this it's just silent).
//   node tools/sfx-have.ts [folder = demo/sfx]        (Node 22.18+ runs .ts directly)
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? join(process.env.REEL_ASSETS ?? "demo", "sfx");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const have = readdirSync(dir).filter((f) => /\.(wav|mp3)$/i.test(f)).sort();
writeFileSync(join(dir, "have.json"), JSON.stringify(have) + "\n");
console.log(`${join(dir, "have.json")}: ${have.length ? have.join(", ") : "no sounds yet"}`);
