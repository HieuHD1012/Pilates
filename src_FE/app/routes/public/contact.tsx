import { Link } from "react-router";

import { STUDIO } from "~/content/studio";
import { telHref } from "~/lib/format";
import { Button } from "~/ui/button";
import { Section } from "~/ui/layout";
import { PendingFact } from "~/ui/pending-fact";
import { PublicPageHeader } from "~/ui/public-page";

import type { Route } from "./+types/contact";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Liên hệ — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Liên hệ Soul Pilates Nha Trang qua điện thoại, Zalo hoặc để lại thông tin tư vấn.",
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
  return (
    <>
      <PublicPageHeader
        label="Liên hệ"
        title="Cách nhanh nhất là để lại số điện thoại."
        lede="Studio gọi lại trong giờ làm việc. Nếu bạn thích nhắn tin, các kênh bên dưới đều được theo dõi."
        aside={
          <Button asChild variant="lacquer" size="lg" fullWidth>
            <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
          </Button>
        }
      />

      <Section index="01" label="Kênh liên hệ">
        <dl className="pb-16 md:pb-24">
          {CHANNELS.map((channel) => (
            <div
              key={channel.key}
              className="rule-t grid grid-cols-3 items-baseline gap-4 py-5"
            >
              <dt className="text-ink-2 text-sm">{channel.label}</dt>
              <dd className="text-ink col-span-2 text-base">
                {channel.value && channel.href ? (
                  <a
                    href={channel.href}
                    className="decoration-rule-2 hover:decoration-lacquer underline underline-offset-[6px]"
                    {...(channel.href.startsWith("http")
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {channel.value}
                  </a>
                ) : (
                  <PendingFact label={channel.label} />
                )}
              </dd>
            </div>
          ))}
          <div className="rule-t grid grid-cols-3 items-baseline gap-4 py-5">
            <dt className="text-ink-2 text-sm">Địa chỉ</dt>
            <dd className="text-ink col-span-2 text-base">
              {STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}
            </dd>
          </div>
          <div className="rule-t grid grid-cols-3 items-baseline gap-4 py-5">
            <dt className="text-ink-2 text-sm">Giờ mở cửa</dt>
            <dd className="text-ink col-span-2 text-base">
              {STUDIO.openingHours ?? <PendingFact label="Giờ mở cửa" />}
            </dd>
          </div>
        </dl>
      </Section>
    </>
  );
}
