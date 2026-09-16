import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod";

import { useLeadDetail, useUpdateLead } from "~/features/leads/queries";
import { useConvertLead } from "~/features/people/queries";
import { StudentForm } from "~/features/people/student-form";
import type { LeadDetail, LeadStatus } from "~/lib/api/types";
import { formatDate, formatPhone, formatTime, studioDateKey, telHref } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { DetailList, DetailRow } from "~/ui/detail-list";
import { Dialog, DialogContent } from "~/ui/dialog";
import { EmptyState, LiveRegion, Skeleton, SkeletonRows } from "~/ui/feedback";
import { Field, Input, Select } from "~/ui/field";
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
 * One enquiry, and the one thing staff do with it: log what happened on the
 * call. Everything above the form is the record; the form is the only ask on
 * the screen (P2).
 *
 * The status vocabulary is duplicated from leads.tsx on purpose — two screens is
 * not yet a pattern. It moves into ~/features/leads when a third surface needs it.
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
  lost: "neutral",
};

const STATUS_ORDER: LeadStatus[] = ["new", "contacted", "scheduled", "converted", "lost"];

/**
 * "Đã chuyển" is not an outcome staff can type — it is set by actually creating
 * the student record. Offering it here would let the status say converted with no
 * profile behind it.
 */
const OUTCOME_STATUSES = STATUS_ORDER.filter((value) => value !== "converted");

/** `source` is a free string from the backend, so unknown values pass through. */
const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  zalo: "Zalo",
  facebook: "Facebook",
  "walk-in": "Đến trực tiếp",
  referral: "Người quen giới thiệu",
};

export default function StaffLeadDetail() {
  const { leadId = "" } = useParams();
  const query = useLeadDetail(leadId);

  return (
    <div className="gutter max-w-(--container-column) py-6">
      <Link
        to="/studio/khach-quan-tam"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Khách quan tâm
      </Link>

      <DemoDataNotice className="mt-4" />

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
        {(lead) => <LeadBody lead={lead} leadId={leadId} />}
      </QueryBoundary>
    </div>
  );
}

