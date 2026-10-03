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
      <section className="ella-about-hero">
        <div className="ella-about-photo">
          <ArtDirectedImage photo="room" priority sizes="(min-width: 768px) 54vw, 100vw" />
        </div>
        <div className="ella-about-copy">
          <p className="ella-kicker">Studio · Nha Trang</p>
          <h1 className="font-display">Một phòng tập dành cho việc tập trung.</h1>
          <p>
            Máy reformer được đặt trong một không gian sáng, đủ rõ để bạn thấy nơi mình sẽ
            tập. Lớp nhóm nhỏ và lớp riêng đều bắt đầu từ sự quan sát từng chuyển động.
          </p>
        </div>
      </section>

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
