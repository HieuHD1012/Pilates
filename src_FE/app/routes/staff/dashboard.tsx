import { Link } from "react-router";
import { ArrowUpRight, CalendarDays, CreditCard, RefreshCw, Users } from "lucide-react";
import { useDashboard } from "~/features/reports/queries";
import type { SessionRowResponse } from "~/lib/api/schema";
import { formatDayMonth, formatNumber, formatTime, weekdayShort } from "~/lib/format";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { CapacityMeter, StatusBadge } from "~/ui/status";
import { Kpi, Panel, PanelBody, PanelHeader } from "~/ui/workspace";
import type { Route } from "./+types/dashboard";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tổng quan — Soul Pilates" }, { name: "robots", content: "noindex" }];
}
const DETAIL_ROUTE: Record<string, string> = {
  sessions_today: "/studio/lich",
  bookings_today: "/studio/lich",
  renewals_due: "/studio/gia-han",
  unconfirmed_payments: "/studio/thanh-toan",
};
const ICONS = [CalendarDays, Users, RefreshCw, CreditCard];
const UNITS: Record<string, string> = {
  sessions_today: "lớp",
  bookings_today: "lượt",
  renewals_due: "gói",
  unconfirmed_payments: "khoản",
};

export default function StaffDashboard() {
  const query = useDashboard();
  return (
    <div className="workspace-page">
      <PageHeader
        title="Một ngày tại studio"
        description="Lịch hôm nay và những việc cần theo dõi, trong cùng một không gian."
        actions={
          <Button asChild variant="secondary">
            <Link to="/studio/lich">Mở lịch tuần</Link>
          </Button>
        }
      />
      {query.isPending ? <SkeletonRows rows={5} /> : null}
      {query.isError ? (
        <ErrorState
          description="Không tải được bảng tổng quan."
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess ? (
        <>
          <div className="dashboard-kpis grid grid-cols-2 gap-3 xl:grid-cols-4">
            {query.data.numbers.map((number, index) => {
              const Icon = ICONS[index] ?? CalendarDays;
              const route = DETAIL_ROUTE[number.key];
              return (
                <Kpi
                  className="min-w-0 px-4"
                  key={number.key}
                  label={number.label}
                  icon={<Icon />}
                  value={
                    number.value === null ? (
                      <>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Chưa có số liệu</span>
                      </>
                    ) : (
                      formatNumber(number.value)
                    )
                  }
                  unit={UNITS[number.key]}
                  context={
                    route ? (
                      <Link
                        className="text-copper inline-flex min-h-9 items-center gap-1"
                        aria-label={`Xem chi tiết: ${number.label}`}
                        to={route}
                      >
                        Xem chi tiết
                        <ArrowUpRight className="size-3" aria-hidden="true" />
                      </Link>
                    ) : null
                  }
                />
              );
            })}
          </div>
          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
            <Panel>
              <PanelHeader title="Lớp hôm nay" description="Theo thứ tự giờ bắt đầu." />
              <PanelBody>
                {query.data.sessions_today.length ? (
                  <ul>
                    {[...query.data.sessions_today]
                      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                      .map((session) => (
                        <SessionRow key={session.class_session_id} session={session}>
                          {session.status === "CANCELLED" ? (
                            <StatusBadge tone="critical">Đã hủy</StatusBadge>
                          ) : (
                            <CapacityMeter
                              booked={session.booked_count}
                              capacity={session.capacity}
                            />
                          )}
                        </SessionRow>
                      ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="Hôm nay không có lớp"
                    description="Chuyển sang lịch tuần để xem những buổi tiếp theo."
                  />
                )}
              </PanelBody>
            </Panel>
            <Panel>
              <PanelHeader
                title="Chờ điểm danh"
                description="Lớp đã kết thúc, chưa hoàn tất điểm danh."
              />
              <PanelBody>
                {query.data.sessions_needing_attention.length ? (
                  <>
                    <p className="text-ink-2 mb-4 text-sm">
                      Nhắc huấn luyện viên phụ trách hoàn tất điểm danh.
                    </p>
                    <ul>
                      {query.data.sessions_needing_attention.map((session) => (
                        <SessionRow key={session.class_session_id} session={session} dated>
                          <StatusBadge tone="attention">Chờ điểm danh</StatusBadge>
                        </SessionRow>
                      ))}
                    </ul>
                  </>
                ) : (
                  <EmptyState
                    title="Đã hoàn tất"
                    description="Không có lớp nào đang chờ điểm danh."
                  />
                )}
              </PanelBody>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
function SessionRow({
  session,
  dated,
  children,
}: {
  session: SessionRowResponse;
  dated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="border-rule border-b py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start gap-4">
        <div className="bg-sand min-w-18 rounded-md px-3 py-2 text-center">
          <Figures className="text-ink text-lg">{formatTime(session.starts_at)}</Figures>
          {dated ? (
            <p className="text-ink-2 text-xs">
              {weekdayShort(session.starts_at)} {formatDayMonth(session.starts_at)}
            </p>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to={`/studio/lich/${session.class_session_id}`}
            className="text-ink hover:text-copper block text-base font-medium wrap-anywhere"
          >
            {session.trainer_name}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">{children}</div>
          <Link
            to={`/studio/lich/${session.class_session_id}`}
            className="text-copper mt-1 inline-flex min-h-9 items-center text-sm"
          >
            Xem lớp
          </Link>
        </div>
      </div>
    </li>
  );
}
