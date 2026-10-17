import { Link } from "react-router";

import { usePublicTrainers } from "~/features/public/queries";
import { publicApi } from "~/lib/api/endpoints";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, Skeleton } from "~/ui/feedback";
import { Section } from "~/ui/layout";
import { PublicPageHeader } from "~/ui/public-page";

import type { Route } from "./+types/trainers";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Huấn luyện viên — J Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Đội ngũ huấn luyện viên của J Pilates Nha Trang. Mỗi buổi tập do một huấn luyện viên phụ trách từ đầu đến cuối.",
    },
  ];
}

/**
 * Trainer profiles are studio-managed and change without a deploy, so this page
 * is pre-rendered for its copy and hydrates the roster from the API. Nothing
 * about a named trainer is hard-coded here — inventing a biography would be
 * inventing a person.
 */
export default function Trainers() {
  const query = usePublicTrainers();

  return (
    <>
      <PublicPageHeader
        label="Huấn luyện viên"
        title={
          <>
            Người sẽ <em>đứng cạnh máy</em> của bạn.
          </>
        }
        lede="Mỗi buổi tập có một huấn luyện viên đồng hành từ đầu đến cuối, quan sát và điều chỉnh động tác cho bạn."
      />

      <Section index="01" label="Đội ngũ">
        <div className="pb-20 md:pb-28">
          {query.isPending ? (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }, (_, index) => (
                <li key={index}>
                  <Skeleton className="aspect-4/5 w-full" />
                  <Skeleton className="mt-4 h-5 w-32" />
                  <Skeleton className="mt-2 h-3 w-full" />
                </li>
              ))}
            </ul>
          ) : null}
          {query.isPending ? (
            // Outside the list: a <ul> may only contain <li> children.
            <span className="sr-only">Đang tải danh sách huấn luyện viên</span>
          ) : null}

          {query.isError ? (
            <ErrorState
              description="Chưa tải được danh sách huấn luyện viên. Bạn có thể liên hệ studio để được giới thiệu trực tiếp."
              onRetry={() => void query.refetch()}
            />
          ) : null}

          {query.isSuccess && query.data.length === 0 ? (
            <EmptyState
              title="Hồ sơ huấn luyện viên đang được cập nhật"
              description="Studio sẽ công bố hồ sơ đội ngũ tại đây. Trong lúc đó, bạn có thể để lại thông tin để được tư vấn."
              action={
                <Button asChild variant="secondary">
                  <Link to="/dat-tu-van">Nhận tư vấn</Link>
                </Button>
              }
            />
          ) : null}

          {query.isSuccess && query.data.length > 0 ? (
            /* A portrait card: face, name and words in one column, read top
               to bottom. The old row put the name four columns away from the
               face it belongs to. */
            <ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {query.data.map((trainer) => (
                /**
                 * `GET /public/trainers` returns a name, a photo key and a bio
                 * — no id, and no specialties. The specialties column that used
                 * to sit here had nothing behind it: the field exists on the
                 * staff-facing trainer record and is deliberately not published.
                 */
                <li key={trainer.full_name}>
                  <div className="aspect-4/5 w-full">
                    {trainer.photo_key ? (
                      <img
                        src={publicApi.trainerPhotoUrl(trainer.photo_key)}
                        alt={`Chân dung ${trainer.full_name}`}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    ) : (
                      // No concept photograph here: a stranger's face beside a
                      // real name would read as that trainer (P3, identity is
                      // absolute). The frame waits, quietly, for the portrait.
                      <div className="border-rule bg-sand-deep size-full border" />
                    )}
                  </div>
                  <h2 className="font-display text-ink mt-4 text-2xl font-light">
                    {trainer.full_name}
                  </h2>
                  {trainer.bio ? (
                    <p className="text-ink-2 mt-1.5 text-base">{trainer.bio}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Section>
    </>
  );
}
