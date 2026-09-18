import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "~/lib/api/client";
import { authApi } from "~/lib/api/endpoints";
import { queryKeys } from "~/lib/api/query-keys";
import type { MeResponse } from "~/lib/api/schema";
import { Button } from "~/ui/button";
import { Field, FormActions, Input } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";

/**
 * The two things anyone signed in may change about themselves.
 *
 * `PATCH /auth/me` takes a name and a phone number and nothing else — not the
 * login email, not the role, not which student or trainer profile the account
 * is attached to. It syncs the linked profile in the same transaction, so a
 * student correcting their phone here corrects it on the studio's record too.
 */

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Nhập họ tên").max(120, "Họ tên quá dài"),
  phone: z.string().trim().max(32, "Số điện thoại quá dài"),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function MyProfileForm({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setError,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: me.full_name ?? "", phone: me.phone ?? "" },
  });

  const save = useMutation({
    mutationFn: (values: ProfileValues) =>
      authApi.updateMe({
        full_name: values.full_name,
        // An empty box means "no number", which the backend stores as null.
        phone: values.phone === "" ? null : values.phone,
      }),
    onSuccess(updated) {
      queryClient.setQueryData(queryKeys.session(), updated);
      reset({ full_name: updated.full_name ?? "", phone: updated.phone ?? "" });
    },
    onError(error) {
      if (error instanceof ApiError && error.isValidation) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field === "full_name" || field === "phone") {
            setError(field, { message: messages[0] ?? "Giá trị chưa hợp lệ" });
          }
        }
      }
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => save.mutateAsync(values).catch(() => {}))}
      className="flex flex-col gap-4"
    >
      <LiveRegion message={save.isSuccess ? "Đã lưu thông tin." : null} />

      <Field label="Họ và tên" required error={errors.full_name?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            autoComplete="name"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("full_name")}
          />
        )}
      </Field>

      <Field label="Số điện thoại" error={errors.phone?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            inputMode="tel"
            autoComplete="tel"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("phone")}
          />
        )}
      </Field>

      {save.isError ? (
        <p role="alert" className="text-danger text-sm">
          Chưa lưu được. Vui lòng thử lại sau ít phút.
        </p>
      ) : null}

      <FormActions>
        <Button type="submit" size="sm" pending={save.isPending} disabled={!isDirty}>
          Lưu thay đổi
        </Button>
      </FormActions>
    </form>
  );
}

/**
 * Changing a password requires the current one from everybody, admins
 * included: without it, an unattended session is a password change.
 */
const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Nhập mật khẩu hiện tại"),
    new_password: z.string().min(10, "Mật khẩu mới cần ít nhất 10 ký tự"),
    confirm: z.string().min(1, "Nhập lại mật khẩu mới"),
  })
  .refine((values) => values.new_password === values.confirm, {
    path: ["confirm"],
    message: "Hai lần nhập chưa giống nhau",
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  });

  const change = useMutation({
    mutationFn: (values: PasswordValues) =>
      authApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      }),
    onSuccess: () => reset(),
    onError(error) {
      if (error instanceof ApiError && error.isValidation) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field === "current_password" || field === "new_password") {
            setError(field, { message: messages[0] ?? "Giá trị chưa hợp lệ" });
          }
        }
      }
    },
  });

  // A wrong current password comes back as 401/403, not as a field error.
  const wrongCurrent =
    change.error instanceof ApiError &&
    (change.error.isAuth || change.error.isForbidden || change.error.isConflict);

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => change.mutateAsync(values).catch(() => {}))}
      className="flex flex-col gap-4"
    >
      <LiveRegion message={change.isSuccess ? "Đã đổi mật khẩu." : null} />

      <Field label="Mật khẩu hiện tại" required error={errors.current_password?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("current_password")}
          />
        )}
      </Field>

      <Field
        label="Mật khẩu mới"
        hint="Ít nhất 10 ký tự."
        required
        error={errors.new_password?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("new_password")}
          />
        )}
      </Field>

      <Field label="Nhập lại mật khẩu mới" required error={errors.confirm?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("confirm")}
          />
        )}
      </Field>

      {change.isError ? (
        <p role="alert" className="text-danger text-sm">
          {wrongCurrent
            ? "Mật khẩu hiện tại chưa đúng."
            : "Chưa đổi được mật khẩu. Vui lòng thử lại sau ít phút."}
        </p>
      ) : null}

      <FormActions>
        <Button type="submit" size="sm" pending={change.isPending}>
          Đổi mật khẩu
        </Button>
      </FormActions>
    </form>
  );
}
