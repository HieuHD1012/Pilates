import { Link } from "react-router";

import { useStudentPackages } from "~/features/booking/queries";
import { formatDate } from "~/lib/format";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { StatusBadge, type StatusTone } from "~/ui/status";
import type { StudentPackageStatus } from "~/lib/api/types";

import type { Route } from "./+types/packages";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Gói tập — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

const STATUS: Record<StudentPackageStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Đang dùng", tone: "positive" },
  expired: { label: "Hết hạn", tone: "critical" },
  used_up: { label: "Hết buổi", tone: "critical" },
  suspended: { label: "Tạm dừng", tone: "attention" },
};

export default function StudentPackages() {
  const query = useStudentPackages();
  const items = query.data ?? [];

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <h1 className="text-ink text-xl font-medium">Gói tập</h1>
      <p className="measure text-ink-2 mt-1 text-sm">
        Số buổi còn lại được tính từ toàn bộ lịch sử cộng và trừ buổi trong hệ thống của
        studio.
      </p>

      <div className="mt-6">
        {query.isPending ? <SkeletonRows rows={2} /> : null}

        {query.isError ? (
          <ErrorState
            description="Không tải được gói tập của bạn."
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {query.isSuccess && items.length === 0 ? (
          <EmptyState
            title="Bạn chưa có gói tập nào"
            description="Liên hệ studio để được tư vấn gói phù hợp với lịch của bạn."
            action={
              <Button asChild variant="secondary">
                <Link to="/lien-he">Liên hệ studio</Link>
              </Button>
            }
          />
        ) : null}

        {query.isSuccess && items.length > 0 ? (
          <ul className="rule-t">
            {items.map((item) => {
              const status = STATUS[item.status];
              const used = item.sessionsTotal - item.sessionsRemaining;

              return (
                <li key={item.id} className="rule-b py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-ink text-base">{item.packageName}</p>
                      <p className="text-ink-2 mt-1 text-xs">
                        {formatDate(`${item.startDate}T00:00:00+07:00`)} –{" "}
                        {formatDate(`${item.expiryDate}T00:00:00+07:00`)}
                      </p>
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>

                  <div className="mt-4 flex items-baseline gap-6">
                    <p className="text-ink-2 flex items-baseline gap-2 text-xs">
                      <span>Còn lại</span>
                      <Figures display className="text-ink text-2xl">
                        {item.sessionsRemaining}
                      </Figures>
                      <span>/ {item.sessionsTotal} buổi</span>
                    </p>
                    <p className="text-ink-2 text-xs">
                      Đã dùng <Figures className="text-ink">{used}</Figures>
                    </p>
                  </div>

                  {item.renewalDue ? (
                    <p className="text-lacquer mt-3 text-xs">
                      Gói sắp hết. Nhân viên studio sẽ liên hệ để gia hạn.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
