import { Link } from "react-router";

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
      <header className="blok-interior-hero">
        <div className="gutter">
          <p className="blok-kicker">Studio</p>
          <h1>Không gian để tập trung vào chuyển động.</h1>
          <p>Máy reformer, ánh sáng tự nhiên và một buổi tập có người theo sát: những điều cần thiết được đặt ở trung tâm.</p>
        </div>
      </header>

      <div className="blok-room-frame">
        <ArtDirectedImage photo="room" sizes="100vw" />
      </div>

      <section className="gutter mx-auto max-w-(--container-page)">
        <div className="blok-about-copy">
          <p className="blok-kicker">Trong phòng tập</p>
          <div>
            <h2>Không gian phục vụ cho việc tập.</h2>
            <p className="mt-8 text-ink-2">Các máy được bố trí để người tập có không gian chuyển động và huấn luyện viên có thể quan sát. Buổi tập tập trung vào cách cơ thể di chuyển, từ điểm tựa đến hơi thở.</p>
            <Link to="/dich-vu" className="mt-8 inline-block border-b border-current pb-1 font-semibold">Tìm hình thức tập phù hợp <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <Section tone="deep" label="Cách tập tại Soul" className="blok-visit">
        <div className="grid gap-6 pb-20 md:grid-cols-3 md:gap-10 md:pb-28">
          {[
            { title: "Lớp nhóm nhỏ", body: "Tập cùng những người khác nhưng vẫn có sự hướng dẫn trong từng buổi." },
            { title: "Lớp riêng", body: "Một buổi tập dành cho một người, với bài tập được điều chỉnh theo nhu cầu của bạn." },
            { title: "Chuyển động chính xác", body: "Nhịp thở, căn chỉnh và khả năng kiểm soát được đặt trước số lần lặp lại." },
          ].map((item) => (
            <article key={item.title} className="border-rule-2 border-t pt-6">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="text-ink-2 mt-4 text-sm leading-relaxed">{item.body}</p>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
