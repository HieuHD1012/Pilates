import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Section } from "~/ui/layout";

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

export default function About() {
  return (
    <>
      <section className="pearl-about-hero gutter mx-auto max-w-(--container-page)">
        <div className="pearl-about-copy">
          <p className="label-micro">Studio / Nha Trang</p>
          <h1 className="font-display text-ink font-light">Một nơi để bắt đầu từ chính mình.</h1>
          <p className="text-ink-2">Không gian reformer tại Nha Trang, cho lớp nhóm nhỏ và lớp riêng. Hãy nhìn qua nơi bạn sẽ tập trước khi ghé studio.</p>
        </div>
        <div className="pearl-about-photo"><ArtDirectedImage photo="room" priority sizes="(min-width: 900px) 56vw, 100vw" /></div>
      </section>

      <Section index="01" label="Cách chúng tôi tập">
        <div className="pearl-about-intro">
          <h2 className="font-display text-ink font-light">Sự chú ý nằm trong từng động tác.</h2>
          <p className="text-ink-2">Một buổi Pilates có thể đi chậm. Hơi thở, căn chỉnh và khả năng kiểm soát là những điều bạn sẽ quay lại với trong mỗi chuyển động.</p>
        </div>
      </Section>

      <Section index="02" label="Nguyên tắc" tone="deep">
        <dl className="pb-20 md:pb-28">
          {[
            {
              term: "Lớp nhỏ",
              def: "Số chỗ mỗi buổi do studio đặt cho từng lớp, và không được vượt qua — kể cả khi có người muốn tập thêm.",
            },
            {
              term: "Một huấn luyện viên cho mỗi buổi",
              def: "Người dạy buổi của bạn là người chịu trách nhiệm cho buổi đó, từ đầu đến cuối.",
            },
            {
              term: "Không có buổi tập bù cho việc tập sai",
              def: "Nếu một động tác chưa đúng, buổi tập dừng lại ở đó và chỉnh, thay vì đi tiếp cho đủ bài.",
            },
          ].map(({ term, def }) => (
            <div key={term} className="rule-t grid gap-x-8 gap-y-2 py-6 md:grid-cols-12">
              <dt className="text-ink text-lg md:col-span-4">{term}</dt>
              <dd className="measure text-ink-2 text-sm md:col-span-7 md:col-start-6">
                {def}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
