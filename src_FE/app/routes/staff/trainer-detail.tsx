import { TrainerEditor } from "~/features/people/trainer-editor";
import { CalendarPlus, ChevronRight, ImageUp, LockKeyhole, Phone } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import {
  useTrainer,
  useTrainerMonthStats,
  useTrainerPhoto,
  useUploadTrainerPhoto,
} from "~/features/people/queries";
import { errorMessage } from "~/lib/api/client";
import type { TrainerResponse } from "~/lib/api/schema";
import { formatDate, formatNumber, formatPhone, telHref } from "~/lib/format";
import { Absent } from "~/ui/absent";
import { Button } from "~/ui/button";
import { LiveRegion, Skeleton, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PendingFact } from "~/ui/pending-fact";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";
import {
  Avatar,
  Panel,
  PanelBody,
  PanelHeader,
  Stat,
  StatGroup,
  WorkspacePage,
} from "~/ui/workspace";

import type { Route } from "./+types/trainer-detail";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Hồ sơ huấn luyện viên — J Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

/**
 * One trainer, as a record.
 *
 * The profile panel says who this is and how to reach them; under it, the
 * public profile (introduction, specialties) is the work, with the month's
 * figures above it and the portrait at the side. The figures are
 * `GET /classes/trainer-stats`, which is the **same function the trainer
 * report uses** — two screens saying "classes taught" must not run two
 * different queries, or one of them is wrong and nobody knows which.
 *
 * Assigning classes lives on the calendar, so this screen links there from the
 * figure it would change instead of growing a second subject.
 */
export default function StaffTrainerDetail() {
  const { trainerId = "" } = useParams();
  const query = useTrainer(Number(trainerId));

  return (
    <WorkspacePage>
      <QueryBoundary
        query={query}
        loading={<RecordSkeleton />}
        errorDescription="Không mở được hồ sơ này. Hồ sơ có thể đã bị xóa hoặc đường dẫn không còn đúng."
        showErrorDetail
      >
        {(trainer) => <TrainerRecord trainer={trainer} />}
      </QueryBoundary>
    </WorkspacePage>
  );
}

