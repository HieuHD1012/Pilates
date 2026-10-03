import { CalendarCheck, Download, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { useReportExport, useTrainerReport } from "~/features/reports/queries";
import { ReportRangeToolbar, ReportSwitcher } from "~/features/reports/report-frame";
import type { TrainerStatsResponse } from "~/lib/api/schema";
import { formatNumber, studioDateKey } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { LiveRegion } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import {
  Kpi,
  Panel,
  PanelFooter,
  PanelHeader,
  PersonCell,
  WorkspacePage,
} from "~/ui/workspace";

import type { Route } from "./+types/report-trainers";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Báo cáo huấn luyện viên — J Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

/** The studio's current calendar month, as two date keys. */
function currentMonth(): { from: string; to: string } {
  const key = studioDateKey(new Date());
  const parts = key.split("-").map(Number);
  const [year, month] = parts as [number, number, number];
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { from: `${key.slice(0, 7)}-01`, to: last };
}

/** Most classes first; then most bookings; then Vietnamese collation by name. */
function byTeachingLoad(a: TrainerStatsResponse, b: TrainerStatsResponse): number {
  if (b.scheduled_sessions !== a.scheduled_sessions) {
    return b.scheduled_sessions - a.scheduled_sessions;
  }
  if (b.total_bookings !== a.total_bookings) return b.total_bookings - a.total_bookings;
  return a.trainer_name.localeCompare(b.trainer_name, "vi");
}

/**
 * Teaching load per trainer, for a range the user chooses.
 *
 * One table, sorted by the column the question is about — who is carrying the
 * timetable. There is no fill-rate column: `GET /reports/trainers` answers with
 * sessions and attendances and **not** with capacity, so a percentage here
 * would have to invent its own denominator. The class-size breakdown on the
 * class report answers the shape of that question from a query that has it.
 */
export default function StaffReportTrainers() {
  const [range, setRange] = useState(currentMonth);
  const params = { period_start: range.from, period_end: range.to };
  const query = useTrainerReport(params);
  const download = useReportExport("trainers");

  return (
    <WorkspacePage>
      <PageHeader
        eyebrow={
          <Link to="/studio/bao-cao" className="hover:text-copper">
            Tất cả báo cáo
          </Link>
        }
        title="Báo cáo huấn luyện viên"
        description="Số lớp đã xếp, lớp đã hủy và lượt đăng ký của từng huấn luyện viên trong khoảng ngày."
        actions={
          <>
            {/* The file comes from the server's own query, not from the rows
                on screen: same period, same filters, and nothing lost to
                whatever this table happens to have fetched. */}
            <Button
              variant="secondary"
              className="max-md:min-h-11"
              icon={<Download className="size-4" aria-hidden="true" />}
              pending={download.isPending}
              onClick={() => download.mutate({ ...params, format: "csv" })}
            >
              Xuất CSV
            </Button>
            <Button
              variant="secondary"
              className="max-md:min-h-11"
              icon={<Download className="size-4" aria-hidden="true" />}
              pending={download.isPending}
              onClick={() => download.mutate({ ...params, format: "xlsx" })}
            >
              Xuất Excel
            </Button>
          </>
        }
      />

      <ReportSwitcher />

      <ReportRangeToolbar
        range={range}
        onChange={setRange}
        fetching={query.isFetching && !query.isPending}
      />

      {/* One block, so the boundary's refresh hairline sits on the content
          rather than taking a gap of the page's own. */}
      <div>
        <QueryBoundary
          query={query}
          skeletonRows={6}
          isEmpty={(report) => report.length === 0}
          emptyTitle="Không có huấn luyện viên nào dạy trong khoảng ngày này"
          emptyDescription="Chưa có lớp nào được phân công trong khoảng ngày đang chọn. Kiểm tra lại khoảng ngày, hoặc mở lịch tuần để xem phân công."
          emptyAction={
            <Button asChild variant="secondary">
              <Link to="/studio/lich">Mở lịch tuần</Link>
            </Button>
          }
          errorDescription="Không tải được báo cáo huấn luyện viên."
          showErrorDetail
        >
          {(report) => {
            const rows = [...report].sort(byTeachingLoad);
            const classTotal = rows.reduce((sum, row) => sum + row.scheduled_sessions, 0);

            return (
              <div className="flex flex-col gap-5 md:gap-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Kpi
                    label="Huấn luyện viên"
                    icon={<UserRound aria-hidden="true" />}
                    value={formatNumber(rows.length)}
                    unit="người"
                  />
                  <Kpi
                    label="Tổng số lớp"
                    icon={<CalendarCheck aria-hidden="true" />}
                    value={formatNumber(classTotal)}
                    unit="lớp"
                    context="Cộng cột “Lớp đã xếp” ở bảng dưới."
                  />
                </div>

                <Panel>
                  <PanelHeader
                    title="Theo huấn luyện viên"
                    description="Sắp xếp theo số lớp đã xếp, nhiều nhất trước. Lớp đã hủy được đếm riêng, không trừ vào cột số lớp."
                  />

                  <ul className="sm:hidden">
                    {rows.map((row) => (
                      <li key={row.trainer_id} className="rule-b px-4 py-4 last:border-b-0">
                        <PersonCell
                          avatarName={row.trainer_name}
                          name={
                            <Link
                              to={`/studio/huan-luyen-vien/${row.trainer_id}`}
                              className="decoration-rule-2 hover:text-copper underline underline-offset-[6px]"
                            >
                              {row.trainer_name}
                            </Link>
                          }
                        />
                        <dl className="mt-3 grid grid-cols-3 gap-3">
                          {(
                            [
                              ["Lớp đã xếp", row.scheduled_sessions],
                              ["Lớp đã hủy", row.cancelled_sessions],
                              ["Lượt đăng ký", row.total_bookings],
                            ] as const
                          ).map(([label, value]) => (
                            <div key={label}>
                              <dt className="text-ink-2 text-xs">{label}</dt>
                              <dd className="mt-1 text-xl">
                                <Figures className="text-ink">
                                  {formatNumber(value)}
                                </Figures>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden sm:block">
                    <DataTable
                      caption="Lớp đã xếp, lớp đã hủy và lượt đăng ký theo huấn luyện viên"
                      minWidth="36rem"
                    >
                      <thead>
                        <tr>
                          <Th>Huấn luyện viên</Th>
                          <Th numeric>Lớp đã xếp</Th>
                          <Th numeric>Lớp đã hủy</Th>
                          <Th numeric>Lượt đăng ký</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <Tr key={row.trainer_id}>
                            <Td>
                              {/* The person first (ADR 0006). The table scrolls
                                in its own box rather than squeezing this cell,
                                so a Vietnamese name is never cut short. */}
                              <PersonCell
                                avatarName={row.trainer_name}
                                name={
                                  <Link
                                    to={`/studio/huan-luyen-vien/${row.trainer_id}`}
                                    className="decoration-rule-2 hover:text-copper underline-offset-[6px] hover:underline"
                                  >
                                    {row.trainer_name}
                                  </Link>
                                }
                              />
                            </Td>
                            <Td numeric>
                              <Figures className="text-base">
                                {formatNumber(row.scheduled_sessions)}
                              </Figures>
                            </Td>
                            <Td numeric>
                              <Figures className="text-ink-2 text-base">
                                {formatNumber(row.cancelled_sessions)}
                              </Figures>
                            </Td>
                            <Td numeric>
                              <Figures className="text-base">
                                {formatNumber(row.total_bookings)}
                              </Figures>
                            </Td>
                          </Tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </div>

                  <PanelFooter className="text-xs">
                    Tệp được sinh ở máy chủ từ đúng truy vấn của bảng này, nên con số trong
                    tệp và con số trên màn hình luôn khớp. Chọn CSV để mở nhanh bằng Excel,
                    hoặc Excel để giữ định dạng cột.
                  </PanelFooter>
                </Panel>
              </div>
            );
          }}
        </QueryBoundary>
      </div>

      <LiveRegion
        message={
          download.isSuccess
            ? "Đã tải tệp báo cáo. Kiểm tra thư mục tải về."
            : download.isError
              ? "Chưa tải được tệp báo cáo."
              : null
        }
      />
    </WorkspacePage>
  );
}
