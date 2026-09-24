import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod";

import { useConvertLead, useLead, useUpdateLead } from "~/features/leads/queries";
import type { LeadResponse, LeadStatus } from "~/lib/api/schema";
import { formatDate, formatPhone, formatTime, telHref } from "~/lib/format";
import { Absent } from "~/ui/absent";
import { Button } from "~/ui/button";
import { DetailList, DetailRow } from "~/ui/detail-list";
import { Dialog, DialogContent } from "~/ui/dialog";
import { LiveRegion, Skeleton, SkeletonRows } from "~/ui/feedback";
import { Field, Select, Textarea } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/lead-detail";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Chi tiết khách quan tâm — Soul Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

/**
 * One enquiry, and the one thing staff do with it: record what happened on the
 * call. Everything above the form is the record; the form is the only ask on
 * the screen (P2).
 *
 * The status vocabulary is duplicated from leads.tsx on purpose — two screens is
 * not yet a pattern. It moves into ~/features/leads when a third surface needs it.
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
  LOST: "neutral",
};

/**
 * `CONVERTED` is not an outcome staff can type — the backend refuses it on
 * `PATCH /leads/{id}` and reaches it only by actually creating the student.
 * Offering it here would let the status say converted with no profile behind it.
 */
const OUTCOME_STATUSES = ["NEW", "CONTACTED", "LOST"] as const;

/** `source` is a free, nullable string from the backend; unknowns pass through. */
const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  zalo: "Zalo",
  facebook: "Facebook",
  "walk-in": "Đến trực tiếp",
  referral: "Người quen giới thiệu",
};

export default function StaffLeadDetail() {
  const { leadId = "" } = useParams();
  const query = useLead(Number(leadId));

  return (
    <div className="gutter max-w-(--container-column) py-6">
      <Link
        to="/studio/khach-quan-tam"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Khách quan tâm
      </Link>

      <QueryBoundary
        query={query}
        showErrorDetail
        errorDescription="Không mở được hồ sơ khách quan tâm này. Hồ sơ có thể đã bị xóa, hoặc đường dẫn không còn đúng."
        loading={
          <div className="mt-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-3 h-3 w-32" />
            <SkeletonRows rows={6} className="mt-6" />
            <span className="sr-only">Đang tải hồ sơ khách quan tâm</span>
          </div>
        }
      >
        {(lead) => <LeadBody lead={lead} />}
      </QueryBoundary>
    </div>
  );
}

