import { useState } from "react";
import { Link } from "react-router";

import { useLeads } from "~/features/leads/queries";
import type { LeadResponse, LeadStatus } from "~/lib/api/schema";
import { cn } from "~/lib/cn";
import { formatDate, formatDayMonth, formatPhone, formatTime, telHref } from "~/lib/format";
import { Button } from "~/ui/button";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";
import {
  Avatar,
  Panel,
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
        description="Người để lại thông tin tư vấn, mới nhất trước. Mở một khách để gọi lại và ghi kết quả."
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

              // Filtered to one status, every row would carry the same pill:
              // the tab already says it (docs/UI_QUALITY.md, principle 2).
              const showStatus = status === "all";
              return (
                <div className="-mx-4 md:-mx-5">
                  <div
                    aria-hidden="true"
                    className={cn(
                      "rule-b text-ink-2 bg-chalk hidden px-5 py-2.5 text-xs font-medium lg:grid lg:gap-6",
                      showStatus ? ROW_COLUMNS_WITH_STATUS : ROW_COLUMNS,
                    )}
                  >
                    <span className="pl-12">Khách</span>
                    <span>Nhu cầu</span>
                    <span>Nhận lúc</span>
                    {showStatus ? <span>Trạng thái</span> : null}
                  </div>
                  <ul aria-label="Khách quan tâm, mới nhất trước">
                    {sorted.map((lead) => (
                      <li key={lead.id} className="rule-b last:border-b-0">
                        <LeadRow lead={lead} showStatus={showStatus} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }}
          </QueryBoundary>
        </div>

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

/** The number as its own `tel:` link, above the row's stretched link. */
function PhoneLink({ phone, className }: { phone: string; className?: string }) {
  return (
    <a
      href={telHref(phone)}
      className={cn(
        "figures text-ink-2 hover:text-copper relative min-h-11 items-center self-start text-xs lg:min-h-6 lg:min-w-24",
        className,
      )}
    >
      {formatPhone(phone)}
    </a>
  );
}

/**
 * Wide-screen columns. Staff compare enquiries down the list — what each person
 * asked for, how long they have waited, where each stands — so each attribute
 * keeps one column and the eye runs straight down it, instead of every fact
 * piling into the left edge with the status a screen-width away.
 */
const ROW_COLUMNS = "lg:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)_8.5rem]";
const ROW_COLUMNS_WITH_STATUS =
  "lg:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)_8.5rem_9rem]";

/**
 * One enquiry: the person, what they asked for, when it arrived and through
 * which door, and — in the unfiltered view — where it stands.
 *
 * Ranked by what the decision "who do I call next" needs: the name and the
 * need carry ink; when, how and the phone are quieter reference. The name's
 * link is stretched over the whole row so the row is the target; the phone
 * sits above that layer as its own `tel:` link. The need is never truncated —
 * a Vietnamese sentence about a lower-back problem is why staff pick up the
 * phone, and P5 forbids resolving it by hover — so it wraps.
 *
 * On a phone the same order stacks: name with its status beside it, the need,
 * then the reference line.
 */
function LeadRow({ lead, showStatus }: { lead: LeadResponse; showStatus: boolean }) {
  const status = showStatus ? (
    <StatusBadge tone={STATUS_TONE[lead.status]} className="shrink-0">
      {STATUS_LABEL[lead.status]}
    </StatusBadge>
  ) : null;

  return (
    <div
      className={cn(
        "hover:bg-sand/70 relative px-4 py-3.5 transition-colors duration-200 md:px-5 lg:grid lg:items-start lg:gap-6",
        showStatus ? ROW_COLUMNS_WITH_STATUS : ROW_COLUMNS,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={lead.full_name} />
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <Link
              to={`/studio/khach-quan-tam/${lead.id}`}
              className="text-ink hover:text-copper inline-flex min-h-6 items-center text-sm font-medium after:absolute after:inset-0"
            >
              {lead.full_name}
            </Link>
            {/* On a phone the status stays with the name it describes. */}
            <span className="lg:hidden">{status}</span>
          </span>
          <PhoneLink phone={lead.phone} className="hidden lg:inline-flex" />
        </div>
      </div>

      {lead.need === null || lead.need.trim() === "" ? (
        <p className="text-ink-2 mt-1 pl-12 text-sm lg:mt-0 lg:pl-0">Chưa ghi nhu cầu</p>
      ) : (
        <p className="text-ink mt-1.5 pl-12 text-sm lg:mt-0 lg:pl-0">{lead.need}</p>
      )}

      {/* Phone: one reference line — number, day, door — set as plain text so
          it wraps at a space and never strands a separator at a line start.
          The number's 44px target is that line's height, not an extra row. */}
      <p className="text-ink-2 mt-0.5 pl-12 text-xs lg:hidden">
        <PhoneLink phone={lead.phone} className="inline-flex align-middle" />
        {" · "}
        <Figures>{formatDayMonth(lead.created_at)}</Figures>{" "}
        <Figures>{formatTime(lead.created_at)}</Figures>
        {" · "}
        <span className="whitespace-nowrap">{sourceLabel(lead.source)}</span>
      </p>

      {/* Wide screens (lg): the "Nhận lúc" column, the full date over the door. */}
      <p className="text-ink-2 hidden text-xs lg:block">
        <Figures>{formatDate(lead.created_at)}</Figures>{" "}
        <Figures>{formatTime(lead.created_at)}</Figures>
        <span className="block">{sourceLabel(lead.source)}</span>
      </p>

      {showStatus ? <div className="hidden lg:block">{status}</div> : null}
    </div>
  );
}
