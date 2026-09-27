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
      <header className="sur-interior-intro gutter">
        <p className="label-micro">Hình thức tập</p>
        <h1>Chọn nhịp tập phù hợp với bạn.</h1>
        <p>Lớp nhóm nhỏ và lớp riêng cùng dựa trên sự chú ý đến từng chuyển động. Khác nhau ở cách buổi tập được chia sẻ và điều chỉnh.</p>
      </header>

      <section className="bg-sand-deep gutter" aria-label="Các hình thức tập">
        <div className="mx-auto max-w-(--container-page)">
          {CLASS_FORMATS.map((format, index) => (
            <article key={format.id} className="sur-service-row">
              <p className="label-micro">0{index + 1} · {format.sub}</p>
              <div>
                <h2>{format.name}</h2>
                <p>{format.body}</p>
              </div>
              <div>
                <p className="label-micro">Phù hợp với</p>
                <ul>
                  {format.forWho.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p className="mt-5 text-xs">
                  Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với giờ bắt đầu để được hoàn lại buổi tập.
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Section tone="ink" className="sur-closing">
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
