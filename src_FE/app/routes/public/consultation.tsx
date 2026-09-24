import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CLASS_FORMATS } from "~/content/studio";
import { ApiError } from "~/lib/api/client";
import { publicApi } from "~/lib/api/endpoints";
import { Button } from "~/ui/button";
import { Field, Input, Select, Textarea } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";
import { Section } from "~/ui/layout";
import { PublicPageHeader } from "~/ui/public-page";

import type { Route } from "./+types/consultation";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Đặt lịch tư vấn — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Để lại tên và số điện thoại, Soul Pilates Nha Trang sẽ liên hệ tư vấn hình thức tập và gói phù hợp.",
    },
  ];
}

/**
 * Vietnamese mobile numbers: 10 digits starting 03/05/07/08/09, optionally
 * written with +84 or spaces. Kept deliberately permissive — a form that
 * rejects a real customer's number is worse than one that lets staff fix it.
 */
const phonePattern = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

const schema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s.-]/g, ""))
    .refine((value) => phonePattern.test(value), "Số điện thoại chưa đúng định dạng"),
  preferredClassType: z.enum(["group", "private", ""]),
  need: z.string().trim().max(500, "Nội dung quá dài").optional(),
});

type FormValues = z.input<typeof schema>;

export default function Consultation() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "", preferredClassType: "", need: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const parsed = schema.parse(values);
      /**
       * `POST /public/leads` has no field for the preferred format — a lead is
       * a name, a phone number, free text and a source. The preference goes
       * into `need`, where staff actually read it, rather than being dropped:
       * a select whose answer goes nowhere is a question asked in bad faith.
       */
      const preference =
        parsed.preferredClassType === "group"
          ? "Quan tâm lớp nhóm."
          : parsed.preferredClassType === "private"
            ? "Quan tâm lớp riêng."
            : null;
      const need = [preference, parsed.need?.trim() ?? ""].filter(Boolean).join(" ");

      return publicApi.createLead({
        full_name: parsed.fullName,
        phone: parsed.phone,
        need: need === "" ? null : need,
        source: "website",
      });
    },
    onSuccess: () => reset(),
    onError: (error) => {
      // Field-level errors from the backend are attached to their own field so
      // the user never has to hunt for what went wrong. The backend names them
      // in snake_case; this form does not.
      if (error instanceof ApiError && error.isValidation) {
        const aliases: Record<string, keyof FormValues> = {
          full_name: "fullName",
          phone: "phone",
          need: "need",
        };
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const target = aliases[field];
          if (target !== undefined) {
            setError(target, { message: messages[0] ?? "Giá trị chưa hợp lệ" });
          }
        }
      }
    },
  });

  const submitted = mutation.isSuccess;

  return (
    <>
      <PublicPageHeader
        label="Tư vấn"
        title="Để lại thông tin, studio sẽ gọi lại."
        lede="Không cần tạo tài khoản. Chỉ cần tên và số điện thoại — phần còn lại nói qua điện thoại sẽ nhanh hơn."
      />

      <Section>
        <div className="grid gap-x-8 gap-y-12 pb-20 md:grid-cols-12 md:pb-28">
          <div className="md:col-span-7 lg:col-span-6">
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
              <div className="rule-t border-t-lacquer pt-8">
                <h2 className="font-display text-d3 text-ink font-light">
                  Đã nhận được thông tin của bạn.
                </h2>
                <p className="measure text-ink-2 mt-4 text-base">
                  Nhân viên studio sẽ liên hệ trong giờ làm việc. Nếu cần gấp, bạn có thể
                  gọi trực tiếp theo thông tin ở trang liên hệ.
                </p>
                <div className="mt-8">
                  <Button variant="secondary" onClick={() => mutation.reset()}>
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
                className="flex flex-col gap-5"
              >
                <Field label="Họ và tên" required error={errors.fullName?.message}>
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      autoComplete="name"
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      {...register("fullName")}
                    />
                  )}
                </Field>

                <Field
                  label="Số điện thoại"
                  required
                  hint="Studio sẽ gọi hoặc nhắn Zalo vào số này."
                  error={errors.phone?.message}
                >
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      {...register("phone")}
                    />
                  )}
                </Field>

                <Field
                  label="Hình thức quan tâm"
                  hint="Chưa chắc cũng không sao — bỏ trống nếu bạn muốn được tư vấn."
                  error={errors.preferredClassType?.message}
                >
                  {({ id, describedBy, invalid }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      {...register("preferredClassType")}
                    >
                      <option value="">Chưa chọn</option>
                      {CLASS_FORMATS.map((format) => (
                        <option key={format.id} value={format.id}>
                          {format.name} ({format.sub})
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field
                  label="Bạn đang muốn cải thiện điều gì?"
                  hint="Ví dụ: đau lưng dưới khi ngồi lâu, mới sinh, muốn tập lại sau chấn thương."
                  error={errors.need?.message}
                >
                  {({ id, describedBy, invalid }) => (
                    <Textarea
                      id={id}
                      rows={4}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      {...register("need")}
                    />
                  )}
                </Field>

                {mutation.isError &&
                !(mutation.error instanceof ApiError && mutation.error.isValidation) ? (
                  <p role="alert" className="text-danger text-sm">
                    Chưa gửi được thông tin. Vui lòng thử lại, hoặc gọi trực tiếp cho
                    studio.
                  </p>
                ) : null}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="lacquer"
                    size="lg"
                    pending={isSubmitting || mutation.isPending}
                  >
                    Gửi thông tin
                  </Button>
                </div>
              </form>
            )}
          </div>

          <aside className="md:col-span-4 md:col-start-9">
            <p className="label-micro">Sau khi gửi</p>
            <ol className="mt-3">
              {[
                "Nhân viên gọi lại trong giờ làm việc.",
                "Trao đổi về tình trạng và mục tiêu của bạn.",
                "Studio đề xuất hình thức lớp và gói phù hợp.",
              ].map((step, index) => (
                <li key={step} className="rule-b flex gap-4 py-3">
                  <span className="figures text-2xs text-ink-2">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-ink-2 text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </Section>
    </>
  );
}
