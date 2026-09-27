import { Link } from "react-router";

import { CANCELLATION_POLICY, CLASS_FORMATS } from "~/content/studio";
import { Button } from "~/ui/button";
import { Figures } from "~/ui/figure";
import { Section } from "~/ui/layout";

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
      <header className="ts-page-lead gutter mx-auto max-w-(--container-page)">
        <p className="ts-kicker">Soul Pilates / Hình thức tập</p>
        <h1>
          Hai cách tập.
          <br />
          <em>Một sự chú ý.</em>
        </h1>
        <p>
          Chọn nhịp phù hợp với bạn. Cả hai đều diễn ra trên reformer, với huấn luyện viên
          theo sát trong suốt buổi tập.
        </p>
      </header>
      {CLASS_FORMATS.map((format, index) => (
        <Section
          key={format.id}
          index={`0${index + 1}`}
          label={format.name}
          tone={index === 0 ? "deep" : "sand"}
          className="ts-service-section"
        >
          <div className="ts-service-grid">
            <div>
              <span className="ts-format-index">{format.sub} / Reformer</span>
              <h2>{format.name}</h2>
              <p className="ts-service-body">{format.body}</p>
            </div>
            <div className="ts-service-detail">
              <h3>Phù hợp khi bạn</h3>
              <ul>
                {format.forWho.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với giờ
                bắt đầu để được hoàn lại buổi tập.
              </p>
            </div>
          </div>
        </Section>
      ))}
      <Section tone="ink" className="ts-closing">
        <div className="ts-closing-content">
          <span className="ts-chapter">Bước tiếp theo</span>
          <div>
            <h2>Chưa chắc nên bắt đầu ở đâu?</h2>
            <p>
              Để lại thông tin. Studio sẽ trao đổi về nhu cầu của bạn trước khi gợi ý hình
              thức tập.
            </p>
            <Button asChild size="lg" className="bg-sand text-ink hover:bg-white">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
