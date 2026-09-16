/**
 * TẦNG 1 — quét đo toàn bộ màn hình của hai bản Soul.
 *
 * Không có phán đoán thẩm mỹ nào trong file này. Mọi con số đều đọc trực tiếp từ
 * DOM/CSSOM hoặc từ axe-core, và chạy lại lúc nào cũng ra cùng kết quả với cùng
 * dữ liệu fixture.
 *
 *   node scripts/tang1-sweep.mjs   → ghi ../soul-tang1.json
 *
 * Cần hai dev server đang chạy: soul-1 ở :5188, soul-2 ở :5199.
 */
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { PROBE } from "./tang1-probe.mjs";

const A = "http://localhost:5188";
const B = "http://localhost:5199";
const VIEWPORT = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const SETTLE = 1300;
/** Thư mục ảnh — đặt qua SHOTS, để trống thì không chụp. */
const SHOTS = process.env.SHOTS || "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
let shotSeq = 0;

/* ── Danh sách màn hình ──────────────────────────────────────────────────
   `from` nghĩa là: mở trang danh sách đó, lấy link chi tiết đầu tiên khớp
   `match`. Không hard-code id fixture, nên sweep sống được khi fixture đổi. */

const SOUL1 = {
  public: [
    ["/", "Trang chủ"], ["/gioi-thieu", "Giới thiệu"], ["/dich-vu", "Dịch vụ"],
    ["/goi-tap", "Gói tập"], ["/huan-luyen-vien", "Huấn luyện viên"],
    ["/lich-tap", "Lịch tập"], ["/khuyen-mai", "Khuyến mãi"],
    ["/lien-he", "Liên hệ"], ["/dat-tu-van", "Đặt tư vấn"],
    ["/dang-nhap", "Đăng nhập"], ["/quen-mat-khau", "Quên mật khẩu"],
    ["/dat-lai-mat-khau", "Đặt lại mật khẩu"], ["/khong-ton-tai", "404"],
  ],
  student: [
    ["/hv", "HV · Trang đầu"], ["/hv/lop-hoc", "HV · Lớp học"],
    { from: "/hv/lop-hoc", match: "/hv/lop-hoc/", label: "HV · Chi tiết lớp" },
    ["/hv/lich-cua-toi", "HV · Lịch của tôi"], ["/hv/lich-su", "HV · Lịch sử"],
    ["/hv/goi-tap", "HV · Gói tập"], ["/hv/tai-khoan", "HV · Tài khoản"],
  ],
  trainer: [
    ["/hlv", "HLV · Trang đầu"], ["/hlv/hom-nay", "HLV · Hôm nay"],
    ["/hlv/lich-day", "HLV · Lịch dạy"],
    { from: "/hlv/lich-day", match: "/hlv/lop/", label: "HLV · Chi tiết lớp" },
    ["/hlv/ho-so", "HLV · Hồ sơ"],
  ],
  staff: [
    ["/studio", "NV · Trang đầu"], ["/studio/tong-quan", "NV · Tổng quan"],
    ["/studio/lich", "NV · Lịch lớp"],
    { from: "/studio/lich", match: "/studio/lich/", label: "NV · Chi tiết lớp" },
    ["/studio/khach-quan-tam", "NV · Khách quan tâm"],
    { from: "/studio/khach-quan-tam", match: "/studio/khach-quan-tam/", label: "NV · Chi tiết khách" },
    ["/studio/hoc-vien", "NV · Học viên"],
    { from: "/studio/hoc-vien", match: "/studio/hoc-vien/", label: "NV · Chi tiết học viên" },
    ["/studio/huan-luyen-vien", "NV · HLV"],
    { from: "/studio/huan-luyen-vien", match: "/studio/huan-luyen-vien/", label: "NV · Chi tiết HLV" },
    ["/studio/goi-tap", "NV · Gói tập"], ["/studio/thanh-toan", "NV · Thanh toán"],
    ["/studio/so-buoi?goi=sp-demo-1", "NV · Sổ buổi"], ["/studio/gia-han", "NV · Gia hạn"],
    ["/studio/bao-cao", "NV · Báo cáo"], ["/studio/bao-cao/doanh-thu", "NV · BC doanh thu"],
    ["/studio/bao-cao/lop-hoc", "NV · BC lớp học"],
    ["/studio/bao-cao/huan-luyen-vien", "NV · BC huấn luyện viên"],
    ["/studio/tai-khoan", "NV · Tài khoản"],
  ],
};