function Breadcrumb({ current }: { current?: string }) {
  return (
    <nav aria-label="Đường dẫn" className="text-ink-2 -mb-1 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link
            to="/studio/huan-luyen-vien"
            className="decoration-rule-2 hover:text-ink hover:decoration-copper underline underline-offset-[6px]"
          >
            Huấn luyện viên
          </Link>
        </li>
        {current ? (
          <li className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span aria-current="page" className="text-ink">
              {current}
            </span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}

function TrainerRecord({ trainer }: { trainer: TrainerResponse }) {
  return (
    <>
      <Breadcrumb current={trainer.full_name} />

      {/* The profile header, as on a student's record: who, how to reach them,
          and the two states the studio acts on. The number is itself the call
          (docs/UI_QUALITY.md, phone numbers): no second "Gọi" beside it. */}
      <Panel aria-labelledby="trainer-name">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-4 px-4 py-5 md:px-6 md:py-6">
          <Portrait trainer={trainer} />

          <div className="min-w-0 flex-1 basis-64">
            <h1
              id="trainer-name"
              className="font-display text-ink text-[1.625rem] leading-tight font-normal tracking-[-0.01em] md:text-[2rem]"
            >
              {trainer.full_name}
            </h1>

            <ul className="text-ink-2 mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <li className="inline-flex items-center gap-1.5">
                <Phone className="size-4" aria-hidden="true" />
                <span className="sr-only">Điện thoại: </span>
                {trainer.phone ? (
                  <a
                    href={telHref(trainer.phone)}
                    className="figures text-ink decoration-rule-2 hover:text-copper hover:decoration-copper inline-flex min-h-11 items-center underline underline-offset-[6px] md:min-h-0"
                  >
                    {formatPhone(trainer.phone)}
                  </a>
                ) : (
                  // A number nobody recorded, not one the studio owes us.
                  <Absent>Chưa ghi số điện thoại</Absent>
                )}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CalendarPlus className="size-4" aria-hidden="true" />
                Thêm vào studio <Figures>{formatDate(trainer.created_at)}</Figures>
              </li>
              {/* A trainer record has no email of its own: the email is the
                  login, and it lives on the account. `user_id` says whether
                  there is one. */}
              <li className="inline-flex items-center gap-1.5">
                <LockKeyhole className="size-4" aria-hidden="true" />
                {trainer.user_id !== null ? "Đã có tài khoản" : "Chưa có tài khoản"}
              </li>
            </ul>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {trainer.is_active ? (
                <StatusBadge tone="positive">Đang dạy</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">Tạm nghỉ</StatusBadge>
              )}
              {trainer.is_public ? (
                <StatusBadge tone="info">Đã công khai</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">Chưa công khai</StatusBadge>
              )}
            </div>
          </div>

          <TrainerEditor trainer={trainer} />
        </div>
      </Panel>

      <div className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5 md:gap-6">
          <MonthStats trainerId={trainer.id} />

          {/* Whether the profile is public is already the badge above; this
              panel holds only what the public page prints. */}
          <Panel>
            <PanelHeader
              title="Giới thiệu và chuyên môn"
              description="Trang huấn luyện viên hiện đúng những dòng này khi hồ sơ được công khai."
            />
            <PanelBody>
              <dl className="divide-rule flex flex-col divide-y">
                <Fact label="Giới thiệu ngắn">
                  {trainer.bio ?? <PendingFact label="Giới thiệu ngắn" />}
                </Fact>
                <Fact label="Chuyên môn">
                  {trainer.specialties ?? <PendingFact label="Chuyên môn" />}
                </Fact>
              </dl>
            </PanelBody>
          </Panel>
        </div>

        <PortraitUpload trainer={trainer} />
      </div>
    </>
  );
}

/** A label above its value, inside a panel. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 py-3 first:pt-0 last:pb-0">
      <dt className="text-ink-2 text-sm">{label}</dt>
      <dd className="text-ink mt-1 text-sm wrap-anywhere">{children}</dd>
    </div>
  );
}

/** Shaped like the record it replaces: a crumb, the profile panel, rows. */
function RecordSkeleton() {
  return (
    <>
      <Skeleton className="h-3 w-40 max-w-full" />
      <Panel className="flex items-start gap-5 px-4 py-5 md:px-6 md:py-6">
        <Skeleton className="size-14 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="mt-3 h-3 w-72 max-w-full" />
          <Skeleton className="mt-4 h-5 w-48 max-w-full" />
        </div>
      </Panel>
      <Panel className="px-4 py-4 md:px-5">
        <SkeletonRows rows={5} />
      </Panel>
    </>
  );
}

/**
 * The portrait, fetched as bytes. `GET /trainers/{id}/photo` is behind the
 * token and re-authorised on every read, so there is no static URL to point an
 * `<img src>` at. With no photo the initials stand in, as on every other
 * person in the workspace.
 */
function Portrait({ trainer }: { trainer: TrainerResponse }) {
  const photo = useTrainerPhoto(trainer.id, trainer.photo_key !== null);
  if (!photo.data) return <Avatar name={trainer.full_name} size="xl" />;

  return (
    <img
      src={photo.data}
      alt={trainer.full_name}
      decoding="async"
      className="border-rule size-14 shrink-0 rounded-full border object-cover"
    />
  );
}

/**
 * The public portrait and the one action on it. Picking a file is the upload —
 * the same `useUploadTrainerPhoto` mutation the trainer's own profile uses —
 * so there is no second "save" step and no raw browser file control on the
 * page. The input stays in the DOM, labelled, for assistive technology and
 * for tests that set files on it; the button is what a person clicks.
 *
 * The preview reads the same cached photo query as the header portrait, so it
 * costs no second request.
 */
function PortraitUpload({ trainer }: { trainer: TrainerResponse }) {
  const upload = useUploadTrainerPhoto(trainer.id);
  const photo = useTrainerPhoto(trainer.id, trainer.photo_key !== null);
  const input = useRef<HTMLInputElement>(null);
  const hasPhoto = trainer.photo_key !== null;

  return (
    <Panel aria-labelledby="portrait-title">
      <PanelBody className="flex items-center gap-4">
        {photo.data ? (
          <img
            src={photo.data}
            alt=""
            decoding="async"
            className="border-rule size-20 shrink-0 rounded-md border object-cover"
          />
        ) : (
          <Avatar name={trainer.full_name} size="xl" className="size-20 rounded-md" />
        )}

        <div className="flex min-w-0 flex-col items-start gap-2">
          <div>
            <h2 id="portrait-title" className="text-ink text-sm font-medium">
              Ảnh trên trang công khai
            </h2>
            <p className="text-ink-2 text-xs">JPEG, PNG hoặc WebP, tối đa 8 MB.</p>
          </div>

          <input
            ref={input}
            type="file"
            aria-label="Ảnh huấn luyện viên"
            accept="image/jpeg,image/png,image/webp"
            disabled={upload.isPending}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const target = event.currentTarget;
              const file = target.files?.[0];
              if (!file) return;
              upload.mutate(file, { onSettled: () => (target.value = "") });
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className="max-sm:min-h-11"
            pending={upload.isPending}
            icon={<ImageUp className="size-4" aria-hidden="true" />}
            onClick={() => input.current?.click()}
          >
            {hasPhoto ? "Đổi ảnh" : "Tải ảnh"}
          </Button>
        </div>
      </PanelBody>

      {upload.isError ? (
        <p role="alert" className="text-danger rule-t px-4 py-3 text-sm md:px-5">
          {errorMessage(upload.error, "Chưa tải được ảnh. Vui lòng thử lại.")}
        </p>
      ) : null}
      <LiveRegion message={upload.isSuccess ? "Đã lưu ảnh huấn luyện viên." : null} />
    </Panel>
  );
}

/**
 * This calendar month, counted in studio time. The month boundary matters: read
 * in the container's timezone, a 06:00 class on the 1st falls into the previous
 * month — which is why the backend takes a year and a month rather than a range.
 */
function MonthStats({ trainerId }: { trainerId: number }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const query = useTrainerMonthStats({ trainer_id: trainerId, year, month });

  const figure = (value: number | undefined) =>
    value === undefined ? "—" : formatNumber(value);

  return (
    <section aria-labelledby="month-stats" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="month-stats" className="text-ink text-base font-semibold">
          Tháng{" "}
          <Figures>
            {month}/{year}
          </Figures>
        </h2>
        {/* The claim and the place to check it, in one line. */}
        <p className="text-ink-2 text-sm">
          Theo giờ studio, cùng cách tính với{" "}
          <Link
            to="/studio/bao-cao/huan-luyen-vien"
            className="text-ink decoration-rule-2 hover:text-copper hover:decoration-copper underline underline-offset-[6px]"
          >
            báo cáo huấn luyện viên
          </Link>
        </p>
      </div>

      <StatGroup label={`Số liệu tháng ${month}/${year}`}>
        <Stat
          label="Lớp đã xếp"
          value={figure(query.data?.scheduled_sessions)}
          unit="lớp"
          context={
            <Link
              to="/studio/lich"
              className="decoration-rule-2 hover:text-copper hover:decoration-copper inline-flex min-h-11 items-center underline underline-offset-[5px] md:min-h-0"
            >
              Xếp lớp ở Lịch &amp; lớp học
            </Link>
          }
        />
        <Stat label="Lượt đăng ký" value={figure(query.data?.total_bookings)} unit="lượt" />
        <Stat
          label="Lớp đã hủy"
          value={figure(query.data?.cancelled_sessions)}
          unit="lớp"
        />
      </StatGroup>
    </section>
  );
}
