import { expect, it } from "vitest";
import { historyMonthParams, shiftMonth } from "./history-range";

it("bounds December history across the year in the studio timezone", () => {
  expect(historyMonthParams("2026-12")).toEqual({
    starts_from: "2026-12-01T00:00:00+07:00",
    starts_to: "2027-01-01T00:00:00+07:00",
  });
  expect(historyMonthParams("2024-02")?.starts_to).toBe("2024-03-01T00:00:00+07:00");
  expect(historyMonthParams("")).toBeNull();
  expect(historyMonthParams("2026-13")).toBeNull();
});

it("steps months across the year boundary both ways", () => {
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2026-10", -1)).toBe("2026-09");
});
