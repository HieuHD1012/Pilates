import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

import { STUDIO } from "~/content/studio";
import { telHref } from "~/lib/format";
import { PendingFact } from "~/ui/pending-fact";

import type { Route } from "./+types/contact";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Liên hệ — Soul Pilates Nha Trang" },
    { name: "description", content: "Để lại thông tin tư vấn hoặc xem các kênh liên hệ của Soul Pilates Nha Trang." },
  ];
}

const CHANNELS = [
  { label: "Điện thoại", value: STUDIO.phone, href: STUDIO.phone ? telHref(STUDIO.phone) : null },
  { label: "Zalo", value: STUDIO.zaloUrl, href: STUDIO.zaloUrl },
  { label: "Email", value: STUDIO.email, href: STUDIO.email ? `mailto:${STUDIO.email}` : null },
] as const;

export default function Contact() {
  return (
    <>
      <section className="barrys-contact-hero barrys-wrap">
        <div><p className="barrys-eyebrow">Soul Pilates · Nha Trang</p><h1>Liên hệ.</h1></div>
        <div><p>Đang tìm một buổi tập phù hợp? Bạn có thể để lại thông tin để studio liên hệ và nghe rõ điều bạn cần.</p><Link to="/dat-tu-van" className="barrys-action-link">Đặt lịch tư vấn <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
      </section>

      <section className="barrys-contact-details">
        <div className="barrys-wrap barrys-contact-details__grid">
          <div><p className="barrys-eyebrow">Tìm và liên hệ studio</p><h2>Thông tin liên hệ.</h2><p>Các chi tiết chưa được chủ cơ sở xác nhận sẽ được bổ sung trước khi website ra mắt.</p></div>
          <dl>
            <div><dt>Địa chỉ</dt><dd>{STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}</dd></div>
            <div><dt>Giờ mở cửa</dt><dd>{STUDIO.openingHours ?? <PendingFact label="Giờ mở cửa" />}</dd></div>
            {CHANNELS.map((channel) => <div key={channel.label}><dt>{channel.label}</dt><dd>{channel.value && channel.href ? <a href={channel.href} {...(channel.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{channel.value}</a> : <PendingFact label={channel.label} />}</dd></div>)}
          </dl>
        </div>
      </section>
    </>
  );
}
