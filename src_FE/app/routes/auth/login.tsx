import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <h1 className="font-display text-ink text-[1.875rem] leading-tight font-normal md:text-4xl">
        Đăng nhập
      </h1>
      <p className="text-ink-2 mt-2 text-base">
        Chào mừng trở lại. Dùng email studio đã cấp cho bạn.
      </p>

      <form
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutateAsync(values).catch(() => {}))}
        className="mt-8 flex flex-col gap-5"
      >
        <Field label="Email" required size="lg" error={errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <span className="relative block">
              <Mail
                aria-hidden="true"
                className="text-ink-2 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              />
              <Input
                id={id}
                type="email"
                className="h-12 pl-10 text-base"
                autoComplete="username"
                inputMode="email"
                placeholder="ten@email.com"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register("email")}
              />
            </span>
          )}
        </Field>

        <Field
          label="Mật khẩu"
          required
          size="lg"
          error={errors.password?.message}
          labelAside={
            <Link
              to="/quen-mat-khau"
              className="text-copper hover:text-copper-2 text-sm font-medium"
            >
              Quên mật khẩu?
            </Link>
          }
        >
          {({ id, describedBy, invalid }) => (
            <span className="relative block">
              <LockKeyhole
                aria-hidden="true"
                className="text-ink-2 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              />
              <Input
                id={id}
                type={showPassword ? "text" : "password"}
                className="h-12 pr-12 pl-10 text-base"
                autoComplete="current-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                className="text-ink-2 hover:text-ink hover:bg-sand absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-sm"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </button>
            </span>
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

      {/* The dead end the audit found: a newcomer arrives here from the public
          timetable, but accounts are created by the studio after a package is
          sold. Say so, and point at the one door that works. */}
      <div className="mt-9">
        <p className="text-ink-2 before:bg-rule-2 after:bg-rule-2 flex items-center gap-3.5 text-sm before:h-px before:flex-1 after:h-px after:flex-1">
          Chưa có tài khoản?
        </p>
        <p className="text-ink-2 mt-4 text-sm">
          Tài khoản do studio tạo khi bạn bắt đầu gói tập. Để lại số điện thoại, studio sẽ
          gọi tư vấn.
        </p>
        <Button asChild variant="secondary" fullWidth className="mt-4">
          <Link to="/dat-tu-van">
            Nhận tư vấn
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>

      <p className="text-ink-2 mt-8 text-center text-xs">
        Cần hỗ trợ đăng nhập? Liên hệ quầy lễ tân của studio.
      </p>
    </div>
  );
}
