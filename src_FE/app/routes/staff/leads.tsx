import { useState } from "react";
import { Link } from "react-router";

import { useLeads } from "~/features/leads/queries";
import type { Lead, LeadStatus } from "~/lib/api/types";
import { formatDate, formatPhone, formatTime, telHref } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Field, Select } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { FilterBar, PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/leads";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Khách quan tâm — Soul Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

/**
 * The consultation CRM list — the first screen a new enquiry touches.
 *
 * The winning subject is the person who enquired, so the name is the only link
 * in the row and every other column is an attribute of that person. There is no
 * conversion funnel chart here: the only question this screen answers is "who
 * has not been called back yet", and a count in the header answers it.
 *
 * The status vocabulary below is deliberately duplicated in lead-detail.tsx
 * rather than abstracted: two screens is not a pattern. If a third surface needs
 * it, it moves into ~/features/leads.
 */

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  scheduled: "Đã hẹn",
  converted: "Đã thành học viên",
  lost: "Không tiếp tục",
};

const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  new: "info",
  contacted: "neutral",
  scheduled: "attention",
  converted: "positive",
  // Not a failure state: a person who chose not to continue is simply closed.
  lost: "neutral",
};

const STATUS_ORDER: LeadStatus[] = ["new", "contacted", "scheduled", "converted", "lost"];

/** `source` is a free string from the backend, so unknown values pass through. */
const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  zalo: "Zalo",
  facebook: "Facebook",
  "walk-in": "Đến trực tiếp",
  referral: "Người quen giới thiệu",
};

function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

export default function StaffLeads() {
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const query = useLeads(status);

  const items = query.data ?? [];
  const newCount = items.filter((item) => item.status === "new").length;

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Khách quan tâm"
        description="Người để lại thông tin tư vấn, mới nhất trước. Mở một khách để ghi nhận kết quả liên hệ."
        meta={
          <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
            <div className="flex items-baseline gap-2">
              <dt>Đang hiển thị</dt>
              <dd>
                <Figures className="text-ink">{items.length}</Figures>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Chưa liên hệ</dt>
              <dd>
                <Figures className={newCount > 0 ? "text-lacquer" : "text-ink"}>
                  {newCount}
                </Figures>
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
        <Field label="Trạng thái" className="w-56">
          {({ id }) => (
            <Select
              id={id}
              value={status}
              onChange={(event) => setStatus(event.target.value as LeadStatus | "all")}
            >
              <option value="all">Tất cả</option>
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FilterBar>

      <DemoDataNotice className="mb-3" />

      <QueryBoundary
        query={query}
        skeletonRows={6}
        showErrorDetail
        errorDescription="Không tải được danh sách khách quan tâm. Kiểm tra kết nối rồi thử lại."
        emptyTitle={
          status === "all"
            ? "Chưa có khách quan tâm nào"
            : "Không có khách ở trạng thái này"
        }
        emptyDescription={
          status === "all"
            ? "Thông tin gửi từ form tư vấn trên website sẽ xuất hiện ở đây."
            : "Bộ lọc đang thu hẹp kết quả. Xem tất cả để thấy những khách ở trạng thái khác."
        }
        emptyAction={
          status === "all" ? undefined : (
            <Button variant="secondary" onClick={() => setStatus("all")}>
              Xem tất cả
            </Button>
          )
        }
      >
        {(leads) => {
          const sorted = [...leads].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

          return (
            <>
              <div className="hidden lg:block">
                <LeadTable leads={sorted} />
              </div>
              <div className="lg:hidden">
                <LeadList leads={sorted} />
              </div>
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

/**
 * Desktop: a wide table that scrolls inside its own box. The need column wraps —
 * a Vietnamese sentence about a lower-back problem is the reason staff pick up
 * the phone, so it is never truncated to keep a column tidy.
 */
function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <DataTable caption="Khách quan tâm, mới nhất trước" minWidth="50rem">
      <thead>
        <tr>
          <Th>Tên</Th>
          <Th>Điện thoại</Th>
          <Th>Nhu cầu</Th>
          <Th>Nguồn</Th>
          <Th numeric>Nhận lúc</Th>
          <Th>Trạng thái</Th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <Tr key={lead.id}>
            <Td className="align-top">
              <Link
                to={`/studio/khach-quan-tam/${lead.id}`}
                className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
              >
                {lead.fullName}
              </Link>
            </Td>
            <Td className="align-top">
              <a
                href={telHref(lead.phone)}
                className="figures text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer whitespace-nowrap underline underline-offset-[6px]"
              >
                {formatPhone(lead.phone)}
              </a>
            </Td>
            <Td className="align-top">
              <span className="block max-w-[24rem]">{needText(lead.need)}</span>
            </Td>
            <Td className="text-ink-2 align-top">{sourceLabel(lead.source)}</Td>
            <Td numeric className="align-top whitespace-nowrap">
              <Figures>{formatDate(lead.createdAt)}</Figures>
              <Figures className="text-ink-2 ml-2 text-xs">
                {formatTime(lead.createdAt)}
              </Figures>
            </Td>
            <Td className="align-top">
              <StatusBadge tone={STATUS_TONE[lead.status]}>
                {STATUS_LABEL[lead.status]}
              </StatusBadge>
            </Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}

/** Below lg the table becomes ruled rows: a studio phone gets the same facts. */
function LeadList({ leads }: { leads: Lead[] }) {
  return (
    <ul className="rule-t">
      {leads.map((lead) => (
        <li key={lead.id} className="rule-b py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
            <Link
              to={`/studio/khach-quan-tam/${lead.id}`}
              className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
            >
              {lead.fullName}
            </Link>
            <StatusBadge tone={STATUS_TONE[lead.status]}>
              {STATUS_LABEL[lead.status]}
            </StatusBadge>
          </div>

          <p className="text-ink-2 mt-2 text-xs">
            <a
              href={telHref(lead.phone)}
              className="figures text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
            >
              {formatPhone(lead.phone)}
            </a>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            {sourceLabel(lead.source)}
          </p>

          <p className="text-ink mt-1.5 text-sm">{needText(lead.need)}</p>

          <p className="text-ink-2 mt-1.5 text-xs">
            Nhận lúc <Figures className="text-ink">{formatDate(lead.createdAt)}</Figures>{" "}
            <Figures className="text-ink">{formatTime(lead.createdAt)}</Figures>
          </p>
        </li>
      ))}
    </ul>
  );
}

function needText(need: string): string {
  return need.trim() === "" ? "Chưa ghi nhu cầu" : need;
}
