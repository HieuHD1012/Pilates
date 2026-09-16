/**
 * Hàm đo của tầng 1 — một định nghĩa duy nhất.
 *
 * Tách khỏi bộ quét để `tang1-verify.mjs` chạy nó trên trang mẫu có số đã biết
 * trước. Nếu bài test và bản quét dùng hai bản sao khác nhau thì bài test không
 * chứng minh được gì về bản quét.
 *
 * Hàm này chạy trong trang qua page.evaluate, nên không được tham chiếu bất kỳ
 * thứ gì ngoài phạm vi của chính nó.
 */
export const PROBE = () => {
  const scope = document.querySelector("main") || document.body;
  const pool = Array.from(scope.querySelectorAll("*"))
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });

  const radii = new Set(), shadows = new Set(), colors = new Set(),
        sizes = new Set(), weights = new Set(), families = new Set();
  let cards = 0, pills = 0, shadowNodes = 0, truncated = 0, upperVi = 0, tapSmall = 0;

  const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

  for (const e of pool) {
    const cs = getComputedStyle(e);
    const box = e.getBoundingClientRect();
    const rad = parseFloat(cs.borderRadius) || 0;

    if (cs.borderRadius && cs.borderRadius !== "0px") radii.add(cs.borderRadius);
    if (cs.boxShadow && cs.boxShadow !== "none") { shadows.add(cs.boxShadow); shadowNodes += 1; }
    colors.add(cs.color);
    sizes.add(cs.fontSize);
    weights.add(cs.fontWeight);
    families.add(cs.fontFamily.split(",")[0].replace(/["']/g, "").trim());

    const hasSurface = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.borderStyle !== "none";
    if (rad >= 6 && box.width > 120 && box.height > 60 && hasSurface) cards += 1;
    if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && box.width > 24 && box.width < 220 &&
        (rad >= 9999 || (rad > 0 && box.height <= 34 && rad >= box.height / 2 - 1))) pills += 1;

    // P5 — chuỗi tiếng Việt bị cắt, hoặc bị viết hoa toàn bộ.
    const t = (e.textContent || "").trim();
    if (cs.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1) truncated += 1;
    if (cs.textTransform === "uppercase" && VI.test(t) && t.length > 1 &&
        e.children.length === 0) upperVi += 1;
  }

  /* Vùng chạm: chỉ control độc lập trong vùng nội dung. Thanh điều hướng bị loại
     — nó chỉ tồn tại ở desktop, nơi ngưỡng 44px không áp dụng, và tính nó vào sẽ
     phạt oan app nào có rail cố định. Xem thêm `tapSmall` ở viewport 390. */
  for (const e of scope.querySelectorAll("button, a, input, select, [role='button'], [role='tab']")) {
    if (e.closest("nav, [role='navigation'], header, footer")) continue;
    const box = e.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (getComputedStyle(e).display === "inline") continue;
    if (Math.min(box.width, box.height) < 44) tapSmall += 1;
  }

  // Độ dài dòng: chỉ khối văn bản thật sự xuống dòng.
  const cpls = [];
  for (const e of scope.querySelectorAll("p, li, dd, span, td")) {
    if (e.children.length > 0) continue;
    const t = (e.textContent || "").trim();
    if (t.length < 60) continue;
    const range = document.createRange();
    range.selectNodeContents(e);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 1);
    if (rects.length < 2) continue;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    cpls.push(Math.round(Math.max(...rects.map((r) => r.width)) / (fs * 0.5)));
  }
  cpls.sort((a, b) => a - b);

  return {
    nodes: pool.length,
    text: (scope.innerText || "").replace(/\s+/g, " ").trim().length,
    cards, pills, shadowNodes, shadowKinds: shadows.size,
    radii: radii.size, sizes: sizes.size, weights: weights.size,
    colors: colors.size, families: [...families].filter(Boolean),
    truncated, upperVi, tapSmall,
    cplN: cpls.length,
    cplMed: cpls.length ? cpls[Math.floor(cpls.length / 2)] : null,
    cplMax: cpls.length ? cpls[cpls.length - 1] : null,
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    title: document.title || "",
    h1: document.querySelectorAll("h1").length,
  };
};
