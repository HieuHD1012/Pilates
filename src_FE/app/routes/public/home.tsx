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
      <Proposition />
      <StudioStory />
      <Method />
      <Formats />
      <ThisWeek />
      <FirstVisit />
      <Closing />
    </>
  );
}

function Hero() {
  return (
    <section className="sur-arrival" aria-label="Không gian studio">
      <ArtDirectedImage photo="hero" priority sizes="100vw" />
    </section>
  );
}

function Proposition() {
  return (
    <section className="sur-proposition gutter">
      <p className="label-micro">Soul Pilates · Nha Trang</p>
      <h1>Một không gian để chuyển động chính xác.</h1>
      <p>Lớp nhóm nhỏ và lớp riêng trên reformer. Mỗi người có chỗ để tập trung vào hơi thở, điểm tựa và cách cơ thể chuyển động.</p>
      <Link to="/dich-vu">Tìm hình thức tập phù hợp <span aria-hidden="true">↗</span></Link>
    </section>
  );
}

function StudioStory() {
  return (
    <section className="sur-studio-story gutter">
      <div className="sur-studio-story-inner">
        <p className="label-micro">Studio</p>
        <h2>Đến để tập trung.</h2>
        <div>
          <p>Không gian được dành cho việc tập: máy, ánh sáng, nhịp chuyển động và sự hướng dẫn. Đó là những gì chúng tôi muốn bạn cảm nhận khi bước vào.</p>
          <Link to="/gioi-thieu">Khám phá studio <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}

function Formats() {
  return (
    <section className="sur-formats gutter" aria-labelledby="sur-formats-title">
      <div className="sur-formats-inner">
        <p className="label-micro">Hình thức tập</p>
        <h2 id="sur-formats-title">Một phương pháp.<br />Hai cách bắt đầu.</h2>
      </div>
      <div className="sur-format-grid">
        {CLASS_FORMATS.map((format, index) => (
          <article key={format.id} className="sur-format">
            <p className="label-micro">0{index + 1} · {format.sub}</p>
            <h3>{format.name}</h3>
            <p>{format.body}</p>
            <Link to="/dich-vu">Tìm hiểu {format.name.toLocaleLowerCase("vi-VN")} <span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Method — one image, one narrow column of text, three ruled notes. The claims
   here are about the discipline, which is true of Pilates anywhere; nothing is
   asserted about this studio that the studio has not confirmed.
   ──────────────────────────────────────────────────────────────────────────── */
const METHOD_NOTES = [
  {
    term: "Hơi thở",
    def: "Nhịp thở dẫn động tác, không phải ngược lại. Đây là phần khó nhất của buổi đầu tiên.",
  },
  {
    term: "Căn chỉnh",
    def: "Vai, khung sườn, khung chậu được đặt đúng trước khi thêm bất kỳ lực nào.",
  },
  {
    term: "Kiểm soát",
    def: "Biên độ nhỏ, tốc độ chậm, dừng được ở bất kỳ điểm nào trong động tác.",
  },
];

function Method() {
  return (
    <section className="sur-method" aria-labelledby="sur-method-title">
      <div className="sur-method-content">
        <p className="label-micro">Phương pháp</p>
        <h2 id="sur-method-title">Chú ý tạo nên khác biệt.</h2>
        <p>Một chuyển động được hiểu rõ có giá trị hơn nhiều lần lặp lại vội vàng. Chúng tôi bắt đầu từ cách bạn đứng, thở và giữ kiểm soát.</p>
        <dl>
            {METHOD_NOTES.map(({ term, def }) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{def}</dd>
              </div>
            ))}
          </dl>
      </div>
      <div className="sur-method-photo">
        <ArtDirectedImage photo="method" sizes="(min-width: 768px) 50vw, 100vw" />
      </div>
    </section>
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
    <Section index="03" label="Bảy ngày tới" className="sur-schedule">
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
    <Section index="04" label="Buổi đầu tiên" className="sur-first-visit">
      <div className="pb-20 md:pb-28">
        <h2 className="measure-wide font-display text-d2 text-ink font-light">
          Bạn không cần biết gì trước khi đến.
        </h2>

        <ol className="sur-visit-grid">
          {FIRST_VISIT_STEPS.map((step) => (
            <li key={step.index}>
              <span className="sur-visit-index">{step.index}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
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
      <Section tone="ink" className="sur-closing">
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
