import { Link, useParams } from "react-router";

import {
  useTrainer,
  useTrainerMonthStats,
  useTrainerPhoto,
} from "~/features/people/queries";
import type { TrainerResponse } from "~/lib/api/schema";
import { formatDate, formatNumber, formatPhone, telHref } from "~/lib/format";
import { Absent } from "~/ui/absent";
import { Button } from "~/ui/button";
import { DetailList, DetailRow } from "~/ui/detail-list";
import { Skeleton, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { Metric, PageHeader } from "~/ui/layout";
import { PendingFact } from "~/ui/pending-fact";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/trainer-detail";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Hồ sơ huấn luyện viên — Soul Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

/**
 * One trainer, as a record.
 *
 * A read screen: the ruled definition list carries the facts the studio has
 * supplied and `<PendingFact>` carries the ones it has not. The figures are
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
    <div className="gutter max-w-(--container-column) py-6">
      <Link
        to="/studio/huan-luyen-vien"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Huấn luyện viên
      </Link>

      <QueryBoundary
        query={query}
        loading={<RecordSkeleton />}
        errorDescription="Không mở được hồ sơ này. Hồ sơ có thể đã bị xóa hoặc đường dẫn không còn đúng."
        showErrorDetail
      >
        {(trainer) => <TrainerRecord trainer={trainer} />}
      </QueryBoundary>
    </div>
  );
}

function TrainerRecord({ trainer }: { trainer: TrainerResponse }) {
  return (
    <>
      <PageHeader
        className="mt-4"
        title={trainer.full_name}
        description="Hồ sơ huấn luyện viên và mức độ hoạt động trong 30 ngày gần nhất."
        meta={
          trainer.is_active ? (
            <StatusBadge tone="positive">Đang dạy</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Tạm nghỉ</StatusBadge>
          )
        }
      />

      <Portrait trainer={trainer} />

      <DetailList className="mt-5">
        <DetailRow label="Họ và tên">{trainer.full_name}</DetailRow>

        <DetailRow label="Giới thiệu ngắn">
          {trainer.bio ?? <PendingFact label="Giới thiệu ngắn" />}
        </DetailRow>

        <DetailRow label="Chuyên môn">
          {trainer.specialties ?? <PendingFact label="Chuyên môn" />}
        </DetailRow>

        <DetailRow label="Điện thoại">
          {trainer.phone ? (
            <a
              href={telHref(trainer.phone)}
              className="decoration-rule-2 hover:decoration-lacquer underline underline-offset-[6px]"
            >
              {formatPhone(trainer.phone)}
            </a>
          ) : (
            <PendingFact label="Số điện thoại huấn luyện viên" />
          )}
        </DetailRow>

        {/* A trainer record has no email of its own: the email is the login,
            and it lives on the account. `user_id` says whether there is one. */}
        <DetailRow label="Tài khoản đăng nhập">
          {trainer.user_id !== null ? (
            "Đã có tài khoản"
          ) : (
            <Absent>Chưa có tài khoản</Absent>
          )}
        </DetailRow>

        <DetailRow label="Thêm vào studio">
          <Figures>{formatDate(trainer.created_at)}</Figures>
        </DetailRow>

        <DetailRow label="Trang công khai">
          {trainer.is_public
            ? "Đã hiện trên trang huấn luyện viên"
            : "Chưa hiện trên trang huấn luyện viên"}
        </DetailRow>
      </DetailList>

      <MonthStats trainerId={trainer.id} />

      <section className="rule-t mt-10 pt-5">
        <h2 className="text-ink text-sm font-medium">So sánh giữa các huấn luyện viên</h2>
        <p className="measure-wide text-ink-2 mt-1 text-xs">
          Báo cáo huấn luyện viên đặt số lớp và lượt đăng ký của cả studio trên cùng một
          khoảng thời gian.
        </p>
        <div className="mt-4">
          <Button asChild size="sm" variant="secondary">
            <Link to="/studio/bao-cao/huan-luyen-vien">Mở báo cáo huấn luyện viên</Link>
          </Button>
        </div>
      </section>

      <p className="rule-t text-ink-2 mt-8 pt-3 text-xs">
        Màn hình này chỉ để xem hồ sơ. Việc xếp lớp cho huấn luyện viên nằm ở màn hình lịch
        &amp; lớp học.
      </p>
    </>
  );
}

/** Shaped like the record it replaces: a title, a line of orientation, rows. */
function RecordSkeleton() {
  return (
    <div className="mt-4">
      <div className="rule-b pb-4">
        <Skeleton className="h-5 w-52 max-w-full" />
        <Skeleton className="mt-3 h-3 w-72 max-w-full" />
      </div>
      <SkeletonRows rows={7} className="mt-5" />
    </div>
  );
}

/**
 * The portrait, fetched as bytes. `GET /trainers/{id}/photo` is behind the
 * token and re-authorised on every read, so there is no static URL to point an
 * `<img src>` at, and no photo means no frame.
 */
function Portrait({ trainer }: { trainer: TrainerResponse }) {
  const photo = useTrainerPhoto(trainer.id, trainer.photo_key !== null);
  if (!photo.data) return null;

  return (
    <img
      src={photo.data}
      alt={trainer.full_name}
      decoding="async"
      className="border-rule mt-5 size-24 rounded-full border object-cover"
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
  const query = useTrainerMonthStats({
    trainer_id: trainerId,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  return (
    <section className="mt-10">
      <h2 className="text-ink text-sm font-medium">Tháng này</h2>
      <p className="measure-wide text-ink-2 mt-1 text-xs">
        Tính theo tháng dương lịch, giờ studio. Cùng cách tính với báo cáo huấn luyện viên.
      </p>

      <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-3">
        <Metric
          label="Lớp đã xếp"
          value={
            <Figures display>
              {query.data ? formatNumber(query.data.scheduled_sessions) : "—"}
            </Figures>
          }
        />
        <Metric
          label="Lớp đã hủy"
          value={
            <Figures display>
              {query.data ? formatNumber(query.data.cancelled_sessions) : "—"}
            </Figures>
          }
        />
        <Metric
          label="Lượt đăng ký"
          value={
            <Figures display>
              {query.data ? formatNumber(query.data.total_bookings) : "—"}
            </Figures>
          }
        />
      </div>
    </section>
  );
}
