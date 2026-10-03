import { ArrowRight, Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import {
  CANCELLATION_POLICY,
  CLASS_FORMATS,
  FIRST_VISIT_STEPS,
  STUDIO,
} from "~/content/studio";
import { BookingBand } from "~/features/public/booking-band";
import { FORMAT_ANCHOR, FormatGuide } from "~/features/public/format-guide";
import { usePublicSchedule, usePublicTrainers } from "~/features/public/queries";
import { publicApi } from "~/lib/api/endpoints";
import { addDays, formatTime, studioDateKey, telHref, weekdayShort } from "~/lib/format";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PendingFact } from "~/ui/pending-fact";
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

/**
 * Pearl reference variant. The page is a long, calm sequence: light field →
 * place → formats → guide → live week → team → principle → first visit →
 * booking → contact. See docs/reference-variant.md for the brief and the
 * claims that were deliberately not carried over from the source.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <AboutStudio />
      <Formats />
      <FormatGuide />
      <ThisWeek />
      <Team />
      <Principle />
      <FirstVisit />
      <BookingBand />
      <Contact />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Hero — no photograph. A satin light field carries the mood; the copy column
   carries the facts and the single ask. The strip under it counts only what
   the app itself defines.
   ──────────────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="pl-hero pl-satin">
      <div aria-hidden="true" className="pl-hero-light" />
      <div className="pl-hero-inner gutter mx-auto max-w-(--container-page)">
        <div className="pl-hero-copy fade-rise">
          <p className="pl-ruled">Studio Pilates reformer tại Nha Trang</p>
          <p className="pl-ruled mt-2">Lớp nhóm nhỏ · Lớp riêng</p>

          <h1 className="pl-hero-title mt-8 md:mt-10">
            Không tập nhiều hơn.
            <br />
            <em>Tập đúng hơn.</em>
          </h1>

          <p className="pl-triad mt-6 md:mt-8">
            Hơi thở<span aria-hidden="true">—</span>Căn chỉnh
            <span aria-hidden="true">—</span>Kiểm soát
          </p>

          <p className="pl-chip mt-6">
            <span>
              Bước đầu tiên: <strong>tên và số điện thoại</strong>, không cần tài khoản
            </span>
          </p>

          <div data-page-ask className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" size="lg" className="pl-btn pl-btn-solid">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="pl-btn pl-btn-outline">
              <Link to="/lich-tap">Xem lịch tập</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 w-full md:mt-20">
          <div className="pl-strip">
            <div>
              <Figures display className="pl-strip-figure">
                {CLASS_FORMATS.length}
              </Figures>
              <p className="text-ink-2 text-sm leading-snug">
                hình thức tập
                <br />
                <span className="text-ink">lớp nhóm nhỏ và lớp riêng</span>
              </p>
            </div>
            <div>
              <Figures display className="pl-strip-figure">
                1
              </Figures>
              <p className="text-ink-2 text-sm leading-snug">
                huấn luyện viên
                <br />
                <span className="text-ink">phụ trách mỗi buổi, từ đầu đến cuối</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Về studio — the asymmetric two-image collage. The tall frame is the real
   room; the offset frame is real practice in that room.
   ──────────────────────────────────────────────────────────────────────────── */
