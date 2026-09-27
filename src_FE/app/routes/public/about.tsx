import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

import { STUDIO } from "~/content/studio";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { PendingFact } from "~/ui/pending-fact";

import type { Route } from "./+types/about";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Studio — Soul Pilates Nha Trang" },
    { name: "description", content: "Xem không gian tập Pilates reformer, hình thức lớp và thông tin liên hệ của Soul Pilates Nha Trang." },
  ];
}

export default function About() {
  return (
    <>
      <section className="barrys-studio-hero">
        <div className="barrys-studio-hero__intro">
          <p className="barrys-eyebrow">Soul Pilates · Nha Trang</p>
          <h1>Studio.</h1>
          <p>Một không gian thật để tập trung vào chuyển động, hơi thở và cách cơ thể của bạn làm việc.</p>
          <Link to="/lien-he" className="barrys-text-link">Liên hệ studio <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="barrys-studio-hero__image"><ArtDirectedImage photo="room" priority sizes="(min-width: 900px) 60vw, 100vw" /></div>
      </section>

      <nav className="barrys-studio-links" aria-label="Khám phá studio">
        <a href="#khong-gian">Không gian</a>
        <a href="#thong-tin">Thông tin studio</a>
        <a href="#buoi-dau">Buổi đầu tiên</a>
      </nav>

      <section id="khong-gian" className="barrys-studio-story barrys-wrap">
        <div><p className="barrys-eyebrow">Không gian tập</p><h2>Ở đây, điều quan trọng là cách bạn tập.</h2></div>
        <div>
          <p>Phòng tập bố trí các máy reformer cùng thiết bị Pilates khác. Lớp nhóm nhỏ và lớp riêng cho bạn hai cách bắt đầu, tùy vào sự thoải mái và mục tiêu của mình.</p>
          <p>Hình ảnh trên là phòng tập thực tế do chủ cơ sở cung cấp. Để biết buổi tập nào phù hợp, studio sẽ trao đổi với bạn trước khi đề xuất lịch và gói.</p>
          <Link to="/dich-vu" className="barrys-text-link">Xem hình thức tập <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="thong-tin" className="barrys-arrival">
        <div className="barrys-wrap">
          <div className="barrys-section-heading"><p className="barrys-eyebrow">Trước khi đến</p><h2>Thông tin studio.</h2></div>
          <dl className="barrys-arrival__facts">
            <div><dt>Địa chỉ</dt><dd>{STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}</dd></div>
            <div><dt>Giờ mở cửa</dt><dd>{STUDIO.openingHours ?? <PendingFact label="Giờ mở cửa" />}</dd></div>
            <div><dt>Điện thoại</dt><dd>{STUDIO.phone ?? <PendingFact label="Số điện thoại" />}</dd></div>
          </dl>
          <Link to="/lien-he" className="barrys-text-link">Xem các kênh liên hệ <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="buoi-dau" className="barrys-studio-next barrys-wrap">
        <div><p className="barrys-eyebrow">Buổi đầu tiên</p><h2>Hãy nói với chúng tôi bạn đang muốn cải thiện điều gì.</h2></div>
        <div><p>Để lại tên, số điện thoại và điều bạn quan tâm. Studio sẽ liên hệ để hiểu rõ trước khi gợi ý hình thức tập.</p><Link to="/dat-tu-van" className="barrys-action-link">Đặt lịch tư vấn <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
      </section>
    </>
  );
}
