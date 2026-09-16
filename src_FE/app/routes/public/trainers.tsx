import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { api } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type { Trainer } from "~/lib/api/types";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, Skeleton } from "~/ui/feedback";
import { Section } from "~/ui/layout";
import { PublicPageHeader } from "~/ui/public-page";

import type { Route } from "./+types/trainers";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Huấn luyện viên — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Đội ngũ huấn luyện viên của Soul Pilates Nha Trang. Mỗi buổi tập do một huấn luyện viên phụ trách từ đầu đến cuối.",
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
  const query = useQuery({
    queryKey: queryKeys.publicTrainers(),
    queryFn: () => api.get<{ items: Trainer[] }>("/public/trainers"),
    select: (data) => data.items,
    staleTime: 5 * 60_000,
  });

  return (
    <>
      <PublicPageHeader
        label="Huấn luyện viên"
        title="Một người chịu trách nhiệm cho buổi tập của bạn."
        lede="Mỗi lớp có đúng một huấn luyện viên phụ trách. Bạn biết trước ai sẽ dạy buổi mình đã đặt."
      />

      <Section index="01" label="Đội ngũ">
        <div className="pb-20 md:pb-28">
          {query.isPending ? (
            <ul className="rule-t">
              {Array.from({ length: 3 }, (_, index) => (
                <li key={index} className="rule-b flex items-center gap-6 py-6">
                  <Skeleton className="size-16 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
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
                  <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
                </Button>
              }
            />
          ) : null}

          {query.isSuccess && query.data.length > 0 ? (
            <ul className="rule-t">
              {query.data.map((trainer) => (
                <li
                  key={trainer.id}
                  className="rule-b grid gap-x-8 gap-y-4 py-7 md:grid-cols-12"
                >
                  <div className="md:col-span-3">
                    <div className="aspect-4/5 w-28 md:w-full md:max-w-40">
                      {trainer.photoUrl ? (
                        <img
                          src={trainer.photoUrl}
                          alt={`Chân dung ${trainer.fullName}`}
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover"
                        />
                      ) : (
                        <ArtDirectedImage photo="method" />
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-5">
                    <h2 className="font-display text-ink text-xl font-light">
                      {trainer.fullName}
                    </h2>
                    {trainer.headline ? (
                      <p className="measure text-ink-2 mt-2 text-sm">{trainer.headline}</p>
                    ) : null}
                  </div>
                  <div className="md:col-span-3 md:col-start-10">
                    {trainer.specialties.length > 0 ? (
                      <>
                        <p className="label-micro">Chuyên môn</p>
                        <ul className="mt-2 space-y-1">
                          {trainer.specialties.map((item) => (
                            <li key={item} className="text-ink text-sm">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Section>
    </>
  );
}
