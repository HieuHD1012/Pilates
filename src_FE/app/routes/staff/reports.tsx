import { Panel } from "~/ui/workspace";
import { Link } from "react-router";

import { PageHeader } from "~/ui/layout";

import type { Route } from "./+types/reports";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Báo cáo — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The reports index.
 *
 * Three destinations, each accompanied by the question it answers. The routes here are the routes in
 * app/routes.ts — an index that links to a path that does not exist is worse
 * than no index at all.
 */
const REPORTS = [
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

export default function StaffReports() {
  return (
    <div className="workspace-page">
      <PageHeader
        title="Báo cáo"
        description="Ba báo cáo, mỗi báo cáo trả lời một câu hỏi. Khoảng ngày được chọn ngay trong từng báo cáo."
      />

      <Panel className="mt-6 px-5 sm:px-6">
        <ul className="rule-t mt-6">
          {REPORTS.map((report) => (
            <li key={report.to} className="rule-b">
              <Link
                to={report.to}
                className="hover:bg-sand-deep/50 active:bg-sand-deep ease-measure flex items-start justify-between gap-6 py-5 transition-colors duration-200"
              >
                <span className="min-w-0">
                  <span className="text-ink block text-base">{report.name}</span>
                  <span className="measure-wide text-ink-2 mt-1 block text-sm">
                    {report.question}
                  </span>
                </span>
                {/* Decoration, not information: the row is already a link. */}
                <span aria-hidden="true" className="text-ink-3 shrink-0 pt-1 text-sm">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="rule-t measure-wide text-ink-2 mt-10 pt-4 text-xs">
        Chọn báo cáo để xem số liệu theo khoảng ngày. Báo cáo huấn luyện viên có thể tải
        dưới dạng CSV hoặc Excel.
      </p>
    </div>
  );
}
