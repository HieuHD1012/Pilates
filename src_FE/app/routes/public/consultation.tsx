import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { CLASS_FORMATS } from "~/content/studio";
import { useSearchParam } from "~/features/public/schedule-ui";
import {
  EMPTY_LEAD,
  LEAD_CONTEXTS,
  isUnexpectedLeadError,
  leadSchema,
  useLeadContext,
  useLeadMutation,
  type LeadFormValues,
} from "~/features/public/lead-form";
import { Button } from "~/ui/button";
import { Field, Input, Textarea } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";

import type { Route } from "./+types/consultation";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Nhận tư vấn — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Để lại tên và số điện thoại, Soul Pilates Nha Trang sẽ liên hệ tư vấn hình thức tập và gói phù hợp.",
    },
  ];
}

const NEXT_STEPS = [
  { title: "Studio nhận thông tin", body: "Nhân viên xem yêu cầu của bạn." },
  {
    title: "Studio gọi hoặc nhắn Zalo",
    body: "Trong giờ làm việc, để nghe tình trạng và mục tiêu của bạn.",
  },
  {
    title: "Chọn hình thức, gói và lịch",
    body: "Studio tạo tài khoản để bạn tự đặt lớp về sau.",
  },
];

const FORMAT_CHOICES = [
  { value: "", label: "Chưa chắc" },
  ...CLASS_FORMATS.map((format) => ({ value: format.id, label: format.name })),
];

/**
 * The page IS the ask, so it has no photograph and the header drops its own
 * button here. Two fields are required; everything else helps staff prepare
 * the call. The copy says plainly that this is a call-back request — the
 * backend creates a lead, not an appointment.
 */
export default function Consultation() {
  const context = useLeadContext();
  const rawPackage = useSearchParam("goi");
  const packageName = context === "goi-tap" && rawPackage && rawPackage.length <= 120 ? rawPackage : null;
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
  const mutation = useLeadMutation({ context, packageName, setError });
  const submitted = mutation.isSuccess;

  return (
    <section className="bg-sand">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="grid grid-cols-1 gap-y-12 pt-12 pb-20 md:pt-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-5">
            <p className="label-micro text-copper">Tư vấn</p>
            <h1 className="font-display text-d1 text-ink mt-5 font-light">
              Để lại số điện thoại.{" "}
              <em className="text-copper font-light">Studio sẽ gọi lại.</em>
            </h1>
            <p className="measure text-lede text-ink-2 mt-6">
              Không cần tạo tài khoản. Chỉ cần tên và số điện thoại; phần còn lại nói qua
              điện thoại sẽ nhanh hơn.
            </p>

            <p className="label-micro text-copper mt-12">Sau khi bạn gửi</p>
            <ol className="mt-3">
              {NEXT_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="rule-t last:border-rule grid grid-cols-[2.5rem_1fr] gap-3 py-4 last:border-b"
                >
                  <span className="figures text-copper text-xl leading-snug">
                    {index + 1}
                  </span>
                  <span>
                    <span className="text-ink block text-base font-medium">
                      {step.title}
                    </span>
                    <span className="text-ink-2 mt-0.5 block text-sm">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <div className="border-rule bg-paper rounded-sm border p-6 sm:p-10">
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
                  <h2 className="font-display text-d3 text-ink font-light">
                    Đã nhận được thông tin của bạn.
                  </h2>
                  <p className="measure text-ink-2 mt-4 text-base">
                    Nhân viên studio sẽ liên hệ trong giờ làm việc qua số điện thoại bạn vừa
                    để lại.
                  </p>
                  <div className="mt-8">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        reset();
                        mutation.reset();
                      }}
                    >
                      Gửi thêm một thông tin khác
                    </Button>
                  </div>
                </div>
              ) : (
                <form
                  noValidate
                  onSubmit={handleSubmit((values) =>
                    mutation.mutateAsync(values).catch(() => {}),
                  )}
                  className="flex flex-col gap-6"
                >
                  {context ? (
                    <p className="bg-copper-wash text-copper-2 self-start rounded-sm px-3 py-2 text-sm">
                      Bạn đang hỏi về: {packageName ?? LEAD_CONTEXTS[context]}
                    </p>
                  ) : null}

                  <Field
                    label="Họ và tên"
                    required
                    size="lg"
                    error={errors.fullName?.message}
                  >
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

                  {/* Three answers, all visible: a select hid "Chưa chắc", which
                      is the most common and most useful answer for staff. */}
                  <fieldset>
                    <legend className="text-ink text-sm font-medium">
                      Hình thức quan tâm (không bắt buộc)
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {FORMAT_CHOICES.map((choice) => (
                        <label
                          key={choice.value || "unsure"}
                          className="border-rule-2 text-ink has-[:checked]:border-copper has-[:checked]:bg-copper-wash has-[:checked]:text-copper-2 has-[:focus-visible]:outline-copper inline-flex min-h-11 cursor-pointer items-center rounded-sm border px-4 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
                        >
                          <input
                            type="radio"
                            value={choice.value}
                            className="sr-only"
                            {...register("preferredClassType")}
                          />
                          {choice.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <Field
                    label="Bạn đang muốn cải thiện điều gì? (không bắt buộc)"
                    size="lg"
                    hint="Ví dụ: đau lưng dưới khi ngồi lâu, mới sinh, muốn tập lại sau chấn thương."
                    error={errors.need?.message}
                  >
                    {({ id, describedBy, invalid }) => (
                      <Textarea
                        id={id}
                        rows={4}
                        className="text-base"
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        {...register("need")}
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

                  <p className="bg-sand-deep text-ink-2 rounded-sm px-4 py-3 text-sm">
                    Đây là yêu cầu gọi lại, chưa phải lịch hẹn đã xác nhận. Studio chỉ dùng
                    số điện thoại này để tư vấn.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
