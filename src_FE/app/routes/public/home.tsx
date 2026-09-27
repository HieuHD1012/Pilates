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
      <Stories />
      <Formats />
      <ThisWeek />
      <FirstVisit />
      <Closing />
    </>
  );
}

function Hero() {
  return (
    <section className="on-opening" aria-labelledby="on-title"><div className="on-opening-photo"><ArtDirectedImage photo="hero" priority sizes="(min-width: 800px) 65vw, 100vw" /></div><div className="on-opening-copy"><p className="on-kicker">Soul Pilates · Nha Trang</p><h1 id="on-title">Chuyển động<br />bắt đầu từ <em>sự chú ý.</em></h1><p>Không cần làm nhiều động tác hơn. Bắt đầu bằng cách hiểu cơ thể mình trong từng chuyển động trên reformer.</p><Link to="/dich-vu">Khám phá hình thức tập <span aria-hidden="true">↗</span></Link></div></section>
  );
}

function Stories() {
  const stories = [
    { n: "01", title: "Cách chúng tôi tập", body: "Huấn luyện viên quan sát, điều chỉnh và giúp bạn tìm nhịp tập phù hợp.", photo: "method" as const, to: "/gioi-thieu", action: "Về studio" },
    { n: "02", title: "Người đồng hành", body: "Gặp những người hướng dẫn buổi tập của bạn và tìm hiểu cách lớp vận hành.", photo: "room" as const, to: "/huan-luyen-vien", action: "Xem huấn luyện viên" },
    { n: "03", title: "Buổi đầu tiên", body: "Không cần thuộc động tác trước khi đến. Bắt đầu từ một cuộc trao đổi ngắn.", photo: "practice" as const, to: "/dat-tu-van", action: "Bắt đầu với Soul" },
  ];
  return <section className="on-stories" aria-labelledby="on-stories-title"><div className="on-stories-head"><p className="on-kicker">Những câu chuyện ở Soul</p><h2 id="on-stories-title">Từ chuyển động<br />đến cách bạn bắt đầu.</h2></div><div className="on-story-grid">{stories.map((story) => <article key={story.n} className="on-story"><div className="on-story-image"><ArtDirectedImage photo={story.photo} sizes="(min-width: 800px) 33vw, 100vw" /></div><div className="on-story-copy"><span>{story.n}</span><h3>{story.title}</h3><p>{story.body}</p><Link to={story.to}>{story.action} ↗</Link></div></article>)}</div></section>;
}

function Formats() {
  return (
    <Section index="01" label="Hai hình thức tập" className="on-formats">
      <div className="on-formats-head"><h2>Chọn cách tập của bạn.</h2><p>Nhóm nhỏ hoặc một kèm một. Cùng là bài tập trên reformer, khác mức độ điều chỉnh riêng.</p></div><div className="grid gap-y-12 pb-20 md:grid-cols-2 md:gap-x-0 md:pb-28">
        {CLASS_FORMATS.map((format, index) => (
          <article
            key={format.id}
            className={
              index === 0
                ? "md:rule-r md:pr-10 lg:pr-16"
                : "rule-t pt-12 md:border-t-0 md:pt-0 md:pl-10 lg:pl-16"
            }
          >
            <p className="label-micro">{format.sub}</p>
            <h2 className="font-display text-d3 text-ink mt-3 font-light">{format.name}</h2>
            <p className="measure text-ink-2 mt-4 text-base">{format.body}</p>

            <p className="label-micro mt-9">Phù hợp với</p>
            <ul className="mt-3">
              {format.forWho.map((item) => (
                <li key={item} className="rule-b text-ink py-3 text-sm">
                  {item}
                </li>
              ))}
            </ul>
            <Link className="on-text-link" to={index === 0 ? "/lich-tap" : "/dat-tu-van"}>{index === 0 ? "Xem lịch lớp" : "Hỏi về lớp riêng"} ↗</Link>
          </article>
        ))}
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
    <Section index="03" label="Bảy ngày tới">
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
    <Section index="04" label="Buổi đầu tiên">
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
    <>
      <div className="h-[38vw] max-h-72 w-full md:h-[22vw]">
        <ArtDirectedImage photo="city" sizes="100vw" />
      </div>

      <Section tone="ink">
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
    </>
  );
}
