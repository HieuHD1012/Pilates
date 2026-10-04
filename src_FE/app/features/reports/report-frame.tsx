import { NavLink } from "react-router";

import { cn } from "~/lib/cn";
import { formatDate } from "~/lib/format";
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
  question: string;
}[] = [
  {
    to: "/studio/bao-cao/doanh-thu",
    name: "Doanh thu",
    question:
      "Studio đã thu được bao nhiêu trong khoảng ngày này, và bao nhiêu đến từ tiền mặt so với chuyển khoản.",
  },
  {
    to: "/studio/bao-cao/lop-hoc",
    name: "Lớp học",
    question:
      "Đã xếp bao nhiêu lớp, có bao nhiêu lượt đăng ký, và lớp được lấp đầy tới đâu.",
  },
  {
    to: "/studio/bao-cao/huan-luyen-vien",
    name: "Huấn luyện viên",
    question:
      "Mỗi huấn luyện viên được xếp bao nhiêu lớp, hủy bao nhiêu lớp và có bao nhiêu lượt đăng ký.",
  },
];

/**
 * The three reports as compact tabs at the top of each report. Once someone is
 * inside a report the switcher is orientation, so it is names on a hairline,
 * not cards: the index page is where a report is chosen by its question.
 * Navigation, not a filter: each tab is a link, and the current one carries
 * `aria-current="page"` (NavLink sets it) and the copper stroke the rail uses
 * for the open page.
 */
export function ReportSwitcher() {
  return (
    <nav aria-label="Các báo cáo" className="rule-b overflow-x-auto">
      <ul className="flex gap-1">
        {REPORTS.map((report) => (
          <li key={report.to} className="shrink-0">
            <NavLink
              to={report.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center border-b-2 px-3 text-sm whitespace-nowrap",
                  "ease-measure transition-colors duration-200",
                  isActive
                    ? "border-copper text-ink font-medium"
                    : "text-ink-2 hover:text-ink border-transparent",
                )
              }
            >
              {report.name}
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
          <span className="text-ink-2 text-xs">{fetching ? "Đang cập nhật" : null}</span>
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
