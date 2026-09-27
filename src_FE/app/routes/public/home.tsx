import { Link } from "react-router";

import { CLASS_FORMATS, FIRST_VISIT_STEPS } from "~/content/studio";
import { addDays, formatTime, studioDateKey, weekdayShort } from "~/lib/format";
import { usePublicSchedule } from "~/features/public/queries";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Section } from "~/ui/layout";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  const title = "Soul Pilates Nha Trang — Studio reformer, lớp nhóm nhỏ và lớp riêng";
  const description =
    "Studio Pilates reformer tại Nha Trang. Lớp nhóm nhỏ và lớp riêng, huấn luyện viên theo sát từng người. Đặt lịch tư vấn để bắt đầu.";
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

export default function Home() {
  return (
    <>
      <Hero />
      <Formats />
      <Comparison />
      <Place />
      <ThisWeek />
      <FirstVisit />
      <Closing />
    </>
  );
}

function Hero() {
  return (
    <section className="rebel-hero" aria-labelledby="rebel-hero-title">
      <div className="rebel-hero-copy">
        <p className="rebel-eyebrow">Soul Pilates · Nha Trang</p>
        <h1 id="rebel-hero-title">Chọn cách tập.<br /><em>Rồi bắt đầu.</em></h1>
        <p>Hai cách tập trên reformer, một điểm chung: chuyển động có kiểm soát và sự theo sát của huấn luyện viên.</p>
        <Link className="rebel-main-action" to="/dich-vu">Tìm hình thức phù hợp <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="rebel-hero-image">
        <ArtDirectedImage photo="hero" priority sizes="(min-width: 800px) 54vw, 100vw" />
      </div>
    </section>
  );
}

