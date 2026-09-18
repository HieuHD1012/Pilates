import { useState } from "react";
import { Link } from "react-router";

import {
  useLogRenewalContact,
  useRenewals,
  useRenewalSummary,
} from "~/features/commerce/queries";
import type { RenewalCandidateResponse } from "~/lib/api/schema";
import { formatDate, formatNumber, formatPhone, formatTime, telHref } from "~/lib/format";
import { Button } from "~/ui/button";
import { LiveRegion } from "~/ui/feedback";
import { Field, Input } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/renewals";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Gia hạn — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The call list — students the studio should contact before their package runs out.
 *
 * The winning subject is the person: one ruled row per student, their name the
 * only link, and one action per row (P2). The thresholds are named on the screen
 * because staff are asked to trust the list, but they are named, not
 * recalculated: `reasons` is the backend's own flag list and the frontend never
 * recomputes it (AGENTS.md rule 12, docs/BUSINESS_RULES.md).
 *
 * There is no endpoint that sends anything, and there will not be one. The Zalo
 * button is a deep link; staff type the message and then record what happened.
 *
 * Logging a contact moves no credit balance, no payment and no authorization,
 * so it needs no confirmation dialog — but it still states its consequence
 * before the action, keeps the button's label while pending, announces the
 * outcome through the screen's one live region, and lets the refreshed row show
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

