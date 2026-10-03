import { CalendarDays, UserRound, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";

import { cn } from "~/lib/cn";
import { formatDate } from "~/lib/format";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Field, Input } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { Panel, Toolbar } from "~/ui/workspace";

/**
 * The frame the three report screens share: which reports exist, the switcher
 * across them, and the range toolbar. The routes here are the routes in
 * app/routes.ts — an index that links to a path that does not exist is worse
 * than no index at all.
 */
export const REPORTS: {
  to: string;
  name: string;
  /** One line, for the switcher at the top of each report. */
  short: string;
  question: string;
  icon: ReactNode;
}[] = [
  {
    to: "/studio/bao-cao/doanh-thu",
    name: "Doanh thu",
    short: "Studio đã thu bao nhiêu",
    question:
      "Studio đã thu được bao nhiêu trong khoảng ngày này, và bao nhiêu đến từ tiền mặt so với chuyển khoản.",
    icon: <Wallet aria-hidden="true" />,
  },
  {
    to: "/studio/bao-cao/lop-hoc",
    name: "Lớp học",
    short: "Lớp được lấp đầy tới đâu",
    question:
      "Đã xếp bao nhiêu lớp, có bao nhiêu lượt đăng ký, và lớp được lấp đầy tới đâu.",
    icon: <CalendarDays aria-hidden="true" />,
  },
  {
    to: "/studio/bao-cao/huan-luyen-vien",
    name: "Huấn luyện viên",
    short: "Ai dạy bao nhiêu lớp",
    question:
      "Mỗi huấn luyện viên được xếp bao nhiêu lớp, hủy bao nhiêu lớp và có bao nhiêu lượt đăng ký.",
    icon: <UserRound aria-hidden="true" />,
  },
];

/**
 * The three reports as a row of selectable cards at the top of each report.
 * Navigation, not a filter: each card is a link, and the current one carries
 * `aria-current="page"` (NavLink sets it).
 */
export function ReportSwitcher() {
  return (
    <nav aria-label="Các báo cáo">
      <ul className="grid grid-cols-3 gap-2 lg:flex lg:flex-wrap">
        {REPORTS.map((report) => (
          <li key={report.to} className="flex">
            <NavLink
              to={report.to}
              end
              className={({ isActive }) =>
                cn(
                  // On a phone the three sit side by side as names only; the
                  // icon and the one-line question return from sm up.
                  "bg-paper flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border px-2 py-2 text-center",
                  "sm:justify-start sm:py-2.5 sm:pr-4 sm:pl-3 sm:text-left",
                  "ease-measure transition-colors duration-200",
                  isActive
                    ? "border-copper ring-copper ring-1"
                    : "border-rule hover:border-rule-2",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "hidden size-8 shrink-0 place-items-center rounded-md sm:grid [&_svg]:size-4",
                      isActive ? "bg-copper-wash text-copper" : "bg-sand-deep text-ink-2",
                    )}
                  >
                    {report.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="text-ink block text-sm font-medium">
                      {report.name}
                    </span>
                    <span className="text-ink-2 hidden text-xs sm:block">
                      {report.short}
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A date key rendered as a Vietnamese date. Backend sends "2026-08-18". */
function dayLabel(dateKey: string): string {
  return formatDate(`${dateKey}T00:00:00+07:00`);
}

export interface ReportRange {
  from: string;
  to: string;
}

/**
 * The range every report is read over, as one toolbar: the two date fields,
 * the range written out, and a quiet note while a new range loads. The range
 * check is the same one each report used to carry; it does not stop the query.
 */
export function ReportRangeToolbar({
  range,
  onChange,
  fetching,
}: {
  range: ReportRange;
  onChange: (update: (current: ReportRange) => ReportRange) => void;
  fetching: boolean;
}) {
  const rangeError =
    range.from > range.to ? "Phải cùng ngày hoặc sau ngày bắt đầu." : undefined;

  return (
    // The panel draws its own edge, so the toolbar's bottom rule is dropped.
    <Panel as="div">
      <Toolbar
        className="border-b-0! py-3.5 md:px-5"
        trailing={
          <>
            <span className="text-ink-2 text-xs">{fetching ? "Đang cập nhật" : null}</span>
            <DemoDataNotice />
          </>
        }
      >
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-start">
          <Field label="Từ ngày" className="w-full sm:w-44">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={range.from}
                onChange={(event) =>
                  onChange((current) => ({ ...current, from: event.target.value }))
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
                  onChange((current) => ({ ...current, to: event.target.value }))
                }
              />
            )}
          </Field>

          <p className="text-ink-2 text-sm sm:self-end sm:pb-3">
            <Figures className="text-ink">{dayLabel(range.from)}</Figures>
            <span className="mx-1">–</span>
            <Figures className="text-ink">{dayLabel(range.to)}</Figures>
          </p>
        </div>
      </Toolbar>
    </Panel>
  );
}