const SOUL2 = {
  public: [
    ["/", "Trang chủ"], ["/gioi-thieu", "Giới thiệu"], ["/dich-vu", "Dịch vụ"],
    ["/goi-tap", "Gói tập"], ["/doi-ngu-hlv", "Huấn luyện viên"],
    ["/lich-lop", "Lịch tập"], ["/khuyen-mai", "Khuyến mãi"],
    ["/lien-he", "Liên hệ"], ["/tu-van", "Đặt tư vấn"],
    ["/dang-nhap", "Đăng nhập"], ["/quen-mat-khau", "Quên mật khẩu"],
    ["/dat-lai-mat-khau", "Đặt lại mật khẩu"],
  ],
  student: [
    ["/hoc-vien", "HV · Trang đầu"], ["/hoc-vien/lop-hoc", "HV · Lớp học"],
    { from: "/hoc-vien/lop-hoc", match: "/hoc-vien/lop-hoc/", label: "HV · Chi tiết lớp" },
    ["/hoc-vien/lich-cua-toi", "HV · Lịch của tôi"], ["/hoc-vien/lich-su", "HV · Lịch sử"],
    ["/hoc-vien/goi-tap", "HV · Gói tập"], ["/hoc-vien/tai-khoan", "HV · Tài khoản"],
  ],
  trainer: [
    ["/hlv", "HLV · Hôm nay"], ["/hlv/lich-day", "HLV · Lịch dạy"],
    { from: "/hlv/lich-day", match: "/hlv/lop-hoc/", label: "HLV · Chi tiết lớp" },
    ["/hlv/ho-so", "HLV · Hồ sơ"],
  ],
  staff: [
    ["/quan-ly", "NV · Tổng quan"],
    ["/quan-ly/lich-lop", "NV · Lịch lớp"],
    { from: "/quan-ly/lich-lop", match: "/quan-ly/lich-lop/", label: "NV · Chi tiết lớp" },
    ["/quan-ly/khach-quan-tam", "NV · Khách quan tâm"],
    { from: "/quan-ly/khach-quan-tam", match: "/quan-ly/khach-quan-tam/", label: "NV · Chi tiết khách" },
    ["/quan-ly/hoc-vien", "NV · Học viên"],
    { from: "/quan-ly/hoc-vien", match: "/quan-ly/hoc-vien/", label: "NV · Chi tiết học viên" },
    ["/quan-ly/hlv", "NV · HLV"],
    { from: "/quan-ly/hlv", match: "/quan-ly/hlv/", label: "NV · Chi tiết HLV" },
    ["/quan-ly/goi-tap", "NV · Gói tập"], ["/quan-ly/thanh-toan", "NV · Thanh toán"],
    ["/quan-ly/so-buoi", "NV · Sổ buổi"], ["/quan-ly/gia-han", "NV · Gia hạn"],
    ["/quan-ly/bao-cao", "NV · Báo cáo"], ["/quan-ly/bao-cao/doanh-thu", "NV · BC doanh thu"],
    ["/quan-ly/bao-cao/lop-hoc", "NV · BC lớp học"],
    ["/quan-ly/bao-cao/hlv", "NV · BC huấn luyện viên"],
    ["/quan-ly/tai-khoan", "NV · Tài khoản"],
  ],
};



function slug(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 44);
}

async function measure(page, label, path, app) {
  await page.waitForTimeout(SETTLE);
  const dom = await page.evaluate(PROBE);
  let shot = null;
  if (SHOTS) {
    shot = `${app}-${String(++shotSeq).padStart(2, "0")}-${slug(label)}.png`;
    await page.screenshot({ path: `${SHOTS}/${shot}`, fullPage: true }).catch(() => { shot = null; });
  }
  let serious, contrast = 0, ids = [];
  try {
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    serious = bad.reduce((s, v) => s + v.nodes.length, 0);
    contrast = bad.filter((v) => v.id === "color-contrast").reduce((s, v) => s + v.nodes.length, 0);
    ids = bad.map((v) => `${v.id}×${v.nodes.length}`);
  } catch {
    // -1 nghĩa là không đo được, khác hẳn 0 nghĩa là không có lỗi.
    serious = -1;
  }
  // Đo lại vùng chạm ở 390px — ngưỡng 44px là ngưỡng cảm ứng, chỉ có nghĩa ở đó.
  await page.setViewportSize(MOBILE);
  await page.waitForTimeout(500);
  const m = await page.evaluate(PROBE);
  await page.setViewportSize(VIEWPORT);
  await page.waitForTimeout(300);
  return { label, path, shot, url: new URL(page.url()).pathname, ...dom, serious, contrast, axe: ids,
           tapSmall390: m.tapSmall, hScroll390: m.hScroll, cplMed390: m.cplMed };
}