function Formats() {
  return (
    <section className="rebel-formats" aria-labelledby="rebel-formats-title">
      <div className="rebel-section-head">
        <p className="rebel-eyebrow">Hai hình thức tập</p>
        <h2 id="rebel-formats-title">Buổi tập nào<br />dành cho bạn?</h2>
        <p>Chọn cách được đồng hành phù hợp với nhịp sống và mục tiêu của mình. Bạn có thể hỏi studio trước khi quyết định.</p>
      </div>
      <div className="rebel-format-grid">
        {CLASS_FORMATS.map((format, index) => (
          <article key={format.id} className="rebel-format-card">
            <div className="rebel-format-image">
              <ArtDirectedImage photo={index === 0 ? "room" : "hero"} sizes="(min-width: 800px) 50vw, 100vw" />
            </div>
            <div className="rebel-format-content">
              <span className="rebel-card-index">0{index + 1} / {format.sub}</span>
              <h3>{format.name}</h3>
              <p>{format.body}</p>
              <Link to="/dich-vu">Tìm hiểu {format.name.toLocaleLowerCase("vi-VN")} <span aria-hidden="true">↗</span></Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <section className="rebel-comparison" aria-labelledby="rebel-comparison-title">
      <div className="rebel-comparison-lead">
        <p className="rebel-eyebrow">Để chọn dễ hơn</p>
        <h2 id="rebel-comparison-title">Cùng một phương pháp.<br />Khác cách đồng hành.</h2>
      </div>
      <div className="rebel-comparison-columns">
        <div><h3>Lớp nhóm</h3><p>Tập cùng một nhóm nhỏ, với huấn luyện viên quan sát và điều chỉnh động tác trong suốt buổi.</p><Link to="/lich-tap">Xem lịch lớp nhóm ↗</Link></div>
        <div><h3>Lớp riêng</h3><p>Một học viên, một huấn luyện viên. Bài tập được điều chỉnh theo cơ thể bạn qua từng buổi.</p><Link to="/dat-tu-van">Hỏi về lớp riêng ↗</Link></div>
      </div>
    </section>
  );
}

function Place() {
  return <section className="rebel-place"><p className="rebel-eyebrow">Tại studio</p><p>Không cần đoán trước buổi đầu sẽ như thế nào.</p><Link to="/gioi-thieu">Xem không gian và cách studio đón bạn <span aria-hidden="true">↗</span></Link></section>;
}

/* ────────────────────────────────────────────────────────────────────────────
   This week — the pre-rendered document, hydrated with live studio data.
   All four remote states are designed: loading, error, empty, and loaded.
   ──────────────────────────────────────────────────────────────────────────── */
function ThisWeek() {
  const today = studioDateKey(new Date());
  const query = usePublicSchedule(today, addDays(today, 6));

  return (
    <Section index="03" label="Bảy ngày tới" className="rebel-base-schedule">
      <div className="grid gap-x-8 gap-y-8 pb-20 md:grid-cols-12 md:pb-28">
        <div className="md:col-span-4">
          <h2 className="font-display text-d3 text-ink font-light">Lịch tập sắp tới</h2>
          {/* No claim about how or how often the timetable syncs: there is no
              backend yet, and even with one the frontend cannot promise it. */}
          <p className="measure text-ink-2 mt-4 text-sm">
            Đăng nhập để đặt chỗ, hoặc để lại thông tin nếu bạn chưa có gói tập.
          </p>
          <div className="mt-6">
            <Button asChild variant="ghost">
              <Link to="/lich-tap">Xem toàn bộ lịch</Link>
            </Button>
          </div>
        </div>

        <div className="md:col-span-8">
          {query.isPending ? <SkeletonRows rows={5} /> : null}

          {query.isError ? (
            <ErrorState
              description="Chưa tải được lịch tập. Bạn vẫn có thể liên hệ studio để hỏi lịch."
              onRetry={() => void query.refetch()}
            />
          ) : null}

          {query.isSuccess && query.data.length === 0 ? (
            <EmptyState
              title="Chưa có lớp nào trong bảy ngày tới"
              description="Studio chưa mở lịch cho khoảng thời gian này. Để lại thông tin và nhân viên sẽ báo bạn khi có lịch mới."
              action={
                <Button asChild variant="secondary">
                  <Link to="/dat-tu-van">Để lại thông tin</Link>
                </Button>
              }
            />
          ) : null}

          {query.isSuccess && query.data.length > 0 ? (
            <>
              <DemoDataNotice className="mb-3" />
              <ul className="rule-t">
                {query.data.slice(0, 7).map((item) => (
                  /**
                   * Two deliberate layouts, not one grid left to wrap.
                   *
                   * Under `sm` the row is a flex pair: day + time and the
                   * availability badge on one baseline, title beneath. The
                   * previous single grid auto-wrapped on a phone, leaving dead
                   * space after the time and detaching the badge from the class
                   * it qualifies.
                   */
                  <li
                    key={`${item.starts_at}-${item.trainer_name}`}
                    className="rule-b py-4"
                  >
                    <div className="flex items-baseline justify-between gap-3 sm:hidden">
                      <span className="flex items-baseline gap-2.5">
                        <span className="figures text-ink-2 text-xs">
                          {weekdayShort(item.starts_at)}
                        </span>
                        <span className="figures text-ink text-sm">
                          {formatTime(item.starts_at)}
                        </span>
                      </span>
                      <AvailabilityBadge isFull={item.is_full} />
                    </div>
                    <p className="text-ink mt-1 text-sm sm:hidden">
                      {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                      <span className="text-ink-2 ml-2">{item.trainer_name}</span>
                    </p>

                    <div className="hidden grid-cols-[3.25rem_5rem_1fr_auto] items-baseline gap-x-4 sm:grid">
                      <span className="figures text-ink-2 text-xs">
                        {weekdayShort(item.starts_at)}
                      </span>
                      <span className="figures text-ink text-sm">
                        {formatTime(item.starts_at)}
                      </span>
                      <span className="text-ink text-sm">
                        {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                        <span className="text-ink-2 ml-2">{item.trainer_name}</span>
                      </span>
                      <span className="justify-self-end">
                        <AvailabilityBadge isFull={item.is_full} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

/**
 * Full or not full. `GET /public/schedule` returns `is_full` and no seat count,
 * because a count says which class has one person in it — a safety question at
 * a small studio, not just a privacy one.
 */
function AvailabilityBadge({ isFull }: { isFull: boolean }) {
  return isFull ? (
    <StatusBadge tone="critical">Hết chỗ</StatusBadge>
  ) : (
    <StatusBadge tone="positive">Còn chỗ</StatusBadge>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   First visit — what the system actually does, written down. This is the
   section where a template would put invented testimonials.
   ──────────────────────────────────────────────────────────────────────────── */
function FirstVisit() {
  return (
    <Section index="04" label="Buổi đầu tiên" className="rebel-base-visit">
      <div className="pb-20 md:pb-28">
        <h2 className="rebel-base-visit-title">Bạn không cần biết gì trước khi đến.</h2>

        <ol className="rebel-base-visit-grid">
          {FIRST_VISIT_STEPS.map((step) => (
            <li key={step.index}>
              <span className="rebel-base-visit-index">{step.index}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Closing — a dark field, one statement, one action.
   ──────────────────────────────────────────────────────────────────────────── */
function Closing() {
  return (
      <Section tone="ink" className="rebel-base-closing">
        <div className="grid gap-x-8 gap-y-10 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-7">
            <h2 className="font-display text-d2 text-sand font-light">
              Bắt đầu bằng một cuộc gọi, không phải một gói tập.
            </h2>
            <p className="measure text-sand/70 mt-6 text-base">
              Để lại tên và số điện thoại. Studio sẽ liên hệ để nghe tình trạng của bạn
              trước khi đề xuất bất cứ điều gì.
            </p>
          </div>
          <div className="flex items-end md:col-span-4 md:col-start-9">
            <Button asChild size="lg" className="bg-sand text-ink hover:bg-white">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
          </div>
        </div>
      </Section>
  );
}