function LeadBody({ lead }: { lead: LeadResponse }) {
  const [converting, setConverting] = useState(false);

  return (
    <>
      <header className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-ink text-xl font-medium">{lead.full_name}</h1>
          <p className="mt-1.5">
            <a
              href={telHref(lead.phone)}
              className="figures text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
            >
              {formatPhone(lead.phone)}
            </a>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge tone={STATUS_TONE[lead.status]}>
            {STATUS_LABEL[lead.status]}
          </StatusBadge>
          {lead.converted_student_id !== null ? (
            <Link
              to={`/studio/hoc-vien/${lead.converted_student_id}`}
              className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-xs underline underline-offset-[6px]"
            >
              Xem hồ sơ học viên
            </Link>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setConverting(true)}>
              Chuyển thành học viên
            </Button>
          )}
        </div>
      </header>

      <DetailList className="mt-6">
        <DetailRow label="Nhu cầu" labelWidth="10rem">
          {lead.need === null || lead.need.trim() === "" ? (
            <Absent>Chưa ghi nhu cầu</Absent>
          ) : (
            lead.need
          )}
        </DetailRow>
        <DetailRow label="Nguồn" labelWidth="10rem">
          {lead.source === null ? (
            <Absent>Không rõ nguồn</Absent>
          ) : (
            (SOURCE_LABEL[lead.source] ?? lead.source)
          )}
        </DetailRow>
        <DetailRow label="Nhận lúc" labelWidth="10rem">
          <Figures>{formatDate(lead.created_at)}</Figures>{" "}
          <Figures>{formatTime(lead.created_at)}</Figures>
        </DetailRow>
        <DetailRow label="Người phụ trách" labelWidth="10rem">
          {lead.assigned_to === null ? (
            <Absent>Chưa giao cho ai</Absent>
          ) : (
            `Tài khoản #${lead.assigned_to}`
          )}
        </DetailRow>
        {lead.converted_student_id !== null ? (
          <DetailRow label="Hồ sơ học viên" labelWidth="10rem">
            <Link
              to={`/studio/hoc-vien/${lead.converted_student_id}`}
              className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
            >
              Mở hồ sơ học viên
            </Link>
          </DetailRow>
        ) : null}
      </DetailList>

      <OutcomeForm lead={lead} />

      <Dialog
        open={converting}
        onOpenChange={(next) => {
          if (!next) setConverting(false);
        }}
      >
        <DialogContent
          title="Chuyển thành học viên"
          description="Hồ sơ học viên được tạo từ chính thông tin khách đã để lại — không phải gõ lại tên và số điện thoại. Khách này sẽ được đánh dấu đã chuyển; gói tập và thanh toán ghi sau, trên hồ sơ mới."
        >
          <ConvertLead lead={lead} onCancel={() => setConverting(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

const schema = z.object({
  status: z.enum(OUTCOME_STATUSES),
  /** Free text staff keep about this person. Replaces what was there. */
  need: z.string().trim().max(1000, "Ghi chú quá dài"),
});

type OutcomeValues = z.infer<typeof schema>;

/**
 * The one mutation on this screen. It is not destructive and it moves no credit
 * balance, so it needs no Dialog — but it still states its consequence before
 * the action, keeps the button label while pending, and announces the outcome
 * in a LiveRegion.
 *
 * There is no contact-history endpoint for leads: the note **is** the record,
 * and saving replaces it. (Renewal calls are the ones with an append-only
 * history, on a different screen.)
 */
function OutcomeForm({ lead }: { lead: LeadResponse }) {
  const update = useUpdateLead(lead.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OutcomeValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: lead.status === "CONVERTED" ? "CONTACTED" : lead.status,
      need: lead.need ?? "",
    },
  });

  return (
    <section className="rule-t mt-10 pt-5">
      <LiveRegion
        message={
          update.isSuccess
            ? "Đã lưu kết quả liên hệ."
            : update.isError
              ? "Chưa lưu được kết quả liên hệ."
              : null
        }
      />

      <h2 className="text-ink text-sm font-medium">Ghi nhận kết quả liên hệ</h2>
      <p className="measure text-ink-2 mt-1 text-xs">
        Lưu sẽ cập nhật trạng thái của khách và ghi đè phần ghi chú. Tên và số điện thoại
        khách để lại không bị thay đổi.
      </p>

      <form
        noValidate
        className="mt-5"
        onSubmit={handleSubmit((values) =>
          update
            .mutateAsync({
              status: values.status,
              need: values.need === "" ? null : values.need,
            })
            .catch(() => {}),
        )}
      >
        <div className="grid gap-4 sm:gap-5">
          <Field label="Trạng thái sau khi liên hệ" error={errors.status?.message}>
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register("status")}
              >
                {OUTCOME_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABEL[value]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Ghi chú"
            hint="Nhu cầu khách nói, kết quả cuộc gọi, hẹn lại khi nào."
            error={errors.need?.message}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={4}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register("need")}
              />
            )}
          </Field>
        </div>

        {update.isError ? (
          <p role="alert" className="text-danger mt-4 text-sm">
            Chưa lưu được kết quả liên hệ. Vui lòng thử lại.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="submit" pending={update.isPending}>
            Lưu kết quả
          </Button>
          {update.isSuccess && !update.isPending ? (
            <p className="text-ink-2 text-xs">Đã lưu.</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}

/**
 * Conversion takes no payload.
 *
 * `POST /leads/{id}/convert` builds the student from the enquiry the studio
 * already holds — which is exactly what "keeps the consultation history and
 * does not retype the data" means. So this is a confirmation, not a form, and
 * corrections happen on the student profile afterwards, where they belong.
 */
function ConvertLead({ lead, onCancel }: { lead: LeadResponse; onCancel: () => void }) {
  const convert = useConvertLead(lead.id);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <DetailList>
        <DetailRow label="Họ và tên" labelWidth="9rem">
          {lead.full_name}
        </DetailRow>
        <DetailRow label="Số điện thoại" labelWidth="9rem">
          <Figures>{formatPhone(lead.phone)}</Figures>
        </DetailRow>
      </DetailList>

      {convert.isError ? (
        <p role="alert" className="text-danger text-sm">
          {/* The common refusal is a phone number already on a student record;
              the backend says so in words written for the person reading. */}
          Chưa tạo được hồ sơ học viên. Vui lòng kiểm tra lại số điện thoại.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Quay lại
        </Button>
        <Button
          size="sm"
          pending={convert.isPending}
          onClick={() => {
            convert
              .mutateAsync()
              .then((student) => navigate(`/studio/hoc-vien/${student.id}`))
              .catch(() => {});
          }}
        >
          Tạo hồ sơ học viên
        </Button>
      </div>
    </div>
  );
}