function AboutStudio() {
  return (
    <section className="pl-section">
      <div className="gutter mx-auto grid max-w-(--container-page) gap-x-12 gap-y-12 md:grid-cols-12">
        <div className="md:col-span-6 lg:col-span-5">
          <div className="pl-collage-tall">
            <ArtDirectedImage photo="room" sizes="(min-width: 768px) 42vw, 82vw" />
          </div>
            {/* Phone: the offset frame overlaps the tall one instead of
                waiting below the text. One instance renders per breakpoint. */}
            <div className="pl-collage-offset md:hidden">
              <ArtDirectedImage photo="practice" sizes="(min-width: 768px) 40vw, 74vw" />
            </div>
        </div>

        <div className="md:col-span-6 lg:col-span-6 lg:col-start-7 md:pt-8">
          <p className="pl-ruled">Về studio</p>
          <h2 className="pl-h2 text-ink mt-6">
            Một phòng tập nhỏ, nơi từng chuyển động được nhìn thấy.
          </h2>
          <p className="measure text-ink-2 mt-6 text-base">
            Các máy reformer được đặt song song, để huấn luyện viên đi được giữa các máy và
            nhìn thấy cả hai bên cơ thể của mỗi người.
          </p>
          <p className="measure text-ink-2 mt-4 text-base">
            Reformer không làm bài tập nhẹ đi. Nó làm cho sai sót hiện ra rõ hơn — và cho
            huấn luyện viên chỗ để chỉnh. Đó là lý do lớp được giữ nhỏ.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <Link to="/gioi-thieu" className="pl-link">
              Xem không gian studio <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link to="/huan-luyen-vien" className="pl-link">
              Gặp huấn luyện viên <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="pl-collage-offset hidden md:block">
            <ArtDirectedImage photo="practice" sizes="(min-width: 768px) 40vw, 74vw" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Formats — frosted, very round cards for the two confirmed formats. The card
   opens on a light swatch, not a photograph: no frame shows a group class or a
   private lesson, and a picture of something else would be a caption lie.
   ──────────────────────────────────────────────────────────────────────────── */
const FORMAT_TAG: Record<(typeof CLASS_FORMATS)[number]["id"], string> = {
  group: "Nhóm nhỏ",
  private: "Một kèm một",
};

function Formats() {
  return (
    <section className="pl-section pl-section--tight">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="pl-section-head">
          <div>
            <p className="pl-ruled">Hình thức tập</p>
            <h2 className="pl-h2 text-ink mt-6 max-w-[16em]">
              Hai hình thức, cùng một phương pháp.
            </h2>
          </div>
          <Link to="/dich-vu" className="pl-link">
            So sánh chi tiết <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {CLASS_FORMATS.map((format) => (
            <article key={format.id} className="pl-card flex flex-col">
              <div className="pl-swatch pl-satin pl-satin--short" aria-hidden="true">
                <span className="pl-swatch-word">{format.sub}</span>
              </div>
              <div className="pl-card-pad flex flex-1 flex-col">
                <div className="flex flex-wrap gap-2">
                  <span className="pl-tag">Reformer</span>
                  <span className="pl-tag">{FORMAT_TAG[format.id]}</span>
                </div>
                <h3 className="pl-h3 text-ink mt-5">{format.name}</h3>
                <p className="measure text-ink-2 mt-3 text-base">{format.body}</p>

                <p className="label-micro mt-7">Phù hợp với</p>
                <ul className="pl-list mt-2">
                  {format.forWho.map((item) => (
                    <li key={item} className="text-ink text-sm">
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
                  <p className="text-ink-2 text-xs">
                    Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ để
                    được hoàn buổi
                  </p>
                  <Button
                    asChild
                    variant="secondary"
                    size="md"
                    className="pl-btn pl-btn-outline"
                  >
                    <Link to={`/dich-vu#${FORMAT_ANCHOR[format.id]}`}>Xem chi tiết</Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   This week — the live schedule, all four remote states, inside a frosted
   panel.
   ──────────────────────────────────────────────────────────────────────────── */
function ThisWeek() {
  const today = studioDateKey(new Date());
  const query = usePublicSchedule(today, addDays(today, 6));

  return (
    <section className="pl-section">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="pl-card pl-card-pad grid gap-x-12 gap-y-8 lg:grid-cols-12 lg:p-14">
          <div className="lg:col-span-4">
            <p className="pl-ruled">Bảy ngày tới</p>
            <h2 className="pl-h3 text-ink mt-6">Lịch tập sắp tới</h2>
            <p className="measure text-ink-2 mt-4 text-sm">
              Đăng nhập để đặt chỗ, hoặc để lại thông tin nếu bạn chưa có gói tập.
            </p>
            <Link to="/lich-tap" className="pl-link mt-6">
              Xem toàn bộ lịch <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="lg:col-span-8">
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
                  <Button asChild variant="secondary" className="pl-btn">
                    <Link to="/dat-tu-van">Để lại thông tin</Link>
                  </Button>
                }
              />
            ) : null}

            {query.isSuccess && query.data.length > 0 ? (
              <>
                <DemoDataNotice className="mb-3" />
                <ul className="pl-list">
                  {query.data.slice(0, 7).map((item) => (
                    <li key={`${item.starts_at}-${item.trainer_name}`} className="py-4">
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
      </div>
    </section>
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
   Team — Pearl's big rounded profile cards, fed only by GET /public/trainers.
   No role, no tags, no biography beyond what the API returns. A trainer with
   no portrait gets a neutral frame; a practice photo never stands in.
   ──────────────────────────────────────────────────────────────────────────── */
function Team() {
  const query = usePublicTrainers();

  return (
    <section className="pl-section pl-section--tight">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="pl-section-head">
          <div>
            <p className="pl-ruled">Huấn luyện viên</p>
            <h2 className="pl-h2 text-ink mt-6 max-w-[16em]">
              Một người chịu trách nhiệm cho buổi tập của bạn.
            </h2>
          </div>
          <Link to="/huan-luyen-vien" className="pl-link">
            Tất cả huấn luyện viên <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        {query.isPending ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="pl-card p-3">
                <Skeleton className="aspect-4/5 w-full" />
                <Skeleton className="mx-3 mt-5 mb-4 h-5 w-40" />
              </div>
            ))}
            <span className="sr-only">Đang tải danh sách huấn luyện viên</span>
          </div>
        ) : null}

        {query.isError ? (
          <ErrorState
            description="Chưa tải được danh sách huấn luyện viên. Bạn có thể liên hệ studio để được giới thiệu trực tiếp."
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {query.isSuccess && query.data.length === 0 ? (
          <div className="pl-card pl-card-pad">
            <EmptyState
              title="Hồ sơ huấn luyện viên đang được cập nhật"
              description="Studio sẽ công bố hồ sơ đội ngũ tại đây."
            />
          </div>
        ) : null}

        {query.isSuccess && query.data.length > 0 ? (
          <>
            <DemoDataNotice className="mb-4" />
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {query.data.slice(0, 3).map((trainer) => (
                /* A published portrait gets Pearl's tall frame. Without one the
                   card stays compact: a small waiting frame beside the name,
                   rather than a tall empty field that outweighs the person. */
                <li
                  key={trainer.full_name}
                  className={
                    trainer.photo_key ? "pl-card p-3" : "pl-card flex items-start gap-4 p-3"
                  }
                >
                  {trainer.photo_key ? (
                    <div className="pl-portrait">
                      <img
                        src={publicApi.trainerPhotoUrl(trainer.photo_key)}
                        alt={`Chân dung ${trainer.full_name}`}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="pl-portrait pl-portrait--small">
                      <div
                        role="img"
                        aria-label={`Chưa có ảnh chân dung của ${trainer.full_name}`}
                        className="pl-portrait-empty"
                      />
                    </div>
                  )}
                  <div className={trainer.photo_key ? "px-3 pt-5 pb-4" : "min-w-0 py-2 pr-3"}>
                    <h3 className="font-display text-ink text-2xl font-light">
                      {trainer.full_name}
                    </h3>
                    {trainer.bio ? (
                      <p className="text-ink-2 mt-2 line-clamp-3 text-sm">{trainer.bio}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Principle — Pearl's dark quote panel. A short, widely published line from
   Joseph Pilates, translated and attributed, beside the real chair sequence.
   ──────────────────────────────────────────────────────────────────────────── */
function Principle() {
  return (
    <section className="pl-section pl-section--tight">
      <div className="gutter mx-auto max-w-(--container-page)">
        <figure data-field="dark" className="pl-quote grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="pl-ruled pl-ruled--light">Nguyên lý</p>
            <blockquote className="mt-8">
              <p>
                “Contrology là sự phối hợp trọn vẹn giữa cơ thể, tâm trí và tinh thần.”
              </p>
            </blockquote>
            <figcaption className="text-sand/70 mt-8 text-sm">
              Joseph H. Pilates, <cite>Return to Life Through Contrology</cite> (1945). Lược
              dịch tiếng Việt.
            </figcaption>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <div className="pl-quote-pair">
              <div>
                <ArtDirectedImage photo="method" sizes="(min-width: 1024px) 15vw, 40vw" />
              </div>
              <div className="mt-8">
                <ArtDirectedImage photo="extend" sizes="(min-width: 1024px) 15vw, 40vw" />
              </div>
            </div>
            <p className="text-sand/65 mt-4 text-xs">
              Một động tác trên ghế Pilates: gập vào, rồi vươn ra — có kiểm soát ở cả hai
              chiều.
            </p>
          </div>
        </figure>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   First visit — where Pearl puts testimonials and prices, this page puts what
   the system actually does.
   ──────────────────────────────────────────────────────────────────────────── */
function FirstVisit() {
  return (
    <section className="pl-section pl-section--tight">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="pl-section-head">
          <div>
            <p className="pl-ruled">Buổi đầu tiên</p>
            <h2 className="pl-h2 text-ink mt-6 max-w-[16em]">
              Bạn không cần biết gì trước khi đến.
            </h2>
          </div>
          <Link to="/goi-tap" className="pl-link">
            Xem gói tập <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FIRST_VISIT_STEPS.map((step) => (
            <li key={step.index} className="pl-card pl-card-pad flex gap-5 sm:block">
              <Figures display className="text-copper shrink-0 text-4xl">
                {step.index}
              </Figures>
              <div>
                <h3 className="text-ink text-lg font-medium sm:mt-6">{step.title}</h3>
                <p className="text-ink-2 mt-2 text-sm">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Contact — Pearl's info list with round icon chips. Every value comes from
   studio.ts; every unknown is a PendingFact.
   ──────────────────────────────────────────────────────────────────────────── */
function Contact() {
  const rows: { icon: ReactNode; label: string; value: ReactNode }[] = [
    {
      icon: <MapPin aria-hidden="true" className="size-4" />,
      label: "Địa chỉ",
      value: STUDIO.address ?? <PendingFact label="Địa chỉ studio" />,
    },
    {
      icon: <Phone aria-hidden="true" className="size-4" />,
      label: "Điện thoại",
      value: STUDIO.phone ? (
        <a href={telHref(STUDIO.phone)} className="pl-link">
          {STUDIO.phone}
        </a>
      ) : (
        <PendingFact label="Số điện thoại" />
      ),
    },
    {
      icon: <MessageCircle aria-hidden="true" className="size-4" />,
      label: "Zalo",
      value: STUDIO.zaloUrl ? (
        <a href={STUDIO.zaloUrl} target="_blank" rel="noreferrer" className="pl-link">
          Nhắn tin qua Zalo
        </a>
      ) : (
        <PendingFact label="Liên kết Zalo" />
      ),
    },
    {
      icon: <Clock aria-hidden="true" className="size-4" />,
      label: "Giờ mở cửa",
      value: STUDIO.openingHours ?? <PendingFact label="Giờ mở cửa" />,
    },
  ];

  return (
    <section className="pl-section">
      <div className="gutter mx-auto grid max-w-(--container-page) gap-x-12 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="pl-ruled">Liên hệ</p>
          <h2 className="pl-h2 text-ink mt-6">Cách nhanh nhất là để lại số điện thoại.</h2>
          <p className="measure text-ink-2 mt-5 text-base">
            Studio gọi lại trong giờ làm việc. Nếu bạn thích nhắn tin, hãy dùng các kênh bên
            cạnh.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <Link to="/dat-tu-van" className="pl-link">
              Để lại thông tin tư vấn <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link to="/lien-he" className="pl-link">
              Trang liên hệ
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <dl className="pl-card pl-card-pad space-y-1">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-4 py-3">
                <span className="pl-icon-chip">{row.icon}</span>
                <div className="min-w-0">
                  <dt className="label-micro">{row.label}</dt>
                  <dd className="text-ink mt-0.5 text-base">{row.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
