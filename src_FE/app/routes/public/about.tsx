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
      <header className="sur-interior-intro gutter">
        <p className="label-micro">Studio</p>
        <h1>Một nơi dành cho sự tập trung.</h1>
        <p>Không gian tập được nhìn từ chính căn phòng bạn sẽ bước vào. Điều quan trọng nhất vẫn là buổi tập và cách cơ thể bạn chuyển động trong đó.</p>
      </header>

      <div className="sur-room-frame">
        <ArtDirectedImage photo="room" sizes="100vw" />
      </div>

      <section className="gutter">
        <div className="sur-about-copy">
          <p className="label-micro">Không gian</p>
          <div>
            <h2>Đủ chỗ cho sự chú ý.</h2>
            <p>Các máy Pilates được bố trí trong ánh sáng tự nhiên. Ở đây, phòng tập là nơi cho bạn thực hành từng chuyển động và để người hướng dẫn quan sát, điều chỉnh khi cần.</p>
          </div>
        </div>
      </section>

      <Section index="02" label="Nguyên tắc" tone="deep" className="sur-first-visit">
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
