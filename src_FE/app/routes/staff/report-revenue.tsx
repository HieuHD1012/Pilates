import { useState } from "react";
import { Link } from "react-router";

import { useRevenueReport } from "~/features/reports/queries";
import type { PaymentMethod } from "~/lib/api/types";
import {
  formatDate,
  formatNumber,
  formatVnd,
  studioDateKey,
  weekdayShort,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Field, Input } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { FilterBar, Metric, PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/report-revenue";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Báo cáo doanh thu — Soul Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
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

/** A date key rendered as a Vietnamese date. Backend sends "2026-08-18". */
function dayLabel(dateKey: string): string {
  return formatDate(`${dateKey}T00:00:00+07:00`);
}

/**
 * Revenue, for a range the user chooses.
 *
 * The one comparison on this screen is cash against transfer — a studio that
 * takes most of its money in cash reconciles differently from one that does
 * not, and that is a decision someone makes. So that pair gets hairline bars.
 * Nothing else does: the day-by-day figures are read, not compared visually,
 * so they stay a table.
 *
 * Every number here is the backend's arithmetic. The frontend never sums
 * payments itself, or two screens end up disagreeing about revenue.
 */
export default function StaffReportRevenue() {
  const [range, setRange] = useState(currentMonth);
  const query = useRevenueReport(range.from, range.to);

  const rangeError =
    range.from > range.to ? "Phải cùng ngày hoặc sau ngày bắt đầu." : undefined;

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Báo cáo doanh thu"
        description="Tiền studio đã thu trong khoảng ngày bạn chọn, tách theo hình thức thanh toán và theo ngày."
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
        isEmpty={(report) => report.transactionCount === 0}
        emptyTitle="Chưa có giao dịch đã xác nhận"
        emptyDescription="Trong khoảng ngày này không có giao dịch nào đã xác nhận. Kiểm tra lại khoảng ngày, hoặc xác nhận giao dịch ở màn hình thanh toán."
        emptyAction={
          <Button asChild variant="secondary">
            <Link to="/studio/thanh-toan">Mở màn hình thanh toán</Link>
          </Button>
        }
        errorDescription="Không tải được báo cáo doanh thu."
        showErrorDetail
      >
        {(report) => (
          <>
            <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <Metric
                label="Tổng doanh thu"
                value={<Figures display>{formatVnd(report.total)}</Figures>}
              />
              <Metric
                label="Số giao dịch"
                value={<Figures display>{formatNumber(report.transactionCount)}</Figures>}
                unit="giao dịch"
              />
            </div>

            <p className="measure-wide text-ink-2 mt-5 text-xs">
              Chỉ tính các giao dịch đã xác nhận. Giao dịch đang chờ xác nhận và giao dịch
              đã hủy không được cộng vào bất kỳ con số nào trên trang này.
            </p>

            <section className="mt-10">
              <h2 className="text-ink text-sm font-medium">Theo hình thức thanh toán</h2>
              <p className="measure-wide text-ink-2 mt-1 text-xs">
                Phần trăm là tỉ trọng của hình thức đó trong tổng doanh thu của khoảng ngày.
              </p>

              <ul className="rule-t mt-4">
                {report.byMethod.map((row) => {
                  const share =
                    report.total > 0 ? Math.round((row.total / report.total) * 100) : 0;

                  return (
                    <li key={row.method} className="rule-b py-4">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-ink text-sm">{METHOD_LABEL[row.method]}</span>
                        <Figures className="text-ink text-sm">
                          {formatVnd(row.total)}
                        </Figures>
                      </div>

                      <div className="mt-2.5 flex items-center gap-3">
                        {/* The comparison, drawn as the hairline this system
                            already uses for capacity. The number beside it is
                            the real content; the bar only ranks the two. */}
                        <span aria-hidden="true" className="bg-rule block h-px flex-1">
                          <span
                            className="bg-ink block h-px transition-[width]"
                            style={{ width: `${share}%` }}
                          />
                        </span>
                        <span className="text-ink-2 shrink-0 text-xs whitespace-nowrap">
                          <Figures className="text-ink">{share}%</Figures> tổng doanh thu
                        </span>
                      </div>

                      <p className="text-ink-2 mt-1.5 text-xs">
                        <Figures className="text-ink">{formatNumber(row.count)}</Figures>{" "}
                        giao dịch
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
                  Không có ngày nào phát sinh doanh thu trong khoảng này.
                </p>
              ) : (
                <DataTable caption="Doanh thu theo ngày" minWidth="20rem">
                  <thead>
                    <tr>
                      <Th>Ngày</Th>
                      <Th numeric>Doanh thu</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byDay.map((row, index) => (
                      <Tr key={`${row.date}-${index}`}>
                        <Td>
                          <span className="text-ink-2 mr-2 text-xs">
                            {weekdayShort(`${row.date}T00:00:00+07:00`)}
                          </span>
                          <Figures className="whitespace-nowrap">
                            {dayLabel(row.date)}
                          </Figures>
                        </Td>
                        <Td numeric>
                          <Figures className="whitespace-nowrap">
                            {formatVnd(row.total)}
                          </Figures>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </section>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
