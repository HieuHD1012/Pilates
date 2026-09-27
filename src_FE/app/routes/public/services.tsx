import { Link } from "react-router";

import { CANCELLATION_POLICY, CLASS_FORMATS } from "~/content/studio";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { Figures } from "~/ui/figure";
import { Section } from "~/ui/layout";
import { PublicPageHeader } from "~/ui/public-page";

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
      <PublicPageHeader
        label="Hình thức tập"
        title="Nhóm nhỏ, hoặc một kèm một."
        lede="Hai hình thức, cùng một phương pháp. Khác nhau ở mức độ điều chỉnh riêng cho cơ thể bạn."
      />

      {CLASS_FORMATS.map((format, index) => (
        <Section
          key={format.id}
          index={`0${index + 1}`}
          label={format.name}
          tone={index % 2 === 0 ? "sand" : "deep"}
        >
          <div className="grid items-center gap-x-10 gap-y-8 pb-20 md:grid-cols-12 md:pb-28">
            <div
              className={
                index === 0 ? "md:col-span-7" : "md:order-2 md:col-span-5 md:col-start-8"
              }
            >
              <div className={index === 0 ? "aspect-3/2 w-full" : "aspect-4/5 w-full"}>
                <ArtDirectedImage
                  photo={format.id === "group" ? "group" : "private"}
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </div>
            </div>

            <div className={index === 0 ? "md:col-span-5" : "md:order-1 md:col-span-6"}>
              <p className="label-micro">{format.sub}</p>
              <h2 className="font-display text-d2 text-ink mt-3 font-light">
                {format.name}
              </h2>
              <p className="measure text-ink-2 mt-6 text-base">{format.body}</p>
              <p className="label-micro mt-9">Phù hợp với</p>
              <ul className="mt-3">
                {format.forWho.map((item) => (
                  <li key={item} className="rule-b text-ink py-3 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-ink-2 mt-6 text-xs">
                Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ so với giờ
                bắt đầu để được hoàn lại buổi tập.
              </p>
            </div>
          </div>
        </Section>
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
