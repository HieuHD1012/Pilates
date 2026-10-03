import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { REPORTS } from "~/features/reports/report-frame";
import { cn } from "~/lib/cn";
import { PageHeader } from "~/ui/layout";
import { WorkspacePage } from "~/ui/workspace";

import type { Route } from "./+types/reports";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Báo cáo — J Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The reports index.
 *
 * Three cards, three questions. Each card leads with the sentence it answers,
 * not an icon: a report is chosen by reading the question, and the icon only
 * repeats it. The routes here are the routes in app/routes.ts — an index that
 * links to a path that does not exist is worse than no index at all.
 */
const ICON_TILE =
  "bg-sand-deep text-copper grid size-9 shrink-0 place-items-center rounded-md [&_svg]:size-4.5";

export default function StaffReports() {
  return (
    <WorkspacePage>
      <PageHeader
        title="Báo cáo"
        description="Ba báo cáo, mỗi báo cáo trả lời một câu hỏi. Khoảng ngày được chọn ngay trong từng báo cáo."
      />

      <ul className="grid gap-4 md:grid-cols-3">
        {REPORTS.map((report) => (
          <li key={report.to} className="flex">
            <Link
              to={report.to}
              className={cn(
                "group border-rule bg-paper flex w-full flex-col gap-3 rounded-lg border p-5",
                "hover:border-copper ease-measure transition-colors duration-200",
              )}
            >
              <span className={ICON_TILE}>{report.icon}</span>
              <span className="text-ink text-base font-semibold">{report.name}</span>
              <span className="text-ink-2 text-sm">{report.question}</span>
              <span className="text-copper group-hover:text-copper-2 mt-auto inline-flex items-center gap-1.5 pt-2 text-sm">
                Mở báo cáo
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="measure-wide text-ink-2 text-xs">
        Chọn báo cáo để xem số liệu theo khoảng ngày. Báo cáo huấn luyện viên có thể tải
        dưới dạng CSV hoặc Excel.
      </p>
    </WorkspacePage>
  );
}
