import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";

import { ApiError } from "~/lib/api/client";
import { authApi } from "~/lib/api/endpoints";
import { Button } from "~/ui/button";
import { Field, Input } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";

import type { Route } from "./+types/reset-password";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Đặt lại mật khẩu — Soul Pilates Nha Trang" },
    { name: "robots", content: "noindex" },
  ];
}

const schema = z
  .object({
    // Ten characters, because that is what the backend enforces.
    password: z.string().min(10, "Mật khẩu cần ít nhất 10 ký tự"),
    confirmPassword: z.string().min(1, "Nhập lại mật khẩu mới"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hai lần nhập chưa giống nhau",
  });

type FormValues = z.infer<typeof schema>;

const FORM_FIELDS = new Set<keyof FormValues>(["password", "confirmPassword"]);

/** The backend calls it `new_password`; this form calls it `password`. */
const FIELD_ALIASES: Record<string, keyof FormValues> = { new_password: "password" };

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      authApi.resetPassword({ token: token ?? "", new_password: values.password }),
    onError: (error) => {
      // 422 belongs to the fields. Anything the backend rejects about the
      // password itself is shown under the password, not in a banner the user
      // has to map back onto a control.
      if (error instanceof ApiError && error.isValidation) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const target = FIELD_ALIASES[field] ?? (field as keyof FormValues);
          if (FORM_FIELDS.has(target)) {
            setError(target, { message: messages[0] ?? "Giá trị chưa hợp lệ" });
          }
        }
      }
    },
  });

  const done = mutation.isSuccess;

  /**
   * 410 / `reset_token_invalid` is the backend saying the link is spent or past
   * its expiry — a different outcome from a rejected password, and it cannot be
   * fixed by editing the form. A URL with no token at all is the same dead end
   * arriving earlier, so it renders the same way instead of a form that is
   * guaranteed to fail on submit.
   */
  const tokenRejected =
    mutation.error instanceof ApiError &&
    (mutation.error.status === 410 || mutation.error.code === "reset_token_invalid");
  const linkDead = !token || tokenRejected;

  // Covers a network failure, a 5xx, and a 422 whose field errors did not map
  // onto anything this form renders.
  const showGenericError =
    mutation.isError && !tokenRejected && !errors.password && !errors.confirmPassword;

  return (
    <div>
      <LiveRegion
        message={
          done
            ? "Đã lưu mật khẩu mới."
            : tokenRejected
              ? "Liên kết đặt lại mật khẩu không còn hiệu lực."
              : mutation.isError
                ? "Chưa đặt lại được mật khẩu."
                : null
        }
      />
      <h1 className="font-display text-d3 text-ink font-light">Đặt lại mật khẩu</h1>

      {done ? (
        <>
          <p className="text-ink mt-4 text-base">Mật khẩu mới đã được lưu.</p>
          <p className="text-ink-2 mt-3 text-sm">
            Liên kết vừa dùng không còn hiệu lực. Từ giờ bạn đăng nhập bằng mật khẩu mới.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" fullWidth>
              <Link to="/dang-nhap">Đăng nhập</Link>
            </Button>
          </div>
        </>
      ) : linkDead ? (
        <>
          <p className="text-ink mt-4 text-base">Liên kết này không còn dùng được.</p>
          <p className="text-ink-2 mt-3 text-sm">
            Liên kết đặt lại mật khẩu chỉ dùng được một lần và sẽ hết hạn. Hãy yêu cầu một
            liên kết mới, rồi mở liên kết mới nhất được gửi tới bạn.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" fullWidth>
              <Link to="/quen-mat-khau">Yêu cầu liên kết mới</Link>
            </Button>
          </div>
          <p className="text-ink-2 mt-6 text-sm">
            <Link
              to="/dang-nhap"
              className="decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
            >
              Quay lại đăng nhập
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="text-ink-2 mt-3 text-sm">
            Đặt mật khẩu mới cho tài khoản đã yêu cầu liên kết này. Sau khi lưu, liên kết
            hết hiệu lực và bạn đăng nhập bằng mật khẩu mới.
          </p>

          <form
            noValidate
            onSubmit={handleSubmit((values) =>
              mutation.mutateAsync(values).catch(() => {}),
            )}
            className="mt-8 flex flex-col gap-5"
          >
            <Field
              label="Mật khẩu mới"
              required
              hint="Ít nhất 8 ký tự."
              error={errors.password?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("password")}
                />
              )}
            </Field>

            <Field
              label="Nhập lại mật khẩu mới"
              required
              error={errors.confirmPassword?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("confirmPassword")}
                />
              )}
            </Field>

            {showGenericError ? (
              <p role="alert" className="text-danger text-sm">
                Chưa đặt lại được mật khẩu. Vui lòng thử lại sau ít phút.
              </p>
            ) : null}

            <Button type="submit" size="lg" fullWidth pending={mutation.isPending}>
              Lưu mật khẩu mới
            </Button>
          </form>

          <p className="text-ink-2 mt-6 text-sm">
            <Link
              to="/dang-nhap"
              className="decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
            >
              Quay lại đăng nhập
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
