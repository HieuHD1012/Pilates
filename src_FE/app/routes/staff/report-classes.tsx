import { useState } from "react";
import { Link } from "react-router";

import { useClassReport } from "~/features/reports/queries";
import type { ClassType } from "~/lib/api/types";
import { formatDate, formatNumber, studioDateKey, weekdayShort } from "~/lib/format";
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

const TYPE_LABEL: Record<ClassType, string> = {
  group: "Lớp nhóm",
  private: "Lớp riêng",
};

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
 * Bookings over capacity, as a whole percentage. `null` when there is no
 * capacity to divide by — an empty range must not render "NaN%" or a
 * confident-looking zero.
 */
function fillRate(bookingCount: number, capacity: number): number | null {
  if (capacity <= 0) return null;
  return Math.round((bookingCount / capacity) * 100);
}

/**
 * Classes and how full they were, for a range the user chooses.
 *
 * The comparison worth drawing is group against private fill rate: it is the
 * question behind "should we schedule another group slot or another private
 * hour". Two hairline bars, both labelled, each with its percentage written
 * out. The daily figures stay a table — they are looked up, not ranked.
 */
export default function StaffReportClasses() {
  const [range, setRange] = useState(currentMonth);
  const query = useClassReport(range.from, range.to);

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
        isEmpty={(report) => report.classCount === 0}
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
          const overall = fillRate(report.bookingCount, report.capacityTotal);

          return (
            <>
              <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Số lớp"
                  value={<Figures display>{formatNumber(report.classCount)}</Figures>}
                  unit="lớp"
                />
                <Metric
                  label="Lượt đăng ký"
                  value={<Figures display>{formatNumber(report.bookingCount)}</Figures>}
                  unit="lượt"
                />
                <Metric
                  label="Sức chứa"
                  value={<Figures display>{formatNumber(report.capacityTotal)}</Figures>}
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
                <h2 className="text-ink text-sm font-medium">Theo hình thức lớp</h2>
                <p className="measure-wide text-ink-2 mt-1 text-xs">
                  Vạch bên dưới mỗi hình thức là tỉ lệ lấp đầy của chính hình thức đó, không
                  phải tỉ trọng trong tổng số lớp.
                </p>

                <ul className="rule-t mt-4">
                  {report.byType.map((row) => {
                    const rate = fillRate(row.bookingCount, row.capacity);

                    return (
                      <li key={row.type} className="rule-b py-4">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-ink text-sm">{TYPE_LABEL[row.type]}</span>
                          <span className="text-ink-2 shrink-0 text-xs">
                            Tỉ lệ lấp đầy{" "}
                            {rate === null ? (
                              <Placeholder />
                            ) : (
                              <Figures className="text-ink text-sm">{rate}%</Figures>
                            )}
                          </span>
                        </div>

                        {rate === null ? null : (
                          <span
                            aria-hidden="true"
                            className="bg-rule mt-2.5 block h-px w-full"
                          >
                            <span
                              className="bg-ink block h-px transition-[width]"
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </span>
                        )}

                        <p className="text-ink-2 mt-1.5 text-xs">
                          <Figures className="text-ink">
                            {formatNumber(row.classCount)}
                          </Figures>{" "}
                          lớp ·{" "}
                          <Figures className="text-ink">
                            {formatNumber(row.bookingCount)}
                          </Figures>
                          /
                          <Figures className="text-ink">
                            {formatNumber(row.capacity)}
                          </Figures>{" "}
                          chỗ đã đăng ký
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="mt-10">
                <h2 className="text-ink mb-4 text-sm font-medium">Theo ngày</h2>

                {report.byDay.length === 0 ? (
                  <p className="rule-t text-ink-2 pt-4 text-xs">
                    Không có ngày nào có lớp trong khoảng này.
                  </p>
                ) : (
                  <DataTable caption="Lớp học theo ngày" minWidth="26rem">
                    <thead>
                      <tr>
                        <Th>Ngày</Th>
                        <Th numeric>Số lớp</Th>
                        <Th numeric>Lượt đăng ký</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byDay.map((row) => (
                        <Tr key={row.date}>
                          <Td>
                            <span className="text-ink-2 mr-2 text-xs">
                              {weekdayShort(`${row.date}T00:00:00+07:00`)}
                            </span>
                            <Figures className="whitespace-nowrap">
                              {dayLabel(row.date)}
                            </Figures>
                          </Td>
                          <Td numeric>
                            <Figures>{formatNumber(row.classCount)}</Figures>
                          </Td>
                          <Td numeric>
                            <Figures>{formatNumber(row.bookingCount)}</Figures>
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
