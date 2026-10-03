import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";

import { ROLE_HOME } from "~/features/auth/use-session";
import { ApiError } from "~/lib/api/client";
import { authApi } from "~/lib/api/endpoints";
import { queryKeys } from "~/lib/api/query-keys";
import { Button } from "~/ui/button";
import { Field, Input } from "~/ui/field";

import type { Route } from "./+types/login";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Đăng nhập — Soul Pilates Nha Trang" },
    { name: "robots", content: "noindex" },
  ];
}

// The backend authenticates by email. The studio identifies people by phone,
// but a phone is not a login: `POST /auth/login` takes `email`, so asking for
// a number here would only produce a 422 the visitor cannot act on.
const schema = z.object({
  email: z.email("Nhập đúng địa chỉ email"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.login(values),
    async onSuccess(user) {
      queryClient.setQueryData(queryKeys.session(), user);
      const next = searchParams.get("next");
      // Only same-origin relative paths are honoured, so a crafted ?next= can
      // never bounce a signed-in studio account off to another site.
      const safeNext = next && /^\/(?!\/)/.test(next) ? next : null;
      await navigate(safeNext ?? ROLE_HOME[user.role], { replace: true });
    },
  });

  const failed = mutation.isError;
  const isCredentialError =
    mutation.error instanceof ApiError &&
    (mutation.error.isAuth || mutation.error.isValidation);
  // 429 is its own answer: the credentials may well be right, and telling
  // someone to check them while the lockout is what stopped them is a lie.
  const isRateLimited = mutation.error instanceof ApiError && mutation.error.isRateLimited;

  return (
    <div>
      <h1 className="font-display text-ink text-[2.25rem] leading-tight font-normal">
        Đăng nhập
      </h1>
      <p className="text-ink-2 mt-3 text-sm">
        Dành cho học viên, huấn luyện viên và nhân viên studio. Tài khoản do studio cấp.
      </p>

      <form
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutateAsync(values).catch(() => {}))}
        className="mt-8 flex flex-col gap-5"
      >
        <Field label="Email" required size="lg" error={errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              className="h-12 text-base"
              autoComplete="username"
              inputMode="email"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("email")}
            />
          )}
        </Field>

        <Field label="Mật khẩu" required size="lg" error={errors.password?.message}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <Input
                id={id}
                type={showPassword ? "text" : "password"}
                className="h-12 pr-18 text-base"
                spellCheck={false}
                autoComplete="current-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register("password")}
              />
              <button
                type="button"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((value) => !value)}
                className="text-ink-2 hover:text-copper absolute inset-y-0 right-1 min-w-16 px-2 text-sm"
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          )}
        </Field>

        {failed ? (
          <p role="alert" className="text-danger text-sm">
            {isRateLimited
              ? "Đã thử quá nhiều lần. Vui lòng chờ ít phút rồi thử lại."
              : isCredentialError
                ? "Thông tin đăng nhập chưa đúng. Vui lòng kiểm tra lại."
                : "Chưa đăng nhập được. Vui lòng thử lại sau ít phút."}
          </p>
        ) : null}

        <Button type="submit" size="lg" fullWidth pending={mutation.isPending}>
          Đăng nhập
        </Button>
      </form>

      <p className="text-ink-2 mt-6 text-sm">
        <Link
          to="/quen-mat-khau"
          className="decoration-rule-2 hover:text-copper hover:decoration-copper underline underline-offset-[6px]"
        >
          Quên mật khẩu?
        </Link>
      </p>

      {/* The dead end the audit found: a newcomer arrives here from the public
          timetable, but accounts are created by the studio after a package is
          sold. Say so, and point at the one door that works. */}
      <div className="border-rule mt-7 border-t pt-5">
        <p className="text-ink text-sm font-medium">Chưa có tài khoản?</p>
        <p className="text-ink-2 mt-1 text-sm">
          Tài khoản do studio tạo khi bạn bắt đầu gói tập. Để lại số điện thoại để được tư
          vấn trước.
        </p>
        <Link
          to="/dat-tu-van"
          className="text-copper decoration-rule-2 hover:decoration-copper mt-2 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-[6px]"
        >
          Nhận tư vấn
        </Link>
      </div>
    </div>
  );
}
