import { Link } from "react-router";

import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { Section } from "~/ui/layout";

import type { Route } from "./+types/about";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Studio — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Không gian và cách Soul Pilates Nha Trang tổ chức lớp nhóm nhỏ và lớp riêng trên máy reformer.",
    },
  ];
}

export default function About() {
  return (
    <>
      <header className="ts-page-lead gutter mx-auto max-w-(--container-page)">
        <p className="ts-kicker">Soul Pilates / Studio</p>
        <h1>
          Chỗ dành cho
          <br />
          <em>sự tập trung.</em>
        </h1>
        <p>
          Không gian tập và cách tổ chức lớp đều phục vụ một việc: để huấn luyện viên theo
          được từng chuyển động.
        </p>
      </header>
      <Section index="01" label="Không gian thực" className="ts-about-room">
        <div className="ts-about-room-grid">
          <div className="ts-about-room-copy">
            <h2>Mỗi chiếc máy có chỗ cho một người.</h2>
            <p>
              Phòng tập được bố trí quanh các máy reformer đặt song song, để huấn luyện viên
              đi được giữa các máy và nhìn thấy hai bên cơ thể của mỗi người.
            </p>
            <Link to="/dich-vu" className="ts-dark-link">
              Xem hình thức tập <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="ts-about-room-photo">
            <ArtDirectedImage
              photo="room"
              priority
              sizes="(min-width: 768px) 55vw, 100vw"
            />
          </div>
        </div>
      </Section>
      <Section
        index="02"
        label="Cách một buổi tập diễn ra"
        tone="deep"
        className="ts-about-principles"
      >
        <div className="ts-about-principles-grid">
          <h2>
            Quan sát.
            <br />
            Điều chỉnh.
            <br />
            Lặp lại.
          </h2>
          <div>
            <p>
              Mỗi buổi có một huấn luyện viên chịu trách nhiệm từ đầu đến cuối. Bài tập có
              thể giống nhau, nhưng cách chỉnh được đặt theo từng cơ thể.
            </p>
            <p>
              Chúng tôi giữ lựa chọn đơn giản: tập cùng một nhóm nhỏ hoặc tập riêng một kèm
              một.
            </p>
            <Button asChild variant="lacquer" size="lg">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
