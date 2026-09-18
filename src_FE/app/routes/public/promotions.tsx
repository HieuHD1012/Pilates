import { Link } from "react-router";

import { usePublicAnnouncements } from "~/features/public/queries";
import { formatDate } from "~/lib/format";
import { Button } from "~/ui/button";
import { Skeleton } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { Section } from "~/ui/layout";
import { PublicPageHeader } from "~/ui/public-page";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/promotions";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Khuyến mãi & thông báo — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Ưu đãi, thay đổi lịch tập và thông báo từ Soul Pilates Nha Trang, kèm ngày công bố.",
    },
  ];
}

/**
 * Announcements are studio-managed and change without a deploy, so this route
 * is served by the SPA fallback and owns its data through TanStack Query — it
 * is deliberately absent from `prerender-paths.ts`.
 *
 * The list is empty today, and that is the state that ships: the studio has not
 * published anything yet. So the empty state is written as real copy — what
 * gets posted here, and what a visitor who came looking for a price can do
 * instead — rather than as a placeholder waiting to be replaced.
 */
export default function Promotions() {
  const query = usePublicAnnouncements();

  return (
    <>
      <PublicPageHeader
        label="Khuyến mãi"
        title="Ưu đãi và thông báo được công bố tại đây."
        lede="Khi studio có đợt ưu đãi, thay đổi lịch tập hoặc thông báo cần học viên biết, nội dung sẽ xuất hiện trên trang này kèm ngày công bố."
      />

      <Section index="01" label="Thông báo">
        <div className="pb-20 md:pb-28">
          <QueryBoundary
            query={query}
            loading={
              <div className="rule-t">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="rule-b grid gap-x-8 gap-y-3 py-7 md:grid-cols-12"
                  >
                    <Skeleton className="h-3 w-24 md:col-span-3" />
                    <div className="space-y-3 md:col-span-8 md:col-start-5">
                      <Skeleton className="h-5 max-w-80" />
                      <Skeleton className="h-3 max-w-full" />
                    </div>
                  </div>
                ))}
                <span className="sr-only">Đang tải thông báo</span>
              </div>
            }
            emptyTitle="Chưa có thông báo nào"
            emptyDescription="Studio đăng các đợt ưu đãi, thay đổi lịch tập và thông báo dành cho học viên tại trang này. Nếu bạn đang muốn biết mức giá và gói đang áp dụng, nhân viên sẽ trao đổi trực tiếp với bạn."
            emptyAction={
              <Button asChild variant="secondary">
                <Link to="/dat-tu-van">Hỏi studio về ưu đãi</Link>
              </Button>
            }
            errorDescription="Chưa tải được danh sách thông báo. Bạn có thể thử lại, hoặc để lại thông tin để nhân viên studio trao đổi trực tiếp."
          >
            {(items) => (
              <ul className="rule-t">
                {items.map((item, index) => (
                  /**
                   * `GET /public/announcements` returns a title, a body and a
                   * publish date — no id and no slug, so there is nothing to
                   * anchor or link to, and the body is the whole payload. A
                   * link to a detail page that does not exist is worse than no
                   * link. The date may be absent on an item published
                   * immediately; the row then carries no timestamp rather than
                   * today's date, which would be a claim the studio never made.
                   */
                  <li
                    key={`${item.publish_at ?? "immediate"}-${index}`}
                    className="rule-b grid gap-x-8 gap-y-3 py-7 md:grid-cols-12"
                  >
                    {item.publish_at ? (
                      <time dateTime={item.publish_at} className="md:col-span-3">
                        <Figures className="text-ink-2 text-sm">
                          {formatDate(item.publish_at)}
                        </Figures>
                      </time>
                    ) : (
                      <span className="md:col-span-3" />
                    )}
                    <div className="md:col-span-8 md:col-start-5">
                      <h2 className="font-display text-ink text-xl font-light">
                        {item.title}
                      </h2>
                      <p className="measure text-ink-2 mt-2 text-sm whitespace-pre-line">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </div>
      </Section>
    </>
  );
}
