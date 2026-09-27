import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, "previews");
mkdirSync(output, { recursive: true });

const references = [
  "blok", "surrenne", "third-space", "othership", "barrys", "pvolve",
  "tracksmith", "remedy-place", "pillar", "on", "1rebel", "satisfy",
];

for (const name of references) {
  const branch = `codex/ref-${name}`;
  const prefix = ["blok", "surrenne", "barrys"].includes(name) ? "home-fold" : "home-first";
  for (const width of [1440, 390]) {
    const source = `src_FE/docs/reference-variant-captures/${prefix}-${width}.png`;
    const bytes = execFileSync("git", ["show", `${branch}:${source}`], {
      maxBuffer: 16 * 1024 * 1024,
    });
    writeFileSync(join(output, `${name}-${width}.png`), bytes);
  }
}

console.log(`Copied ${references.length * 2} unmodified screenshots from reference branches.`);
