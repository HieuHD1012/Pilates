#!/usr/bin/env node
/**
 * CONTENT GATE — part of `npm run verify`.
 *
 * The previous version of this script printed an inventory and always exited
 * zero, and it was not wired into the verify gate. That made it the one piece of
 * tooling that could have created pressure on the content backlog, and it
 * created none. This version fails the build.
 *
 * Two classes of failure, and they are not the same kind of problem:
 *
 *   CODE — fails `npm run verify`, because a code change can fix it today:
 *     · a deadline that has passed, so the date meant something
 *     · a placeholder-shaped identity reachable from a public surface — a fake
 *       name is worse than a visible gap, because nothing signals it is wrong
 *
 *   PLANNING — fails `npm run check:release`, printed loudly on every run:
 *     · a required studio fact still missing with no owner and no date
 *
 * The split matters. An earlier version failed `verify` on untracked debt, which
 * meant the project's one mandatory gate could not go green until the studio sent
 * an address — and a gate that is permanently red teaches people to skip it. The
 * pressure is kept where it can be acted on: release is blocked, and the missing
 * facts are named in red on every single run.
 */
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

import { CONTENT_DEBT, STUDIO } from "../app/content/studio.ts";
import { PHOTOGRAPHY } from "../app/content/photography.ts";

/** `--release` also treats untracked content debt as a failure. */
const releaseMode = process.argv.includes("--release");

const failures = [];
const untracked = [];
const notes = [];
const today = new Date().toISOString().slice(0, 10);

/* ── 1 + 2. Studio facts: owner, date, deadline ─────────────────────────── */
for (const item of CONTENT_DEBT) {
  if (STUDIO[item.key] !== null) continue;
  if (!item.required) {
    notes.push(`${item.label} — chưa có, không chặn launch`);
    continue;
  }
  if (!item.owner || !item.due) {
    untracked.push(
      `${item.label} (${item.key}) — chưa có người phụ trách và hạn.\n` +
        `      → Sửa: đặt owner và due trong CONTENT_DEBT tại app/content/studio.ts`,
    );
    continue;
  }
  if (item.due < today) {
    failures.push(
      `${item.label} (${item.key}) đã quá hạn ${item.due} — phụ trách: ${item.owner}`,
    );
    continue;
  }
  notes.push(`${item.label} — ${item.owner}, hạn ${item.due}`);
}

/* ── 3. No placeholder identity reachable from a public surface ─────────── */
const IDENTITY_PATTERNS = [/HLV Demo/i, /\bDemo [A-Z]\b/, /Lorem/i, /\bTBD\b/, /\bTODO\b/];
const PUBLIC_SOURCES = [
  "app/routes/public/**/*.tsx",
  "app/content/*.ts",
  "app/layouts/public-layout.tsx",
];

for (const pattern of PUBLIC_SOURCES) {
  for await (const file of glob(pattern)) {
    const text = await readFile(file, "utf8");
    for (const rx of IDENTITY_PATTERNS) {
      const hit = text.match(rx);
      if (hit) {
        failures.push(
          `Chuỗi giữ chỗ "${hit[0]}" xuất hiện trong ${file}, là bề mặt công khai.\n` +
            `      → Sửa: đưa qua <PendingFact> hoặc gỡ hẳn.`,
        );
      }
    }
  }
}

/* ── Report ─────────────────────────────────────────────────────────────── */
const photosMissing = Object.values(PHOTOGRAPHY).filter((b) => b.src === null).length;
const photosTotal = Object.keys(PHOTOGRAPHY).length;

if (notes.length) {
  console.log("Nội dung đang chờ:");
  for (const note of notes) console.log(`  · ${note}`);
  console.log("");
}
console.log(`Ảnh studio: ${photosTotal - photosMissing}/${photosTotal} slot đã có.\n`);

if (untracked.length > 0) {
  console.error("Dữ kiện bắt buộc còn thiếu và chưa ai nhận:\n");
  for (const item of untracked) console.error(`  ✗ ${item}`);
  console.error(
    `\n  ${untracked.length} khoản này chặn release, không chặn verify — không có thay đổi\n` +
      "  code nào sửa được chúng. Đây là blocker lớn nhất của dự án.\n",
  );
}

if (failures.length > 0) {
  console.error("Cửa nội dung KHÔNG ĐẠT:\n");
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error("");
  process.exit(1);
}

if (releaseMode && untracked.length > 0) {
  console.error("Không release được khi tồn đọng nội dung chưa có người phụ trách.\n");
  process.exit(1);
}

console.log(
  untracked.length === 0
    ? "Cửa nội dung đạt — mọi dữ kiện bắt buộc đều có người phụ trách và còn hạn."
    : "Cửa nội dung đạt phần code. Tồn đọng nội dung ở trên vẫn chặn release.",
);
