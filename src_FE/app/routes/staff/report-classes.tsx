import { Armchair, CalendarCheck, Gauge, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { useClassReport, useTrainerClassSizes } from "~/features/reports/queries";
import { ReportRangeToolbar, ReportSwitcher } from "~/features/reports/report-frame";
import { formatNumber, studioDateKey } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { Kpi, Meter, Panel, PanelHeader, WorkspacePage } from "~/ui/workspace";

import type { Route } from "./+types/report-classes";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Báo cáo lớp học — Soul Pilates" },
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

/**
 * Classes and how full they were, for a range the user chooses.
 *
 * `fill_rate` is the **backend's** number and it is `null` when no class ran in
 * the period. That is not zero: an empty cell says "not measured", and "0%"
 * would say classes were open and nobody came. The breakdown underneath is the
 * per-trainer class-size table, which is the other query the studio has for
 * this question — row totals there equal `scheduled_sessions` here.
 */
export default function StaffReportClasses() {
  const [range, setRange] = useState(currentMonth);
  const params = { period_start: range.from, period_end: range.to };
  const query = useClassReport(params);
  const sizes = useTrainerClassSizes(params);

  return (
    <WorkspacePage>
      <PageHeader
        eyebrow={
          <Link to="/studio/bao-cao" className="hover:text-copper">
            Tất cả báo cáo
          </Link>
        }
        title="Báo cáo lớp học"
        description="Số lớp đã xếp, lượt đăng ký và mức lấp đầy trong khoảng ngày bạn chọn."
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
          isEmpty={(report) => report.scheduled_sessions === 0}
          emptyTitle="Không có lớp nào trong khoảng ngày này"
          emptyDescription="Chưa có lớp nào được xếp trong khoảng ngày đang chọn. Kiểm tra lại khoảng ngày, hoặc mở lịch tuần để xem lớp đã xếp."
          emptyAction={
            <Button asChild variant="secondary">
              <Link to="/studio/lich">Mở lịch tuần</Link>
            </Button>
          }
          errorDescription="Không tải được báo cáo lớp học."
          showErrorDetail
        >
          {(report) => {
            // Percent, from the backend's ratio. `null` stays null all the way
            // to the figure — see the note above.
            const overall =
              report.fill_rate === null ? null : Math.round(report.fill_rate * 100);

            return (
              <div className="flex flex-col gap-5 md:gap-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Kpi
                    label="Lớp đã xếp"
                    icon={<CalendarCheck aria-hidden="true" />}
                    value={formatNumber(report.scheduled_sessions)}
                    unit="lớp"
                    context={
                      <>
                        <Figures>{formatNumber(report.cancelled_sessions)}</Figures> lớp đã
                        hủy
                      </>
                    }
                  />
                  <Kpi
                    label="Lượt đăng ký"
                    icon={<Users aria-hidden="true" />}
                    value={formatNumber(report.total_bookings)}
                    unit="lượt"
                  />
                  <Kpi
                    label="Sức chứa"
                    icon={<Armchair aria-hidden="true" />}
                    value={formatNumber(report.total_capacity)}
                    unit="chỗ"
                  />
                  <Kpi
                    label="Tỉ lệ lấp đầy"
                    icon={<Gauge aria-hidden="true" />}
                    value={overall === null ? <Placeholder /> : overall}
                    unit={overall === null ? undefined : "%"}
                    context="Lượt đăng ký chia cho sức chứa."
                  >
                    {overall === null ? null : (
                      <Meter value={overall} max={100} className="mt-1.5" />
                    )}
                  </Kpi>
                </div>

                <Panel>
                  <PanelHeader
                    title="Sĩ số theo huấn luyện viên"
                    description="Mỗi dòng là số lớp của một huấn luyện viên theo sĩ số. Cột “không ai đăng ký” là lớp đã xếp nhưng không diễn ra — không phải lớp bị hủy."
                  />

                  {sizes.isPending ? (
                    <p className="text-ink-2 px-4 py-4 text-sm md:px-5">
                      Đang tải bảng sĩ số.
                    </p>
                  ) : sizes.isError ? (
                    <p className="text-ink-2 px-4 py-4 text-sm md:px-5">
                      Không tải được bảng sĩ số.
                    </p>
                  ) : (sizes.data?.length ?? 0) === 0 ? (
                    <p className="text-ink-2 px-4 py-4 text-sm md:px-5">
                      Không có lớp nào trong khoảng này.
                    </p>
                  ) : (
                    <DataTable caption="Số lớp theo sĩ số" minWidth="46rem">
                      <thead>
                        <tr>
                          <Th className="left-0 z-10">Huấn luyện viên</Th>
                          <Th numeric>1 học viên</Th>
                          <Th numeric>2 học viên</Th>
                          <Th numeric>3 học viên</Th>
                          <Th numeric>4 học viên</Th>
                          <Th numeric>5 học viên</Th>
                          <Th numeric>Trên 5 học viên</Th>
                          <Th numeric>Không ai đăng ký</Th>
                          <Th numeric>Tổng</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sizes.data ?? []).map((row) => (
                          <Tr key={row.trainer_id}>
                            {/* Sticky so the name stays beside its numbers when
                              the table scrolls sideways on a phone. */}
                            <Td className="bg-paper sticky left-0 min-w-40 font-medium">
                              {row.trainer_name}
                            </Td>
                            <Td numeric>
                              <Figures>{formatNumber(row.size_1)}</Figures>
                            </Td>
                            <Td numeric>
                              <Figures>{formatNumber(row.size_2)}</Figures>
                            </Td>
                            <Td numeric>
                              <Figures>{formatNumber(row.size_3)}</Figures>
                            </Td>
                            <Td numeric>
                              <Figures>{formatNumber(row.size_4)}</Figures>
                            </Td>
                            <Td numeric>
                              <Figures>{formatNumber(row.size_5)}</Figures>
                            </Td>
                            <Td numeric>
                              <Figures>{formatNumber(row.sessions_over_max)}</Figures>
                            </Td>
                            <Td numeric>
                              <Figures>{formatNumber(row.sessions_empty)}</Figures>
                            </Td>
                            <Td numeric>
                              <Figures className="text-base font-medium">
                                {formatNumber(row.total_sessions)}
                              </Figures>
                            </Td>
                          </Tr>
                        ))}
                      </tbody>
                    </DataTable>
                  )}
                </Panel>
              </div>
            );
          }}
        </QueryBoundary>
      </div>
    </WorkspacePage>
  );
}

/**
 * An absent value. The dash is decoration, so it is hidden from assistive
 * technology and the meaning is written out instead.
 */
function Placeholder() {
  return (
    <>
      <span aria-hidden="true" className="text-ink-2">
        —
      </span>
      <span className="sr-only">chưa có</span>
    </>
  );
}
