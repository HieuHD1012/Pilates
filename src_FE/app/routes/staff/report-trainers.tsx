import { useState } from "react";
import { Link } from "react-router";

import { useTrainerReport } from "~/features/reports/queries";
import type { TrainerReportRow } from "~/lib/api/types";
import { downloadCsv, toCsv } from "~/lib/csv";
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

function fillRate(bookingCount: number, capacity: number): number | null {
  if (capacity <= 0) return null;
  return Math.round((bookingCount / capacity) * 100);
}

/** Most classes first; then most bookings; then Vietnamese collation by name. */
function byTeachingLoad(a: TrainerReportRow, b: TrainerReportRow): number {
  if (b.classCount !== a.classCount) return b.classCount - a.classCount;
  if (b.bookingCount !== a.bookingCount) return b.bookingCount - a.bookingCount;
  return a.fullName.localeCompare(b.fullName, "vi");
}

/**
 * Teaching load per trainer, for a range the user chooses.
 *
 * One table, sorted by the column the question is about — who is carrying the
 * timetable. Fill rate keeps a hairline under the number because it is the one
 * column read across rows rather than down; it is 3rem wide inside a cell whose
 * width the table's own scroll container preserves at 390, so it stays legible
 * instead of collapsing into a smear.
 */
export default function StaffReportTrainers() {
  const [range, setRange] = useState(currentMonth);
  const [exported, setExported] = useState<number | null>(null);
  const query = useTrainerReport(range.from, range.to);

  const rangeError =
    range.from > range.to ? "Phải cùng ngày hoặc sau ngày bắt đầu." : undefined;

  const rows = query.data?.rows;
  const classTotal = (rows ?? []).reduce((sum, row) => sum + row.classCount, 0);

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
            <Button
              size="sm"
              variant="secondary"
              disabled={!rows || rows.length === 0}
              onClick={() => {
                if (!rows) return;
                downloadCsv(
                  `bao-cao-hlv-${range.from}-${range.to}.csv`,
                  toCsv(
                    [
                      "Huấn luyện viên",
                      "Số lớp",
                      "Lượt đăng ký",
                      "Tổng sức chứa",
                      "Tỷ lệ lấp đầy",
                    ],
                    rows.map((row) => [
                      row.fullName,
                      row.classCount,
                      row.bookingCount,
                      row.capacityTotal,
                      // A ratio, written as the studio reads it. Excel gets the
                      // three raw numbers beside it, so nothing is lost.
                      row.capacityTotal > 0
                        ? `${Math.round((row.bookingCount / row.capacityTotal) * 100)}%`
                        : "",
                    ]),
                  ),
                );
                setExported(rows.length);
              }}
            >
              Xuất CSV
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
        Sắp xếp theo số lớp, nhiều nhất trước. Tỉ lệ lấp đầy là lượt đăng ký chia cho sức
        chứa của chính huấn luyện viên đó.
      </p>

      <DemoDataNotice className="mb-3" />

      <QueryBoundary
        query={query}
        skeletonRows={6}
        isEmpty={(report) => report.rows.length === 0}
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
                <Th numeric>Số lớp</Th>
                <Th numeric>Lượt đăng ký</Th>
                <Th numeric>Sức chứa</Th>
                <Th numeric>Tỉ lệ lấp đầy</Th>
              </tr>
            </thead>
            <tbody>
              {[...report.rows].sort(byTeachingLoad).map((row) => {
                const rate = fillRate(row.bookingCount, row.capacityTotal);

                return (
                  <Tr key={row.trainerId}>
                    <Td>
                      {/* Names wrap; a Vietnamese name is never truncated and
                          never hidden behind a hover title. */}
                      <Link
                        to={`/studio/huan-luyen-vien/${row.trainerId}`}
                        className="text-ink decoration-rule-2 underline-offset-[6px] hover:underline"
                      >
                        {row.fullName}
                      </Link>
                    </Td>
                    <Td numeric>
                      <Figures>{formatNumber(row.classCount)}</Figures>
                    </Td>
                    <Td numeric>
                      <Figures>{formatNumber(row.bookingCount)}</Figures>
                    </Td>
                    <Td numeric>
                      <Figures>{formatNumber(row.capacityTotal)}</Figures>
                    </Td>
                    <Td numeric>
                      {rate === null ? (
                        <Placeholder />
                      ) : (
                        <span className="inline-flex flex-col items-end gap-1">
                          <Figures>{rate}%</Figures>
                          <span aria-hidden="true" className="bg-rule block h-px w-12">
                            <span
                              className="bg-ink block h-px transition-[width]"
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </span>
                        </span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </QueryBoundary>

      <LiveRegion
        message={
          exported === null ? null : `Đã xuất ${exported} dòng. Kiểm tra thư mục tải về.`
        }
      />

      <p className="rule-t measure-wide text-ink-2 mt-8 pt-4 text-xs">
        Tệp CSV mở trực tiếp bằng Excel — có BOM UTF-8 và dấu chấm phẩy, nên tiếng Việt
        không bị lỗi phông và các cột không dồn vào một ô. Chưa xuất .xlsx vì việc đó cần
        thêm một thư viện chỉ để phục vụ một báo cáo.
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
