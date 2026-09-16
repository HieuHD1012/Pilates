import { useQuery } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type { ClassSession } from "~/lib/api/types";
import { formatDate, formatTimeRange, studioDateKey, weekdayLong } from "~/lib/format";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { CapacityMeter } from "~/ui/status";

import type { Route } from "./+types/today";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Hôm nay — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

export default function TrainerToday() {
  const today = studioDateKey(new Date());
  const query = useQuery({
    queryKey: queryKeys.trainer.schedule(today, today),
    queryFn: () =>
      api.get<{ items: ClassSession[] }>("/trainer/schedule", {
        searchParams: { from: today, to: today },
      }),
    select: (data) => data.items,
    staleTime: 15_000,
  });

  const items = query.data ?? [];

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <p className="label-micro">
        {weekdayLong(`${today}T00:00:00+07:00`)} · {formatDate(`${today}T00:00:00+07:00`)}
      </p>
      <h1 className="text-ink mt-2 text-xl font-medium">Lịch dạy hôm nay</h1>

      <div className="mt-6">
        {query.isPending ? <SkeletonRows rows={3} /> : null}

        {query.isError ? (
          <ErrorState
            description="Không tải được lịch dạy hôm nay."
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {query.isSuccess && items.length === 0 ? (
          <EmptyState
            title="Hôm nay bạn không có lớp"
            description="Không có buổi nào được phân công cho bạn trong ngày hôm nay."
          />
        ) : null}

        {query.isSuccess && items.length > 0 ? (
          <ul className="rule-t">
            {items.map((item) => (
              <li
                key={item.id}
                className="rule-b flex items-start justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <Figures className="text-ink block text-base">
                    {formatTimeRange(item.startsAt, item.endsAt)}
                  </Figures>
                  <p className="text-ink mt-1 text-sm">{item.title}</p>
                  <p className="text-ink-2 mt-0.5 text-xs">
                    {item.type === "private" ? "Lớp riêng" : "Lớp nhóm"}
                    {item.room ? ` · ${item.room}` : ""}
                  </p>
                </div>
                <CapacityMeter booked={item.bookedCount} capacity={item.capacity} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
