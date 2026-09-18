import { useState } from "react";
import { Link } from "react-router";

import { useReportExport, useTrainerReport } from "~/features/reports/queries";
import type { TrainerStatsResponse } from "~/lib/api/schema";
import { formatDate, formatNumber, studioDateKey } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Field, Input } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { FilterBar, PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/report-trainers";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Báo cáo huấn luyện viên — Soul Pilates" },
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

  const rangeError =
    range.from > range.to ? "Phải cùng ngày hoặc sau ngày bắt đầu." : undefined;

  const rows = query.data;
  const classTotal = (rows ?? []).reduce((sum, row) => sum + row.scheduled_sessions, 0);

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Báo cáo huấn luyện viên"
        description="Mỗi huấn luyện viên dạy bao nhiêu lớp trong khoảng ngày, và lớp của họ được lấp đầy tới đâu."
        actions={
          <>
            <Button asChild size="sm" variant="secondary">
              <Link to="/studio/bao-cao">Tất cả báo cáo</Link>
            </Button>
            {/* The file comes from the server's own query, not from the rows
                on screen: same period, same filters, and nothing lost to
                whatever this table happens to have fetched. */}
            <Button
              size="sm"
              variant="secondary"
              pending={download.isPending}
              onClick={() => download.mutate({ ...params, format: "csv" })}
            >
              Xuất CSV
            </Button>
            <Button
              size="sm"
              variant="secondary"
              pending={download.isPending}
              onClick={() => download.mutate({ ...params, format: "xlsx" })}
            >
              Xuất Excel
            </Button>
          </>
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
            <div className="flex items-baseline gap-2">
              <dt>Huấn luyện viên</dt>
              <dd>
                {rows ? (
                  <Figures className="text-ink">{formatNumber(rows.length)}</Figures>
                ) : (
                  <Placeholder />
                )}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Tổng số lớp</dt>
              <dd>
                {rows ? (
                  <Figures className="text-ink">{formatNumber(classTotal)}</Figures>
                ) : (
                  <Placeholder />
                )}
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

      <p className="measure-wide text-ink-2 mb-3 text-xs">
        Sắp xếp theo số lớp đã xếp, nhiều nhất trước. Lớp đã hủy được đếm riêng, không trừ
        vào cột số lớp.
      </p>

      <DemoDataNotice className="mb-3" />

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
        {(report) => (
          <DataTable
            caption="Số lớp và tỉ lệ lấp đầy theo huấn luyện viên"
            minWidth="44rem"
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
              {[...report].sort(byTeachingLoad).map((row) => (
                <Tr key={row.trainer_id}>
                  <Td>
                    {/* Names wrap; a Vietnamese name is never truncated and
                        never hidden behind a hover title. */}
                    <Link
                      to={`/studio/huan-luyen-vien/${row.trainer_id}`}
                      className="text-ink decoration-rule-2 underline-offset-[6px] hover:underline"
                    >
                      {row.trainer_name}
                    </Link>
                  </Td>
                  <Td numeric>
                    <Figures>{formatNumber(row.scheduled_sessions)}</Figures>
                  </Td>
                  <Td numeric>
                    <Figures>{formatNumber(row.cancelled_sessions)}</Figures>
                  </Td>
                  <Td numeric>
                    <Figures>{formatNumber(row.total_bookings)}</Figures>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </QueryBoundary>

      <LiveRegion
        message={
          download.isSuccess
            ? "Đã tải tệp báo cáo. Kiểm tra thư mục tải về."
            : download.isError
              ? "Chưa tải được tệp báo cáo."
              : null
        }
      />

      <p className="rule-t measure-wide text-ink-2 mt-8 pt-4 text-xs">
        Tệp được sinh ở máy chủ từ đúng truy vấn của bảng này, nên con số trong tệp và con
        số trên màn hình luôn khớp. Chọn CSV để mở nhanh bằng Excel, hoặc Excel để giữ định
        dạng cột.
      </p>
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
