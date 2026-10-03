import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router";

import { CANCELLATION_POLICY, CLASS_FORMATS, FIRST_VISIT_STEPS } from "~/content/studio";
import {
  EMPTY_LEAD,
  isUnexpectedLeadError,
  leadSchema,
  useLeadMutation,
  type LeadFormValues,
} from "~/features/public/lead-form";
import { usePublicSchedule } from "~/features/public/queries";
import {
  SessionLine,
  dayLabel,
  groupSessionsByDay,
  useStudioToday,
} from "~/features/public/schedule-ui";
import { addDays } from "~/lib/format";
import { ArrowLink } from "~/ui/arrow-link";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { EmptyState, ErrorState, LiveRegion, SkeletonRows } from "~/ui/feedback";
import { Field, Input } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { Section } from "~/ui/layout";
import { CheckList, SectionRail } from "~/ui/public-page";

import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  const title = "Soul Pilates Nha Trang — Studio reformer, lớp nhóm nhỏ và lớp riêng";
  const description =
    "Studio Pilates reformer tại Nha Trang. Lớp nhóm nhỏ và lớp riêng, huấn luyện viên theo sát từng người. Để lại số điện thoại để được tư vấn.";
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
   Hero — the promise and its evidence as one block. The title column and the
   photograph share their top and bottom edges; the photograph runs to the
   right viewport edge. Under `lg` it sits between the title and the ask so the
   ask stays inside the first phone screen.
   ──────────────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="bg-sand">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="grid grid-cols-1 lg:min-h-[45rem] lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-6">
          <div className="pt-9 md:pt-14 lg:col-span-6 lg:row-start-1 lg:pt-22 lg:pr-10">
            <p className="label-micro text-copper">Pilates reformer tại Nha Trang</p>
            <h1 className="font-display text-d1 text-ink mt-6 font-light">
              Không tập nhiều hơn.
              <br />
              <em className="text-copper font-light">Tập đúng hơn.</em>
            </h1>
          </div>

          <div className="bleed-x lg:bleed-r mt-8 aspect-4/3 md:aspect-16/10 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:ml-0 lg:aspect-auto">
            <ArtDirectedImage
              photo="hero"
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              imgClassName="object-[60%_50%] lg:object-[57%_50%]"
            />
          </div>

          <div className="pt-8 pb-14 lg:col-span-6 lg:row-start-2 lg:self-end lg:pt-10 lg:pr-10">
            <p className="measure text-lede text-ink-2">
              Lớp nhóm nhỏ và lớp riêng trên máy reformer, để huấn luyện viên theo được từng
              người trong suốt buổi tập.
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-7">
              <Button asChild variant="copper" size="lg" className="w-full sm:w-auto">
                <Link to="/dat-tu-van">Nhận tư vấn</Link>
              </Button>
              <ArrowLink to="/lich-tap">Xem lịch tập</ArrowLink>
            </div>
            <p className="text-ink-2 mt-3 text-sm">
              Để lại tên và số điện thoại, studio sẽ gọi lại cho bạn.
            </p>

            <dl className="sm:border-rule mt-10 grid sm:mt-14 sm:grid-cols-3 sm:gap-5 sm:border-t sm:pt-5">
              {[
                ["Thiết bị", "Máy reformer"],
                ["Hình thức", "Lớp nhóm hoặc lớp riêng"],
                ["Người dạy", "Một huấn luyện viên phụ trách mỗi buổi"],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="rule-t last:border-rule py-3 last:border-b sm:border-0 sm:py-0 sm:last:border-0"
                >
                  <dt className="text-ink-2 text-xs">{term}</dt>
                  <dd className="text-ink mt-0.5 text-base sm:mt-1">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Two formats — a ruled comparison, no photographs. This is what a visitor
   reads to decide, so nothing competes with it; the pictures of each format
   live on /dich-vu beside the longer explanation.
   ──────────────────────────────────────────────────────────────────────────── */
function Formats() {
  return (
    <Section index="01" label="Hai hình thức tập" className="pt-6 md:pt-10">
      <div className="grid grid-cols-1 gap-y-12 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
        <SectionRail
          title="Hai hình thức, cùng một phương pháp."
          className="lg:col-span-12 xl:col-span-4"
        >
          <p className="measure text-ink-2 mt-5 text-base">
            Khác nhau ở mức độ bài tập được dựng riêng cho cơ thể bạn. Nếu chưa chắc, studio
            sẽ tư vấn khi gọi lại.
          </p>
          <div className="mt-4">
            <ArrowLink to="/dich-vu">So sánh chi tiết</ArrowLink>
          </div>
        </SectionRail>

        {CLASS_FORMATS.map((format, index) => (
          <article
            key={format.id}
            className={
              index === 0
                ? "lg:col-span-6 lg:pr-4 xl:col-span-4 xl:pr-2"
                : "rule-t lg:border-rule pt-12 lg:col-span-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 xl:col-span-4"
            }
          >
            <p className="label-micro text-copper">{format.sub}</p>
            {/* The ratio qualifies the name, so it sits beside it — not at the
                far edge of the card, a full column away. */}
            <h3 className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-d3 text-ink font-light">
                {format.name}
              </span>
              <span className="figures-display text-copper-bright text-[1.5rem] leading-none">
                {format.ratio}
              </span>
            </h3>
            <p className="text-ink mt-1 text-sm font-medium">{format.size}</p>
            <p className="measure text-ink-2 mt-4 text-base">{format.body}</p>

            <p className="text-ink-2 mt-7 text-sm">Phù hợp với</p>
            <CheckList items={format.forWho} className="mt-3" />
            <p className="text-ink-2 mt-5 text-sm">
              Hủy trước <Figures>{CANCELLATION_POLICY[format.id]}</Figures> giờ để được hoàn
              buổi.
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Method — the close view. It mirrors the hero across the page (left bleed
   against the hero's right bleed) so the eye travels in a Z. The claims are
   about the discipline, true of reformer Pilates anywhere.
   ──────────────────────────────────────────────────────────────────────────── */
const METHOD_NOTES = [
  { term: "Hơi thở", def: "Nhịp thở dẫn động tác, không phải ngược lại." },
  {
    term: "Căn chỉnh",
    def: "Vai, khung sườn, khung chậu được đặt đúng trước khi thêm lực.",
  },
  { term: "Kiểm soát", def: "Biên độ nhỏ, tốc độ chậm, dừng được ở bất kỳ điểm nào." },
];

function Method() {
  return (
    <Section index="02" label="Phương pháp" tone="deep">
      <div className="grid grid-cols-1 gap-y-10 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
        <div className="bleed-x lg:bleed-l aspect-4/3 lg:col-span-6 lg:mr-0 lg:aspect-5/4">
          <ArtDirectedImage
            photo="craft"
            sizes="(min-width: 1024px) 50vw, 100vw"
            imgClassName="object-[62%_58%]"
          />
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:self-center">
          <h2 className="font-display text-d2 text-ink font-light">
            Pilates là một môn học về sự{" "}
            <em className="text-copper font-light">chính xác</em>.
          </h2>
          <p className="measure text-ink-2 mt-6 text-base">
            Lực cản của reformer đến từ lò xo, và được chọn trước mỗi bài. Máy không làm bài
            tập nhẹ đi; nó làm cho sai lệch hiện ra rõ hơn, để huấn luyện viên có chỗ chỉnh.
            Đó là lý do lớp được giữ nhỏ.
          </p>

          {/* Three principles, each a word and its sentence read together. */}
          <dl className="mt-9 flex flex-col gap-5">
            {METHOD_NOTES.map(({ term, def }) => (
              <div key={term}>
                <dt className="text-ink text-base font-medium">{term}</dt>
                <dd className="text-ink-2 mt-0.5 text-base">{def}</dd>
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
   The rail offers both real paths: a student signs in, a newcomer asks.
   ──────────────────────────────────────────────────────────────────────────── */
function ThisWeek() {
  const today = useStudioToday();
  const query = usePublicSchedule(today ?? "", today ? addDays(today, 6) : "");

  return (
    <Section index="03" label="Bảy ngày tới" className="pt-20 md:pt-28">
      <div className="grid grid-cols-1 gap-y-10 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
        <SectionRail title="Lịch tập sắp tới">
          {/* No claim about how or how often the timetable syncs. */}
          <p className="measure text-ink-2 mt-5 text-base">
            Học viên đã có gói đăng nhập để đặt chỗ. Nếu bạn chưa có gói, studio sẽ cùng bạn
            chọn lớp và giờ phù hợp.
          </p>
          <div className="mt-7 flex flex-col items-start gap-1">
            <Button asChild variant="secondary" size="lg">
              <Link to="/lich-tap">Xem toàn bộ lịch</Link>
            </Button>
            <ArrowLink to="/dat-tu-van?tu=lich-tap">Chưa có gói? Nhận tư vấn</ArrowLink>
          </div>
        </SectionRail>

        <div className="min-w-0 lg:col-span-8">
          {query.isPending || !today ? <SkeletonRows rows={5} /> : null}

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
                  <Link to="/dat-tu-van?tu=lich-tap">Nhận tư vấn</Link>
                </Button>
              }
            />
          ) : null}

          {query.isSuccess && query.data.length > 0 ? (
            <>
              <div className="mb-3 flex justify-end">
                <DemoDataNotice />
              </div>
              {/* Grouped by day under a heading, so the day is read once and the
                  rows below it are only time, class and room — instead of a
                  four-column line that repeats the day on every row. */}
              <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
                {groupSessionsByDay(query.data.slice(0, 6)).map(([day, sessions]) => (
                  <section key={day} aria-label={dayLabel(day, today)}>
                    <h3 className="border-rule-2 text-ink border-b pb-2 text-base font-medium">
                      {dayLabel(day, today)}
                    </h3>
                    {sessions.map((session) => (
                      <SessionLine
                        key={`${session.starts_at}-${session.trainer_name}`}
                        session={session}
                      />
                    ))}
                  </section>
                ))}
              </div>
              <div className="mt-6">
                <ArrowLink to="/lich-tap">Chọn buổi trên lịch đầy đủ</ArrowLink>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Section>
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
        <h2 className="font-display text-d2 text-ink max-w-[16em] font-light">
          Bạn không cần biết gì trước khi đến.
        </h2>

        <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          {FIRST_VISIT_STEPS.map((step) => (
            <li key={step.index} className="rule-t relative pt-5">
              <span
                aria-hidden="true"
                className="bg-copper-bright absolute -top-px left-0 h-px w-10"
              />
              <span className="figures-display text-copper-bright block text-[2.75rem] leading-none">
                {step.index}
              </span>
              <h3 className="text-ink mt-5 text-lg font-medium">{step.title}</h3>
              <p className="measure text-ink-2 mt-2 text-base">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Closing — the ask, made answerable on the spot. The two required fields of
   the consultation form, posting the same lead; the full form is one link away
   for anyone who wants to describe their situation first.
   ──────────────────────────────────────────────────────────────────────────── */
function Closing() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: EMPTY_LEAD,
  });
  const mutation = useLeadMutation({ setError });
  const submitted = mutation.isSuccess;

  return (
    <Section tone="ink" className="pb-20 md:pb-28">
      <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-6">
          <p className="label-micro text-amber">Bắt đầu</p>
          <h2 className="font-display text-d2 text-sand mt-5 font-light">
            Bắt đầu bằng một cuộc gọi, không phải một gói tập.
          </h2>
          <p className="measure text-sand/80 mt-6 text-base">
            Để lại tên và số điện thoại. Studio sẽ liên hệ để nghe tình trạng của bạn trước
            khi đề xuất bất cứ điều gì.
          </p>
        </div>

        {/* A light panel, not dark inputs: field errors are danger-red and must
            stay legible, which they are not on the ink field. */}
        <div className="bg-sand text-ink rounded-sm p-6 sm:p-8 lg:col-span-5 lg:col-start-8">
          <LiveRegion
            message={
              submitted
                ? "Đã gửi thông tin tư vấn thành công."
                : mutation.isError
                  ? "Gửi thông tin không thành công."
                  : null
            }
          />
          {submitted ? (
            <div>
              <h3 className="font-display text-ink text-2xl font-light">
                Đã nhận được thông tin của bạn.
              </h3>
              <p className="text-ink-2 mt-3 text-sm">
                Nhân viên studio sẽ liên hệ trong giờ làm việc.
              </p>
              <Button
                variant="secondary"
                className="mt-6"
                onClick={() => {
                  reset();
                  mutation.reset();
                }}
              >
                Gửi thêm một thông tin khác
              </Button>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit((values) =>
                mutation.mutateAsync(values).catch(() => {}),
              )}
              className="flex flex-col gap-5"
            >
              <Field label="Họ và tên" required size="lg" error={errors.fullName?.message}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    autoComplete="name"
                    className="h-12 text-base"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...register("fullName")}
                  />
                )}
              </Field>
              <Field
                label="Số điện thoại"
                required
                size="lg"
                hint="Studio sẽ gọi hoặc nhắn Zalo vào số này."
                error={errors.phone?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="h-12 text-base"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...register("phone")}
                  />
                )}
              </Field>

              {mutation.isError && isUnexpectedLeadError(mutation.error) ? (
                <p role="alert" className="text-danger text-sm">
                  Chưa gửi được thông tin. Vui lòng thử lại sau ít phút.
                </p>
              ) : null}

              <Button
                type="submit"
                variant="copper"
                size="lg"
                fullWidth
                pending={isSubmitting || mutation.isPending}
              >
                Gửi thông tin
              </Button>
              <p className="text-ink-2 text-xs">
                Đây là yêu cầu gọi lại, chưa phải lịch hẹn.{" "}
                <Link
                  to="/dat-tu-van"
                  className="text-copper decoration-rule-2 hover:decoration-copper underline underline-offset-4"
                >
                  Mở form đầy đủ
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}
