import { useTrainerSchedule } from "~/features/schedule/use-staff-calendar";
import { formatDate, formatTimeRange, studioDateKey, weekdayLong } from "~/lib/format";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";

import type { Route } from "./+types/today";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Hôm nay — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

export default function TrainerToday() {
  const today = studioDateKey(new Date());
  const query = useTrainerSchedule(today, today);

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
                    {formatTimeRange(item.starts_at, item.ends_at)}
                  </Figures>
                  <p className="text-ink mt-1 text-sm">
                    {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                  </p>
                  {item.status === "CANCELLED" ? (
                    <p className="text-danger mt-0.5 text-xs">Lớp đã hủy</p>
                  ) : null}
                </div>
                {/* Capacity, not occupancy: `GET /classes/my-schedule` carries
                    the seats a class has, and a trainer cannot read the
                    bookings list that would say how many are taken. The roster
                    on the class itself answers that. */}
                <Figures className="text-ink-2 shrink-0 text-sm">
                  {item.capacity} chỗ
                </Figures>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
