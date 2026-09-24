import { useState } from "react";
import { useNavigate } from "react-router";

import { useTrainerSchedule } from "~/features/schedule/use-staff-calendar";
import { WeekGrid, WeekList } from "~/features/schedule/week-grid";
import type { ClassSessionResponse } from "~/lib/api/schema";
import { addDays, formatDate, startOfStudioWeek, studioDateKey } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/schedule";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Lịch dạy — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The trainer's own teaching week.
 *
 * Same week as Reference B, one subject narrower: this is the trainer's
 * assignment, so there is no trainer filter and no class-type filter to add —
 * `GET /classes/my-schedule` is already pinned to the signed-in trainer. Selecting a
 * class opens the roster route rather than a dialog: a trainer between classes
 * wants a page they can keep open, refresh and hand around, not a layer that
 * closes when they tap the wrong pixel.
 */
export default function TrainerSchedule() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfStudioWeek(new Date()));

  const weekEnd = addDays(weekStart, 6);
  const today = studioDateKey(new Date());
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const query = useTrainerSchedule(weekStart, weekEnd);

  const items = query.data;
  const seatsTotal = items?.reduce((sum, item) => sum + item.capacity, 0);

  // `GET /classes` carries the trainer's own id and nothing else about them.
  // On this screen every class is theirs, so the map has one entry.
  const trainerNames = new Map(
    (items ?? []).map((item) => [item.trainer_id, "Bạn"] as const),
  );

  const openClass = (item: ClassSessionResponse) => {
    void navigate(`/hlv/lop/${item.id}`);
  };

  return (
    <div className="gutter mx-auto max-w-(--container-page) py-5">
      <PageHeader
        title="Lịch dạy"
        description="Tuần dạy của bạn. Chọn một lớp để xem danh sách học viên."
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              Tuần trước
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setWeekStart(startOfStudioWeek(new Date()))}
            >
              Tuần này
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              Tuần sau
            </Button>
          </>
        }
        meta={
          <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
            <div className="flex items-baseline gap-2">
              <dt>Tuần</dt>
              <dd>
                <Figures className="text-ink">
                  {formatDate(`${weekStart}T00:00:00+07:00`)}
                </Figures>
                <span className="mx-1">–</span>
                <Figures className="text-ink">
                  {formatDate(`${weekEnd}T00:00:00+07:00`)}
                </Figures>
              </dd>
            </div>
            {/* The counts appear once they are known. A zero while the week is
                still loading is a number the trainer would read as an answer. */}
            {items ? (
              <>
                <div className="flex items-baseline gap-2">
                  <dt>Số lớp</dt>
                  <dd>
                    <Figures className="text-ink">{items.length}</Figures>
                  </dd>
                </div>
                {/* Seats offered, not seats taken. A trainer cannot read the
                    bookings list, so an occupancy figure here would be a
                    number with nothing behind it. */}
                <div className="flex items-baseline gap-2">
                  <dt>Số chỗ</dt>
                  <dd>
                    <Figures className="text-ink">{seatsTotal}</Figures>
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        }
      />

      <DemoDataNotice className="mt-4 mb-3" />

      <QueryBoundary
        query={query}
        skeletonRows={6}
        errorDescription="Không tải được lịch dạy của tuần này."
        emptyTitle="Tuần này bạn không có lớp"
        emptyDescription="Không có buổi nào được phân công cho bạn trong tuần này."
        emptyAction={
          <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Xem tuần sau
          </Button>
        }
      >
        {(sessions) => (
          <>
            <div className="hidden lg:block">
              <WeekGrid
                days={days}
                items={sessions}
                today={today}
                onSelect={openClass}
                selectedId={null}
                trainerNames={trainerNames}
              />
            </div>
            <div className="lg:hidden">
              <WeekList
                days={days}
                items={sessions}
                today={today}
                onSelect={openClass}
                trainerNames={trainerNames}
              />
            </div>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
