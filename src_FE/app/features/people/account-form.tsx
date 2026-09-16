import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "~/lib/api/client";
import type { AccountInput, Role } from "~/lib/api/types";
import { Button } from "~/ui/button";
import { Field, FormActions, Input, Select } from "~/ui/field";

/**
 * Creating an account for someone.
 *
 * There is no password field, and adding one would be a mistake rather than a
 * convenience: a studio that types a person's password knows it. The backend
 * sends an invitation and the person sets their own — the same principle behind
 * "forgot password" answering identically whether or not the account exists.
 */

/** Same permissiveness as every other phone field in the product. */
const phonePattern = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

const schema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  identifier: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s.-]/g, ""))
    .refine((value) => phonePattern.test(value), "Số điện thoại chưa đúng định dạng"),
  role: z.enum(["student", "trainer", "staff", "owner"]),
});

export type AccountFormValues = z.input<typeof schema>;

const FIELD_NAMES = new Set(["fullName", "identifier", "role"]);

/**
 * What each role can reach, in one line each. A role picker with four bare words
 * makes the studio guess; the consequence of the choice belongs beside it.
 */
const ROLE_NOTE: Record<Role, string> = {
  student: "Xem lịch của mình, đặt và hủy buổi.",
  trainer: "Xem lịch dạy và danh sách học viên của lớp mình.",
  staff: "Toàn bộ phần vận hành studio: lịch, học viên, thu chi.",
  owner: "Như nhân viên, cộng báo cáo và quản lý tài khoản.",
};

const ROLE_LABEL: Record<Role, string> = {
  student: "Học viên",
  trainer: "Huấn luyện viên",
  staff: "Nhân viên",
  owner: "Chủ studio",
};

const ROLE_ORDER: Role[] = ["student", "trainer", "staff", "owner"];

export function AccountForm({
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  error: unknown;
  onSubmit: (input: AccountInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
  } = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", identifier: "", role: "student" },
  });

  const duplicate = error instanceof ApiError && error.code === "identifier_taken";
  const otherFailure = error instanceof ApiError && !duplicate && !error.isValidation;

  // The note beside the picker has to follow the picker.
  const role = (useWatch({ control, name: "role" }) ?? "student") as Role;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) => {
        const parsed = schema.parse(values);
        return onSubmit({
          fullName: parsed.fullName,
          identifier: parsed.identifier,
          role: parsed.role as Role,
        }).catch((cause) => {
          if (cause instanceof ApiError && cause.isValidation) {
            for (const [field, messages] of Object.entries(cause.fieldErrors)) {
              if (FIELD_NAMES.has(field)) {
                setError(field as keyof AccountFormValues, {
                  message: messages[0] ?? "Giá trị chưa hợp lệ",
                });
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
        hint="Số này là tên đăng nhập, nên mỗi số chỉ có một tài khoản."
        error={
          duplicate ? "Số điện thoại này đã có tài khoản." : errors.identifier?.message
        }
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-describedby={describedBy}
            aria-invalid={invalid || duplicate}
            {...register("identifier")}
          />
        )}
      </Field>

      <Field label="Quyền" required hint={ROLE_NOTE[role]} error={errors.role?.message}>
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("role")}
          >
            {ROLE_ORDER.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABEL[value]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <p className="measure text-ink-2 rule-t pt-3 text-xs">
        Studio không đặt mật khẩu cho người khác. Hệ thống gửi lời mời, người này tự đặt mật
        khẩu của mình.
      </p>

      {otherFailure ? (
        <p role="alert" className="text-danger text-sm">
          Chưa tạo được tài khoản. Vui lòng thử lại sau ít phút.
        </p>
      ) : null}

      <FormActions>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" size="sm" pending={pending}>
          Tạo tài khoản
        </Button>
      </FormActions>
    </form>
  );
}
