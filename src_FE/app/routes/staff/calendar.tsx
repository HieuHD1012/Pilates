import { useState } from "react";
import { Link } from "react-router";

import { ClassForm } from "~/features/schedule/class-form";
import {
  trainerNameMap,
  useCalendarSeatCounts,
  useCreateClass,
  useCreateRecurrence,
  usePreviewRecurrence,
  useStaffCalendar,
  useStudioTrainers,
} from "~/features/schedule/use-staff-calendar";
import { WeekGrid, WeekList } from "~/features/schedule/week-grid";
import { errorMessage } from "~/lib/api/client";
import type {
  ClassCreateRequest,
  ClassSessionResponse,
  ClassType,
  OccurrenceResponse,
  RecurrencePreviewResponse,
  RecurrenceRequest,
} from "~/lib/api/schema";
import {
  addDays,
  formatDate,
  formatTime,
  formatTimeRange,
  startOfStudioWeek,
  studioDateKey,
  weekdayLong,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import {
  EmptyState,
  ErrorState,
  LiveRegion,
  RefreshingRule,
  SkeletonRows,
} from "~/ui/feedback";
import { Field, Select } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { FilterBar, PageHeader } from "~/ui/layout";
import { CapacityMeter, StatusBadge } from "~/ui/status";

import type { Route } from "./+types/calendar";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Lịch & lớp học — Soul Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

/**
 * REFERENCE B — the canonical operational screen.
 *
 * What it establishes for every screen that follows: the workspace frame, the
 * filter row sitting on a rule above its data, the week grid, the status
 * vocabulary, and how brand translates into software that someone uses for
 * eight hours (quietly, and out of the way).
 */
export default function StaffCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfStudioWeek(new Date()));
  const [classType, setClassType] = useState<ClassType | "all">("all");
  const [trainerId, setTrainerId] = useState<number | "all">("all");
  const [selected, setSelected] = useState<ClassSessionResponse | null>(null);
  const [creating, setCreating] = useState<"single" | "recurring" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The recurrence being previewed, held until staff accept or discard it. */
  const [pattern, setPattern] = useState<{
    request: RecurrenceRequest;
    preview: RecurrencePreviewResponse;
  } | null>(null);
  const create = useCreateClass();
  const preview = usePreviewRecurrence();
  const createRecurrence = useCreateRecurrence();

  const today = studioDateKey(new Date());
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const filters = {
    from: weekStart,
    to: addDays(weekStart, 6),
    classType,
    trainerId,
  };
  const trainers = useStudioTrainers();
  const query = useStaffCalendar(filters);
  // Occupancy is a second query: `GET /classes` carries capacity, not seats
  // taken, and counting held bookings over the same week is what the backend's
  // own `booked_count` does.
  const seatCounts = useCalendarSeatCounts(filters);

  const items = query.data ?? [];
  const seats = seatCounts.data;
  const trainerNames = trainerNameMap(trainers.data);
  const fullCount = items.filter(
    (item) => (seats?.get(item.id) ?? 0) >= item.capacity,
  ).length;
  const bookedTotal = [...(seats?.values() ?? [])].reduce((sum, n) => sum + n, 0);
  const capacityTotal = items.reduce((sum, item) => sum + item.capacity, 0);

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Lịch & lớp học"
        description="Toàn bộ lớp trong tuần, theo huấn luyện viên và hình thức lớp."
        actions={
          <>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setCreating("single")}>
                Thêm lớp
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCreating("recurring")}
              >
                Lớp định kỳ
              </Button>
            </div>
            <div className="flex gap-2">
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
            </div>
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
                  {formatDate(`${addDays(weekStart, 6)}T00:00:00+07:00`)}
                </Figures>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Số lớp</dt>
              <dd>
                <Figures className="text-ink">{items.length}</Figures>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Lượt đăng ký</dt>
              <dd>
                <Figures className="text-ink">
                  {bookedTotal}/{capacityTotal}
                </Figures>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Lớp đủ chỗ</dt>
              <dd>
                <Figures className={fullCount > 0 ? "text-lacquer" : "text-ink"}>
                  {fullCount}
                </Figures>
              </dd>
            </div>
          </dl>
        }
      />

      <FilterBar
        trailing={
          <span className="text-ink-2 text-xs">
            {query.isFetching && !query.isPending ? "Đang cập nhật" : null}
          </span>
        }
      >
        <Field label="Hình thức lớp" className="w-44">
          {({ id }) => (
            <Select
              id={id}
              value={classType}
              onChange={(event) => setClassType(event.target.value as ClassType | "all")}
            >
              <option value="all">Tất cả</option>
              <option value="GROUP">Lớp nhóm</option>
              <option value="PRIVATE">Lớp riêng</option>
            </Select>
          )}
        </Field>

        <Field label="Huấn luyện viên" className="w-56">
          {({ id }) => (
            <Select
              id={id}
              value={trainerId === "all" ? "all" : String(trainerId)}
              onChange={(event) =>
                setTrainerId(
                  event.target.value === "all" ? "all" : Number(event.target.value),
                )
              }
              disabled={trainers.isPending}
            >
              <option value="all">Tất cả</option>
              {(trainers.data ?? []).map((trainer) => (
                <option key={trainer.id} value={String(trainer.id)}>
                  {trainer.full_name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FilterBar>

      <RefreshingRule active={query.isFetching && !query.isPending} />

      {query.isPending ? <SkeletonRows rows={6} /> : null}

      {query.isError ? (
        <ErrorState
          description="Không tải được lịch lớp của tuần này."
          detail={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title="Không có lớp nào khớp bộ lọc"
          description="Tuần này chưa có lớp, hoặc bộ lọc đang thu hẹp kết quả. Thử bỏ bớt bộ lọc hoặc chuyển sang tuần khác."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setClassType("all");
                setTrainerId("all");
              }}
            >
              Bỏ bộ lọc
            </Button>
          }
        />
      ) : null}

      {query.isSuccess && items.length > 0 ? (
        <>
          <div className="hidden lg:block">
            <WeekGrid
              days={days}
              items={items}
              today={today}
              onSelect={setSelected}
              selectedId={selected?.id ?? null}
              trainerNames={trainerNames}
              seats={seats}
            />
          </div>
          <div className="lg:hidden">
            <WeekList
              days={days}
              items={items}
              today={today}
              onSelect={setSelected}
              trainerNames={trainerNames}
              seats={seats}
            />
          </div>
        </>
      ) : null}

      <ClassDetailDialog
        item={selected}
        trainerNames={trainerNames}
        seats={seats}
        onClose={() => setSelected(null)}
      />

      <LiveRegion message={notice} />

      <Dialog
        open={creating !== null}
        onOpenChange={(next) => {
          if (!next) {
            create.reset();
            preview.reset();
            setCreating(null);
          }
        }}
      >
        <DialogContent
          title={creating === "recurring" ? "Lớp định kỳ" : "Thêm lớp"}
          description={
            creating === "recurring"
              ? "Một mẫu lặp hàng tuần. Bước sau cho xem trước từng buổi và những buổi trùng lịch huấn luyện viên."
              : "Buổi tập mới, chưa có ai đăng ký. Trùng giờ huấn luyện viên sẽ bị từ chối."
          }
        >
          <ClassForm
            key={creating ?? "closed"}
            trainers={trainers.data ?? []}
            recurring={creating === "recurring"}
            /* Prefilled with a day inside the week on screen, so scheduling three
               classes for one week is not typing the date three times — and never
               with a date the person is not looking at. */
            defaultValues={{
              date: days.includes(today) ? today : weekStart,
              capacity: "6",
            }}
            submitLabel={creating === "recurring" ? "Xem trước" : "Thêm lớp"}
            pending={create.isPending || preview.isPending}
            error={creating === "recurring" ? preview.error : create.error}
            onCancel={() => setCreating(null)}
            onSubmit={async (input) => {
              if (creating === "recurring") {
                // Preview first, always. The create is all-or-nothing, so
                // seeing which occurrences clash before committing is the
                // difference between a considered decision and a 409.
                const request = input as RecurrenceRequest;
                const result = await preview.mutateAsync(request);
                setCreating(null);
                setPattern({ request, preview: result });
                return result;
              }
              const created = await create.mutateAsync(input as ClassCreateRequest);
              setCreating(null);
              setNotice(
                `Đã thêm lớp ${weekdayLong(created.starts_at)} ${formatTime(created.starts_at)}.`,
              );
              return created;
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={pattern !== null}
        onOpenChange={(next) => {
          if (!next) {
            createRecurrence.reset();
            setPattern(null);
          }
        }}
      >
        <DialogContent
          title="Xem trước lịch lặp"
          description="Những buổi sẽ được tạo. Buổi trùng lịch huấn luyện viên được đánh dấu và sẽ bị bỏ qua."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setPattern(null)}>
                Quay lại
              </Button>
              <Button
                size="sm"
                pending={createRecurrence.isPending}
                disabled={(pattern?.preview.available_count ?? 0) === 0}
                onClick={() => {
                  if (pattern === null) return;
                  createRecurrence
                    .mutateAsync(pattern.request)
                    .then((result) => {
                      setPattern(null);
                      setNotice(`Đã tạo ${result.sessions.length} buổi.`);
                    })
                    .catch(() => {});
                }}
              >
                Tạo {pattern?.preview.available_count ?? 0} buổi
              </Button>
            </>
          }
        >
          <p className="text-ink-2 text-xs">
            <Figures className="text-ink">{pattern?.preview.available_count ?? 0}</Figures>{" "}
            buổi tạo được ·{" "}
            <Figures className="text-ink">{pattern?.preview.conflict_count ?? 0}</Figures>{" "}
            buổi trùng lịch
          </p>

          {createRecurrence.isError ? (
            <p role="alert" className="text-danger mt-3 text-sm">
              {/* A slot taken between the preview and the commit rolls the whole
                  group back, rather than leaving a half-written pattern. */}
              {errorMessage(
                createRecurrence.error,
                "Chưa tạo được lịch lặp. Có buổi vừa bị chiếm chỗ — xem lại rồi thử lại.",
              )}
            </p>
          ) : null}

          <ul className="rule-t mt-3 max-h-80 overflow-y-auto">
            {(pattern?.preview.occurrences ?? []).map((occurrence) => (
              <OccurrenceRow key={occurrence.starts_at} occurrence={occurrence} />
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OccurrenceRow({ occurrence }: { occurrence: OccurrenceResponse }) {
  return (
    <li className="rule-b flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
      <span className="text-ink text-sm">
        {weekdayLong(occurrence.starts_at)},{" "}
        <Figures>{formatDate(occurrence.starts_at)}</Figures>{" "}
        <Figures className="text-ink-2">
          {formatTimeRange(occurrence.starts_at, occurrence.ends_at)}
        </Figures>
      </span>
      {occurrence.conflict === null ? (
        <StatusBadge tone="positive">Tạo được</StatusBadge>
      ) : (
        <span className="text-ink-2 text-xs">Trùng lịch — bỏ qua</span>
      )}
    </li>
  );
}

function ClassDetailDialog({
  item,
  trainerNames,
  seats,
  onClose,
}: {
  item: ClassSessionResponse | null;
  trainerNames: Map<number, string>;
  seats: Map<number, number> | undefined;
  onClose: () => void;
}) {
  const taken = item === null ? undefined : seats?.get(item.id);

  return (
    <Dialog open={item !== null} onOpenChange={(open) => (open ? null : onClose())}>
      {item ? (
        <DialogContent
          title={item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
          description={`${weekdayLong(item.starts_at)}, ${formatDate(item.starts_at)}`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Đóng
              </Button>
              <Button asChild size="sm">
                <Link to={`/studio/lich/${item.id}`}>Mở lớp</Link>
              </Button>
            </>
          }
        >
          <dl className="text-sm">
            <Row label="Giờ">
              <Figures>{formatTimeRange(item.starts_at, item.ends_at)}</Figures>
            </Row>
            <Row label="Hình thức">
              {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
            </Row>
            <Row label="Huấn luyện viên">
              {trainerNames.get(item.trainer_id) ?? `HLV #${item.trainer_id}`}
            </Row>
            <Row label="Sức chứa">
              {taken === undefined ? (
                <Figures>{item.capacity} chỗ</Figures>
              ) : (
                <CapacityMeter booked={taken} capacity={item.capacity} />
              )}
            </Row>
            <Row label="Trạng thái">
              {item.status === "CANCELLED" ? (
                <StatusBadge tone="critical">Đã hủy</StatusBadge>
              ) : taken !== undefined && taken >= item.capacity ? (
                <StatusBadge tone="attention">Đủ chỗ</StatusBadge>
              ) : (
                <StatusBadge tone="positive">Còn chỗ</StatusBadge>
              )}
            </Row>
          </dl>

          <p className="rule-t text-ink-2 mt-4 pt-3 text-xs">
            Danh sách học viên, đổi huấn luyện viên và hủy lớp nằm ở màn hình chi tiết lớp.
            Giờ và sức chứa của một buổi đã xếp thì không sửa được — studio tạo và hủy,
            không dời.
          </p>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rule-b grid grid-cols-[7.5rem_1fr] items-center gap-3 py-2.5 last:border-b-0">
      <dt className="text-ink-2 text-xs">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
