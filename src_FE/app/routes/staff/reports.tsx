import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { REPORTS } from "~/features/reports/report-frame";
import { useUnconfirmedPayments } from "~/features/reports/queries";
import { formatVnd, formatDate } from "~/lib/format";
import { QueryBoundary } from "~/ui/query-boundary";
import { cn } from "~/lib/cn";
import { PageHeader } from "~/ui/layout";
import { WorkspacePage, Panel, PanelHeader, PanelBody } from "~/ui/workspace";

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
  const pending = useUnconfirmedPayments();
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
      <Panel>
        <PanelHeader
          title="Khoản thu chờ xác nhận quá 7 ngày"
          description="Gói đã được cộng buổi nhưng khoản thu chưa được xác nhận. Kiểm tra lại với người phụ trách trước khi xác nhận tiền."
        />
        <PanelBody>
          <QueryBoundary
            query={pending}
            emptyTitle="Không có khoản thu quá hạn xác nhận"
            errorDescription="Chưa tải được khoản thu cần kiểm tra."
          >
            {(items) => (
              <ul className="divide-rule divide-y">
                {items.map((item) => (
                  <li
                    key={item.payment_id}
                    className="flex flex-wrap justify-between gap-3 py-3"
                  >
                    <div>
                      <Link
                        to={`/studio/hoc-vien/${item.student_id}`}
                        className="text-ink text-sm underline underline-offset-4"
                      >
                        {item.student_name}
                      </Link>
                      <p className="text-ink-2 text-sm">
                        {item.package_name} · {formatVnd(item.amount)}
                      </p>
                      <p className="text-ink-2 text-xs">
                        Ghi nhận {formatDate(item.recorded_at)} · chờ {item.days_pending}{" "}
                        ngày
                      </p>
                    </div>
                    <Link
                      to="/studio/thanh-toan"
                      className="text-copper text-sm underline underline-offset-4"
                    >
                      Mở thanh toán
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </PanelBody>
      </Panel>

      <p className="measure-wide text-ink-2 text-xs">
        Chọn báo cáo để xem số liệu theo khoảng ngày. Báo cáo huấn luyện viên có thể tải
        dưới dạng CSV hoặc Excel.
      </p>
    </WorkspacePage>
  );
}
