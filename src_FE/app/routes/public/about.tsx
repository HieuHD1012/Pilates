import { Link } from "react-router";

import { ArtDirectedImage } from "~/ui/art-directed-image";

import type { Route } from "./+types/about";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Studio — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Không gian và cách tập Pilates tại Soul Nha Trang: lớp nhóm nhỏ, lớp riêng và sự chú ý vào chuyển động.",
    },
  ];
}

const PRINCIPLES = [
  {
    title: "Lớp đủ nhỏ",
    body: "Số chỗ trong mỗi buổi do studio thiết lập. Mỗi người có không gian để tập và được quan sát.",
  },
  {
    title: "Chuyển động có chủ đích",
    body: "Bài tập đi từ hơi thở và căn chỉnh trước khi tăng lực hay biên độ.",
  },
  {
    title: "Tiến bộ theo cơ thể bạn",
    body: "Lớp nhóm và lớp riêng cho hai nhịp tập khác nhau. Điều quan trọng là chọn đúng điểm bắt đầu.",
  },
];

export default function About() {
  return (
    <>
      <header className="os-about-hero">
        <div className="os-container os-about-grid">
          <div className="os-about-copy">
            <p className="os-eyebrow">Studio</p>
            <h1>Một không gian cho sự chú tâm.</h1>
            <p>
              Tại Soul, thiết bị là công cụ. Điều đáng nhớ hơn là cảm giác nhận ra cơ thể
              đang chuyển động như thế nào.
            </p>
          </div>
          <div className="os-about-image">
            <ArtDirectedImage
              photo="room"
              priority
              sizes="(min-width: 900px) 50vw, 100vw"
            />
          </div>
        </div>
      </header>
      <section className="os-about-principles">
        <div className="os-container">
          <p className="os-section-kicker">Cách Soul tổ chức buổi tập</p>
          <h2>Mỗi chi tiết đều phục vụ việc tập.</h2>
          <div className="os-about-principle-grid">
            {PRINCIPLES.map((item, index) => (
              <article key={item.title}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <Link className="os-text-link" to="/dich-vu">
            Khám phá hình thức tập <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
