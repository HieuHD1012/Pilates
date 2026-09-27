import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Section } from "~/ui/layout";
import { TickRule } from "~/ui/tick-rule";

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
      <header className="bg-sand">
        <div className="gutter mx-auto max-w-(--container-page) pt-7 md:pt-12">
          <p className="label-micro">Studio · Nha Trang</p>
          <div className="mt-6 aspect-4/3 w-full md:aspect-16/8">
            <ArtDirectedImage photo="room" priority sizes="100vw" />
          </div>
          <div className="grid gap-x-8 gap-y-6 py-10 md:grid-cols-12 md:py-14">
            <h1 className="font-display text-d2 text-ink font-light md:col-span-7">
              Một phòng tập được giữ nhỏ, có chủ đích.
            </h1>
            <p className="measure text-lede text-ink-2 md:col-span-4 md:col-start-9">
              Lớp nhóm nhỏ và lớp riêng để huấn luyện viên theo được từng người trong suốt
              buổi tập.
            </p>
          </div>
          <TickRule />
        </div>
      </header>

      <Section index="01" label="Sự chuẩn bị">
        <div className="grid gap-x-8 gap-y-10 pb-20 md:grid-cols-12 md:pb-28">
          <div className="md:col-span-5">
            <h2 className="font-display text-d3 text-ink font-light">
              Chú ý bắt đầu từ trước động tác đầu tiên.
            </h2>
            <p className="measure text-ink-2 mt-5 text-base">
              Lò xo, vị trí đặt tay và nhịp của bài tập đều thay đổi cảm giác trên reformer.
              Vì vậy, phần hướng dẫn và căn chỉnh luôn quan trọng như chính chuyển động.
            </p>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <div className="aspect-3/2 w-full">
              <ArtDirectedImage photo="craft" sizes="(min-width: 768px) 50vw, 100vw" />
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
