import { useTrainerProfile } from "~/features/people/queries";
import { formatDate, formatNumber, formatPhone, telHref } from "~/lib/format";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { DetailList, DetailRow } from "~/ui/detail-list";
import { Skeleton } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { Metric, PageHeader } from "~/ui/layout";
import { PendingFact } from "~/ui/pending-fact";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/profile";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Hồ sơ — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The trainer's own record, as the studio holds it.
 *
 * Read-only: the studio owns a trainer's headline, specialties and contact
 * details, and there is no self-service endpoint. Facts the studio has not
 * supplied render as <PendingFact> instead of being filled in, and the portrait
 * frame is simply absent when there is no photograph — an empty avatar ring
 * reads as a broken profile rather than a waiting one.
 */
export default function TrainerProfile() {
  const query = useTrainerProfile();

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <PageHeader
        title="Hồ sơ"
        description="Thông tin studio đang lưu cho bạn. Cần chỉnh sửa, vui lòng liên hệ studio."
      />

      <DemoDataNotice className="mt-4" />

      <div className="mt-6">
        <QueryBoundary
          query={query}
          isEmpty={() => false}
          loading={<ProfileSkeleton />}
          errorDescription="Không tải được hồ sơ của bạn."
        >
          {(trainer) => (
            <>
              {trainer.photoUrl ? (
                <img
                  src={trainer.photoUrl}
                  alt={trainer.fullName}
                  loading="lazy"
                  decoding="async"
                  className="border-rule mb-6 size-24 rounded-full border object-cover"
                />
              ) : null}

              <DetailList>
                <DetailRow label="Họ và tên">{trainer.fullName}</DetailRow>
                <DetailRow label="Giới thiệu ngắn">
                  {trainer.headline ?? <PendingFact label="Giới thiệu huấn luyện viên" />}
                </DetailRow>
                <DetailRow label="Chuyên môn">
                  {trainer.specialties.length > 0 ? (
                    trainer.specialties.join(" · ")
                  ) : (
                    <PendingFact label="Chuyên môn huấn luyện viên" />
                  )}
                </DetailRow>
                <DetailRow label="Số điện thoại">
                  {trainer.phone ? (
                    <a
                      href={telHref(trainer.phone)}
                      className="figures text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[5px]"
                    >
                      {formatPhone(trainer.phone)}
                    </a>
                  ) : (
                    <PendingFact label="Số điện thoại huấn luyện viên" />
                  )}
                </DetailRow>
                <DetailRow label="Email">
                  {trainer.email ?? <PendingFact label="Email huấn luyện viên" />}
                </DetailRow>
                <DetailRow label="Bắt đầu làm việc">
                  <Figures>{formatDate(`${trainer.joinedAt}T00:00:00+07:00`)}</Figures>
                </DetailRow>
              </DetailList>

              <section className="mt-8">
                <h2 className="text-ink text-sm font-medium">Một tháng gần đây</h2>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5">
                  <Metric
                    label="Lớp đã dạy"
                    value={formatNumber(trainer.monthlyClassCount)}
                    unit="lớp"
                  />
                  <Metric
                    label="Học viên"
                    value={formatNumber(trainer.monthlyStudentCount)}
                    unit="người"
                  />
                </div>
                <p className="text-ink-2 mt-4 text-xs">
                  Hai số này do hệ thống của studio tính.
                </p>
              </section>
            </>
          )}
        </QueryBoundary>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div>
      <div className="rule-t">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="rule-b flex items-baseline gap-4 py-3.5">
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-3 max-w-64 flex-1" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-6">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      <span className="sr-only">Đang tải hồ sơ</span>
    </div>
  );
}
