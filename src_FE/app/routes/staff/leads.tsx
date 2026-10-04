import { useState } from "react";
import { Link } from "react-router";

import { useLeads } from "~/features/leads/queries";
import type { LeadResponse, LeadStatus } from "~/lib/api/schema";
import { formatDate, formatPhone, formatTime, telHref } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";
import {
  Avatar,
  Panel,
  PanelFooter,
  SegmentFilter,
  Toolbar,
  WorkspacePage,
  type SegmentOption,
} from "~/ui/workspace";

import { PageControls } from "~/ui/page-controls";

import type { Route } from "./+types/leads";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Khách quan tâm — J Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The consultation CRM list — the first screen a new enquiry touches.
 *
 * The winning subject is the person who enquired, so every row starts with
 * the person (ADR 0006, decision 8) and the name is the row's link. There is no
 * conversion funnel chart here: the only question this screen answers is "who
 * has not been called back yet", and the count on "Mới" answers it.
 *
 * The status vocabulary below is deliberately duplicated in lead-detail.tsx
 * rather than abstracted: two screens is not a pattern. If a third surface needs
 * it, it moves into ~/features/leads.
 */

/**
 * Four states, not five. There is no "đã hẹn": the backend's lead statuses are
 * NEW, CONTACTED, CONVERTED and LOST, and an appointment is something staff
 * write into the note rather than a state the system tracks.
 */
const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  CONVERTED: "Đã thành học viên",
  LOST: "Không tiếp tục",
};

const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  NEW: "info",
  CONTACTED: "neutral",
  CONVERTED: "positive",
  // Not a failure state: a person who chose not to continue is simply closed.
  LOST: "neutral",
};

const STATUS_ORDER: LeadStatus[] = ["NEW", "CONTACTED", "CONVERTED", "LOST"];

/** The list asks for at most this many rows; see `segmentOptions`. */
const LIMIT = 200;

/** `source` is a free, nullable string from the backend; unknowns pass through. */
const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  zalo: "Zalo",
  facebook: "Facebook",
  "walk-in": "Đến trực tiếp",
  referral: "Người quen giới thiệu",
};

function sourceLabel(source: string | null): string {
  if (source === null || source.trim() === "") return "Không rõ nguồn";
  return SOURCE_LABEL[source] ?? source;
}

/**
 * Counts on the status filter, only where the loaded rows prove them.
 *
 * The list is fetched per status, so an unfiltered response can count every
 * status, while a filtered one only knows its own. A response that hit the row
 * limit, or that is still the previous filter's rows shown as placeholder, is
 * not a count of anything — so it shows none rather than a wrong one.
 */
function segmentOptions(
  status: LeadStatus | "all",
  items: LeadResponse[] | undefined,
  trustworthy: boolean,
): SegmentOption<LeadStatus | "all">[] {
  const known = trustworthy && items !== undefined && items.length < LIMIT;
  const countFor = (value: LeadStatus | "all"): number | undefined => {
    if (!known) return undefined;
    if (status === "all") {
      return value === "all"
        ? items.length
        : items.filter((item) => item.status === value).length;
    }
    return value === status ? items.length : undefined;
  };

  return [
    { value: "all", label: "Tất cả", count: countFor("all") },
    ...STATUS_ORDER.map((value) => ({
      value,
      label: STATUS_LABEL[value],
      count: countFor(value),
    })),
  ];
}

export default function StaffLeads() {
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const query = useLeads({
    status: status === "all" ? undefined : status,
    limit: LIMIT,
    offset,
  });

  const options = segmentOptions(
    status,
    query.data,
    !query.isPlaceholderData && offset === 0,
  );

  return (
    <WorkspacePage>
      <PageHeader
        title="Khách quan tâm"
        description="Người để lại thông tin tư vấn, mới nhất trước. Mở một khách để gọi lại và ghi nhận kết quả liên hệ."
        actions={<DemoDataNotice />}
      />

      <Panel aria-label="Danh sách khách quan tâm">
        <Toolbar
          trailing={
            query.isFetching && !query.isPending ? (
              <span className="text-ink-2 text-xs">Đang cập nhật</span>
            ) : null
          }
        >
          <SegmentFilter
            label="Lọc theo trạng thái"
            options={options}
            value={status}
            onChange={(next) => {
              setOffset(0);
              setStatus(next);
            }}
          />
        </Toolbar>

        <div className="px-4 md:px-5">
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
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOffset(0);
                    setStatus("all");
                  }}
                >
                  Xem tất cả
                </Button>
              )
            }
          >
            {(leads) => {
              const sorted = [...leads].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              );

              return (
                <ul aria-label="Khách quan tâm, mới nhất trước" className="-mx-4 md:-mx-5">
                  {sorted.map((lead) => (
                    <li key={lead.id} className="rule-b last:border-b-0">
                      <LeadRow lead={lead} />
                    </li>
                  ))}
                </ul>
              );
            }}
          </QueryBoundary>
        </div>

        {query.data && query.data.length > 0 ? (
          <PanelFooter>
            <span>
              Đang hiển thị <Figures className="text-ink">{query.data.length}</Figures>{" "}
              khách
            </span>
          </PanelFooter>
        ) : null}
        <PageControls
          offset={offset}
          limit={LIMIT}
          count={query.data?.length ?? 0}
          pending={query.isFetching}
          onChange={setOffset}
        />
      </Panel>
    </WorkspacePage>
  );
}

/**
 * One enquiry as a person: who, when, how to reach them, what they asked for,
 * and where it stands.
 *
 * The name's link is stretched over the whole row so the row is the target;
 * the phone sits above that layer as its own `tel:` link, because calling back
 * is the reason this list exists. The need is never truncated — a Vietnamese
 * sentence about a lower-back problem is why staff pick up the phone, and P5
 * forbids resolving it by hover — so it wraps onto as many lines as it needs.
 */
function LeadRow({ lead }: { lead: LeadResponse }) {
  return (
    <div className="hover:bg-sand/70 relative flex items-start gap-3 px-4 py-4 transition-colors duration-200 md:px-5">
      <Avatar name={lead.full_name} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <Link
              to={`/studio/khach-quan-tam/${lead.id}`}
              className="text-ink hover:text-copper text-sm font-medium after:absolute after:inset-0"
            >
              {lead.full_name}
            </Link>
            <span className="text-ink-2 text-xs">
              <Figures>{formatDate(lead.created_at)}</Figures>{" "}
              <Figures>{formatTime(lead.created_at)}</Figures>
            </span>
          </div>
          <StatusBadge tone={STATUS_TONE[lead.status]} className="shrink-0">
            {STATUS_LABEL[lead.status]}
          </StatusBadge>
        </div>

        <p className="text-ink-2 text-sm">
          <a
            href={telHref(lead.phone)}
            className="figures text-ink decoration-rule-2 hover:text-copper hover:decoration-copper relative inline-flex min-h-11 items-center underline underline-offset-[6px] md:min-h-0"
          >
            {formatPhone(lead.phone)}
          </a>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          {sourceLabel(lead.source)}
        </p>

        {lead.need === null || lead.need.trim() === "" ? (
          <p className="text-ink-2 mt-0.5 text-sm">Chưa ghi nhu cầu</p>
        ) : (
          <p className="text-ink mt-0.5 text-sm">{lead.need}</p>
        )}
      </div>
    </div>
  );
}
