import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, Phone, UserPlus, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
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
import { Avatar, Panel, PanelBody, PanelHeader, WorkspacePage } from "~/ui/workspace";

import type { Route } from "./+types/lead-detail";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Chi tiết khách quan tâm — J Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

/**
 * One enquiry, and the one thing staff do with it: call back, then record what
 * happened on the call. The record panel opens on the person and how to reach
 * them; the outcome form is the only ask on the screen (P2) and sits in its own
 * panel — beside the record on a wide screen, under it on a phone.
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

function sourceLabel(source: string | null): string {
  if (source === null || source.trim() === "") return "Không rõ nguồn";
  return SOURCE_LABEL[source] ?? source;
}

export default function StaffLeadDetail() {
  const { leadId = "" } = useParams();
  const query = useLead(Number(leadId));

  return (
    <WorkspacePage>
      <nav aria-label="Đường dẫn" className="text-ink-2 flex items-center gap-1.5 text-sm">
        <Link
          to="/studio/khach-quan-tam"
          className="decoration-rule-2 hover:text-ink underline underline-offset-[6px]"
        >
          Khách quan tâm
        </Link>
        {query.data ? (
          <>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            <span aria-current="page" className="min-w-0 truncate">
              {query.data.full_name}
            </span>
          </>
        ) : null}
      </nav>

      <QueryBoundary
        query={query}
        showErrorDetail
        errorDescription="Không mở được hồ sơ khách quan tâm này. Hồ sơ có thể đã bị xóa, hoặc đường dẫn không còn đúng."
        loading={
          <Panel as="div" className="px-4 py-5 md:px-6 md:py-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="mt-3 h-3 w-32" />
              </div>
            </div>
            <SkeletonRows rows={5} className="mt-6" />
            <span className="sr-only">Đang tải hồ sơ khách quan tâm</span>
          </Panel>
        }
      >
        {(lead) => <LeadBody lead={lead} />}
      </QueryBoundary>
    </WorkspacePage>
  );
}

function LeadBody({ lead }: { lead: LeadResponse }) {
  const [converting, setConverting] = useState(false);
  const hasNeed = lead.need !== null && lead.need.trim() !== "";

  return (
    <>
      <div className="grid items-start gap-5 md:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Panel aria-labelledby="lead-name">
          <div className="flex items-start gap-4 px-4 pt-5 md:px-6 md:pt-6">
            <Avatar name={lead.full_name} size="lg" />
            <div className="min-w-0 flex-1">
              {/* The status sits with the name it describes, not a panel-width
                  away at the far edge (docs/UI_QUALITY.md, principle 3). */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1
                  id="lead-name"
                  className="font-display text-ink text-[1.625rem] leading-tight font-normal tracking-[-0.01em]"
                >
                  {lead.full_name}
                </h1>
                <StatusBadge tone={STATUS_TONE[lead.status]} className="shrink-0">
                  {STATUS_LABEL[lead.status]}
                </StatusBadge>
              </div>
              {/* Where and when the enquiry came in. Said once, here — the facts
                  below hold only what this line does not. */}
              <p className="text-ink-2 mt-1 text-sm">
                {sourceLabel(lead.source)}
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span className="whitespace-nowrap">
                  <Figures>{formatDate(lead.created_at)}</Figures> lúc{" "}
                  <Figures>{formatTime(lead.created_at)}</Figures>
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 px-4 py-5 md:px-6">
            {/* Calling back is the contact action, so it is copper (ADR 0006,
                decision 9); the screen's ask stays the ink "Lưu kết quả". */}
            <Button asChild variant="copper">
              <a href={telHref(lead.phone)}>
                <Phone className="size-4" aria-hidden="true" />
                <span>
                  Gọi <span className="figures">{formatPhone(lead.phone)}</span>
                </span>
              </a>
            </Button>
            {lead.converted_student_id !== null ? (
              <Button asChild variant="secondary">
                <Link to={`/studio/hoc-vien/${lead.converted_student_id}`}>
                  <UserRound className="size-4" aria-hidden="true" />
                  <span>Xem hồ sơ học viên</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="secondary"
                icon={<UserPlus className="size-4" aria-hidden="true" />}
                onClick={() => setConverting(true)}
              >
                Chuyển thành học viên
              </Button>
            )}
          </div>

          <div className="rule-t px-4 py-5 md:px-6">
            <h2 className="text-ink-2 text-sm">Khách để lại</h2>
            {hasNeed ? (
              <blockquote className="bg-sand text-ink mt-2 rounded-md px-4 py-3 text-base">
                “{lead.need}”
              </blockquote>
            ) : (
              <p className="mt-2 text-sm">
                <Absent>Chưa ghi nhu cầu</Absent>
              </p>
            )}

            <dl className="mt-5">
              <Fact label="Người phụ trách">
                {lead.assigned_to === null ? (
                  <Absent>Chưa giao cho ai</Absent>
                ) : (
                  `Tài khoản #${lead.assigned_to}`
                )}
              </Fact>
            </dl>
          </div>
        </Panel>

        <OutcomeForm lead={lead} />
      </div>

      <Dialog
        open={converting}
        onOpenChange={(next) => {
          if (!next) setConverting(false);
        }}
      >
        <ConvertLead lead={lead} onCancel={() => setConverting(false)} />
      </Dialog>
    </>
  );
}

/** A fact of the record: label above value, no rule between them. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-2 text-sm">{label}</dt>
      <dd className="text-ink mt-1 text-sm wrap-anywhere">{children}</dd>
    </div>
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
    <Panel aria-labelledby="outcome-heading">
      <LiveRegion
        message={
          update.isSuccess
            ? "Đã lưu kết quả liên hệ."
            : update.isError
              ? "Chưa lưu được kết quả liên hệ."
              : null
        }
      />

      <PanelHeader
        title={<span id="outcome-heading">Ghi nhận kết quả liên hệ</span>}
        description="Lưu sẽ đổi trạng thái và ghi đè ghi chú cũ."
      />

      <PanelBody className="md:py-5">
        <form
          noValidate
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

          <div className="mt-5 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            {update.isSuccess && !update.isPending ? (
              <p className="text-ink-2 text-xs">Đã lưu.</p>
            ) : null}
            <Button type="submit" pending={update.isPending}>
              Lưu kết quả
            </Button>
          </div>
        </form>
      </PanelBody>
    </Panel>
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
    <DialogContent
      busy={convert.isPending}
      title="Chuyển thành học viên"
      description="Hồ sơ học viên được tạo từ chính thông tin khách đã để lại — không phải gõ lại tên và số điện thoại. Khách này sẽ được đánh dấu đã chuyển; gói tập và thanh toán ghi sau, trên hồ sơ mới."
    >
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
          <Button
            variant="secondary"
            size="sm"
            disabled={convert.isPending}
            onClick={onCancel}
          >
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
    </DialogContent>
  );
}
