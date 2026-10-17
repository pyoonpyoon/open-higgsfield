// Copies the repo's ComfyUI workflows into the app so they ship with the build.
// The source of truth is ../workflows; src/workflows is generated (gitignored).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const src = path.resolve(import.meta.dirname, "../../workflows");
const dest = path.resolve(import.meta.dirname, "../src/workflows");

if (!existsSync(path.join(src, "manifest.json"))) {
  console.error(`sync-workflows: ${src}/manifest.json not found`);
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
const files = readdirSync(src).filter((f) => f === "manifest.json" || f.endsWith(".api.json"));
for (const need of ["angle.api.json", "angle.gguf.api.json", "move.api.json"]) if (!files.includes(need)) { console.error(`sync-workflows: missing ${need}`); process.exit(1); }
for (const f of files) cpSync(path.join(src, f), path.join(dest, f));
console.log(`sync-workflows: ${files.length} files -> src/workflows`);
