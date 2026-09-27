import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Link } from "react-router";
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
      <header className="pillar-about-head"><p className="pillar-kicker">Studio</p><h1>Không gian để tập trung vào từng chuyển động.</h1><p>Nơi bạn tập và cách bạn được hướng dẫn đều quan trọng trong buổi đầu.</p></header>

      <section className="pillar-about-room"><div><ArtDirectedImage photo="room" priority sizes="(min-width: 800px) 65vw, 100vw" /></div><div><p className="pillar-kicker">Không gian</p><h2>Thấy rõ nơi mình sẽ tập.</h2><p>Ánh sáng, máy Pilates và khoảng không để chuyển động tạo nên một buổi tập có sự tập trung.</p><Link className="pillar-text-link" to="/dich-vu">Xem hình thức tập ↗</Link></div></section>

      <Section index="01" label="Trong một buổi tập">
        <div className="grid gap-x-8 gap-y-10 pb-20 md:grid-cols-12 md:pb-28">
          <div className="md:col-span-6">
            <p className="measure text-ink-2 text-base">
              Lớp nhóm nhỏ và lớp riêng đều tập trung vào hơi thở, điểm tựa và biên độ.
              Huấn luyện viên theo sát để bạn hiểu từng chuyển động trước khi thêm độ khó.
            </p>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <div className="aspect-square w-full">
              <ArtDirectedImage photo="hero" sizes="(min-width: 768px) 35vw, 100vw" />
            </div>
          </div>
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
