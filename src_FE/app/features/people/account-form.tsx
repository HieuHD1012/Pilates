import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError, errorMessage } from "~/lib/api/client";
import type { AccountCreateRequest, Role } from "~/lib/api/schema";
import { Button } from "~/ui/button";
import { Field, FormActions, Input, Select } from "~/ui/field";

import { useStudents } from "./queries";

/**
 * Creating a login for someone.
 *
 * Three things the contract decides, not this form:
 *
 *  - **The login is an email.** `POST /accounts` takes `email`; the studio
 *    identifies people by phone, but a phone is not a credential here.
 *  - **A `STUDENT` account must name an existing student profile.** The studio
 *    creates the person first and the login second, and they are linked in one
 *    transaction — so the picker below is required for that role and absent for
 *    every other.
 *  - **There is no password field.** Omitting `password` emails a set-your-own
 *    link, which is the normal path: a studio that types someone's password
 *    knows it. The same principle as "forgot password" answering identically
 *    whether or not the account exists.
 */

/** Same permissiveness as every other phone field in the product. */
const phonePattern = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

const schema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  email: z.email("Email chưa đúng định dạng"),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s.-]/g, ""))
    .refine(
      (value) => value === "" || phonePattern.test(value),
      "Số điện thoại chưa đúng định dạng",
    ),
  role: z.enum(["STUDENT", "TRAINER", "STAFF", "ADMIN"]),
  /** Only read, and only required, when the role is `STUDENT`. */
  studentId: z.string(),
});

export type AccountFormValues = z.input<typeof schema>;

/** The backend names its fields in snake_case; this form does not. */
const FIELD_ALIASES: Record<string, keyof AccountFormValues> = {
  full_name: "fullName",
  email: "email",
  phone: "phone",
  role: "role",
  student_id: "studentId",
};

/**
 * What each role can reach, in one line each. A role picker with four bare words
 * makes the studio guess; the consequence of the choice belongs beside it.
 */
const ROLE_NOTE: Record<Role, string> = {
  STUDENT: "Xem lịch của mình, đặt và hủy buổi.",
  TRAINER: "Xem lịch dạy và điểm danh lớp mình dạy.",
  STAFF: "Toàn bộ phần vận hành studio: lịch, học viên, thu chi.",
  ADMIN: "Như nhân viên, cộng quản lý tài khoản và điều chỉnh số buổi.",
};

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Học viên",
  TRAINER: "Huấn luyện viên",
  STAFF: "Nhân viên",
  ADMIN: "Quản trị",
};

const ROLE_ORDER: Role[] = ["STUDENT", "TRAINER", "STAFF", "ADMIN"];

export function AccountForm({
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  error: unknown;
  onSubmit: (input: AccountCreateRequest) => Promise<unknown>;
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
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "STUDENT",
      studentId: "",
    },
  });

  const duplicate = error instanceof ApiError && error.isConflict;
  const otherFailure = error instanceof ApiError && !duplicate && !error.isValidation;

  // The note beside the picker has to follow the picker.
  const role = (useWatch({ control, name: "role" }) ?? "STUDENT") as Role;

  // Only fetched for the role that needs it. Student profiles without a login
  // are the ones worth offering, but the backend refuses a second link anyway,
  // so the list stays whole rather than second-guessing it.
  const students = useStudents({ limit: 200 });

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) => {
        const parsed = schema.parse(values);
        if (parsed.role === "STUDENT" && parsed.studentId === "") {
          setError("studentId", { message: "Chọn hồ sơ học viên" });
          return;
        }

        return onSubmit({
          email: parsed.email,
          full_name: parsed.fullName,
          phone: parsed.phone === "" ? null : parsed.phone,
          role: parsed.role as Role,
          student_id: parsed.role === "STUDENT" ? Number(parsed.studentId) : null,
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
        label="Email đăng nhập"
        required
        hint="Đây là tên đăng nhập, nên mỗi email chỉ có một tài khoản."
        error={
          duplicate
            ? errorMessage(error, "Email này đã có tài khoản.")
            : errors.email?.message
        }
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            aria-describedby={describedBy}
            aria-invalid={invalid || duplicate}
            {...register("email")}
          />
        )}
      </Field>

      <Field label="Số điện thoại" hint="Không bắt buộc." error={errors.phone?.message}>
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

      {role === "STUDENT" ? (
        <Field
          label="Hồ sơ học viên"
          required
          hint="Tài khoản học viên phải gắn với một hồ sơ đã có trong studio."
          error={errors.studentId?.message}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              disabled={students.isPending}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("studentId")}
            >
              <option value="">
                {students.isPending ? "Đang tải hồ sơ…" : "— Chọn hồ sơ học viên —"}
              </option>
              {(students.data ?? []).map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.full_name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}

      <p className="measure text-ink-2 rule-t pt-3 text-xs">
        Studio không đặt mật khẩu cho người khác. Hệ thống gửi liên kết qua email, người này
        tự đặt mật khẩu của mình.
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
