import { Link } from "react-router";

import { CLASS_FORMATS, FIRST_VISIT_STEPS } from "~/content/studio";
import { addDays, formatTime, studioDateKey, weekdayShort } from "~/lib/format";
import { usePublicSchedule } from "~/features/schedule/use-public-schedule";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Section } from "~/ui/layout";
import { StatusBadge } from "~/ui/status";
import { TickRule } from "~/ui/tick-rule";

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

/* ────────────────────────────────────────────────────────────────────────────
   Hero — an editorial split, not a photograph with type on top. The statement
   holds the left seven columns; the image bleeds off the right page edge. The
   page opens on a ruled edge rather than a picture.
   ──────────────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="bg-sand">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="grid items-start gap-x-8 gap-y-10 pt-10 pb-14 md:grid-cols-12 md:pt-14 md:pb-20">
          <div className="md:col-span-7 lg:col-span-6">
            <p className="label-micro">Pilates reformer · Nha Trang</p>

            <h1 className="font-display text-d1 text-ink mt-6 font-light">
              Không tập nhiều hơn.
              <br />
              <em>Tập đúng hơn.</em>
            </h1>

            <p className="measure text-lede text-ink-2 mt-7">
              Lớp nhóm nhỏ và lớp riêng trên reformer, để huấn luyện viên theo được từng
              người trong suốt buổi tập.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button asChild variant="lacquer" size="lg">
                <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/lich-tap">Xem lịch tập</Link>
              </Button>
            </div>
          </div>

          <div className="md:col-span-5 lg:col-span-6 lg:col-start-7">
            <div className="aspect-4/5 w-full md:aspect-3/4 lg:aspect-4/5">
              <ArtDirectedImage
                photo="hero"
                priority
                sizes="(min-width: 768px) 45vw, 100vw"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="gutter mx-auto max-w-(--container-page)">
        <TickRule />
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
    <Section index="01" label="Hai hình thức tập">
      <div className="grid gap-y-12 pb-20 md:grid-cols-2 md:gap-x-0 md:pb-28">
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
    <Section index="02" label="Phương pháp" tone="deep">
      <div className="grid gap-x-8 gap-y-12 pb-20 md:grid-cols-12 md:pb-28">
        <div className="md:col-span-5">
          {/* 4/5, không phải ô vuông. Nội dung của khung này là cái vươn tay lên
              hết biên độ; ô vuông cắt mất bàn tay, tức là cắt mất nội dung. */}
          <div className="aspect-4/5 w-full">
            <ArtDirectedImage photo="method" sizes="(min-width: 768px) 40vw, 100vw" />
          </div>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <h2 className="font-display text-d2 text-ink font-light">
            Pilates là một môn học về sự chính xác.
          </h2>
          <p className="measure text-ink-2 mt-6 text-base">
            Reformer không làm bài tập nhẹ đi. Nó làm cho sai sót hiện ra rõ hơn — và cho
            huấn luyện viên chỗ để chỉnh. Đó là lý do lớp được giữ nhỏ.
          </p>

          <dl className="mt-10">
            {METHOD_NOTES.map(({ term, def }) => (
              <div key={term} className="rule-t grid grid-cols-6 gap-x-8 py-4">
                <dt className="text-ink col-span-2 text-sm font-medium">{term}</dt>
                <dd className="text-ink-2 col-span-4 text-sm">{def}</dd>
              </div>
            ))}
          </dl>
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
                  <li key={item.id} className="rule-b py-4">
                    <div className="flex items-baseline justify-between gap-3 sm:hidden">
                      <span className="flex items-baseline gap-2.5">
                        <span className="figures text-ink-2 text-xs">
                          {weekdayShort(item.startsAt)}
                        </span>
                        <span className="figures text-ink text-sm">
                          {formatTime(item.startsAt)}
                        </span>
                      </span>
                      <AvailabilityBadge availability={item.availability} />
                    </div>
                    <p className="text-ink mt-1 text-sm sm:hidden">
                      {item.title}
                      <span className="text-ink-2 ml-2">
                        {item.type === "private" ? "Lớp riêng" : "Lớp nhóm"}
                      </span>
                    </p>

                    <div className="hidden grid-cols-[3.25rem_5rem_1fr_auto] items-baseline gap-x-4 sm:grid">
                      <span className="figures text-ink-2 text-xs">
                        {weekdayShort(item.startsAt)}
                      </span>
                      <span className="figures text-ink text-sm">
                        {formatTime(item.startsAt)}
                      </span>
                      <span className="text-ink text-sm">
                        {item.title}
                        <span className="text-ink-2 ml-2">
                          {item.type === "private" ? "Lớp riêng" : "Lớp nhóm"}
                        </span>
                      </span>
                      <span className="justify-self-end">
                        <AvailabilityBadge availability={item.availability} />
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

function AvailabilityBadge({
  availability,
}: {
  availability: "open" | "few_left" | "full";
}) {
  if (availability === "full") return <StatusBadge tone="critical">Hết chỗ</StatusBadge>;
  if (availability === "few_left")
    return <StatusBadge tone="attention">Sắp đầy</StatusBadge>;
  return <StatusBadge tone="positive">Còn chỗ</StatusBadge>;
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
      {/* Ở đây từng có một dải ảnh 21/9 tràn viền. Không khung nào trong bộ ảnh
          làm được việc của nó — mọi khung đủ rộng đều là một cảnh, không phải một
          chất liệu, nên cắt ra chỉ được một lát trông như lỗi hiển thị. Khối cát
          gặp thẳng khối mực; chỗ nghỉ là một khoảng trống, không phải một tấm ảnh
          lấp chỗ. */}
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
