import { expect, it } from "vitest";
import { historyMonthParams } from "./history-range";

it("bounds December history across the year in the studio timezone", () => {
  expect(historyMonthParams("2026-12")).toEqual({
    starts_from: "2026-12-01T00:00:00+07:00",
    starts_to: "2027-01-01T00:00:00+07:00",
  });
  expect(historyMonthParams("2024-02")?.starts_to).toBe("2024-03-01T00:00:00+07:00");
  expect(historyMonthParams("")).toBeNull();
  expect(historyMonthParams("2026-13")).toBeNull();
});
