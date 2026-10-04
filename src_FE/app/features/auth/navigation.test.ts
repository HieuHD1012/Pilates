import { expect, it } from "vitest";

import { safeReturnPath } from "./navigation";

it.each([
  "//outside.test",
  "/\\outside.test",
  "/\n/outside.test",
  "https://outside.test",
  null,
])("rejects an unsafe return path %s", (value) => {
  expect(safeReturnPath(value)).toBeNull();
});
it("keeps a private deep link and query intact", () => {
  expect(safeReturnPath("/hv/lop-hoc/12?from=lich")).toBe("/hv/lop-hoc/12?from=lich");
});
