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
      <header className="sat-interior-head"><p className="sat-kicker">Hình thức tập</p><h1>Hai cách giữ sự chú ý.</h1><p>Lớp nhóm nhỏ hoặc lớp riêng trên reformer. Cùng bắt đầu từ chuyển động có kiểm soát.</p></header>

      <div className="sat-service-choice">{CLASS_FORMATS.map((format,index) => <article key={format.id}><p className="sat-kicker">0{index + 1} / {format.sub}</p><h2>{format.name}</h2><p>{format.body}</p><ul className="my-8">{format.forWho.map((item) => <li key={item}>{item}</li>)}</ul><p className="text-ink-2 my-5 text-xs">Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với giờ bắt đầu để được hoàn lại buổi tập.</p><Link className="sat-text-link" to={index === 0 ? "/lich-tap" : "/dat-tu-van"}>{index === 0 ? "Xem lịch lớp" : "Hỏi về lớp riêng"} ↗</Link></article>)}</div>

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
