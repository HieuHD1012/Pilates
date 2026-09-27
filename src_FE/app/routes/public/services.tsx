import { Link } from "react-router";

import { CANCELLATION_POLICY, CLASS_FORMATS } from "~/content/studio";
import { Button } from "~/ui/button";
import { Figures } from "~/ui/figure";
import { Section } from "~/ui/layout";
import { ArtDirectedImage } from "~/ui/art-directed-image";

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
      <header className="on-interior-head"><p className="on-kicker">Hình thức tập</p><h1>Chọn cách chuyển động.</h1><p>Nhóm nhỏ hoặc một kèm một. Mỗi buổi tập có người hướng dẫn và điều chỉnh.</p></header>

      {CLASS_FORMATS.map((format, index) => (
        <section key={format.id} className="on-service-stage"><div className="on-service-photo"><ArtDirectedImage photo={index === 0 ? "room" : "hero"} sizes="(min-width: 800px) 50vw, 100vw" /></div><div className="on-service-copy"><p className="on-kicker">0{index + 1} / {format.sub}</p><h2>{format.name}</h2><p>{format.body}</p><ul>{format.forWho.map((item) => <li key={item}>{item}</li>)}</ul><p className="text-ink-2 my-5 text-xs">Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với giờ bắt đầu để được hoàn lại buổi tập.</p><Link className="on-text-link" to={index === 0 ? "/lich-tap" : "/dat-tu-van"}>{index === 0 ? "Xem lịch lớp" : "Hỏi về lớp riêng"} ↗</Link></div></section>
      ))}

      <Section tone="ink">
        <div className="flex flex-wrap items-end justify-between gap-8 py-16 md:py-24">
          <h2 className="measure font-display text-d3 text-sand font-light">
            Chưa chắc nên bắt đầu bằng hình thức nào?
          </h2>
          <Button asChild size="lg" className="bg-sand text-ink hover:bg-white">
            <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
