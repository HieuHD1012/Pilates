import type { ReactNode } from "react";

import { STUDIO } from "~/content/studio";
import { telHref } from "~/lib/format";
import { ArrowLink } from "~/ui/arrow-link";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { PendingFact } from "~/ui/pending-fact";
import { HoursText } from "~/ui/public-page";

import type { Route } from "./+types/contact";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Liên hệ — J Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Liên hệ J Pilates Nha Trang qua điện thoại, Zalo hoặc để lại thông tin tư vấn.",
    },
  ];
}

const CHANNELS = [
  {
    key: "phone",
    label: "Điện thoại",
    value: STUDIO.phone,
    href: STUDIO.phone ? telHref(STUDIO.phone) : null,
    required: true,
  },
  {
    key: "zalo",
    label: "Zalo",
    value: STUDIO.zaloUrl,
    href: STUDIO.zaloUrl,
    required: true,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    value: STUDIO.whatsappUrl,
    href: STUDIO.whatsappUrl,
    required: false,
  },
  {
    key: "email",
    label: "Email",
    value: STUDIO.email,
    href: STUDIO.email ? `mailto:${STUDIO.email}` : null,
    required: false,
  },
] as const;

/**
 * The subject is getting here, or getting a call. The arrival frame sits beside
 * the facts it illustrates and never replaces them; on a phone the facts come
 * first. Direct channels render only once the studio has confirmed them — a
 * call button with no number behind it is a broken promise.
 */
export default function Contact() {
  const directChannels = CHANNELS.filter((channel) => channel.value && channel.href);

  return (
    <section className="bg-sand">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="grid grid-cols-1 gap-y-14 pt-12 pb-20 md:pt-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-5">
            <p className="label-micro text-copper">Liên hệ</p>
            <h1 className="font-display text-d1 text-ink mt-5 font-light">
              Tìm đến studio, hoặc để{" "}
              <em className="text-copper font-light">studio gọi bạn</em>.
            </h1>
            <p className="measure text-lede text-ink-2 mt-6">
              Bạn muốn tìm hiểu studio hoặc chọn buổi tập đầu tiên? Để lại thông tin, J
              Pilates sẽ liên hệ tư vấn.
            </p>

            {/* Two groups by intent — getting there, and getting in touch —
                each fact stacked under its own label so the eye moves straight
                down, never across a gap from a label to its value. */}
            <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
              <ContactGroup title="Đến studio">
                <ContactFact label="Địa chỉ">
                  {STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}
                </ContactFact>
                <ContactFact label="Giờ mở cửa">
                  {STUDIO.openingHours ? (
                    <HoursText value={STUDIO.openingHours} />
                  ) : (
                    <PendingFact label="Giờ mở cửa" />
                  )}
                </ContactFact>
              </ContactGroup>
              <ContactGroup title="Liên lạc">
                {/* Phone and Zalo are owed before launch, so their slots wait.
                    WhatsApp and email are optional: no row until they exist. */}
                {CHANNELS.filter(
                  (channel) => channel.required || (channel.value && channel.href),
                ).map((channel) => (
                  <ContactFact key={channel.key} label={channel.label}>
                    {channel.value && channel.href ? (
                      <a
                        href={channel.href}
                        className="decoration-rule-2 hover:decoration-copper underline underline-offset-[6px]"
                        {...(channel.href.startsWith("http")
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                      >
                        {channel.value}
                      </a>
                    ) : (
                      <PendingFact label={channel.label} />
                    )}
                  </ContactFact>
                ))}
              </ContactGroup>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-2">
              {directChannels.map((channel) => (
                <Button key={channel.key} asChild variant="secondary" size="lg">
                  <a href={channel.href ?? undefined}>
                    {channel.key === "phone" ? "Gọi studio" : `Nhắn ${channel.label}`}
                  </a>
                </Button>
              ))}
              {STUDIO.mapUrl ? <ArrowLink to={STUDIO.mapUrl}>Chỉ đường</ArrowLink> : null}
              <ArrowLink to="/dat-tu-van">Để studio gọi bạn</ArrowLink>
            </div>
          </div>

          <div className="bleed-x lg:bleed-r lg:col-span-6 lg:col-start-7 lg:ml-0">
            <div className="aspect-4/3 lg:aspect-5/4">
              <ArtDirectedImage
                photo="arrival"
                sizes="(min-width: 1024px) 50vw, 100vw"
                imgClassName="object-[46%_55%]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="border-rule-2 text-ink border-b pb-2 text-base font-medium">
        {title}
      </h2>
      <dl className="mt-4 flex flex-col gap-4">{children}</dl>
    </section>
  );
}

function ContactFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-ink-2 text-sm">{label}</dt>
      <dd className="text-ink mt-0.5 text-base">{children}</dd>
    </div>
  );
}
