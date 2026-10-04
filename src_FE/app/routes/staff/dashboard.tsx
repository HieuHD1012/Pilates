import { CalendarDays, ChevronRight } from "lucide-react";
import { Link } from "react-router";

import { useSession } from "~/features/auth/use-session";
import { useLeads } from "~/features/leads/queries";
import { useStudioToday } from "~/features/public/schedule-ui";
import { useDashboard } from "~/features/reports/queries";
import type { DashboardNumber, SessionRowResponse } from "~/lib/api/schema";
import { cn } from "~/lib/cn";
import {
  formatDate,
  formatDayMonth,
  formatNumber,
  formatTime,
  weekdayLong,
  weekdayShort,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { ErrorState, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { StatusBadge } from "~/ui/status";
import { Meter, Panel, PanelHeader, Stat, StatGroup, WorkspacePage } from "~/ui/workspace";

import type { Route } from "./+types/dashboard";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tổng quan — J Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The dashboard answers one question: what needs attention today?
 *
 * The whole board is `GET /reports/dashboard` — four numbers, today's classes,
 * and the classes that have ended without a trainer marking attendance — plus
 * the new-lead list the staff rail already loads. Two properties of that
 * endpoint are design decisions, not omissions:
 *
 *  - **There is no revenue figure.** This board is open all day at a counter
 *    customers can see. Money has its own screen, behind a sign-in and a click.
 *  - **A number may be `null`,** meaning not measured. The figure is then a
 *    dash that says so; "0" would be a measurement, and a wrong one.
 *
 * The numbers have no strip of their own: each is read where it is acted on
 * (docs/UI_QUALITY.md, principle 4). Today's classes and seats head the
 * "Lớp hôm nay" timeline; renewals and unconfirmed payments are queues in
 * "Việc cần làm", beside new leads and the classes awaiting attendance. A
 * number this board has no place for is still shown, below both, unlinked.
 *
 * `detail_path` on each number is an **API** path, not a route. The link on a
 * queue is the studio screen that lists the same rows, chosen here by `key`.
 */

/** Dashboard number keys, by where the board reads them. */
const SESSIONS_TODAY = ["sessions_today"];
const BOOKINGS_TODAY = ["bookings_today"];
// The fixtures say `renewals_due`; the backend says `renewals_needing_contact`.
const RENEWALS = ["renewals_due", "renewals_needing_contact"];
const PAYMENTS = ["unconfirmed_payments"];
const PLACED = new Set([...SESSIONS_TODAY, ...BOOKINGS_TODAY, ...RENEWALS, ...PAYMENTS]);

function findNumber(numbers: DashboardNumber[], keys: string[]) {
  return numbers.find((number) => keys.includes(number.key));
}

export default function StaffDashboard() {
  const query = useDashboard();
  const { data: user } = useSession();
  const today = useStudioToday();
  const name = user?.full_name?.trim();

  return (
    <WorkspacePage>
      <PageHeader
        eyebrow={
          today ? (
            <>
              {weekdayLong(`${today}T00:00:00+07:00`)},{" "}
              <Figures>{formatDate(`${today}T00:00:00+07:00`)}</Figures>
            </>
          ) : null
        }
        title={name ? `Xin chào, ${name}` : "Tổng quan"}
        description="Việc đang chờ và lớp của hôm nay."
        actions={
          <Button asChild variant="secondary">
            <Link to="/studio/lich">
              <CalendarDays className="size-4" aria-hidden="true" />
              Mở lịch tuần
            </Link>
          </Button>
        }
      />

      {query.isPending ? <SkeletonRows rows={5} /> : null}

      {query.isError ? (
        <ErrorState
          description="Không tải được bảng tổng quan."
          detail={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess ? (
        <>
          {/* The queues first: they are what the front desk came here for, and
              on a phone they are the first thing on screen. */}
          <div className="grid items-start gap-5 md:gap-6 lg:grid-cols-2">
            <TasksPanel
              numbers={query.data.numbers}
              attendance={query.data.sessions_needing_attention}
            />
            <TodayPanel sessions={query.data.sessions_today} numbers={query.data.numbers} />
          </div>
          <OtherNumbers numbers={query.data.numbers} />
        </>
      ) : null}
    </WorkspacePage>
  );
}

/**
 * The work waiting on the front desk, one row per queue, each row the link to
 * the screen that works it. Every count is one the backend returned — two
 * dashboard numbers, the length of the new-lead list and of the attendance
 * list — so nothing here is a rule re-derived in the browser. A queue with
 * nothing in it stays listed, quietly, so the rows never change places.
 */
function TasksPanel({
  numbers,
  attendance,
}: {
  numbers: DashboardNumber[];
  attendance: SessionRowResponse[];
}) {
  const newLeads = useLeads({ status: "NEW" });
  // A key the board does not return is a number nobody measured.
  const valueOf = (keys: string[]) => findNumber(numbers, keys)?.value ?? null;

  const tasks: Task[] = [
    {
      key: "leads",
      title: "Khách mới chờ gọi",
      count: newLeads.data?.length ?? (newLeads.isError ? null : undefined),
      to: "/studio/khach-quan-tam",
    },
    {
      key: "payments",
      title: "Khoản thu chờ xác nhận",
      count: valueOf(PAYMENTS),
      to: "/studio/thanh-toan",
    },
    {
      key: "renewals",
      title: "Học viên cần gia hạn",
      count: valueOf(RENEWALS),
      to: "/studio/gia-han",
    },
  ];
  const waiting =
    tasks.filter((task) => (task.count ?? 0) > 0).length + (attendance.length > 0 ? 1 : 0);

  return (
    <Panel>
      <PanelHeader
        title="Việc cần làm"
        description={
          waiting > 0 ? (
            <>
              <Figures className="text-ink">{waiting}</Figures> việc đang chờ
            </>
          ) : (
            "Không có việc nào đang chờ"
          )
        }
      />
      <ul>
        {tasks.map((task) => (
          <TaskRow key={task.key} task={task} />
        ))}
        <AttendanceRow sessions={attendance} />
      </ul>
    </Panel>
  );
}

interface Task {
  key: string;
  /** Names what the count counts, so the figure needs no unit beside it. */
  title: string;
  /** `undefined` while loading, `null` when not measured. */
  count: number | null | undefined;
  to: string;
}

function TaskRow({ task }: { task: Task }) {
  const waiting = (task.count ?? 0) > 0;
  return (
    <li className="rule-b last:border-b-0">
      <Link
        to={task.to}
        className="hover:bg-sand/60 flex min-h-11 items-center gap-3 px-4 py-3 md:px-5"
      >
        <TaskTitle waiting={waiting}>{task.title}</TaskTitle>
        <TaskCount count={task.count} waiting={waiting} />
        <ChevronRight className="text-ink-2 size-4 shrink-0" aria-hidden="true" />
      </Link>
    </li>
  );
}

/**
 * Classes that ended without a trainer marking attendance. No studio screen
 * lists them, so the queue carries its own rows, each one the class itself.
 * Staff cannot mark attendance; the one line says what they can do instead.
 */
function AttendanceRow({ sessions }: { sessions: SessionRowResponse[] }) {
  const waiting = sessions.length > 0;
  return (
    <li className="rule-b last:border-b-0">
      <div className="flex min-h-11 items-center gap-3 px-4 py-3 md:px-5">
        <span className="flex min-w-0 flex-1 flex-col">
          <TaskTitle waiting={waiting}>Lớp chờ điểm danh</TaskTitle>
          {waiting ? (
            <span className="text-ink-2 text-xs">
              Chỉ huấn luyện viên phụ trách điểm danh được — nhắc họ mở lớp.
            </span>
          ) : null}
        </span>
        <TaskCount count={sessions.length} waiting={waiting} />
        {/* Holds the chevron's width so this count lines up with the others. */}
        <span className="size-4 shrink-0" aria-hidden="true" />
      </div>
      {waiting ? (
        <ul className="pb-2">
          {sessions.map((session) => (
            <li key={session.class_session_id}>
              <Link
                to={`/studio/lich/${session.class_session_id}`}
                className="hover:bg-sand/60 flex min-h-11 items-center gap-3 py-2 pr-4 pl-7 md:pr-5 md:pl-8"
              >
                {/* Outside today's list a time alone is ambiguous, so the day
                    comes with it. */}
                <span className="text-ink-2 w-24 shrink-0 text-xs">
                  {weekdayShort(session.starts_at)}{" "}
                  <Figures>{formatDayMonth(session.starts_at)}</Figures>{" "}
                  <Figures className="text-ink">{formatTime(session.starts_at)}</Figures>
                </span>
                <span className="text-ink min-w-0 flex-1 text-sm">
                  {session.trainer_name}
                </span>
                <ChevronRight className="text-ink-2 size-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function TaskTitle({ waiting, children }: { waiting: boolean; children: string }) {
  return (
    <span
      className={cn(
        "min-w-0 flex-1 text-sm",
        waiting ? "text-ink font-medium" : "text-ink-2",
      )}
    >
      {children}
    </span>
  );
}

/** A queue's count. A zero recedes with its row; it is still a measurement. */
function TaskCount({
  count,
  waiting,
}: {
  count: number | null | undefined;
  waiting: boolean;
}) {
  return (
    <span className="w-14 shrink-0 text-right text-base">
      {count === undefined ? (
        <span className="text-ink-2 text-xs">Đang tải</span>
      ) : count === null ? (
        <Placeholder />
      ) : (
        <Figures className={waiting ? "text-ink" : "text-ink-2"}>
          {formatNumber(count)}
        </Figures>
      )}
    </span>
  );
}

/**
 * Today as a timeline: the hour in the serif, the class, its seats. The day's
 * two dashboard numbers head it; seats are read against the places today's
 * running classes offer — the same sum the calendar prints for its week.
 */
function TodayPanel({
  sessions,
  numbers,
}: {
  sessions: SessionRowResponse[];
  numbers: DashboardNumber[];
}) {
  const sorted = [...sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const classCount = findNumber(numbers, SESSIONS_TODAY);
  const booked = findNumber(numbers, BOOKINGS_TODAY);
  // A cancelled class offers no places.
  const capacityToday = sessions
    .filter((session) => session.status !== "CANCELLED")
    .reduce((sum, session) => sum + session.capacity, 0);

  return (
    <Panel>
      <PanelHeader
        title="Lớp hôm nay"
        description={
          <>
            {/* Without the number, the list itself is the count. */}
            {classCount === undefined ? (
              <Figures className="text-ink">{sessions.length}</Figures>
            ) : (
              <Measured value={classCount.value} />
            )}{" "}
            lớp
            {booked ? (
              <>
                {" · "}
                <Measured value={booked.value} />
                {booked.value !== null && capacityToday > 0 ? (
                  <Figures className="text-ink">/{formatNumber(capacityToday)}</Figures>
                ) : null}{" "}
                chỗ đã đặt
              </>
            ) : null}
          </>
        }
      />
      {sorted.length === 0 ? (
        <p className="text-ink-2 px-4 py-4 text-sm md:px-5">
          Không có buổi nào được xếp cho hôm nay.
        </p>
      ) : (
        <ol>
          {sorted.map((session) => (
            <li key={session.class_session_id} className="rule-b last:border-b-0">
              <Link
                to={`/studio/lich/${session.class_session_id}`}
                className="hover:bg-sand/60 flex min-h-11 items-center gap-4 px-4 py-3.5 md:px-5"
              >
                <Figures display className="text-ink w-14 shrink-0 text-xl leading-none">
                  {formatTime(session.starts_at)}
                </Figures>
                <span className="text-ink min-w-0 flex-1 text-sm font-medium">
                  {session.trainer_name}
                </span>
                {session.status === "CANCELLED" ? (
                  <StatusBadge tone="critical">Đã hủy</StatusBadge>
                ) : (
                  <span className="flex w-20 shrink-0 flex-col gap-1.5 md:w-28">
                    <span className="text-ink-2 text-xs">
                      <Figures className="text-ink">
                        {session.booked_count}/{session.capacity}
                      </Figures>{" "}
                      chỗ
                    </span>
                    <Meter
                      value={session.booked_count}
                      max={session.capacity}
                      tone={
                        session.booked_count >= session.capacity ? "attention" : "neutral"
                      }
                    />
                  </span>
                )}
                <ChevronRight className="text-ink-2 size-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/**
 * A dashboard number this board has no place for — a key added after this
 * screen was written. It is shown rather than dropped, and without a link:
 * no studio screen is known to list its rows.
 */
function OtherNumbers({ numbers }: { numbers: DashboardNumber[] }) {
  const rest = numbers.filter((number) => !PLACED.has(number.key));
  if (rest.length === 0) return null;
  return (
    <StatGroup label="Số liệu khác">
      {rest.map((number) => (
        <Stat
          key={number.key}
          label={number.label}
          value={number.value === null ? <Placeholder /> : formatNumber(number.value)}
        />
      ))}
    </StatGroup>
  );
}

/** A number in running text: the figure, or the dash that says it was not measured. */
function Measured({ value }: { value: number | null }) {
  return value === null ? (
    <Placeholder />
  ) : (
    <Figures className="text-ink">{formatNumber(value)}</Figures>
  );
}

/** A figure the backend did not measure. The dash is decoration, so it speaks. */
function Placeholder() {
  return (
    <>
      <span aria-hidden="true" className="text-ink-2">
        —
      </span>
      <span className="sr-only">chưa có số liệu</span>
    </>
  );
}
