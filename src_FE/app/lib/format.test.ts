import { describe, expect, it } from "vitest";

import {
  addDays,
  formatDate,
  formatLeadTime,
  formatNumber,
  formatPhone,
  formatSigned,
  formatTime,
  formatTimeRange,
  formatVnd,
  minutesBetween,
  startOfStudioWeek,
  studioDateKey,
  weekdayLong,
  weekdayShort,
} from "./format";

/**
 * Formatting is where a Vietnamese product quietly turns American. These tests
 * pin the studio's timezone and locale conventions rather than the browser's.
 */
describe("formatting", () => {
  it("formats VND without decimals", () => {
    expect(formatVnd(1_250_000)).toContain("1.250.000");
  });

  it("renders times in the studio timezone regardless of the host zone", () => {
    // 23:30 UTC is 06:30 the next day in Asia/Ho_Chi_Minh.
    expect(formatTime("2026-08-17T23:30:00Z")).toBe("06:30");
  });

  it("joins a time range with an en dash", () => {
    const range = formatTimeRange("2026-08-18T06:30:00+07:00", "2026-08-18T07:20:00+07:00");
    expect(range).toContain("06:30");
    expect(range).toContain("07:20");
    expect(range).toContain("–");
  });

  it("formats dates as dd/MM/yyyy", () => {
    expect(formatDate("2026-08-18T06:30:00+07:00")).toBe("18/08/2026");
  });

  it("names weekdays in Vietnamese, computed in the studio zone", () => {
    expect(weekdayShort("2026-08-18T06:30:00+07:00")).toBe("T3");
    expect(weekdayLong("2026-08-18T06:30:00+07:00")).toBe("Thứ ba");
    // 18:00 UTC Sunday is already Monday in Nha Trang.
    expect(weekdayShort("2026-08-16T18:00:00Z")).toBe("T2");
  });

  it("starts the week on Monday", () => {
    expect(startOfStudioWeek("2026-08-18T06:30:00+07:00")).toBe("2026-08-17");
    expect(startOfStudioWeek("2026-08-17T06:30:00+07:00")).toBe("2026-08-17");
    expect(startOfStudioWeek("2026-08-23T06:30:00+07:00")).toBe("2026-08-17");
  });

  it("adds days across a month boundary", () => {
    expect(addDays("2026-08-30", 3)).toBe("2026-09-02");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("derives the studio date key from an instant", () => {
    // 17:30 UTC is 00:30 the following day in Nha Trang.
    expect(studioDateKey("2026-08-18T17:30:00Z")).toBe("2026-08-19");
  });

  it("measures class duration in minutes", () => {
    expect(minutesBetween("2026-08-18T06:30:00+07:00", "2026-08-18T07:20:00+07:00")).toBe(
      50,
    );
  });

  it("reports lead time in Vietnamese and floors at zero", () => {
    const now = new Date("2026-08-18T06:00:00+07:00");
    expect(formatLeadTime("2026-08-18T06:30:00+07:00", now)).toBe("30 phút");
    expect(formatLeadTime("2026-08-18T10:00:00+07:00", now)).toBe("4 giờ");
    expect(formatLeadTime("2026-08-18T10:15:00+07:00", now)).toBe("4 giờ 15 phút");
    expect(formatLeadTime("2026-08-21T06:00:00+07:00", now)).toBe("3 ngày");
    expect(formatLeadTime("2026-08-18T05:00:00+07:00", now)).toBe("đã qua");
  });
});

describe("formatPhone", () => {
  it("groups a ten-digit local mobile 4-3-3", () => {
    expect(formatPhone("0911000001")).toBe("0911 000 001");
  });

  it("normalises the +84 form to the local form", () => {
    expect(formatPhone("+84911000001")).toBe("0911 000 001");
    expect(formatPhone("84911000001")).toBe("0911 000 001");
  });

  it("regroups a number that was already spaced, rather than doubling spaces", () => {
    expect(formatPhone("0900 000 001")).toBe("0900 000 001");
    expect(formatPhone("0900.000.001")).toBe("0900 000 001");
  });

  it("leaves anything it does not recognise exactly as recorded", () => {
    // A landline, a typo and an international number must not be dressed up to
    // look official when they are not the expected shape.
    expect(formatPhone("02583123456")).toBe("02583123456");
    expect(formatPhone("091100")).toBe("091100");
    expect(formatPhone("+1 415 555 0100")).toBe("+1 415 555 0100");
  });
});

describe("formatSigned", () => {
  it("uses a real minus sign, not the hyphen Intl emits", () => {
    // U+2212. In the display serif a hyphen is narrower than the digits it sits
    // beside, which breaks the column it is meant to align.
    expect(formatSigned(-4)).toBe("\u22124");
    expect(formatSigned(-4)).not.toContain("-");
    // The same rule for a plain number: this is a typeface decision, not a
    // ledger one, so every negative the product prints gets it.
    expect(formatNumber(-4)).toBe("\u22124");
  });

  it("carries an explicit plus, so a change is never read as a total", () => {
    expect(formatSigned(10)).toBe("+10");
  });

  it("writes zero without a sign", () => {
    expect(formatSigned(0)).toBe("0");
  });
});
