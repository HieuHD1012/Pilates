import { Link } from "react-router";

import { ArrowLink } from "~/ui/arrow-link";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { Section } from "~/ui/layout";
import { SectionRail } from "~/ui/public-page";

import type { Route } from "./+types/about";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Studio — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Soul Pilates Nha Trang: studio reformer với lớp nhóm nhỏ và lớp riêng, tập trung vào căn chỉnh và kiểm soát chuyển động.",
    },
  ];
}

const PRINCIPLES = [
  {
    term: "Lớp nhỏ",
    def: "Bạn có thể chọn nhịp chung của lớp nhóm hoặc một buổi riêng với huấn luyện viên.",
  },
  {
    term: "Một người dạy",
    def: "Người dạy buổi của bạn chịu trách nhiệm cho buổi đó, từ đầu đến cuối.",
  },
  {
    term: "Chỉnh trước, tăng sau",
    def: "Huấn luyện viên quan sát chuyển động và điều chỉnh bài tập theo khả năng của người tập.",
  },
];

/**
 * The one page whose subject is the room itself, so it is the one page that
 * opens on a full-width photograph. The title panel overlaps the frame's lower
 * left corner on the cream ground: type is joined to the picture without being
 * set on it, so no scrim is ever needed (P1).
 */
export default function About() {
  return (
    <>
      <section className="bg-sand">
        <div className="aspect-4/3 md:aspect-16/9 lg:aspect-auto lg:h-[38.75rem]">
          <ArtDirectedImage
            photo="room"
            priority
            sizes="100vw"
            imgClassName="object-[50%_62%]"
          />
        </div>
        <div className="gutter mx-auto max-w-(--container-page)">
          <div className="grid grid-cols-1 gap-y-8 pb-16 md:pb-24 lg:grid-cols-12 lg:gap-x-6">
            <div className="bg-sand relative -mt-10 pt-8 pr-6 md:-mt-18 md:pt-12 lg:col-span-7 lg:-mt-42 lg:pt-14 lg:pr-16">
              {/* The panel's ground continues to the viewport edge on the left
                  so its corner reads as a cut into the photograph, not a card. */}
              <span
                aria-hidden="true"
                className="bg-sand absolute inset-y-0 right-full w-[100vw]"
              />
              <p className="label-micro text-copper">Studio</p>
              <h1 className="font-display text-d1 text-ink mt-5 font-light">
                Một khoảng thời gian để{" "}
                <em className="text-copper font-light">trở lại với cơ thể.</em>
              </h1>
              <p className="measure text-lede text-ink-2 mt-6">
                Từ một buổi lớp nhóm đến một giờ tập riêng, cách hướng dẫn bắt đầu bằng việc
                quan sát bạn di chuyển trên máy reformer.
              </p>
            </div>
            {/* The sticky header already carries the ask in this viewport (P2),
                so the page offers it as a question instead of a second button. */}
            <div className="lg:col-span-4 lg:col-start-9 lg:self-end">
              <p className="measure text-ink-2 text-sm">
                Muốn hỏi về phòng tập hay giờ tập? Để lại số, studio gọi lại.
              </p>
              <ArrowLink to="/dat-tu-van">Hỏi studio</ArrowLink>
            </div>
          </div>
        </div>
      </section>

      <Section index="01" label="Không gian">
        <div className="grid grid-cols-1 gap-y-8 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
          <SectionRail title="Không gian dành cho chuyển động." />
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-x-12 lg:col-span-8">
            <p className="measure text-ink-2 text-base">
              Reformer hỗ trợ nhiều mức lực cản và tư thế tập. Bài tập có thể được điều chỉnh
              để phù hợp với buổi học và người tập.
            </p>
            <p className="measure text-ink-2 text-base">
              Một buổi tập tốt có không gian cho câu hỏi, hướng dẫn và những điều chỉnh nhỏ.
              Bạn không cần thuộc bài trước khi đến.
            </p>
          </div>
        </div>
      </Section>

      <Section index="02" label="Nguyên tắc" tone="deep">
        <div className="grid grid-cols-1 gap-y-8 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
          <SectionRail title="Ba điều studio giữ ở mọi buổi tập." />
          <dl className="lg:col-span-8">
            {PRINCIPLES.map(({ term, def }) => (
              <div
                key={term}
                className="border-rule-2 grid gap-2 border-t py-5 last:border-b sm:grid-cols-[11rem_1fr] sm:gap-6"
              >
                <dt className="text-ink text-base font-medium">{term}</dt>
                <dd className="measure text-ink-2 text-base">{def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <section className="bg-sand">
        <div className="gutter mx-auto flex max-w-(--container-page) flex-wrap items-end justify-between gap-8 py-20 md:py-28">
          <h2 className="font-display text-d2 text-ink max-w-[16em] font-light">
            Hai hình thức tập: lớp nhóm và lớp riêng.
          </h2>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
            <Button asChild variant="secondary" size="lg">
              <Link to="/dich-vu">Xem hình thức tập</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
