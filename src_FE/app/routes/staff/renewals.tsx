import { useState } from "react";
import { Link } from "react-router";

import { useLogRenewalContact, useRenewals } from "~/features/commerce/queries";
import type { RenewalCandidate } from "~/lib/api/types";
import {
  formatDate,
  formatNumber,
  formatPhone,
  formatTime,
  studioDateKey,
  telHref,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
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
 * recalculated: `reason` is the backend's flag and the frontend never recomputes
 * it (AGENTS.md rule 12, docs/BUSINESS_RULES.md).
 *
 * Logging a contact moves no session balance, no payment and no authorization,
 * so it needs no confirmation dialog — but it still states its consequence
 * before the action, keeps the button's label while pending, announces the
 * outcome through the screen's one live region, and lets the refreshed row show
 * the result.
 */

const REASON: Record<RenewalCandidate["reason"], { label: string; tone: StatusTone }> = {
  sessions_low: { label: "Sắp hết buổi", tone: "attention" },
  expiring_soon: { label: "Sắp hết hạn", tone: "attention" },
  both: { label: "Hết buổi và hết hạn", tone: "critical" },
};

/** A date-only calendar date, as the studio's own start of that day. */
function dateKeyToIso(dateKey: string): string {
  return `${dateKey}T00:00:00+07:00`;
}

export default function StaffRenewals() {
  const query = useRenewals();
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const items = query.data;
  const uncontacted = (items ?? []).filter(
    (candidate) => candidate.lastContactedAt === null,
  ).length;

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
              <div className="flex items-baseline gap-2">
                <dt>Cần liên hệ</dt>
                <dd>
                  {items ? (
                    <Figures className="text-ink">{formatNumber(items.length)}</Figures>
                  ) : (
                    <Placeholder />
                  )}
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt>Chưa liên hệ lần nào</dt>
                <dd>
                  {items ? (
                    <Figures className="text-ink">{formatNumber(uncontacted)}</Figures>
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
        “Đã liên hệ” ghi lại thời điểm liên hệ, tên người thực hiện và ngày trong ô “Hẹn
        lại” của dòng đó; bỏ trống ô đó nghĩa là không hẹn lại. Số buổi còn lại và hạn dùng
        của gói không thay đổi.
      </p>

      <DemoDataNotice className="mb-3" />

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
              a.expiryDate.localeCompare(b.expiryDate) ||
              a.sessionsRemaining - b.sessionsRemaining,
          );

          return (
            <ul className="rule-t">
              {sorted.map((candidate) => (
                <li key={candidate.studentId} className="rule-b py-4">
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
  candidate: RenewalCandidate;
  onAnnounce: (message: string) => void;
}) {
  const logContact = useLogRenewalContact();
  const [followUpDate, setFollowUpDate] = useState(
    candidate.followUpAt ? studioDateKey(candidate.followUpAt) : "",
  );

  const reason = REASON[candidate.reason];

  function submit() {
    void logContact
      .mutateAsync({
        studentId: candidate.studentId,
        followUpAt: followUpDate === "" ? null : dateKeyToIso(followUpDate),
      })
      .then(() => onAnnounce(`Đã ghi nhận liên hệ với ${candidate.fullName}.`))
      .catch(() => onAnnounce(`Chưa ghi nhận được liên hệ với ${candidate.fullName}.`));
  }

  return (
    <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <Link
            to={`/studio/hoc-vien/${candidate.studentId}`}
            className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
          >
            {candidate.fullName}
          </Link>
          <StatusBadge tone={reason.tone}>{reason.label}</StatusBadge>
        </div>

        <p className="text-ink-2 mt-1.5 text-xs">
          <a
            href={telHref(candidate.phone)}
            className="figures text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
          >
            {formatPhone(candidate.phone)}
          </a>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          {candidate.packageName}
        </p>

        <p className="text-ink-2 mt-1.5 text-xs">
          Còn{" "}
          <Figures className="text-ink">
            {formatNumber(candidate.sessionsRemaining)}
          </Figures>{" "}
          buổi
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          Hạn{" "}
          <Figures className="text-ink whitespace-nowrap">
            {formatDate(dateKeyToIso(candidate.expiryDate))}
          </Figures>
        </p>

        <p className="text-ink-2 mt-1.5 text-xs">
          {candidate.lastContactedAt ? (
            <>
              Liên hệ lần cuối{" "}
              <Figures className="text-ink">
                {formatDate(candidate.lastContactedAt)}
              </Figures>{" "}
              <Figures className="text-ink">
                {formatTime(candidate.lastContactedAt)}
              </Figures>
            </>
          ) : (
            "Chưa liên hệ lần nào"
          )}
        </p>
      </div>

      {/* The follow-up date is rendered once, by the control that owns it: the
          field is pre-filled with `followUpAt`, so saving keeps the date the
          studio already agreed unless someone changes it. Printing the same
          date again as a read-only fact would be one fact rendered twice. */}
      <div className="lg:justify-self-end">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
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
