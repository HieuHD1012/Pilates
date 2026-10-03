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
      <Room />
      <ThisWeek />
      <FirstVisit />
      <Closing />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Hero — an editorial split, not a photograph with type on top. The statement
   holds the left seven columns; the image bleeds off the right page edge. The
   page opens on a ruled edge rather than a picture.
   ──────────────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="pearl-hero">
      <div className="pearl-hero-inner gutter mx-auto max-w-(--container-page)">
        <div className="pearl-hero-copy">
          <p className="label-micro">Pilates reformer · Nha Trang</p>
          <h1 className="font-display text-ink font-light">
            Một nhịp tập<br />
            <em>dành cho cơ thể bạn.</em>
          </h1>
          <p className="text-ink-2">
            Lớp nhóm nhỏ và lớp riêng trên reformer. Bắt đầu bằng một cuộc trò chuyện để chọn cách tập phù hợp với bạn.
          </p>
          <div className="pearl-hero-actions">
            <Button asChild variant="lacquer" size="lg"><Link to="/dat-tu-van">Đặt lịch tư vấn</Link></Button>
            <Link className="pearl-text-link" to="/dich-vu">Khám phá lớp tập <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="pearl-hero-visual">
          <div className="pearl-hero-image"><ArtDirectedImage photo="hero" priority sizes="(min-width: 900px) 46vw, 100vw" /></div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Two formats — a ruled comparison. Two columns divided by a hairline; no
   cards, no borders around the outside, no "most popular" badge.
   ──────────────────────────────────────────────────────────────────────────── */
function Formats() {
  return (
    <Section index="01" label="Chọn nhịp tập">
      <div className="pearl-formats-head">
        <h2 className="font-display text-ink font-light">Không có một cách tập cho tất cả.</h2>
        <p className="text-ink-2">Hai hình thức tập đang có tại studio, cùng tập trung vào chuyển động có kiểm soát.</p>
      </div>
      <div className="pearl-formats">
        {CLASS_FORMATS.map((format, index) => (
          <article
            key={format.id}
            className={`pearl-format pearl-format-${index + 1}`}
          >
            <span className="pearl-format-index">0{index + 1} / 02</span>
            <p className="label-micro">{format.sub}</p>
            <h3 className="font-display text-ink font-light">{format.name}</h3>
            <p className="text-ink-2">{format.body}</p>
            <Link to="/dich-vu" className="pearl-text-link">Tìm hiểu hình thức tập <span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </div>
    </Section>
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
    <Section index="02" label="Chuyển động" tone="deep" className="pearl-method-section">
      <div className="pearl-method">
        <div className="pearl-method-copy">
          <p className="label-micro">Từng chuyển động có mục đích</p>
          <h2 className="font-display text-ink font-light">Chậm lại để cảm nhận rõ hơn.</h2>
          <p className="text-ink-2">Pilates chú ý đến hơi thở, vị trí cơ thể và khả năng kiểm soát trong từng động tác.</p>
          <dl>
            {METHOD_NOTES.map(({ term, def }) => (
              <div key={term} className="rule-t grid grid-cols-6 gap-x-8 py-4">
                <dt className="text-ink col-span-2 text-sm font-medium">{term}</dt>
                <dd className="text-ink-2 col-span-4 text-sm">{def}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="pearl-method-visual">
          <div className="pearl-method-photo pearl-method-photo-one"><ArtDirectedImage photo="method" sizes="(min-width: 900px) 24vw, 47vw" /></div>
          <div className="pearl-method-photo pearl-method-photo-two"><ArtDirectedImage photo="practice" sizes="(min-width: 900px) 24vw, 47vw" /></div>
        </div>
      </div>
    </Section>
  );
}

function Room() {
  return (
    <section className="pearl-room-section">
      <div className="pearl-room gutter mx-auto max-w-(--container-page)">
        <div className="pearl-room-photo"><ArtDirectedImage photo="room" sizes="(min-width: 900px) 52vw, 100vw" /></div>
        <div className="pearl-room-copy">
          <p className="label-micro">03 / Không gian tập</p>
          <h2 className="font-display text-ink font-light">Một nơi để tập trung vào chính mình.</h2>
          <p className="text-ink-2">Cùng nhìn qua không gian reformer tại Nha Trang trước khi bạn ghé studio.</p>
          <Link to="/gioi-thieu" className="pearl-text-link">Xem studio <span aria-hidden="true">↗</span></Link>
        </div>
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
    <Section index="04" label="Bảy ngày tới">
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
    <Section index="05" label="Buổi đầu tiên">
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
