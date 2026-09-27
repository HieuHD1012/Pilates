import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

import { CLASS_FORMATS, FIRST_VISIT_STEPS } from "~/content/studio";
import { usePublicSchedule } from "~/features/public/queries";
import { addDays, formatTime, studioDateKey, weekdayShort } from "~/lib/format";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  const title = "Soul Pilates Nha Trang — studio reformer, lớp nhóm nhỏ và lớp riêng";
  const description =
    "Khám phá không gian tập, hình thức lớp và cách bắt đầu tại Soul Pilates Nha Trang.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:locale", content: "vi_VN" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

const DESTINATIONS = [
  { number: "01", title: "Xem studio", to: "/gioi-thieu", detail: "Không gian tập" },
  { number: "02", title: "Chọn hình thức", to: "/dich-vu", detail: "Lớp nhóm · Lớp riêng" },
  { number: "03", title: "Bắt đầu", to: "/dat-tu-van", detail: "Để lại thông tin" },
];

export default function Home() {
  return (
    <>
      <section className="barrys-hero">
        <div className="barrys-hero__copy">
          <p className="barrys-eyebrow barrys-eyebrow--light">Soul Pilates · Nha Trang</p>
          <h1>Tập đúng hơn.<br />Ngay từ buổi đầu.</h1>
          <p>
            Lớp nhóm nhỏ và lớp riêng trên reformer. Xem nơi bạn sẽ tập,
            cách lớp diễn ra và bước đầu tiên trước khi quyết định.
          </p>
          <Link to="/gioi-thieu" className="barrys-light-link">
            Khám phá studio <ArrowUpRight aria-hidden="true" size={19} />
          </Link>
          <span className="barrys-hero__scroll" aria-hidden="true"><ArrowDown size={18} /></span>
        </div>
        <div className="barrys-hero__image">
          <ArtDirectedImage photo="hero" priority sizes="(min-width: 900px) 58vw, 100vw" />
        </div>
      </section>

      <nav className="barrys-routebar" aria-label="Lối vào nhanh">
        {DESTINATIONS.map((item) => (
          <Link to={item.to} key={item.to} className="barrys-routebar__item">
            <span className="barrys-routebar__number">{item.number}</span>
            <span className="barrys-routebar__words"><strong>{item.title}</strong><small>{item.detail}</small></span>
            <ArrowUpRight aria-hidden="true" size={21} />
          </Link>
        ))}
      </nav>

      <section className="barrys-intro barrys-wrap">
        <div className="barrys-intro__heading">
          <p className="barrys-eyebrow">Một nơi để bắt đầu</p>
          <h2>Biết rõ trước khi bước vào.</h2>
        </div>
        <div className="barrys-intro__body">
          <p>
            Chọn giữa lớp nhóm và lớp riêng, xem lịch, hoặc gửi một câu hỏi cho
            studio. Nếu đây là buổi đầu, bạn không cần biết trước các bài tập.
          </p>
          <Link className="barrys-text-link" to="/lien-he">Xem cách liên hệ <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="barrys-formats" id="hinh-thuc-tap">
        <div className="barrys-wrap">
          <div className="barrys-section-heading">
            <p className="barrys-eyebrow">Hình thức tập</p>
            <h2>Hai cách tập.<br />Cùng một sự chú ý.</h2>
          </div>
          <div className="barrys-formats__grid">
            {CLASS_FORMATS.map((format, index) => (
              <article className="barrys-format" key={format.id}>
                <span className="barrys-format__number">0{index + 1}</span>
                <h3>{format.name}</h3>
                <p>{format.body}</p>
                <Link to="/dich-vu" className="barrys-text-link">Tìm hiểu lớp {format.name.toLowerCase()} <ArrowUpRight size={18} aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="barrys-first">
        <div className="barrys-first__image">
          <ArtDirectedImage photo="practice" sizes="(min-width: 900px) 42vw, 100vw" />
        </div>
        <div className="barrys-first__content">
          <p className="barrys-eyebrow">Lần đầu đến studio</p>
          <h2>Bắt đầu không cần đoán.</h2>
          <p className="barrys-first__lead">Một cuộc trò chuyện đi trước buổi tập. Bạn có thể nói rõ mục tiêu và điều cơ thể đang gặp phải.</p>
          <ol>
            {FIRST_VISIT_STEPS.map((step) => (
              <li key={step.index}>
                <span>{step.index}</span>
                <div><h3>{step.title}</h3><p>{step.body}</p></div>
              </li>
            ))}
          </ol>
          <Link to="/dat-tu-van" className="barrys-action-link">Để lại thông tin tư vấn <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>

      <UpcomingSchedule />

      <section className="barrys-close">
        <div className="barrys-wrap barrys-close__inner">
          <div><p className="barrys-eyebrow barrys-eyebrow--light">Buổi đầu tiên</p><h2>Bạn có thể bắt đầu bằng một câu hỏi.</h2></div>
          <Link to="/dat-tu-van" className="barrys-light-action">Đặt lịch tư vấn <ArrowUpRight size={19} aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  );
}

function UpcomingSchedule() {
  const today = studioDateKey(new Date());
  const query = usePublicSchedule(today, addDays(today, 6));
  return (
    <section className="barrys-schedule">
      <div className="barrys-wrap barrys-schedule__grid">
        <div>
          <p className="barrys-eyebrow">Bảy ngày tới</p>
          <h2>Chọn thời điểm tập.</h2>
          <p>Đăng nhập để đặt chỗ, hoặc để lại thông tin nếu bạn chưa có gói tập.</p>
          <Link to="/lich-tap" className="barrys-text-link">Xem toàn bộ lịch <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="barrys-schedule__list">
          {query.isPending ? <SkeletonRows rows={5} /> : null}
          {query.isError ? <ErrorState description="Chưa tải được lịch tập. Bạn vẫn có thể liên hệ studio để hỏi lịch." onRetry={() => void query.refetch()} /> : null}
          {query.isSuccess && query.data.length === 0 ? <EmptyState title="Chưa có lớp nào trong bảy ngày tới" description="Studio chưa mở lịch cho khoảng thời gian này. Để lại thông tin và nhân viên sẽ báo bạn khi có lịch mới." action={<Button asChild variant="secondary"><Link to="/dat-tu-van">Để lại thông tin</Link></Button>} /> : null}
          {query.isSuccess && query.data.length > 0 ? <><DemoDataNotice className="mb-3" /><ul>{query.data.slice(0, 7).map((item) => (
            <li key={`${item.starts_at}-${item.trainer_name}`}>
              <span className="barrys-schedule__date">{weekdayShort(item.starts_at)}</span>
              <span className="barrys-schedule__time">{formatTime(item.starts_at)}</span>
              <span className="barrys-schedule__name">{item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}<small>{item.trainer_name}</small></span>
              <StatusBadge tone={item.is_full ? "critical" : "positive"}>{item.is_full ? "Hết chỗ" : "Còn chỗ"}</StatusBadge>
            </li>
          ))}</ul></> : null}
        </div>
      </div>
    </section>
  );
}
