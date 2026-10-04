import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { useBookClass } from "~/features/booking/queries";
import { useAdjustCredits } from "~/features/commerce/queries";
import { useMarkAttendance } from "~/features/roster/queries";
import { useCancelClass } from "~/features/schedule/use-staff-calendar";
import { bookingsApi, classesApi, packagesApi } from "./endpoints";
import { queryKeys } from "./query-keys";
import { invalidateChange } from "./invalidation";

afterEach(() => vi.restoreAllMocks());

function setup<T>(hook: () => T, keys: readonly (readonly unknown[])[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  keys.forEach((key) => client.setQueryData(key, "previous"));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(hook, { wrapper }) };
}

it("refreshes eligibility and credit summaries after a manual balance adjustment", async () => {
  vi.spyOn(packagesApi, "adjust").mockResolvedValue(
    {} as Awaited<ReturnType<typeof packagesApi.adjust>>,
  );
  const keys = [
    queryKeys.classes.bookableList({}),
    queryKeys.mySchedule.bookable({}),
    queryKeys.students.overview(1),
    queryKeys.renewals.summary(),
    queryKeys.packages.ledger(1),
  ];
  const { client, result } = setup(() => useAdjustCredits(1), keys);
  await act(async () => {
    await result.current.mutateAsync({ delta: 2, reason: "Correction" });
  });
  keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  client.clear();
});

it("refreshes seat, renewal, dashboard and public readers after booking", async () => {
  vi.spyOn(bookingsApi, "create").mockResolvedValue(
    {} as Awaited<ReturnType<typeof bookingsApi.create>>,
  );
  const keys = [
    queryKeys.bookings.roster(1),
    queryKeys.students.overview(1),
    queryKeys.reports.dashboard(),
    queryKeys.pub.schedule(7),
    queryKeys.renewals.summary(),
  ];
  const { client, result } = setup(useBookClass, keys);
  await act(async () => {
    await result.current.mutateAsync(1);
  });
  keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  client.clear();
});

it("refreshes refunds and renewal status when the studio cancels a class", async () => {
  vi.spyOn(classesApi, "cancel").mockResolvedValue(
    {} as Awaited<ReturnType<typeof classesApi.cancel>>,
  );
  const keys = [
    queryKeys.packages.ledger(1),
    queryKeys.students.overview(1),
    queryKeys.renewals.summary(),
    queryKeys.reports.dashboard(),
  ];
  const { client, result } = setup(() => useCancelClass(1), keys);
  await act(async () => {
    await result.current.mutateAsync({ reason: "Studio closed" });
  });
  keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  client.clear();
});

it("refreshes attendance reports and trainer stats after marking a booking", async () => {
  vi.spyOn(bookingsApi, "markAttendance").mockResolvedValue(
    {} as Awaited<ReturnType<typeof bookingsApi.markAttendance>>,
  );
  const keys = [
    queryKeys.classes.attendance(1),
    queryKeys.classes.trainerStats({ trainer_id: 1, year: 2026, month: 10 }),
    queryKeys.reports.classes({}),
    queryKeys.mySchedule.list({}),
  ];
  const { client, result } = setup(() => useMarkAttendance(1), keys);
  await act(async () => {
    await result.current.mutateAsync({ bookingId: 1, status: "ATTENDED" });
  });
  keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  client.clear();
});

it("waits for active dependent readers without re-fetching private photos", async () => {
  const client = new QueryClient();
  const key = queryKeys.mySchedule.bookable({});
  client.setQueryData(key, [1]);
  client.setQueryData(queryKeys.students.photoFile(1, 2), "blob:private");
  let resolve!: (value: number[]) => void;
  const read = vi.fn(
    () =>
      new Promise<number[]>((done) => {
        resolve = done;
      }),
  );
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: read,
    staleTime: Infinity,
  });
  const unsubscribe = observer.subscribe(() => {});
  let settled = false;
  const write = invalidateChange(client, "commerce").then(() => {
    settled = true;
  });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  expect(settled).toBe(false);
  resolve([1, 2]);
  await write;
  expect(client.getQueryData(key)).toEqual([1, 2]);
  expect(client.getQueryState(queryKeys.students.photoFile(1, 2))?.isInvalidated).toBe(
    false,
  );
  unsubscribe();
  client.clear();
});
