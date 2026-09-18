import { Link } from "react-router";

import { useTrainers } from "~/features/people/queries";
import type { TrainerResponse } from "~/lib/api/schema";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { PendingFact } from "~/ui/pending-fact";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/trainers";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Huấn luyện viên — Soul Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

/**
 * The trainer roster.
 *
 * Four fields per person — name, headline, specialties, and two states — which
 * is a ruled list, not a table: five columns of mostly-prose would spend the
 * width of the screen on alignment nobody reads down. Specialties are written
 * as a sentence fragment rather than a row of pills; they are read, not
 * filtered on. Nothing here is invented: a headline the studio has not written
 * yet renders as a pending fact.
 */
export default function StaffTrainers() {
  // Everyone, not just the active ones: this is the screen where a trainer who
  // has stopped teaching is found again.
  const query = useTrainers({ limit: 200 });

  const trainers = query.data ?? [];
  const activeCount = trainers.filter((trainer) => trainer.is_active).length;
  const publishedCount = trainers.filter((trainer) => trainer.is_public).length;

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Huấn luyện viên"
        description="Ai đang dạy, chuyên môn của từng người, và hồ sơ nào đã hiện trên trang công khai."
        meta={
          query.isSuccess ? (
            <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
              <div className="flex items-baseline gap-2">
                <dt>Đang dạy</dt>
                <dd>
                  <Figures className="text-ink">
                    {activeCount}/{trainers.length}
                  </Figures>
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt>Đã công khai</dt>
                <dd>
                  <Figures className="text-ink">{publishedCount}</Figures>
                </dd>
              </div>
            </dl>
          ) : null
        }
      />

      <DemoDataNotice className="mt-5 mb-3" />

      <QueryBoundary
        query={query}
        skeletonRows={4}
        emptyTitle="Chưa có huấn luyện viên"
        emptyDescription="Danh sách sẽ xuất hiện khi studio thêm hồ sơ huấn luyện viên."
        errorDescription="Không tải được danh sách huấn luyện viên."
        showErrorDetail
      >
        {(items) => (
          <ul className="rule-t">
            {items.map((trainer) => (
              <TrainerRow key={trainer.id} trainer={trainer} />
            ))}
          </ul>
        )}
      </QueryBoundary>
    </div>
  );
}

function TrainerRow({ trainer }: { trainer: TrainerResponse }) {
  return (
    <li className="rule-b grid gap-x-6 gap-y-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      {/* A Vietnamese name wraps; it is never truncated and never hidden behind
          a hover title (AGENTS P5). */}
      <div className="min-w-0">
        <Link
          to={`/studio/huan-luyen-vien/${trainer.id}`}
          className="text-ink decoration-rule-2 hover:decoration-lacquer text-base underline underline-offset-[6px]"
        >
          {trainer.full_name}
        </Link>

        <p className="measure-wide text-ink-2 mt-1.5 text-sm">
          {trainer.bio ?? <PendingFact label="Giới thiệu ngắn" />}
        </p>

        {/* Specialties are one free-text line on the backend, not a list: it is
            read, never filtered on, so it is rendered as the sentence the
            trainer wrote. */}
        <p className="measure-wide text-ink-2 mt-1 text-xs">
          Chuyên môn:{" "}
          {trainer.specialties ? (
            <span className="text-ink">{trainer.specialties}</span>
          ) : (
            <PendingFact label="Chuyên môn" />
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
    </li>
  );
}
