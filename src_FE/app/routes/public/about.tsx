import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Section } from "~/ui/layout";
import { PublicPageHeader } from "~/ui/public-page";

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
      <PublicPageHeader
        label="Studio"
        title="Một phòng tập được giữ nhỏ, có chủ đích."
        lede="Soul Pilates Nha Trang chọn số lượng người trong mỗi buổi tập trước khi chọn bất cứ điều gì khác."
      />

      <Section index="01" label="Không gian">
        <div className="grid gap-x-8 gap-y-10 pb-20 md:grid-cols-12 md:pb-28">
          <div className="md:col-span-6">
            <p className="measure text-ink-2 text-base">
              Phòng tập được bố trí quanh các máy reformer đặt song song, để huấn luyện viên
              đi được giữa các máy và nhìn thấy cả hai bên cơ thể của mỗi người. Ánh sáng
              lấy từ cửa sổ; không có gương phủ kín tường, vì phần lớn việc căn chỉnh được
              cảm nhận chứ không nhìn thấy.
            </p>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <div className="aspect-square w-full">
              <ArtDirectedImage photo="room" sizes="(min-width: 768px) 35vw, 100vw" />
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
