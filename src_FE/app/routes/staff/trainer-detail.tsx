import { Link, useParams } from "react-router";

import { useTrainerDetail } from "~/features/people/queries";
import type { TrainerDetail as TrainerDetailRecord } from "~/lib/api/types";
import { formatDate, formatPhone, telHref } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
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
 * supplied, `<PendingFact>` carries the ones it has not, and the two figures
 * are the backend's own rolling-30-day counts — not a chart, and not a tile
 * grid. Assigning classes lives on the calendar, so this screen states where
 * that happens instead of growing a second subject.
 */
export default function StaffTrainerDetail() {
  const { trainerId = "" } = useParams();
  const query = useTrainerDetail(trainerId);

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

function TrainerRecord({ trainer }: { trainer: TrainerDetailRecord }) {
  return (
    <>
      <PageHeader
        className="mt-4"
        title={trainer.fullName}
        description="Hồ sơ huấn luyện viên và mức độ hoạt động trong 30 ngày gần nhất."
        meta={
          trainer.active ? (
            <StatusBadge tone="positive">Đang dạy</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Tạm nghỉ</StatusBadge>
          )
        }
      />

      <DemoDataNotice className="mt-5" />

      <DetailList className="mt-5">
        <DetailRow label="Họ và tên">{trainer.fullName}</DetailRow>

        <DetailRow label="Giới thiệu ngắn">
          {trainer.headline ?? <PendingFact label="Giới thiệu ngắn" />}
        </DetailRow>

        <DetailRow label="Chuyên môn">
          {trainer.specialties.length > 0 ? (
            trainer.specialties.join(", ")
          ) : (
            <PendingFact label="Chuyên môn" />
          )}
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

        <DetailRow label="Email">
          {trainer.email ? (
            <a
              href={`mailto:${trainer.email}`}
              className="decoration-rule-2 hover:decoration-lacquer underline underline-offset-[6px]"
            >
              {trainer.email}
            </a>
          ) : (
            <PendingFact label="Email huấn luyện viên" />
          )}
        </DetailRow>

        <DetailRow label="Bắt đầu làm việc">
          <Figures>{formatDate(`${trainer.joinedAt}T00:00:00+07:00`)}</Figures>
        </DetailRow>

        <DetailRow label="Trang công khai">
          {trainer.publicProfile
            ? "Đã hiện trên trang huấn luyện viên"
            : "Chưa hiện trên trang huấn luyện viên"}
        </DetailRow>
      </DetailList>

      <section className="mt-10">
        <h2 className="text-ink text-sm font-medium">Hoạt động 30 ngày gần nhất</h2>
        <p className="measure-wide text-ink-2 mt-1 text-xs">
          Hệ thống tính trên 30 ngày liên tục tính đến hôm nay.
        </p>

        <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <Metric
            label="Lớp trong 30 ngày"
            value={<Figures display>{trainer.monthlyClassCount}</Figures>}
          />
          <Metric
            label="Học viên trong 30 ngày"
            value={<Figures display>{trainer.monthlyStudentCount}</Figures>}
          />
        </div>
      </section>

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
