import { Check, Info, Phone, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import {
  useLogRenewalContact,
  useRenewals,
  useRenewalSummary,
} from "~/features/commerce/queries";
import type { RenewalCandidateResponse } from "~/lib/api/schema";
import { formatDate, formatNumber, formatPhone, formatTime, telHref } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { LiveRegion } from "~/ui/feedback";
import { Field, Input } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";
import { InlineNote, Panel, PersonCell, WorkspacePage } from "~/ui/workspace";

import type { Route } from "./+types/renewals";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Gia hạn — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The call list — students the studio should contact before their package runs out.
 *
 * The winning subject is the person: one card per student, their name the only
 * link, and one ask per card (P2) — the call, in copper because it is the
 * contact action (ADR 0006). The thresholds are named on the screen because
 * staff are asked to trust the list, but they are named, not recalculated:
 * `reasons` is the backend's own flag list and the frontend never recomputes it
 * (AGENTS.md rule 12, docs/BUSINESS_RULES.md).
 *
 * There is no endpoint that sends anything, and there will not be one. The call
 * button is a `tel:` link; staff talk to the student and then record what
 * happened.
 *
 * Logging a contact moves no credit balance, no payment and no authorization,
 * so it needs no confirmation dialog — but it still states its consequence
 * before the action, keeps the button's label while pending, announces the
 * outcome through the screen's one live region, and lets the refreshed card show
 * the result.
 */

/**
 * The backend sends free-form reason strings. Known ones get studio wording;
 * anything new is shown as it arrives rather than swallowed, because a flag
 * nobody can read is a flag nobody acts on.
 */
const REASON_LABEL: Record<string, string> = {
  low_credits: "Sắp hết buổi",
  expiring_soon: "Sắp hết hạn",
  never_contacted: "Chưa liên hệ lần nào",
};

/**
 * Attention, never critical: every card carries the copper call button, and
 * copper never shares a context with danger (docs/DESIGN_SYSTEM.md). "Never
 * contacted" is a fact about the history, not a threshold, so it stays neutral.
 */
function reasonTone(reason: string): StatusTone {
  return reason === "never_contacted" ? "neutral" : "attention";
}

/** A date-only calendar date, as the studio's own start of that day. */
function dateKeyToIso(dateKey: string): string {
  return `${dateKey}T00:00:00+07:00`;
}

export default function StaffRenewals() {
  const query = useRenewals();
  const summary = useRenewalSummary();
  const [announcement, setAnnouncement] = useState<string | null>(null);

  return (
    <WorkspacePage>
      {/* One polite live region for the whole screen: every card's outcome is
          announced here rather than in a per-card region no one hears. */}
      <LiveRegion message={announcement} />

      <PageHeader
        title="Gia hạn"
        description="Học viên cần được gọi trước khi gói hết buổi hoặc hết hạn. Danh sách do hệ thống của studio đánh dấu."
        actions={
          <Button asChild variant="secondary" className="max-md:min-h-11">
            <Link to="/studio/hoc-vien">
              <Users className="size-4" aria-hidden="true" />
              Danh sách học viên
            </Link>
          </Button>
        }
        meta={
          <div className="flex flex-col gap-2">
            <p className="measure-wide text-ink-2 text-xs">
              Ngưỡng đã xác nhận: còn <Figures className="text-ink">6</Figures> buổi hoặc{" "}
              <Figures className="text-ink">15</Figures> ngày.
            </p>
            <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm">
              {/* Head-count only — this board sits where customers can see
                  the screen, so there is no money on it by design. */}
              <SummaryFigure label="Cần liên hệ" value={summary.data?.needing_contact} />
              <SummaryFigure label="Sắp hết buổi" value={summary.data?.low_credits} />
              <SummaryFigure label="Sắp hết hạn" value={summary.data?.expiring_soon} />
              <SummaryFigure
                label="Chưa liên hệ lần nào"
                value={summary.data?.never_contacted}
              />
            </dl>
            <DemoDataNotice className="self-start" />
          </div>
        }
      />

      {/* The consequence, stated once for every card rather than per button. */}
      <InlineNote icon={<Info aria-hidden="true" />}>
        “Đã liên hệ” ghi thêm một dòng vào lịch sử liên hệ của học viên, kèm nội dung bạn
        nhập và ngày trong ô “Hẹn lại”; bỏ trống ô đó nghĩa là không hẹn lại. Lịch sử chỉ
        thêm, không sửa dòng cũ. Số buổi còn lại và hạn dùng của gói không thay đổi.
      </InlineNote>

      {/* One block, so the boundary's refresh hairline sits on the content
          rather than taking a gap of the page's own. */}
      <div>
        <QueryBoundary
          query={query}
          skeletonRows={4}
          showErrorDetail
          errorDescription="Không tải được danh sách cần gia hạn."
          emptyTitle="Không có ai cần gia hạn"
          emptyDescription="Chưa có học viên nào chạm ngưỡng 6 buổi hoặc 15 ngày còn lại. Danh sách sẽ tự xuất hiện khi có."
          emptyAction={
            <Button asChild variant="secondary">
              <Link to="/studio/hoc-vien">Xem danh sách học viên</Link>
            </Button>
          }
        >
          {(candidates) => {
            // A reading order for a call list — soonest expiry, then fewest
            // sessions left. It re-orders cards; it does not re-decide the flag.
            const sorted = [...candidates].sort(
              (a, b) =>
                a.end_date.localeCompare(b.end_date) ||
                a.credits_remaining - b.credits_remaining,
            );

            return (
              <ul className="flex flex-col gap-4">
                {sorted.map((candidate) => (
                  <li key={candidate.student_package_id}>
                    <RenewalCard candidate={candidate} onAnnounce={setAnnouncement} />
                  </li>
                ))}
              </ul>
            );
          }}
        </QueryBoundary>
      </div>
    </WorkspacePage>
  );
}

function SummaryFigure({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt>{label}</dt>
      <dd>
        {value === undefined ? (
          <Placeholder />
        ) : (
          <Figures className="text-ink text-base">{formatNumber(value)}</Figures>
        )}
      </dd>
    </div>
  );
}

/**
 * One student, their package, and the one thing staff do about it.
 *
 * The mutation lives in the card, so `pending` belongs to this card's button
 * only and a slow save never freezes the rest of the call list.
 */
function RenewalCard({
  candidate,
  onAnnounce,
}: {
  candidate: RenewalCandidateResponse;
  onAnnounce: (message: string) => void;
}) {
  const logContact = useLogRenewalContact();
  const [followUpDate, setFollowUpDate] = useState(candidate.next_contact_date ?? "");
  const [result, setResult] = useState("");

  // Which figure the flag is about. Read from the backend's own reasons, so the
  // emphasis follows the flag rather than a threshold this screen re-applies.
  const lowCredits = candidate.reasons.includes("low_credits");
  const expiring = candidate.reasons.includes("expiring_soon");

  function submit() {
    void logContact
      .mutateAsync({
        student_id: candidate.student_id,
        // The backend requires a result: an empty log entry says a call
        // happened without saying anything about it.
        result: result.trim() === "" ? "Đã gọi" : result.trim(),
        next_contact_date: followUpDate === "" ? null : followUpDate,
      })
      .then(() => {
        setResult("");
        onAnnounce(`Đã ghi nhận liên hệ với ${candidate.student_name}.`);
      })
      .catch(() => onAnnounce(`Chưa ghi nhận được liên hệ với ${candidate.student_name}.`));
  }

  return (
    <Panel
      as="article"
      aria-label={candidate.student_name}
      className="grid gap-x-6 gap-y-5 p-4 md:grid-cols-2 md:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_auto] xl:px-6"
    >
      <div className="min-w-0">
        <PersonCell
          size="lg"
          avatarName={candidate.student_name}
          name={
            <Link
              to={`/studio/hoc-vien/${candidate.student_id}`}
              className="decoration-rule-2 hover:text-copper hover:decoration-copper text-base underline underline-offset-[6px]"
            >
              {candidate.student_name}
            </Link>
          }
          detail={<Figures>{formatPhone(candidate.student_phone)}</Figures>}
        />
        <div className="mt-3 flex flex-wrap gap-1.5 md:pl-15">
          {candidate.reasons.map((reason) => (
            <StatusBadge key={reason} tone={reasonTone(reason)}>
              {REASON_LABEL[reason] ?? reason}
            </StatusBadge>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-ink-2 text-sm">{candidate.package_name}</p>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-3">
          <BigFigure
            value={candidate.credits_remaining}
            label="buổi còn lại"
            hot={lowCredits}
          />
          <BigFigure
            value={candidate.days_remaining}
            label="ngày còn lại"
            hot={expiring}
            detail={
              <>
                hết hạn{" "}
                <Figures className="whitespace-nowrap">
                  {formatDate(dateKeyToIso(candidate.end_date))}
                </Figures>
              </>
            }
          />
        </dl>
      </div>

      <div className="min-w-0">
        <p className="text-ink-2 text-sm">Lần liên hệ gần nhất</p>
        {candidate.last_contacted_at ? (
          <>
            <p className="text-ink mt-1.5 flex items-center gap-1.5 text-sm">
              <Phone className="text-ink-2 size-3.5 shrink-0" aria-hidden="true" />
              <Figures>{formatDate(candidate.last_contacted_at)}</Figures>
              <Figures className="text-ink-2">
                {formatTime(candidate.last_contacted_at)}
              </Figures>
            </p>
            {candidate.last_contact_result ? (
              <p className="text-ink-2 mt-1.5 text-sm">“{candidate.last_contact_result}”</p>
            ) : null}
          </>
        ) : (
          <p className="text-ink-2 mt-1.5 text-sm">Chưa liên hệ lần nào</p>
        )}
      </div>

      <div className="md:min-w-36 md:justify-self-end">
        <Button
          asChild
          variant="copper"
          fullWidth
          aria-label={`Gọi ${candidate.student_name}`}
        >
          <a href={telHref(candidate.student_phone)}>
            <Phone className="size-4" aria-hidden="true" />
            Gọi
          </a>
        </Button>
      </div>

      {/* The log form is its own block: what happened on the call and when to
          call again. The follow-up date is rendered once, by the control that
          owns it: the field is pre-filled with `next_contact_date`, so saving
          keeps the date the studio already agreed unless someone changes it.
          Printing the same date again as a read-only fact would be one fact
          rendered twice. */}
      <div
        role="group"
        aria-label={`Ghi liên hệ với ${candidate.student_name}`}
        className="border-rule bg-chalk rounded-md border p-4 md:col-span-2 md:px-5 xl:col-span-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-4">
          <Field label="Kết quả" className="min-w-0 md:min-w-64 md:flex-1">
            {({ id }) => (
              <Input
                id={id}
                value={result}
                placeholder="Đã gọi"
                onChange={(event) => setResult(event.target.value)}
              />
            )}
          </Field>

          <Field label="Hẹn lại" className="md:w-44">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={followUpDate}
                onChange={(event) => setFollowUpDate(event.target.value)}
              />
            )}
          </Field>

          <Button
            variant="secondary"
            className="max-md:w-full"
            icon={<Check className="size-4" aria-hidden="true" />}
            pending={logContact.isPending}
            onClick={submit}
          >
            Đã liên hệ
          </Button>
        </div>

        {logContact.isError ? (
          <p role="alert" className="text-danger mt-2.5 text-xs">
            Chưa ghi nhận được. Vui lòng thử lại.
          </p>
        ) : null}

        {logContact.isSuccess && !logContact.isPending ? (
          <p className="text-success mt-2.5 text-xs">Đã ghi nhận vào hồ sơ học viên.</p>
        ) : null}
      </div>
    </Panel>
  );
}

/**
 * One of the two quantities a renewal is about, set large. `hot` marks the one
 * the backend's flag names. There is no "of N" and no meter: the candidate
 * carries the remaining count, not the package's size.
 */
function BigFigure({
  value,
  label,
  hot,
  detail,
}: {
  value: number;
  label: string;
  hot: boolean;
  detail?: ReactNode;
}) {
  return (
    <div className="flex items-end gap-2">
      {/* The term follows its figure on screen, as "2 buổi còn lại" reads; in
          the DOM it stays first, as a description list requires. */}
      <dt className="text-ink-2 order-2 text-xs leading-snug">
        {label}
        {detail ? (
          <>
            <br />
            {detail}
          </>
        ) : null}
      </dt>
      {/* The size sits on the wrapper: tailwind-merge reads `text-d3` as a
          colour and would drop it beside the figure's own colour class. */}
      <dd className="text-d3 order-1 leading-none">
        <Figures display className={hot ? "text-copper" : "text-ink"}>
          {formatNumber(value)}
        </Figures>
      </dd>
    </div>
  );
}

/** A figure that is not known yet. The dash is decoration, so it is announced. */
function Placeholder() {
  return (
    <>
      <span aria-hidden="true" className="text-ink-2">
        —
      </span>
      <span className="sr-only">đang tải</span>
    </>
  );
}
