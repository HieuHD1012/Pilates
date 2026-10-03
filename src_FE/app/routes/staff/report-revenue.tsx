import { Banknote, Info, Landmark } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import { useRevenueDetail, useRevenueReport } from "~/features/reports/queries";
import { ReportRangeToolbar, ReportSwitcher } from "~/features/reports/report-frame";
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
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import {
  InlineNote,
  Kpi,
  Panel,
  PanelBody,
  PanelHeader,
  WorkspacePage,
} from "~/ui/workspace";

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

const METHOD_ICON: Record<PaymentMethod, ReactNode> = {
  CASH: <Banknote aria-hidden="true" />,
  TRANSFER: <Landmark aria-hidden="true" />,
};

/**
 * The two methods' bars. Copper and amber are the two warm accents the system
 * already has; no chart palette is introduced for a two-way split.
 */
const METHOD_BAR: Record<PaymentMethod, string> = {
  TRANSFER: "bg-copper",
  CASH: "bg-amber",
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

/**
 * Revenue, for a range the user chooses.
 *
 * The one comparison on this screen is cash against transfer — a studio that
 * takes most of its money in cash reconciles differently from one that does
 * not, and that is a decision someone makes. So that pair gets bars, thick
 * enough to compare at a glance (a hairline bar read as a rule, not a
 * quantity). Nothing else does: the transactions are read, not compared
 * visually, so they stay a table.
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

  return (
    <WorkspacePage>
      <PageHeader
        eyebrow={
          <Link to="/studio/bao-cao" className="hover:text-copper">
            Tất cả báo cáo
          </Link>
        }
        title="Báo cáo doanh thu"
        description="Tiền studio đã thu trong khoảng ngày bạn chọn, tách theo hình thức thanh toán và theo từng giao dịch."
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
          {(report) => {
            // Money crosses the network as a decimal string; it is parsed here,
            // at the point of display, and only to rank the methods' bars.
            const total = decimalToNumber(report.total) ?? 0;
            const methods = report.by_method.map((row) => {
              const rowTotal = decimalToNumber(row.total) ?? 0;
              return {
                ...row,
                share: total > 0 ? Math.round((rowTotal / total) * 100) : 0,
              };
            });

            return (
              <div className="flex flex-col gap-5 md:gap-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Kpi
                    label="Tổng doanh thu"
                    value={formatVnd(report.total)}
                    context={
                      <>
                        Chỉ giao dịch đã xác nhận ·{" "}
                        <Figures>{formatNumber(report.payment_count)}</Figures> giao dịch
                      </>
                    }
                  />
                  {methods.map((row) => (
                    <Kpi
                      key={row.method}
                      label={METHOD_LABEL[row.method]}
                      icon={METHOD_ICON[row.method]}
                      value={formatVnd(row.total)}
                      context={
                        <>
                          <Figures>{row.share}%</Figures> ·{" "}
                          <Figures>{formatNumber(row.payment_count)}</Figures> giao dịch
                        </>
                      }
                    />
                  ))}
                </div>

                <InlineNote icon={<Info aria-hidden="true" />}>
                  Chỉ tính các giao dịch đã xác nhận. Giao dịch đang chờ xác nhận và giao
                  dịch đã hủy không được cộng vào bất kỳ con số nào trên trang này.
                </InlineNote>

                <div className="grid gap-5 md:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
                  <Panel className="xl:order-2">
                    <PanelHeader
                      title="Theo hình thức thanh toán"
                      description="Phần trăm là tỉ trọng của hình thức đó trong tổng doanh thu của khoảng ngày."
                    />
                    <PanelBody>
                      <ul className="flex flex-col gap-5">
                        {methods.map((row) => (
                          <li key={row.method} className="min-w-0">
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="text-ink flex items-center gap-2 text-sm">
                                <span
                                  aria-hidden="true"
                                  className={`size-2.5 shrink-0 rounded-xs ${METHOD_BAR[row.method]}`}
                                />
                                {METHOD_LABEL[row.method]}
                              </span>
                              <span className="text-2xl leading-none">
                                <Figures className="text-ink">{row.share}%</Figures>
                              </span>
                            </div>

                            {/* The comparison. The number beside it is the real
                              content; the bar only ranks the two. */}
                            <span
                              aria-hidden="true"
                              className="bg-sand-deep mt-2.5 block h-2.5 w-full overflow-hidden rounded-full"
                            >
                              <span
                                className={`block h-full rounded-full transition-[width] duration-200 ${METHOD_BAR[row.method]}`}
                                style={{ width: `${row.share}%` }}
                              />
                            </span>

                            <p className="text-ink-2 mt-2 text-xs">
                              <Figures className="text-ink">{formatVnd(row.total)}</Figures>
                              <span className="mx-1.5" aria-hidden="true">
                                ·
                              </span>
                              <Figures className="text-ink">
                                {formatNumber(row.payment_count)}
                              </Figures>{" "}
                              giao dịch
                            </p>
                          </li>
                        ))}
                      </ul>
                    </PanelBody>
                  </Panel>

                  <Panel className="xl:order-1">
                    <PanelHeader
                      title="Từng giao dịch"
                      description="Các dòng tạo nên con số trên, cùng khoảng ngày và cùng truy vấn."
                    />
                    {detail.isPending ? (
                      <p className="text-ink-2 px-4 py-4 text-sm md:px-5">
                        Đang tải danh sách.
                      </p>
                    ) : detail.isError ? (
                      <p className="text-ink-2 px-4 py-4 text-sm md:px-5">
                        Không tải được danh sách giao dịch.
                      </p>
                    ) : (detail.data?.length ?? 0) === 0 ? (
                      <p className="text-ink-2 px-4 py-4 text-sm md:px-5">
                        Không có giao dịch nào trong khoảng này.
                      </p>
                    ) : (
                      <>
                        <ul className="md:hidden">
                          {(detail.data ?? []).map((row) => (
                            <li
                              key={row.payment_id}
                              className="rule-b px-4 py-4 last:border-b-0"
                            >
                              <div className="flex items-baseline justify-between gap-4">
                                <p className="text-ink min-w-0 text-sm font-medium">
                                  {row.student_name}
                                </p>
                                <Figures className="text-ink shrink-0 text-lg">
                                  {formatVnd(row.amount)}
                                </Figures>
                              </div>
                              <p className="text-ink-2 mt-1 text-sm">{row.package_name}</p>
                              <p className="text-ink-2 mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs">
                                <MethodLabel method={row.method} />
                                <span aria-hidden="true">·</span>
                                <span>
                                  Xác nhận lúc{" "}
                                  <Figures className="text-ink">
                                    {formatTime(row.confirmed_at)}{" "}
                                    {formatDate(row.confirmed_at)}
                                  </Figures>
                                </span>
                              </p>
                            </li>
                          ))}
                        </ul>
                        <div className="hidden md:block">
                          <DataTable caption="Giao dịch đã xác nhận" minWidth="40rem">
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
                                  <Td className="whitespace-nowrap">
                                    <Figures>{formatDate(row.confirmed_at)}</Figures>
                                    <Figures className="text-ink-2 mt-0.5 block text-xs">
                                      {formatTime(row.confirmed_at)}
                                    </Figures>
                                  </Td>
                                  <Td className="font-medium">{row.student_name}</Td>
                                  <Td className="text-ink-2">{row.package_name}</Td>
                                  <Td className="text-ink-2">
                                    <MethodLabel method={row.method} />
                                  </Td>
                                  <Td numeric>
                                    <Figures className="text-base whitespace-nowrap">
                                      {formatVnd(row.amount)}
                                    </Figures>
                                  </Td>
                                </Tr>
                              ))}
                            </tbody>
                          </DataTable>
                        </div>
                      </>
                    )}
                  </Panel>
                </div>
              </div>
            );
          }}
        </QueryBoundary>
      </div>
    </WorkspacePage>
  );
}

function MethodLabel({ method }: { method: PaymentMethod }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap [&>svg]:size-3.5 [&>svg]:shrink-0">
      {METHOD_ICON[method]}
      {METHOD_LABEL[method]}
    </span>
  );
}
