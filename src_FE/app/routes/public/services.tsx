import { Link } from "react-router";

import { CANCELLATION_POLICY, CLASS_FORMATS } from "~/content/studio";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Figures } from "~/ui/figure";

import type { Route } from "./+types/services";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Hình thức tập — Soul Pilates Nha Trang" },
    {
      name: "description",
      content: "Lớp nhóm nhỏ và lớp riêng trên máy reformer tại Soul Pilates Nha Trang.",
    },
  ];
}

export default function Services() {
  return (
    <>
      <header className="os-interior-hero os-services-hero">
        <div className="os-container os-interior-hero-grid">
          <div>
            <p className="os-eyebrow">Hình thức tập</p>
            <h1>Hai cách để tìm nhịp tập của riêng bạn.</h1>
          </div>
          <p>
            Nhóm nhỏ hoặc một kèm một. Cùng tập trên reformer, khác ở mức độ điều chỉnh cho
            từng cơ thể.
          </p>
        </div>
      </header>
      <div className="os-container os-service-paths">
        {CLASS_FORMATS.map((format, index) => (
          <section
            className={`os-service-stage os-service-${format.id}`}
            id={format.id}
            key={format.id}
          >
            <div className="os-service-image">
              <ArtDirectedImage
                photo={format.id === "group" ? "room" : "practice"}
                sizes="(min-width: 900px) 50vw, 100vw"
              />
            </div>
            <div className="os-service-copy">
              <p className="os-section-kicker">
                0{index + 1} / {format.sub}
              </p>
              <h2>{format.name}</h2>
              <p className="os-service-lede">{format.body}</p>
              <h3>Phù hợp khi bạn</h3>
              <ul>
                {format.forWho.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="os-policy">
                Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với giờ
                bắt đầu để được hoàn lại buổi tập.
              </p>
              <Link className="os-text-link" to="/dat-tu-van">
                Trao đổi với studio <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </section>
        ))}
      </div>
      <section className="os-service-end">
        <div className="os-container os-service-end-grid">
          <h2>Chưa chắc nên chọn lớp nào?</h2>
          <p>
            Để lại thông tin và điều bạn muốn cải thiện. Studio sẽ liên hệ để cùng bạn chọn
            hình thức phù hợp.
          </p>
          <Link className="os-pill os-pill-accent" to="/dat-tu-van">
            Đặt lịch tư vấn <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
