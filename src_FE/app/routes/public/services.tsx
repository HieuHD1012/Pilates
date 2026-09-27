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
      content:
        "Lớp nhóm nhỏ (Group) và lớp riêng (Private) trên máy reformer tại Soul Pilates Nha Trang.",
    },
  ];
}

export default function Services() {
  return (
    <>
      <header className="blok-interior-hero">
        <div className="gutter">
          <p className="blok-kicker">Hình thức tập</p>
          <h1>Một phương pháp. Hai cách tập.</h1>
          <p>Chọn không gian bạn muốn chia sẻ và mức độ điều chỉnh dành riêng cho mình. Cả hai đều bắt đầu bằng chuyển động có kiểm soát.</p>
        </div>
      </header>

      {CLASS_FORMATS.map((format, index) => (
        <section key={format.id} className="blok-service-stage" aria-labelledby={`format-${format.id}`}>
          <div className="blok-service-primary">
            <p className="blok-kicker">0{index + 1} / {format.sub}</p>
            <div>
              <h2 id={`format-${format.id}`}>{format.name}</h2>
              <p className="mt-7">{format.body}</p>
            </div>
          </div>
          <div className="blok-service-detail">
            <p className="blok-kicker mb-5">Phù hợp với</p>
            <ul>
              {format.forWho.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="text-ink-2 mt-5 text-xs">
              Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với giờ bắt đầu để được hoàn lại buổi tập.
            </p>
            <Link to="/lich-tap">Xem lịch tập <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      ))}

      <Section tone="ink" className="blok-closing">
        <div className="flex flex-wrap items-end justify-between gap-8 py-16 md:py-24">
          <h2 className="measure text-d3 text-sand">Chưa chắc nên bắt đầu bằng hình thức nào?</h2>
          <Button asChild size="lg" className="bg-sand text-ink hover:bg-white">
            <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
