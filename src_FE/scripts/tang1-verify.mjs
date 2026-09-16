/**
 * KIỂM CHỨNG BỘ ĐO TẦNG 1
 *
 * Câu hỏi "làm sao biết thống kê đúng" không trả lời được bằng lời. Cách trả lời
 * là dựng một trang có số đã biết trước, chạy đúng hàm đo mà bản quét dùng, rồi
 * so kỳ vọng với thực tế.
 *
 * Mỗi ca dưới đây gài một con số cụ thể — kèm cả những thứ *không được* đếm, vì
 * một bộ đếm chỉ đúng khi nó cũng biết bỏ qua đúng chỗ.
 *
 *   node scripts/tang1-verify.mjs
 */
import { chromium } from "@playwright/test";
import { PROBE } from "./tang1-probe.mjs";

const CASES = [
  {
    name: "card — đếm đúng, và bỏ qua khối quá nhỏ / không có mặt phẳng",
    html: `
      <div style="border-radius:8px;background:#eee;width:200px;height:100px">1</div>
      <div style="border-radius:12px;border:1px solid #999;width:300px;height:80px">2</div>
      <div style="border-radius:6px;background:#eee;width:130px;height:70px">3</div>
      <!-- KHÔNG tính: bo góc 4px (<6) -->
      <div style="border-radius:4px;background:#eee;width:200px;height:100px">x</div>
      <!-- KHÔNG tính: quá hẹp (119 < 120) -->
      <div style="border-radius:8px;background:#eee;width:119px;height:100px">x</div>
      <!-- KHÔNG tính: quá thấp (59 < 60) -->
      <div style="border-radius:8px;background:#eee;width:200px;height:59px">x</div>
      <!-- KHÔNG tính: bo góc nhưng không nền không viền -->
      <div style="border-radius:8px;width:200px;height:100px">x</div>`,
    expect: { cards: 3 },
  },
  {
    name: "pill — đếm chip bo tròn có nền, bỏ qua chip trong suốt và khối cao",
    html: `
      <span style="display:inline-block;border-radius:9999px;background:#ddd;width:60px;height:20px"></span>
      <span style="display:inline-block;border-radius:9999px;background:#ddd;width:80px;height:24px"></span>
      <span style="display:inline-block;border-radius:16px;background:#ddd;width:90px;height:32px"></span>
      <!-- KHÔNG tính: không nền -->
      <span style="display:inline-block;border-radius:9999px;width:60px;height:20px"></span>
      <!-- KHÔNG tính: rộng 240 > 220 -->
      <span style="display:inline-block;border-radius:9999px;background:#ddd;width:240px;height:20px"></span>
      <!-- KHÔNG tính: cao 40 > 34 và bo góc 8 < nửa chiều cao -->
      <span style="display:inline-block;border-radius:8px;background:#ddd;width:90px;height:40px"></span>`,
    expect: { pills: 3 },
  },
  {
    name: "bóng đổ — đếm node, và đếm số kiểu bóng khác nhau",
    html: `
      <div style="box-shadow:0 1px 2px #0002;width:50px;height:50px"></div>
      <div style="box-shadow:0 1px 2px #0002;width:50px;height:50px"></div>
      <div style="box-shadow:0 8px 24px #0004;width:50px;height:50px"></div>
      <div style="width:50px;height:50px"></div>`,
    expect: { shadowNodes: 3, shadowKinds: 2 },
  },
  {
    name: "P5 — chuỗi tiếng Việt bị cắt: đếm chuỗi thật sự cắt, không đếm chuỗi vừa khung",
    html: `
      <div style="width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Nguyễn Thị Hồng Nhung</div>
      <div style="width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Lê Văn Bảo Quốc Khánh</div>
      <!-- KHÔNG tính: có ellipsis nhưng chuỗi vừa, không cắt -->
      <div style="width:600px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Ngắn</div>`,
    expect: { truncated: 2 },
  },
  {
    name: "P5 — chữ Việt VIẾT HOA: chỉ đếm chuỗi có dấu, bỏ chuỗi không dấu",
    html: `
      <span style="text-transform:uppercase">Hình thức lớp</span>
      <span style="text-transform:uppercase">Huấn luyện viên</span>
      <!-- KHÔNG tính: không có dấu tiếng Việt -->
      <span style="text-transform:uppercase">Reformer</span>
      <!-- KHÔNG tính: không uppercase -->
      <span>Hình thức lớp</span>`,
    expect: { upperVi: 2 },
  },
  {
    name: "vùng chạm <44px — đếm control trong nội dung, LOẠI control trong nav/header/footer",
    html: `
      <button style="display:block;width:30px;height:30px">a</button>
      <button style="display:block;width:100px;height:20px">b</button>
      <a href="#" style="display:block;width:100px;height:32px">c</a>
      <!-- KHÔNG tính: đủ 44 -->
      <button style="display:block;width:60px;height:44px">ok</button>
      <!-- KHÔNG tính: link nằm trong dòng văn bản -->
      <p>xem <a href="#" style="display:inline">đây</a></p>
      <!-- KHÔNG tính: nằm trong nav / header / footer -->
      <nav><button style="display:block;width:20px;height:20px">n</button></nav>
      <header><button style="display:block;width:20px;height:20px">h</button></header>
      <footer><button style="display:block;width:20px;height:20px">f</button></footer>`,
    expect: { tapSmall: 3 },
  },
  {
    name: "cpl — chỉ đo khối văn bản thật sự xuống dòng",
    // 40 chữ 'M' ở 20px trên khung 400px → mỗi dòng khoảng 400/(20*0.5) = 40 cpl.
    html: `
      <p style="width:400px;font-size:20px;line-height:1.5;font-family:monospace">${"M ".repeat(120)}</p>
      <!-- KHÔNG tính: một dòng, không có gì để đo -->
      <p style="width:2000px;font-size:20px">${"N ".repeat(40)}</p>`,
    expect: { cplN: 1 },
  },
  {
    name: "trang trắng — mọi bộ đếm phải về 0, không phải undefined",
    html: `<div></div>`,
    expect: { cards: 0, pills: 0, shadowNodes: 0, truncated: 0, upperVi: 0, tapSmall: 0 },
  },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let pass = 0, fail = 0;
const report = [];
for (const c of CASES) {
  await page.setContent(
    `<!doctype html><html><body style="margin:0"><main>${c.html}</main></body></html>`,
  );
  await page.waitForTimeout(120);
  const got = await page.evaluate(PROBE);
  const lines = [];
  let ok = true;
  for (const [k, want] of Object.entries(c.expect)) {
    const have = got[k];
    const good = have === want;
    if (!good) ok = false;
    lines.push(`${good ? "✓" : "✗"} ${k}: kỳ vọng ${want}, đo được ${have}`);
  }
  if (ok) pass += 1;
  else fail += 1;
  report.push({ name: c.name, ok, lines });
  console.log(`\n  ${ok ? "ĐẠT " : "SAI "} ${c.name}`);
  for (const l of lines) console.log(`        ${l}`);
}

/* ── Ca cuối: gài lỗi vào chính soul-1 và xem bộ đo có bắt được không.
      Một bộ đếm không phát hiện được khuyết điểm cố tình gài vào thì nó không
      đang đo gì cả. ────────────────────────────────────────────────────── */
try {
  await page.goto("http://localhost:5188/studio/hoc-vien", { waitUntil: "domcontentloaded", timeout: 8000 });
  await page.evaluate(() => localStorage.setItem("soul:demo-role", "staff"));
  await page.goto("http://localhost:5188/studio/hoc-vien", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1600);
  const before = await page.evaluate(PROBE);
  await page.evaluate(() => {
    const host = document.querySelector("main") || document.body;
    const card = document.createElement("div");
    card.style.cssText = "border-radius:12px;background:#eee;box-shadow:0 4px 12px #0003;width:300px;height:120px";
    const pill = document.createElement("span");
    pill.style.cssText = "display:inline-block;border-radius:9999px;background:#ddd;width:70px;height:22px";
    card.appendChild(pill);
    host.appendChild(card);
  });
  await page.waitForTimeout(200);
  const after = await page.evaluate(PROBE);
  const good = after.cards === before.cards + 1 && after.pills === before.pills + 1
            && after.shadowNodes === before.shadowNodes + 1;
  if (good) pass += 1;
  else fail += 1;
  console.log(`\n  ${good ? "ĐẠT " : "SAI "} gài 1 card + 1 pill + 1 bóng vào /studio/hoc-vien đang chạy`);
  console.log(`        card ${before.cards}→${after.cards} · pill ${before.pills}→${after.pills} · bóng ${before.shadowNodes}→${after.shadowNodes}`);
  report.push({ name: "gài lỗi vào app đang chạy", ok: good,
                lines: [`card ${before.cards}→${after.cards}`, `pill ${before.pills}→${after.pills}`, `bóng ${before.shadowNodes}→${after.shadowNodes}`] });
} catch {
  console.log("\n  BỎ QUA  ca gài lỗi — cần dev server soul-1 ở :5188");
}

await browser.close();
console.log(`\n  ${pass} đạt · ${fail} sai\n`);
process.exit(fail === 0 ? 0 : 1);
