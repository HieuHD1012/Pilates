import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

/**
 * The three things that decide whether the studio can actually open the file.
 */
describe("toCsv", () => {
  it("starts with a byte-order mark so Excel reads it as UTF-8", () => {
    const csv = toCsv(["Tên"], [["Nguyễn Thị Hồng"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Nguyễn Thị Hồng");
  });

  it("separates with semicolons, which is what Excel expects here", () => {
    const csv = toCsv(["a", "b"], [[1, 2]]);
    expect(csv).toContain("a;b");
    expect(csv).toContain("1;2");
  });

  it("quotes a cell containing the delimiter, a quote or a newline", () => {
    const csv = toCsv(["x"], [['Lớp "Reformer"; sáng']]);
    expect(csv).toContain('"Lớp ""Reformer""; sáng"');
  });

  it("neutralises a cell Excel would run as a formula", () => {
    // Not paranoia: a class note beginning with "=" would otherwise execute.
    const csv = toCsv(["note"], [["=1+1"]]);
    expect(csv).toContain("\t=1+1");
    expect(csv).not.toMatch(/(?<!\t)=1\+1/);
  });

  it("writes an empty cell for a missing value rather than 'null'", () => {
    const csv = toCsv(["a", "b"], [[null, undefined]]);
    expect(csv).toContain(";");
    expect(csv).not.toContain("null");
    expect(csv).not.toContain("undefined");
  });

  it("ends every line with CRLF", () => {
    expect(toCsv(["a"], [["b"]])).toBe("﻿a\r\nb\r\n");
  });
});