function LeadBody({ lead, leadId }: { lead: LeadDetail; leadId: string }) {
  const [converting, setConverting] = useState(false);
  const notes = [...lead.notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <>
      <header className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-ink text-xl font-medium">{lead.fullName}</h1>
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
          {lead.convertedStudentId ? (
            <Link
              to={`/studio/hoc-vien/${lead.convertedStudentId}`}
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
          {lead.need.trim() === "" ? (
            <span className="text-ink-2">Chưa ghi nhu cầu</span>
          ) : (
            lead.need
          )}
        </DetailRow>
        <DetailRow label="Hình thức quan tâm" labelWidth="10rem">
          {lead.preferredClassType === "private" ? (
            "Lớp riêng"
          ) : lead.preferredClassType === "group" ? (
            "Lớp nhóm"
          ) : (
            <span className="text-ink-2">Chưa chọn</span>
          )}
        </DetailRow>
        <DetailRow label="Nguồn" labelWidth="10rem">
          {SOURCE_LABEL[lead.source] ?? lead.source}
        </DetailRow>
        <DetailRow label="Nhận lúc" labelWidth="10rem">
          <Figures>{formatDate(lead.createdAt)}</Figures>{" "}
          <Figures>{formatTime(lead.createdAt)}</Figures>
        </DetailRow>
        <DetailRow label="Liên hệ lần cuối" labelWidth="10rem">
          {lead.lastContactedAt ? (
            <>
              <Figures>{formatDate(lead.lastContactedAt)}</Figures>{" "}
              <Figures>{formatTime(lead.lastContactedAt)}</Figures>
            </>
          ) : (
            <span className="text-ink-2">Chưa liên hệ</span>
          )}
        </DetailRow>
        <DetailRow label="Hẹn lại" labelWidth="10rem">
          {lead.followUpAt ? (
            <Figures>{formatDate(lead.followUpAt)}</Figures>
          ) : (
            <span className="text-ink-2">Chưa hẹn</span>
          )}
        </DetailRow>
        {lead.convertedStudentId ? (
          <DetailRow label="Hồ sơ học viên" labelWidth="10rem">
            <Link
              to={`/studio/hoc-vien/${lead.convertedStudentId}`}
              className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
            >
              Mở hồ sơ học viên
            </Link>
          </DetailRow>
        ) : null}
      </DetailList>

      <section className="mt-10">
        <h2 className="text-ink text-sm font-medium">Lịch sử liên hệ</h2>
        <p className="measure text-ink-2 mt-1 text-xs">
          Mỗi lần ghi nhận kết quả đều lưu người thực hiện và thời điểm.
        </p>

        {notes.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="Chưa có ghi chú liên hệ"
            description="Khách này chưa được gọi lại lần nào. Ghi nhận kết quả bên dưới để mở lịch sử liên hệ."
          />
        ) : (
          <ul className="rule-t mt-4">
            {notes.map((note) => (
              <li key={note.id} className="rule-b py-3.5">
                <p className="measure-wide text-ink text-sm">{note.body}</p>
                <p className="text-ink-2 mt-1.5 text-xs">
                  {note.actorName}
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <Figures>{formatDate(note.createdAt)}</Figures>{" "}
                  <Figures>{formatTime(note.createdAt)}</Figures>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <OutcomeForm lead={lead} leadId={leadId} />

      <Dialog
        open={converting}
        onOpenChange={(next) => {
          if (!next) setConverting(false);
        }}
      >
        <DialogContent
          title="Chuyển thành học viên"
          description="Tạo hồ sơ học viên từ thông tin đã ghi nhận. Khách này sẽ được đánh dấu đã chuyển; gói tập và thanh toán ghi sau, trên hồ sơ mới."
        >
          <ConvertLeadForm
            lead={lead}
            leadId={leadId}
            onCancel={() => setConverting(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

const schema = z.object({
  status: z.enum(["new", "contacted", "scheduled", "lost"]),
  /** Empty means "no follow-up planned"; the backend receives null. */
  followUpDate: z.string(),
});

type OutcomeValues = z.infer<typeof schema>;

/**
 * The one mutation on this screen. It is not destructive and it moves no session
 * balance, so it needs no Dialog — but it still states its consequence before
 * the action, keeps the button label while pending, announces the outcome in a
 * LiveRegion, and never shows the backend's own error text.
 */
function OutcomeForm({ lead, leadId }: { lead: LeadDetail; leadId: string }) {
  const update = useUpdateLead(leadId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OutcomeValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: lead.status === "converted" ? "contacted" : lead.status,
      followUpDate: lead.followUpAt ? studioDateKey(lead.followUpAt) : "",
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
        Lưu sẽ cập nhật trạng thái của khách và ghi lại thời điểm liên hệ cùng tên người
        thực hiện. Thông tin khách để lại không bị thay đổi.
      </p>

      <form
        noValidate
        className="mt-5"
        onSubmit={handleSubmit((values) =>
          update
            .mutateAsync({
              status: values.status,
              // A date-only field carries no time of day: send the start of that
              // day in studio time rather than invent an appointment hour.
              followUpAt:
                values.followUpDate === "" ? null : `${values.followUpDate}T00:00:00+07:00`,
            })
            .catch(() => {}),
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
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
            label="Hẹn lại"
            hint="Bỏ trống nếu chưa cần hẹn lại."
            error={errors.followUpDate?.message}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="date"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register("followUpDate")}
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
            <p className="text-ink-2 text-xs">
              Đã lưu. Lịch sử liên hệ phía trên đã được cập nhật.
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}

/**
 * Conversion prefills from the enquiry rather than asking staff to retype a name
 * and phone the studio already has. It is a create, so the dialog states what the
 * record becomes before the button, and the screen moves to the new profile after
 * — the next thing to do is always on the student, not on the closed enquiry.
 */
function ConvertLeadForm({
  lead,
  leadId,
  onCancel,
}: {
  lead: LeadDetail;
  leadId: string;
  onCancel: () => void;
}) {
  const convert = useConvertLead(leadId);
  const navigate = useNavigate();

  return (
    <StudentForm
      defaultValues={{
        fullName: lead.fullName,
        phone: lead.phone,
        email: "",
        note: lead.need.trim(),
      }}
      submitLabel="Tạo hồ sơ học viên"
      pending={convert.isPending}
      error={convert.error}
      onCancel={onCancel}
      onSubmit={async (input) => {
        const result = await convert.mutateAsync(input);
        void navigate(`/studio/hoc-vien/${result.studentId}`);
        return result;
      }}
    />
  );
}
