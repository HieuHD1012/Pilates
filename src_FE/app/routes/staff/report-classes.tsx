import { useState } from "react";
import { Link } from "react-router";

import { useClassReport, useTrainerClassSizes } from "~/features/reports/queries";
import { formatDate, formatNumber, studioDateKey } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Field, Input } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { FilterBar, Metric, PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";

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

function dayLabel(dateKey: string): string {
  return formatDate(`${dateKey}T00:00:00+07:00`);
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

  const rangeError =
    range.from > range.to ? "Phải cùng ngày hoặc sau ngày bắt đầu." : undefined;

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Báo cáo lớp học"
        description="Số lớp đã xếp, lượt đăng ký và mức lấp đầy trong khoảng ngày bạn chọn."
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link to="/studio/bao-cao">Tất cả báo cáo</Link>
          </Button>
        }
        meta={
          <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
            <div className="flex items-baseline gap-2">
              <dt>Khoảng ngày</dt>
              <dd>
                <Figures className="text-ink">{dayLabel(range.from)}</Figures>
                <span className="mx-1">–</span>
                <Figures className="text-ink">{dayLabel(range.to)}</Figures>
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
        <Field label="Từ ngày" className="w-full sm:w-44">
          {({ id }) => (
            <Input
              id={id}
              type="date"
              value={range.from}
              onChange={(event) =>
                setRange((current) => ({ ...current, from: event.target.value }))
              }
            />
          )}
        </Field>

        <Field label="Đến ngày" error={rangeError} className="w-full sm:w-44">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              value={range.to}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              onChange={(event) =>
                setRange((current) => ({ ...current, to: event.target.value }))
              }
            />
          )}
        </Field>
      </FilterBar>

      <DemoDataNotice className="mb-3" />

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
          // to the cell — see the note above.
          const overall =
            report.fill_rate === null ? null : Math.round(report.fill_rate * 100);

          return (
            <>
              <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Lớp đã xếp"
                  value={
                    <Figures display>{formatNumber(report.scheduled_sessions)}</Figures>
                  }
                  unit="lớp"
                  detail={`${formatNumber(report.cancelled_sessions)} lớp đã hủy`}
                />
                <Metric
                  label="Lượt đăng ký"
                  value={<Figures display>{formatNumber(report.total_bookings)}</Figures>}
                  unit="lượt"
                />
                <Metric
                  label="Sức chứa"
                  value={<Figures display>{formatNumber(report.total_capacity)}</Figures>}
                  unit="chỗ"
                />
                <Metric
                  label="Tỉ lệ lấp đầy"
                  value={
                    overall === null ? (
                      <Placeholder />
                    ) : (
                      <Figures display>{overall}</Figures>
                    )
                  }
                  unit={overall === null ? undefined : "%"}
                  detail="Lượt đăng ký chia cho sức chứa."
                />
              </div>

              <section className="mt-10">
                <h2 className="text-ink text-sm font-medium">Sĩ số theo huấn luyện viên</h2>
                <p className="measure-wide text-ink-2 mt-1 mb-4 text-xs">
                  Mỗi dòng là số lớp của một huấn luyện viên theo sĩ số. Cột “không ai đăng
                  ký” là lớp đã xếp nhưng không diễn ra — không phải lớp bị hủy.
                </p>

                {sizes.isPending ? (
                  <p className="rule-t text-ink-2 pt-4 text-xs">Đang tải bảng sĩ số.</p>
                ) : sizes.isError ? (
                  <p className="rule-t text-ink-2 pt-4 text-xs">
                    Không tải được bảng sĩ số.
                  </p>
                ) : (sizes.data?.length ?? 0) === 0 ? (
                  <p className="rule-t text-ink-2 pt-4 text-xs">
                    Không có lớp nào trong khoảng này.
                  </p>
                ) : (
                  <DataTable caption="Số lớp theo sĩ số" minWidth="46rem">
                    <thead>
                      <tr>
                        <Th>Huấn luyện viên</Th>
                        <Th numeric>1</Th>
                        <Th numeric>2</Th>
                        <Th numeric>3</Th>
                        <Th numeric>4</Th>
                        <Th numeric>5</Th>
                        <Th numeric>Trên 5</Th>
                        <Th numeric>Không ai đăng ký</Th>
                        <Th numeric>Tổng</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sizes.data ?? []).map((row) => (
                        <Tr key={row.trainer_id}>
                          <Td>{row.trainer_name}</Td>
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
                            <Figures>{formatNumber(row.total_sessions)}</Figures>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </DataTable>
                )}
              </section>
            </>
          );
        }}
      </QueryBoundary>
    </div>
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
