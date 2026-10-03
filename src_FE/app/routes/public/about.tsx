import { BookingBand } from "~/features/public/booking-band";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Figures } from "~/ui/figure";
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

const PRINCIPLES = [
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
];

export default function About() {
  return (
    <>
      <PublicPageHeader
        label="Studio"
        title="Một phòng tập được giữ nhỏ, có chủ đích."
        lede="Soul Pilates Nha Trang chọn số lượng người trong mỗi buổi tập trước khi chọn bất cứ điều gì khác."
      />

      {/* The place: the real room as the tall frame, one movement in that
          room's window light as the offset frame. */}
      <section className="pl-section pl-section--tight">
        <div className="gutter mx-auto grid max-w-(--container-page) gap-x-12 gap-y-12 md:grid-cols-12">
          <div className="md:col-span-6 lg:col-span-5">
            <div className="pl-collage-tall">
              <ArtDirectedImage photo="room" priority sizes="(min-width: 768px) 42vw, 82vw" />
            </div>
            {/* Phone: the offset frame overlaps the tall one instead of
                waiting below the text. One instance renders per breakpoint. */}
            <div className="pl-collage-offset pl-collage-offset--portrait md:hidden">
              <ArtDirectedImage photo="extend" sizes="(min-width: 768px) 30vw, 60vw" />
            </div>
          </div>
          <div className="md:col-span-6 lg:col-span-6 lg:col-start-7 md:pt-8">
            <p className="pl-ruled">Không gian</p>
            <h2 className="pl-h2 text-ink mt-6">Các máy đặt song song, ánh sáng từ cửa sổ.</h2>
            <p className="measure text-ink-2 mt-6 text-base">
              Phòng tập được bố trí quanh các máy reformer đặt song song, để huấn luyện viên đi
              được giữa các máy và nhìn thấy cả hai bên cơ thể của mỗi người.
            </p>
            <p className="measure text-ink-2 mt-4 text-base">
              Ánh sáng lấy từ cửa sổ, qua lớp rèm mỏng. Phần lớn việc căn chỉnh được cảm nhận
              trong cơ thể, chứ không chỉ nhìn thấy.
            </p>
            <div className="pl-collage-offset pl-collage-offset--portrait hidden md:block">
              <ArtDirectedImage photo="extend" sizes="(min-width: 768px) 30vw, 60vw" />
            </div>
          </div>
        </div>
      </section>

      <section className="pl-section pl-section--tight">
        <div className="gutter mx-auto max-w-(--container-page)">
          <div className="pl-section-head">
            <div>
              <p className="pl-ruled">Nguyên tắc</p>
              <h2 className="pl-h2 text-ink mt-6 max-w-[16em]">
                Ba điều studio giữ trong mọi buổi tập.
              </h2>
            </div>
          </div>
          <ol className="grid gap-5 md:grid-cols-3">
            {PRINCIPLES.map(({ term, def }, index) => (
              <li key={term} className="pl-card pl-card-pad">
                <Figures display className="text-copper text-4xl">
                  {String(index + 1).padStart(2, "0")}
                </Figures>
                <h3 className="pl-h3 text-ink mt-6">{term}</h3>
                <p className="text-ink-2 mt-3 text-sm">{def}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <BookingBand />
    </>
  );
}
