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
      <Method />
      <ThisWeek />
      <FirstVisit />
      <Closing />
    </>
  );
}

function Hero() {
  return (
    <section className="ts-hero bg-sand">
      <div className="gutter mx-auto max-w-(--container-page) pt-8 pb-7 md:pt-12 md:pb-10">
        <div className="ts-masthead">
          <p className="ts-kicker">Soul Pilates · Nha Trang</p>
          <h1 className="ts-display">
            Một cách tập
            <br />
            <em>có chủ đích.</em>
          </h1>
          <p className="ts-masthead-aside">
            Pilates reformer
            <br />
            Lớp nhóm nhỏ &amp; lớp riêng
          </p>
        </div>
      </div>
      <div className="ts-hero-spread">
        <div className="ts-hero-photo">
          <ArtDirectedImage photo="hero" priority sizes="(min-width: 800px) 62vw, 100vw" />
        </div>
        <div className="ts-hero-story">
          <span className="ts-chapter">01 / Thực hành</span>
          <div>
            <h2>Chuyển động có kiểm soát.</h2>
            <p>
              Từ tư thế đến nhịp di chuyển, bài tập trên reformer cần sự chú ý ở từng đoạn.
              Chọn lớp nhóm nhỏ hoặc lớp riêng để bắt đầu.
            </p>
            <Button asChild size="lg" className="bg-sand text-ink hover:bg-white">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
            <Link to="/lich-tap" className="ts-text-link">
              Xem lịch tập <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Formats() {
  return (
    <Section index="02" label="Chọn cách tập" className="ts-formats">
      <div className="ts-section-intro">
        <h2>Đều đặn theo nhịp của bạn.</h2>
        <p>
          Hai hình thức tập trên reformer. Cùng một sự chú ý đến từng chuyển động; khác nhau
          ở mức độ điều chỉnh riêng.
        </p>
      </div>
      <div className="ts-format-grid">
        {CLASS_FORMATS.map((format, index) => (
          <article key={format.id} className="ts-format">
            <div className="ts-format-index">
              0{index + 1} / {format.sub}
            </div>
            <h3>{format.name}</h3>
            <p>{format.body}</p>
            <Link to="/dich-vu" className="ts-format-link">
              Tìm hiểu hình thức tập <span aria-hidden="true">↗</span>
            </Link>
          </article>
        ))}
      </div>
    </Section>
  );
}

function Method() {
  return (
    <Section index="03" label="Trong một động tác" tone="deep" className="ts-method">
      <div className="ts-method-layout">
        <div className="ts-method-copy">
          <p className="ts-kicker">Tập đúng hơn</p>
          <h2>
            Từ thu lại
            <br />
            đến vươn ra.
          </h2>
          <p>
            Hai khoảnh khắc của cùng một chuyển động. Pilates không nằm ở tư thế cuối cùng,
            mà ở cách bạn kiểm soát đoạn đường giữa chúng.
          </p>
          <Link to="/gioi-thieu" className="ts-dark-link">
            Hiểu về studio <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="ts-sequence">
          <div>
            <ArtDirectedImage photo="method" sizes="(min-width: 768px) 25vw, 50vw" />
          </div>
          <div>
            <ArtDirectedImage photo="practice" sizes="(min-width: 768px) 25vw, 50vw" />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   This week — the pre-rendered document, hydrated with live studio data.
   All four remote states are designed: loading, error, empty, and loaded.
   ──────────────────────────────────────────────────────────────────────────── */
function ThisWeek() {
  const today = studioDateKey(new Date());
  const query = usePublicSchedule(today, addDays(today, 6));

  return (
    <Section index="04" label="Bảy ngày tới" className="ts-schedule">
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
    <Section index="05" label="Buổi đầu tiên" className="ts-first-visit">
      <div className="pb-20 md:pb-28">
        <h2 className="measure-wide font-display text-d2 text-ink font-light">
          Bạn không cần biết gì trước khi đến.
        </h2>

        <ol className="mt-12">
          {FIRST_VISIT_STEPS.map((step) => (
            <li
              key={step.index}
              className="rule-t grid gap-x-8 gap-y-2 py-6 md:grid-cols-12 md:py-8"
            >
              <span className="figures-display text-ink-3 text-2xl md:col-span-2 md:text-3xl">
                {step.index}
              </span>
              <h3 className="text-ink text-lg md:col-span-4">{step.title}</h3>
              <p className="measure text-ink-2 text-sm md:col-span-6">{step.body}</p>
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
    <Section tone="ink" className="ts-closing">
      <div className="ts-closing-content">
        <span className="ts-chapter">Bắt đầu tại Soul</span>
        <div>
          <h2>Hãy bắt đầu bằng một cuộc trò chuyện.</h2>
          <p>
            Để lại tên và số điện thoại. Studio sẽ liên hệ để nghe nhu cầu của bạn trước khi
            đề xuất hình thức tập.
          </p>
          <Button asChild size="lg" className="bg-sand text-ink hover:bg-white">
            <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}
