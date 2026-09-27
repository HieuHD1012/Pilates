import { Link } from "react-router";

import { CANCELLATION_POLICY, CLASS_FORMATS } from "~/content/studio";
import { Button } from "~/ui/button";
import { Figures } from "~/ui/figure";

import type { Route } from "./+types/services";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Hình thức tập — Soul Pilates Nha Trang" },
    { name: "description", content: "So sánh lớp nhóm nhỏ và lớp riêng tại Soul Pilates Nha Trang trước khi chọn lịch tập." },
  ];
}

export default function Services() {
  return (
    <>
      <section className="pvolve-services-hero">
        <div className="pvolve-container">
          <p className="pvolve-kicker">Hình thức tập / Soul Pilates</p>
          <h1>Phương pháp giống nhau. Mức độ riêng cho bạn khác nhau.</h1>
          <div className="pvolve-services-hero__bottom">
            <p>
              Cả lớp nhóm và lớp riêng đều đặt sự chú ý vào cách bạn di chuyển. Chọn hình
              thức theo nhu cầu được hướng dẫn, nhịp tập và điều bạn muốn trao đổi với huấn
              luyện viên.
            </p>
            <Link className="pvolve-text-link" to="/lich-tap">Xem lịch tập <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="pvolve-services-compare" aria-labelledby="compare-title">
        <div className="pvolve-container">
          <div className="pvolve-section-head">
            <p className="pvolve-kicker">Hai cách bắt đầu</p>
            <h2 id="compare-title">Chọn mức độ đồng hành phù hợp.</h2>
          </div>
          <div className="pvolve-services-compare__grid">
            {CLASS_FORMATS.map((format, index) => (
              <article key={format.id}>
                <div className="pvolve-services-compare__head">
                  <span className="pvolve-ordinal">0{index + 1} / {format.sub}</span>
                  <h3>{format.name}</h3>
                  <p>{format.body}</p>
                </div>
                <div className="pvolve-services-compare__fit">
                  <h4>Phù hợp khi bạn</h4>
                  <ul>{format.forWho.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div className="pvolve-services-compare__policy">
                  Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với giờ bắt đầu để được hoàn lại buổi tập.
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pvolve-services-next">
        <div className="pvolve-container">
          <div>
            <p className="pvolve-kicker">Bước tiếp theo</p>
            <h2>Nhìn lịch trước, rồi quyết định.</h2>
          </div>
          <p>
            Bạn có thể xem các buổi sắp tới. Nếu chưa rõ nên chọn lớp nhóm hay lớp riêng,
            hãy để lại thông tin để studio trao đổi trước khi đặt chỗ.
          </p>
          <div className="pvolve-services-next__actions">
            <Button asChild variant="lacquer" size="lg"><Link to="/dat-tu-van">Đặt lịch tư vấn</Link></Button>
            <Link className="pvolve-text-link" to="/lich-tap">Xem lịch tập <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>
    </>
  );
}
