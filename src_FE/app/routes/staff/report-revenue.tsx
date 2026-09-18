import { useState } from "react";
import { Link } from "react-router";

import { useRevenueDetail, useRevenueReport } from "~/features/reports/queries";
import type { PaymentMethod } from "~/lib/api/schema";
import {
  decimalToNumber,
  formatDate,
  formatNumber,
  formatTime,
  formatVnd,
  studioDateKey,
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
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
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
  const params = { period_start: range.from, period_end: range.to };
  const query = useRevenueReport(params);
  // The rows behind the number, from the same period and the same query on the
  // server. `detail_path` names this route; it is fetched here rather than
  // linked so the total and its rows can never be read from two periods.
  const detail = useRevenueDetail(params, query.isSuccess);

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
        isEmpty={(report) => report.payment_count === 0}
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
                value={<Figures display>{formatNumber(report.payment_count)}</Figures>}
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
                {report.by_method.map((row) => {
                  // Money crosses the network as a decimal string; it is parsed
                  // here, at the point of display, and only to rank two bars.
                  const total = decimalToNumber(report.total) ?? 0;
                  const rowTotal = decimalToNumber(row.total) ?? 0;
                  const share = total > 0 ? Math.round((rowTotal / total) * 100) : 0;

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
                        <Figures className="text-ink">
                          {formatNumber(row.payment_count)}
                        </Figures>{" "}
                        giao dịch
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="text-ink text-sm font-medium">Từng giao dịch</h2>
              <p className="measure-wide text-ink-2 mt-1 mb-4 text-xs">
                Các dòng tạo nên con số trên, cùng khoảng ngày và cùng truy vấn.
              </p>

              {detail.isPending ? (
                <p className="rule-t text-ink-2 pt-4 text-xs">Đang tải danh sách.</p>
              ) : detail.isError ? (
                <p className="rule-t text-ink-2 pt-4 text-xs">
                  Không tải được danh sách giao dịch.
                </p>
              ) : (detail.data?.length ?? 0) === 0 ? (
                <p className="rule-t text-ink-2 pt-4 text-xs">
                  Không có giao dịch nào trong khoảng này.
                </p>
              ) : (
                <DataTable caption="Giao dịch đã xác nhận" minWidth="44rem">
                  <thead>
                    <tr>
                      <Th>Xác nhận lúc</Th>
                      <Th>Học viên</Th>
                      <Th>Gói tập</Th>
                      <Th>Hình thức</Th>
                      <Th numeric>Số tiền</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.data ?? []).map((row) => (
                      <Tr key={row.payment_id}>
                        <Td>
                          <Figures className="whitespace-nowrap">
                            {formatTime(row.confirmed_at)} {formatDate(row.confirmed_at)}
                          </Figures>
                        </Td>
                        <Td>{row.student_name}</Td>
                        <Td>{row.package_name}</Td>
                        <Td>{METHOD_LABEL[row.method]}</Td>
                        <Td numeric>
                          <Figures className="whitespace-nowrap">
                            {formatVnd(row.amount)}
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
