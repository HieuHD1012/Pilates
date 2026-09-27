import { Link } from "react-router";

import { STUDIO } from "~/content/studio";
import { telHref } from "~/lib/format";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { Section } from "~/ui/layout";
import { PublicPageHeader } from "~/ui/public-page";

import type { Route } from "./+types/contact";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Liên hệ — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Để lại thông tin tư vấn cho Soul Pilates Nha Trang và xem các kênh liên hệ đã được studio xác nhận.",
    },
  ];
}

const CHANNELS = [
  {
    key: "phone",
    label: "Điện thoại",
    value: STUDIO.phone,
    href: STUDIO.phone ? telHref(STUDIO.phone) : null,
  },
  { key: "zalo", label: "Zalo", value: STUDIO.zaloUrl, href: STUDIO.zaloUrl },
  {
    key: "whatsapp",
    label: "WhatsApp",
    value: STUDIO.whatsappUrl,
    href: STUDIO.whatsappUrl,
  },
  {
    key: "email",
    label: "Email",
    value: STUDIO.email,
    href: STUDIO.email ? `mailto:${STUDIO.email}` : null,
  },
] as const;

export default function Contact() {
  const availableChannels = CHANNELS.filter((channel) => channel.value && channel.href);

  return (
    <>
      <PublicPageHeader
        label="Liên hệ"
        title="Cách nhanh nhất là để lại số điện thoại."
        lede="Bạn có thể để lại tên và số điện thoại để studio liên hệ. Các kênh trực tiếp sẽ được hiển thị sau khi xác nhận."
        aside={
          <Button asChild variant="lacquer" size="lg" fullWidth>
            <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
          </Button>
        }
      />

      <Section index="01" label="Thông tin tới studio">
        <div className="grid items-start gap-x-10 gap-y-10 pb-16 md:grid-cols-12 md:pb-24">
          <div className="md:col-span-6">
            <h2 className="font-display text-d3 text-ink font-light">
              Một cuộc trao đổi là điểm bắt đầu.
            </h2>
            {availableChannels.length === 0 && !STUDIO.address && !STUDIO.openingHours ? (
              <p className="measure text-ink-2 mt-5 text-base">
                Địa chỉ, giờ mở cửa và các kênh liên hệ trực tiếp đang chờ studio xác nhận.
                Trong lúc đó, biểu mẫu tư vấn là cách gửi nhu cầu của bạn đến đội ngũ.
              </p>
            ) : null}
            <dl className="mt-8">
              {availableChannels.map((channel) => (
                <div
                  key={channel.key}
                  className="rule-t grid grid-cols-3 items-baseline gap-4 py-5"
                >
                  <dt className="text-ink-2 text-sm">{channel.label}</dt>
                  <dd className="text-ink col-span-2 text-base">
                    <a
                      href={channel.href!}
                      className="decoration-rule-2 hover:decoration-lacquer underline underline-offset-[6px]"
                      {...(channel.href!.startsWith("http")
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                    >
                      {channel.value}
                    </a>
                  </dd>
                </div>
              ))}
              {STUDIO.address ? (
                <div className="rule-t grid grid-cols-3 items-baseline gap-4 py-5">
                  <dt className="text-ink-2 text-sm">Địa chỉ</dt>
                  <dd className="text-ink col-span-2 text-base">{STUDIO.address}</dd>
                </div>
              ) : null}
              {STUDIO.openingHours ? (
                <div className="rule-t grid grid-cols-3 items-baseline gap-4 py-5">
                  <dt className="text-ink-2 text-sm">Giờ mở cửa</dt>
                  <dd className="text-ink col-span-2 text-base">{STUDIO.openingHours}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <div className="aspect-4/5 w-full">
              <ArtDirectedImage photo="arrival" sizes="(min-width: 768px) 40vw, 100vw" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