/** Điều hướng trong cùng document, để state của MSW không bị reset. */
async function push(page, href) {
  await page.evaluate((h) => {
    window.history.pushState({}, "", h);
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  }, href);
}

async function sweep(page, base, entries, hard, app) {
  const out = [];
  for (const entry of entries) {
    try {
      if (Array.isArray(entry)) {
        const [path, label] = entry;
        if (hard) await page.goto(base + path, { waitUntil: "domcontentloaded" });
        else await push(page, path);
        out.push(await measure(page, label, path, app));
      } else {
        // Route chi tiết: lấy link thật từ trang danh sách.
        if (hard) await page.goto(base + entry.from, { waitUntil: "domcontentloaded" });
        else await push(page, entry.from);
        await page.waitForTimeout(SETTLE);
        const findHref = () => page.evaluate((m) => {
          const a = Array.from(document.querySelectorAll("a[href]"))
            .find((x) => (x.getAttribute("href") || "").startsWith(m) &&
                         (x.getAttribute("href") || "").length > m.length);
          return a ? a.getAttribute("href") : null;
        }, entry.match);
        let href = await findHref();
        // Lịch tuần vẽ lớp bằng <button>, không phải <a>. Bấm một ô rồi tìm lại —
        // liên kết chi tiết nằm trong hộp thoại mở ra sau cú bấm đó.
        if (!href) {
          const chip = page.locator("button[aria-pressed]").or(page.locator("li button")).first();
          if (await chip.count()) {
            await chip.click().catch(() => {});
            await page.waitForTimeout(700);
            href = await findHref();
          }
        }
        if (!href) { out.push({ label: entry.label, path: entry.match + "?", skipped: "không tìm được link chi tiết" }); continue; }
        if (hard) await page.goto(base + href, { waitUntil: "domcontentloaded" });
        else await push(page, href);
        out.push(await measure(page, entry.label, href, app));
      }
      process.stdout.write(".");
    } catch (e) {
      out.push({ label: Array.isArray(entry) ? entry[1] : entry.label, error: String(e).split("\n")[0].slice(0, 70) });
      process.stdout.write("x");
    }
  }
  return out;
}

const browser = await chromium.launch();
const results = { measuredAt: new Date().toISOString(), viewport: VIEWPORT, apps: {} };

/* ── soul-1: vai trò qua localStorage, tải cứng được vì MSW tự gieo lại ── */
{
  const rows = [];
  for (const [role, key] of [["public", null], ["student", "student"], ["trainer", "trainer"], ["staff", "staff"]]) {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await page.goto(A + "/", { waitUntil: "domcontentloaded" });
    await page.evaluate((k) => k ? localStorage.setItem("soul:demo-role", k) : localStorage.removeItem("soul:demo-role"), key);
    process.stdout.write(`\n  soul-1 ${role} `);
    rows.push(...(await sweep(page, A, SOUL1[role], true, "s1")).map((r) => ({ ...r, role })));
    await ctx.close();
  }
  results.apps["soul-1"] = rows;
}

/* ── soul-2: phải đăng nhập, và state MSW chết khi tải lại trang, nên sau
     khi đăng nhập chỉ được điều hướng trong cùng document. ────────────── */
{
  const rows = [];
  const ctx0 = await browser.newContext({ viewport: VIEWPORT });
  const p0 = await ctx0.newPage();
  process.stdout.write("\n  soul-2 public ");
  rows.push(...(await sweep(p0, B, SOUL2.public, true, "s2")).map((r) => ({ ...r, role: "public" })));
  await ctx0.close();

  for (const [role, phone, pass] of [
    ["student", "0901234567", "123456"],
    ["trainer", "0901555666", "123456"],
    ["staff", "0258123456", "admin123"],
  ]) {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await page.goto(B + "/dang-nhap", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const inputs = page.locator("input");
    await inputs.nth(0).fill(phone);
    await inputs.nth(1).fill(pass);
    await page.getByRole("button", { name: /Đăng nhập|Tiếp tục/ }).first().click();
    await page.waitForTimeout(2000);
    process.stdout.write(`\n  soul-2 ${role} `);
    rows.push(...(await sweep(page, B, SOUL2[role], false, "s2")).map((r) => ({ ...r, role })));
    await ctx.close();
  }
  results.apps["soul-2"] = rows;
}

await browser.close();
writeFileSync("/Users/loctv/Documents/soul-tang1.json", JSON.stringify(results, null, 1));
const n1 = results.apps["soul-1"].length, n2 = results.apps["soul-2"].length;
console.log(`\n\n  soul-1: ${n1} màn hình · soul-2: ${n2} màn hình`);
console.log("  → /Users/loctv/Documents/soul-tang1.json");