function reasonTone(reasons: string[]): StatusTone {
  return reasons.length > 1 ? "critical" : "attention";
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
    <div className="gutter py-6">
      {/* One polite live region for the whole screen: every row's outcome is
          announced here rather than in a per-row region no one hears. */}
      <LiveRegion message={announcement} />

      <PageHeader
        title="Gia hạn"
        description="Học viên cần được gọi trước khi gói hết buổi hoặc hết hạn. Danh sách do hệ thống của studio đánh dấu."
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link to="/studio/hoc-vien">Danh sách học viên</Link>
          </Button>
        }
        meta={
          <>
            <p className="measure-wide text-ink-2 text-xs">
              Ngưỡng đã xác nhận: còn <Figures className="text-ink">6</Figures> buổi hoặc{" "}
              <Figures className="text-ink">15</Figures> ngày.
            </p>
            <dl className="text-ink-2 mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
              {/* Head-count only — this board sits where customers can see
                  the screen, so there is no money on it by design. */}
              <div className="flex items-baseline gap-2">
                <dt>Cần liên hệ</dt>
                <dd>
                  {summary.data ? (
                    <Figures className="text-ink">
                      {formatNumber(summary.data.needing_contact)}
                    </Figures>
                  ) : (
                    <Placeholder />
                  )}
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt>Sắp hết buổi</dt>
                <dd>
                  {summary.data ? (
                    <Figures className="text-ink">
                      {formatNumber(summary.data.low_credits)}
                    </Figures>
                  ) : (
                    <Placeholder />
                  )}
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt>Sắp hết hạn</dt>
                <dd>
                  {summary.data ? (
                    <Figures className="text-ink">
                      {formatNumber(summary.data.expiring_soon)}
                    </Figures>
                  ) : (
                    <Placeholder />
                  )}
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt>Chưa liên hệ lần nào</dt>
                <dd>
                  {summary.data ? (
                    <Figures className="text-ink">
                      {formatNumber(summary.data.never_contacted)}
                    </Figures>
                  ) : (
                    <Placeholder />
                  )}
                </dd>
              </div>
            </dl>
          </>
        }
      />

      {/* The consequence, stated once for every row rather than per button. */}
      <p className="measure-wide text-ink-2 py-3 text-xs">
        “Đã liên hệ” ghi thêm một dòng vào lịch sử liên hệ của học viên, kèm nội dung bạn
        nhập và ngày trong ô “Hẹn lại”; bỏ trống ô đó nghĩa là không hẹn lại. Lịch sử chỉ
        thêm, không sửa dòng cũ. Số buổi còn lại và hạn dùng của gói không thay đổi.
      </p>

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
          // sessions left. It re-orders rows; it does not re-decide the flag.
          const sorted = [...candidates].sort(
            (a, b) =>
              a.end_date.localeCompare(b.end_date) ||
              a.credits_remaining - b.credits_remaining,
          );

          return (
            <ul className="rule-t">
              {sorted.map((candidate) => (
                <li key={candidate.student_package_id} className="rule-b py-4">
                  <RenewalRow candidate={candidate} onAnnounce={setAnnouncement} />
                </li>
              ))}
            </ul>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

/**
 * One student, their package, and the one thing staff do about it.
 *
 * The mutation lives in the row, so `pending` belongs to this row's button only
 * and a slow save never freezes the rest of the call list.
 */
function RenewalRow({
  candidate,
  onAnnounce,
}: {
  candidate: RenewalCandidateResponse;
  onAnnounce: (message: string) => void;
}) {
  const logContact = useLogRenewalContact();
  const [followUpDate, setFollowUpDate] = useState(candidate.next_contact_date ?? "");
  const [result, setResult] = useState("");

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
    <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <Link
            to={`/studio/hoc-vien/${candidate.student_id}`}
            className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
          >
            {candidate.student_name}
          </Link>
          {candidate.reasons.map((reason) => (
            <StatusBadge key={reason} tone={reasonTone(candidate.reasons)}>
              {REASON_LABEL[reason] ?? reason}
            </StatusBadge>
          ))}
        </div>

        <p className="text-ink-2 mt-1.5 text-xs">
          <a
            href={telHref(candidate.student_phone)}
            className="figures text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
          >
            {formatPhone(candidate.student_phone)}
          </a>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          {candidate.package_name}
        </p>

        <p className="text-ink-2 mt-1.5 text-xs">
          Còn{" "}
          <Figures className="text-ink">
            {formatNumber(candidate.credits_remaining)}
          </Figures>{" "}
          buổi
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          Hạn{" "}
          <Figures className="text-ink whitespace-nowrap">
            {formatDate(dateKeyToIso(candidate.end_date))}
          </Figures>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          còn{" "}
          <Figures className="text-ink">{formatNumber(candidate.days_remaining)}</Figures>{" "}
          ngày
        </p>

        <p className="text-ink-2 mt-1.5 text-xs">
          {candidate.last_contacted_at ? (
            <>
              Liên hệ lần cuối{" "}
              <Figures className="text-ink">
                {formatDate(candidate.last_contacted_at)}
              </Figures>{" "}
              <Figures className="text-ink">
                {formatTime(candidate.last_contacted_at)}
              </Figures>
              {candidate.last_contact_result ? (
                <span className="text-ink"> — {candidate.last_contact_result}</span>
              ) : null}
            </>
          ) : (
            "Chưa liên hệ lần nào"
          )}
        </p>
      </div>

      {/* The follow-up date is rendered once, by the control that owns it: the
          field is pre-filled with `next_contact_date`, so saving keeps the date
          the studio already agreed unless someone changes it. Printing the same
          date again as a read-only fact would be one fact rendered twice. */}
      <div className="lg:justify-self-end">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <Field label="Kết quả" className="w-56">
            {({ id }) => (
              <Input
                id={id}
                value={result}
                placeholder="Đã gọi"
                onChange={(event) => setResult(event.target.value)}
              />
            )}
          </Field>

          <Field label="Hẹn lại" className="w-40">
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
            size="sm"
            pending={logContact.isPending}
            onClick={submit}
          >
            Đã liên hệ
          </Button>
        </div>

        {logContact.isError ? (
          <p role="alert" className="text-danger mt-2 text-xs">
            Chưa ghi nhận được. Vui lòng thử lại.
          </p>
        ) : null}

        {logContact.isSuccess && !logContact.isPending ? (
          <p className="text-ink-2 mt-2 text-xs">Đã ghi nhận vào hồ sơ học viên.</p>
        ) : null}
      </div>
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
