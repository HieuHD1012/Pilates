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
      <header className="rem-interior-head"><p className="rem-kicker">Hình thức tập</p><h1>Chọn một buổi tập phù hợp.</h1><p>Hai cách tập trên reformer, khác nhau ở mức độ điều chỉnh riêng cho cơ thể bạn.</p></header>

      {CLASS_FORMATS.map((format, index) => (
        <section key={format.id} className="rem-service-row"><div><p className="rem-kicker">0{index + 1} / {format.sub}</p><h2>{format.name}</h2><p>{format.body}</p></div><div><p className="rem-kicker">Phù hợp với</p><ul>{format.forWho.map((item) => <li key={item}>{item}</li>)}</ul><p className="text-ink-2 my-5 text-xs">Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với giờ bắt đầu để được hoàn lại buổi tập.</p><Link to={index === 0 ? "/lich-tap" : "/dat-tu-van"}>{index === 0 ? "Xem lịch lớp" : "Hỏi về lớp riêng"} ↗</Link></div></section>
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
