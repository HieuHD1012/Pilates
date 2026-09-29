/** Apply the observed Soul Đà Nẵng colour language to one reference checkout.
 * Usage: node apply-soul-theme.mjs <checkout> <variant>
 * The variants keep their own composition; this pass only changes colour roles.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [checkout, variant] = process.argv.slice(2);
if (!checkout || !variant) throw new Error("Expected checkout path and variant name");

const cssPath = join(checkout, "src_FE/app/styles/app.css");
let css = readFileSync(cssPath, "utf8");
const tokens = {
  sand: "#fff5ec", "sand-deep": "#fce5d1", chalk: "#fafaf8", paper: "#ffffff",
  ink: "#2c2319", "ink-deep": "#1a1410", "ink-2": "#5a4b40", "ink-3": "#806f61",
  rule: "#e8e5e0", "rule-2": "#d4c5b6", "rule-dark": "#6b4b39",
  lacquer: "#9a4e2d", "lacquer-2": "#7c391f", "lacquer-wash": "#fce5d1",
};
for (const [key, value] of Object.entries(tokens)) {
  const pattern = new RegExp(`(--color-${key}:\\s*)#[0-9a-fA-F]{6}`);
  if (!pattern.test(css)) throw new Error(`Missing token ${key} in ${variant}`);
  css = css.replace(pattern, `$1${value}`);
}
css = css.replace(
  /\/\* ── Colour ─+[^]*?\*\/\n  --color-transparent:/,
  `/* ── Colour ─────────────────────────────────────────────────────────────
     Soul Đà Nẵng homepage palette, adapted for J Pilates reference variants.
     Copper #c97b4b is decorative; darker #9a4e2d carries small text/actions.
     See docs/reference-variant.md and the comparison theme transfer notes. */
  --color-transparent:`,
);
css = css.replace(/(  --color-lacquer-wash:[^\n]*\n)/, `$1\n  --color-cream: #fff5ec;\n  --color-peach: #fce5d1;\n  --color-copper: #c97b4b;\n  --color-amber: #d4a574;\n  --color-walnut: #2c2319;\n`);
writeFileSync(cssPath, css);

