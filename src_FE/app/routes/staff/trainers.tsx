import { ArrowRight, ChartColumn, Eye } from "lucide-react";
import { Link } from "react-router";

import { useTrainerDirectory } from "~/features/people/queries";
import type { TrainerResponse } from "~/lib/api/schema";
import { formatPhone } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { PendingFact } from "~/ui/pending-fact";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";
import { Avatar, InlineNote, Panel, WorkspacePage } from "~/ui/workspace";

import type { Route } from "./+types/trainers";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Huấn luyện viên — J Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The trainer roster.
 *
 * A handful of people, so each is a card rather than a table row: there is no
 * column anyone reads down, and a person reads better as a person — initials,
 * name, phone, then the two states the studio acts on. Specialties are one
 * free-text line on the backend, read and never filtered on, so they are the
 * sentence the trainer wrote. Nothing here is invented: a specialty or phone
 * the studio has not supplied renders as a pending fact.
 *
 * The month's figures live on the profile, not here: the list endpoint does
 * not carry them, and one stats request per card would be a query per person
 * to decorate a roster.
 */
export default function StaffTrainers() {
  // Everyone, not just the active ones: this is the screen where a trainer who
  // has stopped teaching is found again.
  const query = useTrainerDirectory();

  const trainers = query.data ?? [];
  const activeCount = trainers.filter((trainer) => trainer.is_active).length;
  const publishedCount = trainers.filter((trainer) => trainer.is_public).length;

  return (
    <WorkspacePage>
      <PageHeader
        title="Huấn luyện viên"
        description="Ai đang dạy, chuyên môn của từng người, và hồ sơ nào đã hiện trên trang công khai."
        actions={
          <>
            <DemoDataNotice />
            <Button asChild variant="secondary">
              <Link to="/studio/bao-cao/huan-luyen-vien">
                <ChartColumn className="size-4" aria-hidden="true" />
                So sánh giữa các huấn luyện viên
              </Link>
            </Button>
          </>
        }
        meta={
          query.isSuccess ? (
            <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-sm">
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

      {/* One wrapper, so the refetch hairline QueryBoundary draws above the
          cards does not take a gap of its own in the page column. */}
      <div>
        <QueryBoundary
          query={query}
          skeletonRows={4}
          emptyTitle="Chưa có huấn luyện viên"
          emptyDescription="Danh sách sẽ xuất hiện khi studio thêm hồ sơ huấn luyện viên."
          errorDescription="Không tải được danh sách huấn luyện viên."
          showErrorDetail
        >
          {(items) => (
            <ul className="grid gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
              {items.map((trainer) => (
                <li key={trainer.id} className="flex min-w-0">
                  <TrainerCard trainer={trainer} />
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </div>

      <InlineNote icon={<Eye aria-hidden="true" />}>
        Chỉ hồ sơ “Đã công khai” hiện trên trang Huấn luyện viên của website. Chuyên môn và
        giới thiệu ngắn ở đó lấy đúng từ hồ sơ này.
      </InlineNote>
    </WorkspacePage>
  );
}

function TrainerCard({ trainer }: { trainer: TrainerResponse }) {
  return (
    // A trainer who has stopped teaching recedes with the recessed ground, but
    // stays on the page: this is where they are found again.
    <Panel
      as="article"
      tone={trainer.is_active ? "paper" : "recessed"}
      aria-labelledby={`trainer-${trainer.id}`}
      className="flex w-full flex-col gap-4 p-5"
    >
      <div className="flex items-center gap-3.5">
        <Avatar name={trainer.full_name} size="xl" />
        {/* A Vietnamese name wraps; it is never truncated and never hidden behind
            a hover title (AGENTS P5). */}
        <div className="min-w-0">
          <h2
            id={`trainer-${trainer.id}`}
            className="font-display text-ink text-2xl leading-tight font-normal"
          >
            {trainer.full_name}
          </h2>
          <p className="text-ink-2 mt-0.5 text-sm">
            {trainer.phone ? (
              formatPhone(trainer.phone)
            ) : (
              <PendingFact label="Số điện thoại huấn luyện viên" />
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

      <div className="text-sm">
        <p className="text-ink-2 text-xs">Chuyên môn</p>
        <p className="text-ink mt-0.5">
          {trainer.specialties ?? <PendingFact label="Chuyên môn" />}
        </p>
      </div>

      <Link
        to={`/studio/huan-luyen-vien/${trainer.id}`}
        className="rule-t text-copper hover:text-copper-2 mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-sm font-medium"
      >
        Mở hồ sơ<span className="sr-only"> {trainer.full_name}</span>
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </Panel>
  );
}
