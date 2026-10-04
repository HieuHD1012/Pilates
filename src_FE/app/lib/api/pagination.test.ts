import { expect, it, vi } from "vitest";

import { collectPages } from "./pagination";

it("includes records beyond the first page and stops at a partial page", async () => {
  const rows = Array.from({ length: 417 }, (_, id) => ({ id }));
  const read = vi.fn(async ({ limit, offset }) => rows.slice(offset, offset + limit));
  expect(await collectPages(read)).toEqual(rows);
  expect(read.mock.calls.map(([page]) => page.offset)).toEqual([0, 200, 400]);
});

it("probes the page after an exact multiple rather than dropping the last record", async () => {
  const read = vi.fn().mockResolvedValueOnce([1, 2]).mockResolvedValueOnce([]);
  expect(await collectPages(read, 2)).toEqual([1, 2]);
  expect(read).toHaveBeenCalledTimes(2);
});
