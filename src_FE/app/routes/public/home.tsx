import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router";

import { CLASS_FORMATS } from "~/content/studio";
import {
  EMPTY_LEAD,
  isUnexpectedLeadError,
  leadSchema,
  useLeadMutation,
  type LeadFormValues,
} from "~/features/public/lead-form";
import { usePublicSchedule } from "~/features/public/queries";
import { SessionLine, useStudioToday } from "~/features/public/schedule-ui";
import { addDays } from "~/lib/format";
import { ArrowLink } from "~/ui/arrow-link";
import { ArtDirectedImage } from "~/ui/art-directed-image";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { EmptyState, ErrorState, LiveRegion, SkeletonRows } from "~/ui/feedback";
import { Field, Input } from "~/ui/field";
import { Section } from "~/ui/layout";
import { SectionRail } from "~/ui/public-page";

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
        <div className="grid lg:min-h-[42rem] lg:grid-cols-12 lg:gap-x-6">
          <div className="flex flex-col justify-center py-12 md:py-16 lg:col-span-5 lg:py-24 lg:pr-6">
            <p className="label-micro text-copper">Pilates reformer · Nha Trang</p>
            <h1 className="font-display text-d1 text-ink mt-6 font-light">
              Một buổi tập <em className="text-copper font-light">dành cho bạn.</em>
            </h1>
            <p className="measure text-lede text-ink-2 mt-7">
              Bắt đầu với lớp nhóm hoặc lớp riêng. Trên máy reformer, huấn luyện viên quan sát
              và hướng dẫn từng chuyển động.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Button asChild variant="copper" size="lg">
                <Link to="/dat-tu-van">Trao đổi với studio</Link>
              </Button>
              <ArrowLink to="/dich-vu">Chọn hình thức tập</ArrowLink>
            </div>
            <p className="text-ink-2 mt-4 text-sm">Để lại số điện thoại; studio sẽ liên hệ lại.</p>
          </div>
          <div className="bleed-x lg:bleed-r aspect-4/3 md:aspect-16/10 lg:col-span-7 lg:col-start-6 lg:aspect-auto lg:min-h-[42rem]">
            <ArtDirectedImage
              photo="hero"
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              imgClassName="object-[57%_50%]"
            />
          </div>
        </div>
      </div>
      <div className="border-rule border-b">
        <div className="gutter mx-auto flex max-w-(--container-page) flex-wrap gap-x-10 gap-y-2 py-5 text-sm text-ink-2">
          <span>Hướng dẫn trực tiếp</span><span>Máy reformer</span><span>Nhóm &amp; riêng</span>
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
    <Section index="01" label="Hình thức tập" className="pt-12 md:pt-20">
      <div className="flex flex-wrap items-end justify-between gap-5 pb-9 md:pb-12">
        <div>
          <h2 className="font-display text-d2 text-ink font-light">Bắt đầu theo cách của bạn.</h2>
          <p className="measure text-ink-2 mt-4 text-base">Hai trải nghiệm khác nhau, cùng sự chú ý đến từng chuyển động.</p>
        </div>
        <ArrowLink to="/dich-vu">So sánh hai hình thức</ArrowLink>
      </div>
      <div className="grid gap-10 pb-20 md:grid-cols-2 md:gap-6 md:pb-28">
        {CLASS_FORMATS.map((format) => (
          <article key={format.id} className="min-w-0">
            <div className="aspect-16/10 overflow-hidden md:aspect-3/2">
              <ArtDirectedImage photo={format.id} sizes="(min-width: 768px) 50vw, 100vw" />
            </div>
            <div className="border-rule flex items-start justify-between gap-6 border-t pt-5">
              <div>
                <p className="label-micro text-copper">{format.sub}</p>
                <h3 className="font-display text-d3 text-ink mt-2 font-light">{format.name}</h3>
                <p className="measure text-ink-2 mt-3 max-w-[29em] text-base">
                  {format.id === "group"
                    ? "Một nhịp tập chung, với hướng dẫn riêng cho từng người trong lớp."
                    : "Một buổi dành riêng cho mục tiêu, khả năng và nhịp độ của bạn."}
                </p>
              </div>
              <span className="font-display text-copper text-3xl" aria-hidden="true">↗</span>
            </div>
            <ArrowLink to={`/lich-tap?loai=${format.id === "group" ? "nhom" : "rieng"}`}>Xem lịch {format.name.toLowerCase()}</ArrowLink>
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
function Method() {
  return (
    <Section index="02" label="Phương pháp" tone="deep">
      <div className="grid grid-cols-1 gap-y-10 pb-16 md:pb-24 lg:grid-cols-12 lg:gap-x-6">
        <div className="bleed-x lg:bleed-l aspect-16/10 lg:col-span-6 lg:mr-0 lg:aspect-5/4">
          <ArtDirectedImage
            photo="craft"
            sizes="(min-width: 1024px) 50vw, 100vw"
            imgClassName="object-[62%_58%]"
          />
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:self-center">
          <h2 className="font-display text-d2 text-ink font-light">Chuyển động tốt bắt đầu từ <em className="text-copper font-light">sự chú ý.</em></h2>
          <p className="measure text-ink-2 mt-6 text-base">
            Lò xo trên reformer tạo lực cản có thể điều chỉnh. Huấn luyện viên quan sát cách
            bạn di chuyển, rồi hướng dẫn nhịp thở, tư thế và biên độ phù hợp với buổi tập.
          </p>
          <p className="border-rule text-ink mt-8 border-t pt-5 text-sm">Hơi thở&nbsp; · &nbsp;Căn chỉnh&nbsp; · &nbsp;Kiểm soát</p>
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
              <div className="rule-t">
                {query.data.slice(0, 3).map((session) => (
                  <SessionLine
                    key={`${session.starts_at}-${session.trainer_name}`}
                    session={session}
                    today={today}
                  />
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
      <div className="grid gap-10 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-5">
          <h2 className="font-display text-d2 text-ink max-w-[12em] font-light">Buổi đầu bắt đầu bằng một cuộc trò chuyện.</h2>
          <p className="measure text-ink-2 mt-5 text-base">Bạn kể điều mình đang tìm kiếm. Studio giúp chọn hình thức tập và lịch phù hợp trước khi bạn quyết định gói tập.</p>
          <div className="mt-6"><ArrowLink to="/dat-tu-van">Nói với studio điều bạn cần</ArrowLink></div>
        </div>
        <div className="border-rule lg:col-span-6 lg:col-start-7 lg:border-l lg:pl-10">
          <div className="border-rule border-t py-5"><span className="font-display text-copper text-3xl">01</span><h3 className="text-ink mt-2 font-medium">Gửi thông tin</h3><p className="text-ink-2 mt-1 text-sm">Tên và số điện thoại là đủ để bắt đầu.</p></div>
          <div className="border-rule border-t py-5"><span className="font-display text-copper text-3xl">02</span><h3 className="text-ink mt-2 font-medium">Studio liên hệ</h3><p className="text-ink-2 mt-1 text-sm">Cùng tìm hình thức và giờ tập phù hợp.</p></div>
          <div className="border-rule border-y py-5"><span className="font-display text-copper text-3xl">03</span><h3 className="text-ink mt-2 font-medium">Bắt đầu tập</h3><p className="text-ink-2 mt-1 text-sm">Khi có tài khoản và gói, bạn có thể tự đặt lớp trực tuyến.</p></div>
        </div>
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
