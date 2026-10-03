import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Phone,
  RefreshCw,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
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
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { StatusBadge } from "~/ui/status";
import { Kpi, Meter, Panel, PanelBody, PanelHeader, WorkspacePage } from "~/ui/workspace";

import type { Route } from "./+types/dashboard";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tổng quan — Soul Pilates" }, { name: "robots", content: "noindex" }];
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
 * `detail_path` on each number is an **API** path, not a route. The link on a
 * figure is the studio screen that answers the same question, chosen by `key`;
 * a number whose screen does not exist yet is shown without a link rather than
 * pointing at a page that is not there.
 */

/** Dashboard number keys → the studio screen that shows those rows. */
const DETAIL_ROUTE: Record<string, string> = {
  sessions_today: "/studio/lich",
  bookings_today: "/studio/lich",
  // The fixtures say `renewals_due`; the backend says `renewals_needing_contact`.
  renewals_due: "/studio/gia-han",
  renewals_needing_contact: "/studio/gia-han",
  unconfirmed_payments: "/studio/thanh-toan",
};

/** What each figure counts, written beside it. Unknown keys get no unit. */
const PRESENTATION: Record<string, { icon: ReactNode; unit?: string }> = {
  sessions_today: { icon: <CalendarDays />, unit: "lớp" },
  bookings_today: { icon: <Users />, unit: "chỗ" },
  renewals_due: { icon: <RefreshCw />, unit: "học viên" },
  renewals_needing_contact: { icon: <RefreshCw />, unit: "học viên" },
  unconfirmed_payments: { icon: <CreditCard />, unit: "khoản" },
};

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
        description="Bốn con số của hôm nay, lịch trong ngày, việc đang chờ, và những lớp đã kết thúc còn chờ điểm danh."
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
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            {query.data.numbers.map((number) => (
              <NumberPanel
                key={number.key}
                number={number}
                sessionsToday={query.data.sessions_today}
              />
            ))}
          </div>

          <div className="grid items-start gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <TodayPanel sessions={query.data.sessions_today} today={today} />

            <div className="flex flex-col gap-5 md:gap-6">
              <TasksPanel numbers={query.data.numbers} />
              <AttendancePanel sessions={query.data.sessions_needing_attention} />
            </div>
          </div>
        </>
      ) : null}
    </WorkspacePage>
  );
}

/**
 * One dashboard number as a panel. The whole panel is the link to the screen
 * that lists the same rows, so the target is the size of the thing read.
 */
function NumberPanel({
  number,
  sessionsToday,
}: {
  number: DashboardNumber;
  sessionsToday: SessionRowResponse[];
}) {
  const route = DETAIL_ROUTE[number.key];
  const presentation = PRESENTATION[number.key];
  const value =
    number.value === null ? (
      <Placeholder />
    ) : (
      <Figures display>{formatNumber(number.value)}</Figures>
    );

  // Seats are read against the places today's running classes offer — the
  // same sum the calendar prints for its week. A cancelled class offers none.
  const capacityToday = sessionsToday
    .filter((session) => session.status !== "CANCELLED")
    .reduce((sum, session) => sum + session.capacity, 0);

  let context: ReactNode = null;
  let extra: ReactNode = null;
  let unit = presentation?.unit;

  if (number.key === "sessions_today" && number.value !== null) {
    context =
      sessionsToday.length > 0 ? (
        <Figures>
          {sessionsToday
            .slice(0, 4)
            .map((session) => formatTime(session.starts_at))
            .join(" · ")}
          {sessionsToday.length > 4 ? " …" : ""}
        </Figures>
      ) : (
        "Không có lớp nào"
      );
  } else if (
    number.key === "bookings_today" &&
    number.value !== null &&
    capacityToday > 0
  ) {
    unit = `/ ${formatNumber(capacityToday)} chỗ`;
    extra = <Meter value={number.value} max={capacityToday} className="mt-2" />;
  } else if (route && number.key !== "bookings_today") {
    context = (
      <span className="text-copper inline-flex items-center gap-1">
        {number.key === "unconfirmed_payments" ? "Mở để xác nhận" : "Mở danh sách"}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </span>
    );
  }

  const panel = (
    <Kpi
      label={number.label}
      icon={presentation?.icon}
      value={value}
      unit={number.value === null ? undefined : unit}
      context={context}
      className={cn("h-full", route && "group-hover:border-rule-2 transition-colors")}
    >
      {extra}
    </Kpi>
  );

  return route ? (
    <Link
      to={route}
      className="group focus-visible:outline-ink block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {panel}
    </Link>
  ) : (
    panel
  );
}

