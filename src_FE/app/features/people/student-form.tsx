import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "~/lib/api/client";
import type { StudentCreateRequest } from "~/lib/api/schema";
import { Button } from "~/ui/button";
import { Field, FormActions, Input, Textarea } from "~/ui/field";

/**
 * One form, three jobs: create a student, edit one, and convert a lead. The
 * fields, the validation and the backend's field-error mapping are identical in
 * all three, which is what makes this a component rather than a composition
 * repeated three times.
 */

/** Same permissiveness as the public consultation form — staff can correct a number. */
const phonePattern = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

const schema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s.-]/g, ""))
    .refine((value) => phonePattern.test(value), "Số điện thoại chưa đúng định dạng"),
  email: z.string().trim().email("Email chưa đúng định dạng").or(z.literal("")),
  note: z.string().trim().max(500, "Ghi chú quá dài").or(z.literal("")),
});

export type StudentFormValues = z.input<typeof schema>;

/** The backend names these in snake_case; this form does not. */
const FIELD_ALIASES: Record<string, keyof StudentFormValues> = {
  full_name: "fullName",
  phone: "phone",
  email: "email",
  note: "note",
};

export function StudentForm({
  defaultValues,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<StudentFormValues>;
  submitLabel: string;
  pending: boolean;
  /** The mutation's error, so field-level messages land on their own field. */
  error: unknown;
  onSubmit: (input: StudentCreateRequest) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: defaultValues?.fullName ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      note: defaultValues?.note ?? "",
    },
  });

  /**
   * A duplicate phone is the one rejection this form expects, and it belongs on
   * the phone field — not in a banner the eye has to hunt for.
   */
  const duplicatePhone = error instanceof ApiError && error.code === "phone_taken";
  const otherFailure = error instanceof ApiError && !duplicatePhone && !error.isValidation;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) => {
        const parsed = schema.parse(values);
        return onSubmit({
          full_name: parsed.fullName,
          phone: parsed.phone,
          email: parsed.email === "" ? null : parsed.email,
          note: parsed.note === "" ? null : parsed.note,
        }).catch((cause) => {
          if (cause instanceof ApiError && cause.isValidation) {
            for (const [field, messages] of Object.entries(cause.fieldErrors)) {
              const target = FIELD_ALIASES[field];
              if (target !== undefined) {
                setError(target, { message: messages[0] ?? "Giá trị chưa hợp lệ" });
              }
            }
          }
        });
      })}
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
        hint="Studio dùng số này để nhận diện học viên, nên mỗi số chỉ có một hồ sơ."
        error={
          duplicatePhone ? "Số điện thoại này đã có hồ sơ học viên." : errors.phone?.message
        }
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-describedby={describedBy}
            aria-invalid={invalid || duplicatePhone}
            {...register("phone")}
          />
        )}
      </Field>

      <Field label="Email" hint="Không bắt buộc." error={errors.email?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("email")}
          />
        )}
      </Field>

      <Field
        label="Ghi chú"
        hint="Tình trạng cần lưu ý, mục tiêu, hoặc điều đã trao đổi khi tư vấn."
        error={errors.note?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={3}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("note")}
          />
        )}
      </Field>

      {otherFailure ? (
        <p role="alert" className="text-danger text-sm">
          Chưa lưu được hồ sơ. Vui lòng thử lại sau ít phút.
        </p>
      ) : null}

      <FormActions>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" size="sm" pending={pending}>
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}
