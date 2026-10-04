import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

import { myScheduleApi } from "~/lib/api/endpoints";
import { ApiError } from "~/lib/api/client";
import { useBookableIds } from "./queries";

it("treats capped eligibility as incomplete instead of claiming every omitted class is ineligible", async () => {
  const read = vi
    .spyOn(myScheduleApi, "bookable")
    .mockResolvedValue(Array.from({ length: 300 }, (_, id) => id + 1));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(useBookableIds, { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeInstanceOf(ApiError);
  expect(result.current.error).toMatchObject({ code: "result_limit_reached" });
  expect(result.current.data).toBeUndefined();
  unmount();
  client.clear();
  read.mockRestore();
});