/** Today as a timeline: the hour in the serif, the class, its seats. */
function TodayPanel({
  sessions,
  today,
}: {
  sessions: SessionRowResponse[];
  today: string | null;
}) {
  const sorted = [...sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <Panel>
      <PanelHeader
        title="Lớp hôm nay"
        description={
          <>
            {today ? (
              <>
                {weekdayLong(`${today}T00:00:00+07:00`)},{" "}
                <Figures>{formatDate(`${today}T00:00:00+07:00`)}</Figures>
                {" · "}
              </>
            ) : null}
            <Figures>{sessions.length}</Figures> lớp
          </>
        }
      />
      {sorted.length === 0 ? (
        <PanelBody>
          <EmptyState
            className="py-6"
            title="Hôm nay không có lớp"
            description="Không có buổi nào được xếp cho ngày hôm nay."
          />
        </PanelBody>
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
 * The work waiting on the front desk, one row per queue. Every count is one
 * the backend returned — two dashboard numbers and the length of the new-lead
 * list — so nothing here is a rule re-derived in the browser. A queue with
 * nothing in it stays listed, quietly, so the rows never change places.
 */
function TasksPanel({ numbers }: { numbers: DashboardNumber[] }) {
  const newLeads = useLeads({ status: "NEW" });
  const valueOf = (...keys: string[]) => {
    const found = numbers.find((number) => keys.includes(number.key));
    return found === undefined ? undefined : found.value;
  };

  const tasks: Task[] = [
    {
      key: "leads",
      icon: <Phone />,
      tone: "info",
      title: "Gọi khách mới",
      count: newLeads.data?.length ?? (newLeads.isError ? null : undefined),
      detail: (n) => `${formatNumber(n)} khách chưa được liên hệ`,
      done: "Không có khách mới đang chờ",
      to: "/studio/khach-quan-tam",
      linkLabel: "Mở khách quan tâm",
    },
    {
      key: "payments",
      icon: <CreditCard />,
      tone: "attention",
      title: "Xác nhận khoản thu",
      count: valueOf("unconfirmed_payments"),
      detail: (n) => `${formatNumber(n)} khoản chờ xác nhận`,
      done: "Không có khoản nào chờ xác nhận",
      to: "/studio/thanh-toan",
      linkLabel: "Mở thanh toán",
    },
    {
      key: "renewals",
      icon: <RefreshCw />,
      tone: "copper",
      title: "Gọi gia hạn",
      count: valueOf("renewals_needing_contact", "renewals_due"),
      detail: (n) => `${formatNumber(n)} học viên cần liên hệ`,
      done: "Không có học viên nào cần gọi",
      to: "/studio/gia-han",
      linkLabel: "Mở gia hạn",
    },
  ];
  const waiting = tasks.filter((task) => (task.count ?? 0) > 0).length;

  return (
    <Panel>
      <PanelHeader
        title="Việc cần làm"
        actions={
          waiting > 0 ? (
            <span className="bg-copper-wash text-copper-2 figures inline-grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs">
              {waiting}
            </span>
          ) : null
        }
      />
      <ul>
        {tasks.map((task) => (
          <TaskRow key={task.key} task={task} />
        ))}
      </ul>
    </Panel>
  );
}

interface Task {
  key: string;
  icon: ReactNode;
  tone: "info" | "attention" | "copper";
  title: string;
  /** `undefined` while loading or absent, `null` when not measured. */
  count: number | null | undefined;
  detail: (count: number) => string;
  done: string;
  to: string;
  linkLabel: string;
}

function TaskRow({ task }: { task: Task }) {
  const waiting = task.count !== null && task.count !== undefined && task.count > 0;
  const line =
    task.count === undefined
      ? "Đang tải"
      : task.count === null
        ? "Chưa có số liệu"
        : task.count > 0
          ? task.detail(task.count)
          : task.done;

  return (
    <li className="rule-b flex items-center gap-3 px-4 py-3.5 last:border-b-0 md:px-5">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md [&_svg]:size-4",
          !waiting && "bg-sand-deep text-ink-2",
          waiting && task.tone === "info" && "bg-info-wash text-info",
          waiting && task.tone === "attention" && "bg-warning-wash text-warning",
          waiting && task.tone === "copper" && "bg-copper-wash text-copper",
        )}
      >
        {task.icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("text-sm font-medium", waiting ? "text-ink" : "text-ink-2")}>
          {task.title}
        </span>
        <span className="text-ink-2 text-xs">{line}</span>
      </span>
      {waiting ? (
        <Button asChild size="sm" variant="secondary" className="max-md:min-h-11">
          <Link to={task.to} aria-label={task.linkLabel}>
            Mở
          </Link>
        </Button>
      ) : null}
    </li>
  );
}

function AttendancePanel({ sessions }: { sessions: SessionRowResponse[] }) {
  return (
    <Panel tone={sessions.length > 0 ? "attention" : "paper"}>
      <PanelHeader
        title="Chờ điểm danh"
        description="Lớp đã kết thúc mà huấn luyện viên chưa điểm danh. Chỉ huấn luyện viên phụ trách mới điểm danh được — nhắc họ mở lớp của mình."
      />
      {sessions.length === 0 ? (
        <PanelBody>
          <EmptyState
            className="py-2"
            title="Không có lớp nào chờ điểm danh"
            description="Mọi lớp đã kết thúc đều đã được điểm danh."
          />
        </PanelBody>
      ) : (
        <ul>
          {sessions.map((session) => (
            <li key={session.class_session_id} className="rule-b last:border-b-0">
              <Link
                to={`/studio/lich/${session.class_session_id}`}
                className="hover:bg-paper/70 flex min-h-11 items-center gap-3 px-4 py-3 md:px-5"
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
      )}
    </Panel>
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
