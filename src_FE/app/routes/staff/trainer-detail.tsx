import { TrainerPhotoUpload } from "~/features/people/photo-gallery";
import { TrainerEditor } from "~/features/people/trainer-editor";
import {
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  ChartColumn,
  ChevronRight,
  Info,
  LockKeyhole,
  Phone,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import {
  useTrainer,
  useTrainerMonthStats,
  useTrainerPhoto,
} from "~/features/people/queries";
import type { TrainerResponse } from "~/lib/api/schema";
import { formatDate, formatNumber, formatPhone, telHref } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Skeleton, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PendingFact } from "~/ui/pending-fact";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";
import {
  Avatar,
  InlineNote,
  Kpi,
  Panel,
  PanelBody,
  PanelHeader,
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
 * A read screen: the profile panel says who this is and how to reach them, the
 * month's figures sit under it, and the facts the studio has supplied — or has
 * not, as `<PendingFact>` — sit in the record beside them. The figures are
 * `GET /classes/trainer-stats`, which is the **same function the trainer
 * report uses** — two screens saying "classes taught" must not run two
 * different queries, or one of them is wrong and nobody knows which.
 *
 * Assigning classes lives on the calendar, so this screen states where that
 * happens instead of growing a second subject.
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
          and the two states the studio acts on. */}
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
            <p className="text-ink-2 mt-1 text-sm">
              Hồ sơ huấn luyện viên và mức độ hoạt động trong tháng này.
            </p>

            <ul className="text-ink-2 mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <li className="inline-flex items-center gap-1.5">
                <Phone className="size-4" aria-hidden="true" />
                <span className="sr-only">Điện thoại: </span>
                {trainer.phone ? (
                  <span className="text-ink">{formatPhone(trainer.phone)}</span>
                ) : (
                  <PendingFact label="Số điện thoại huấn luyện viên" />
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

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
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
              <DemoDataNotice />
            </div>
          </div>

          {/* Calling is the contact action, so it is copper (ADR 0006, 9).
              With no number on file there is nothing to call. */}
          <TrainerEditor trainer={trainer} />
          {trainer.phone ? (
            <Button asChild variant="copper">
              <a href={telHref(trainer.phone)}>
                <Phone className="size-4" aria-hidden="true" />
                Gọi
              </a>
            </Button>
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5 md:gap-6">
          <MonthStats trainerId={trainer.id} />
          <Panel>
            <PanelBody>
              <TrainerPhotoUpload trainerId={trainer.id} />
            </PanelBody>
          </Panel>

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
                <Fact label="Trang công khai">
                  {trainer.is_public
                    ? "Đã hiện trên trang huấn luyện viên"
                    : "Chưa hiện trên trang huấn luyện viên"}
                </Fact>
              </dl>
            </PanelBody>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5 md:gap-6">
          <Panel>
            <PanelHeader
              title="So sánh giữa các huấn luyện viên"
              description="Báo cáo huấn luyện viên đặt số lớp và lượt đăng ký của cả studio trên cùng một khoảng thời gian."
            />
            <PanelBody>
              <Button asChild size="sm" variant="secondary">
                <Link to="/studio/bao-cao/huan-luyen-vien">
                  <ChartColumn className="size-4" aria-hidden="true" />
                  Mở báo cáo huấn luyện viên
                </Link>
              </Button>
            </PanelBody>
          </Panel>

          <InlineNote icon={<Info aria-hidden="true" />}>
            Màn hình này chỉ để xem hồ sơ. Việc xếp lớp cho huấn luyện viên nằm ở màn hình
            lịch &amp; lớp học.
          </InlineNote>
        </div>
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
          Tháng này
        </h2>
        <p className="text-ink-2 text-sm">
          Tháng{" "}
          <Figures>
            {month}/{year}
          </Figures>{" "}
          · tính theo giờ studio, cùng cách tính với báo cáo huấn luyện viên
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
        <Kpi
          label="Lớp đã xếp"
          icon={<CalendarCheck />}
          value={figure(query.data?.scheduled_sessions)}
          unit="lớp"
        />
        <Kpi
          label="Lượt đăng ký"
          icon={<Users />}
          value={figure(query.data?.total_bookings)}
          unit="lượt"
        />
        <Kpi
          label="Lớp đã hủy"
          icon={<CalendarX />}
          value={figure(query.data?.cancelled_sessions)}
          unit="lớp"
        />
      </div>
    </section>
  );
}
