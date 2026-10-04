import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { bookingsApi, classesApi } from "~/lib/api/endpoints";
import { useCalendarSeatCounts } from "./use-staff-calendar";

afterEach(() => vi.restoreAllMocks());

it("does not undercount a class when its bookings fall beyond the weekly API cap", async () => {
  vi.spyOn(bookingsApi, "list").mockResolvedValue(
    Array.from({ length: 500 }, (_, id) => ({ id, class_session_id: 1 })) as Awaited<
      ReturnType<typeof bookingsApi.list>
    >,
  );
  vi.spyOn(classesApi, "list").mockResolvedValue([{ id: 1 }, { id: 2 }] as Awaited<
    ReturnType<typeof classesApi.list>
  >);
  const detail = vi
    .spyOn(classesApi, "get")
    .mockImplementation(
      async (id) =>
        ({ id, booked_count: id === 1 ? 500 : 4 }) as Awaited<
          ReturnType<typeof classesApi.get>
        >,
    );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(
    () => useCalendarSeatCounts({ from: "2026-10-05", to: "2026-10-11" }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.get(2)).toBe(4);
  expect(detail).toHaveBeenCalledTimes(2);
  unmount();
  client.clear();
});