const rootPath = join(checkout, "src_FE/app/root.tsx");
let root = readFileSync(rootPath, "utf8");
root = root.replace(/(name: "theme-color", content: ")#[0-9a-fA-F]{6}/, "$1#fff5ec");
writeFileSync(rootPath, root);

const files = {
  blok: "blok.css", surrenne: "surrenne.css", "third-space": "third-space.css",
  othership: "othership.css", barrys: "barrys.css", pvolve: "pvolve.css",
  tracksmith: "tracksmith.css", "remedy-place": "remedy-place.css",
  pillar: "pillar.css", on: "on-culture.css", "1rebel": "one-rebel.css",
  satisfy: "satisfy.css",
};
const maps = {
  "third-space": { "#dfddd7": "#fce5d1" },
  othership: {
    "#30212f": "#2c2319", "#241823": "#1a1410", "#f5f1ea": "#fff5ec",
    "#eac3ac": "#fce5d1", "#bb806d": "#c97b4b", "#d6ccc0": "#d4c5b6",
    "#685964": "#6b4b39", "#6c5d64": "#6b4b39", "#f2d5c3": "#fce5d1",
    "#e4d8dd": "#f2dfd1", "#beafb8": "#d4bda9", "#e7d8ce": "#f2dfd1",
    "#dbcfd7": "#e9cdb9", "#c7b7c2": "#d4bda9", "#5e5159": "#5a4b40",
    "#dfd2d9": "#ead4c4", "#e9d9cc": "#f3dfcf", "#e8dfd8": "#f1e4d7",
    "#bfb1a9": "#d1bba8", "#675b62": "#6b4b39", "#ebe2d9": "#f7e7d8",
    "#c3b5c0": "#d4bda9", "#bdaeba": "#cfb39e",
  },
  barrys: { "#eebcb3": "#d4a574", "#777a73": "#aa917d", "#a2a49e": "#c1a993", "#bbbdb6": "#d4bda9", "#c6c6c0": "#dfcbb9", "#d7d6d0": "#ead9c9", "#e9e6dd": "#fce5d1" },
  tracksmith: { "#dedbd2": "#e8d5c4" },
  "remedy-place": {
    "#26241f": "#2c2319", "#696159": "#6b5748", "#9a4e39": "#9a4e2d",
    "#9b9188": "#9a8573", "#c5b9ae": "#d4c5b6", "#f0ebe4": "#fff5ec",
    "#f4eee4": "#fff5ec", "#24201c": "#1a1410", "#5d5148": "#5a4b40",
    "#d3cac0": "#e8d5c4", "#d8c7b8": "#e5cdb9", "#dac5b0": "#d4a574",
    "#ddd9d1": "#e8e5e0",
  },
  pillar: {
    "#efede7": "#fff5ec", "#57564f": "#5a4b40", "#292920": "#2c2319",
    "#d9d5cb": "#fce5d1", "#924932": "#9a4e2d", "#a5a297": "#b49b85",
    "#bbb7ad": "#d4c5b6",
  },
  on: {
    "#e8e7e2": "#fff5ec", "#14191a": "#1a1410", "#f6f5f1": "#fafaf8",
    "#535a56": "#5a4b40", "#cfd3d0": "#e8d5c4", "#f2f2ed": "#fff5ec",
    "#5c8678": "#9a4e2d", "#619685": "#c97b4b", "#c4c7c1": "#d4c5b6",
    "#c5dbd2": "#fce5d1",
  },
  "1rebel": {
    "#d5a491": "#d4a574", "#f5f0e8": "#fff5ec", "#c7c8c3": "#d4c5b6",
    "#eeeae1": "#fce5d1", "#131815": "#1a1410", "#7d827c": "#927c6b",
    "#805f54": "#9a4e2d", "#a33e2b": "#9a4e2d", "#b7b5ad": "#cbb7a5",
    "#c37158": "#c97b4b", "#d7b9a9": "#e5c9b3", "#dedad4": "#e8e5e0",
    "#e0d3c7": "#ead4c4", "#f6f3ed": "#fff5ec", "#faf8f4": "#fafaf8",
  },
  satisfy: {
    "#e8e4dc": "#fff5ec", "#181b19": "#1a1410", "#c4b4a4": "#d4bda9",
    "#f2efe8": "#fff5ec", "#24241f": "#2c2319", "#4b4d47": "#5a4b40",
    "#898982": "#aa917d", "#aa644c": "#c97b4b", "#b4b4ad": "#cbb7a5",
    "#cecfc8": "#e5d5c6", "#d1d0c9": "#e8d5c4", "#d8b59a": "#d4a574",
  },
};
const variantPath = join(checkout, "src_FE/app/styles", files[variant]);
let variantCss = readFileSync(variantPath, "utf8");
for (const [from, to] of Object.entries(maps[variant] ?? {})) {
  if (!variantCss.toLowerCase().includes(from)) throw new Error(`Missing ${from} in ${variant}`);
  variantCss = variantCss.replaceAll(new RegExp(from, "gi"), to);
}
writeFileSync(variantPath, variantCss);

const docPath = join(checkout, "src_FE/docs/reference-variant.md");
let doc = readFileSync(docPath, "utf8");
doc += `\n## Soul palette transfer · 2026-09-30\n\nThis variant now uses the observed [Soul Đà Nẵng homepage](https://soulpilates.com.vn/) colour roles: cream #fff5ec, peach #fce5d1, copper #c97b4b, amber #d4a574 and chocolate #2c2319. Small action text uses #9a4e2d for legibility. The reference-specific layout and image sequence remain this variant's own experiment. This is a palette study for the owner's beige preference, not a brand/name transfer from the Đà Nẵng studio.\n`;
writeFileSync(docPath, doc);
console.log(`Applied Soul theme to ${variant}`);
