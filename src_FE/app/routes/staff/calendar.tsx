import { useState } from "react";
import { Link } from "react-router";

import { ClassForm } from "~/features/schedule/class-form";
import {
  useCreateClass,
  useCreateRecurringClasses,
  useStaffCalendar,
  useStaffTrainers,
} from "~/features/schedule/use-staff-calendar";
import { WeekGrid, WeekList } from "~/features/schedule/week-grid";
import type {
  ClassSession,
  ClassType,
  RecurringClassInput,
  SkippedOccurrence,
} from "~/lib/api/types";
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
import { DemoDataNotice } from "~/ui/demo-data-notice";
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
  const [type, setType] = useState<ClassType | "all">("all");
  const [trainerId, setTrainerId] = useState<string>("all");
  const [selected, setSelected] = useState<ClassSession | null>(null);
  const [creating, setCreating] = useState<"single" | "recurring" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<SkippedOccurrence[] | null>(null);
  const create = useCreateClass();
  const createRecurring = useCreateRecurringClasses();

  const today = studioDateKey(new Date());
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const trainers = useStaffTrainers();
  const query = useStaffCalendar({
    from: weekStart,
    to: addDays(weekStart, 6),
    type,
    trainerId,
  });

  const items = query.data ?? [];
  const fullCount = items.filter((item) => item.bookedCount >= item.capacity).length;
  const bookedTotal = items.reduce((sum, item) => sum + item.bookedCount, 0);
  const capacityTotal = items.reduce((sum, item) => sum + item.capacity, 0);

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Lịch & lớp học"
        description="Toàn bộ lớp trong tuần, theo huấn luyện viên và hình thức lớp."
        actions={
          <>
            <Button size="sm" onClick={() => setCreating("single")}>
              Thêm lớp
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCreating("recurring")}>
              Lớp định kỳ
            </Button>
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
              value={type}
              onChange={(event) => setType(event.target.value as ClassType | "all")}
            >
              <option value="all">Tất cả</option>
              <option value="group">Lớp nhóm</option>
              <option value="private">Lớp riêng</option>
            </Select>
          )}
        </Field>

        <Field label="Huấn luyện viên" className="w-56">
          {({ id }) => (
            <Select
              id={id}
              value={trainerId}
              onChange={(event) => setTrainerId(event.target.value)}
              disabled={trainers.isPending}
            >
              <option value="all">Tất cả</option>
              {(trainers.data ?? []).map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.fullName}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FilterBar>

      <DemoDataNotice className="mb-3" />
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
                setType("all");
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
            />
          </div>
          <div className="lg:hidden">
            <WeekList days={days} items={items} today={today} onSelect={setSelected} />
          </div>
        </>
      ) : null}

      <ClassDetailDialog item={selected} onClose={() => setSelected(null)} />

      <LiveRegion message={notice} />

      <Dialog
        open={creating !== null}
        onOpenChange={(next) => {
          if (!next) {
            create.reset();
            createRecurring.reset();
            setCreating(null);
          }
        }}
      >
        <DialogContent
          title={creating === "recurring" ? "Lớp định kỳ" : "Thêm lớp"}
          description={
            creating === "recurring"
              ? "Một mẫu lặp hàng tuần. Buổi nào trùng lịch huấn luyện viên sẽ bị bỏ qua, và được liệt kê sau khi lưu."
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
            submitLabel={creating === "recurring" ? "Tạo mẫu lặp" : "Thêm lớp"}
            pending={create.isPending || createRecurring.isPending}
            error={creating === "recurring" ? createRecurring.error : create.error}
            onCancel={() => setCreating(null)}
            onSubmit={async (input) => {
              if (creating === "recurring") {
                const result = await createRecurring.mutateAsync(
                  input as RecurringClassInput,
                );
                setCreating(null);
                setNotice(
                  result.skipped.length === 0
                    ? `Đã tạo ${result.created.length} buổi.`
                    : `Đã tạo ${result.created.length} buổi, bỏ qua ${result.skipped.length} buổi trùng lịch.`,
                );
                // Never a silent skip: if anything was dropped, say which.
                if (result.skipped.length > 0) setSkipped(result.skipped);
                return result;
              }
              const created = await create.mutateAsync(input);
              setCreating(null);
              setNotice(
                `Đã thêm ${created.title}, ${weekdayLong(created.startsAt)} ${formatTime(created.startsAt)}.`,
              );
              return created;
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={skipped !== null}
        onOpenChange={(next) => {
          if (!next) setSkipped(null);
        }}
      >
        <DialogContent
          title="Những buổi đã bỏ qua"
          description="Mẫu lặp đã tạo xong. Các ngày dưới đây bị bỏ qua vì huấn luyện viên đã có lớp — xếp lại từng buổi này nếu vẫn cần."
          footer={
            <Button size="sm" onClick={() => setSkipped(null)}>
              Đã hiểu
            </Button>
          }
        >
          <ul className="rule-t">
            {(skipped ?? []).map((item) => (
              <li key={item.date} className="rule-b py-3">
                <p className="text-ink text-sm">
                  {weekdayLong(`${item.date}T00:00:00+07:00`)},{" "}
                  <Figures>{formatDate(`${item.date}T00:00:00+07:00`)}</Figures>
                </p>
                <p className="text-ink-2 mt-1 text-xs">
                  Trùng <span className="text-ink">{item.conflict.title}</span>{" "}
                  <Figures className="text-ink">
                    {formatTimeRange(item.conflict.startsAt, item.conflict.endsAt)}
                  </Figures>
                </p>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClassDetailDialog({
  item,
  onClose,
}: {
  item: ClassSession | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => (open ? null : onClose())}>
      {item ? (
        <DialogContent
          title={item.title}
          description={`${weekdayLong(item.startsAt)}, ${formatDate(item.startsAt)}`}
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
              <Figures>{formatTimeRange(item.startsAt, item.endsAt)}</Figures>
            </Row>
            <Row label="Hình thức">
              {item.type === "private" ? "Lớp riêng" : "Lớp nhóm"}
            </Row>
            <Row label="Huấn luyện viên">{item.trainer.fullName}</Row>
            <Row label="Sức chứa">
              <CapacityMeter booked={item.bookedCount} capacity={item.capacity} />
            </Row>
            <Row label="Chờ chỗ">
              <Figures>{item.waitlistCount}</Figures>
            </Row>
            <Row label="Trạng thái">
              {item.status === "cancelled" ? (
                <StatusBadge tone="critical">Đã hủy</StatusBadge>
              ) : item.bookedCount >= item.capacity ? (
                <StatusBadge tone="attention">Đủ chỗ</StatusBadge>
              ) : (
                <StatusBadge tone="positive">Còn chỗ</StatusBadge>
              )}
            </Row>
          </dl>

          <p className="rule-t text-ink-2 mt-4 pt-3 text-xs">
            Danh sách học viên, sửa lớp, đổi huấn luyện viên và hủy lớp nằm ở màn hình chi
            tiết lớp.
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
