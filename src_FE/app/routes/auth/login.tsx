import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";

import { ROLE_HOME } from "~/features/auth/use-session";
import { api, ApiError } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type { SessionUser } from "~/lib/api/types";
import { Button } from "~/ui/button";
import { Field, Input } from "~/ui/field";

import type { Route } from "./+types/login";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Đăng nhập — Soul Pilates Nha Trang" },
    { name: "robots", content: "noindex" },
  ];
}

const schema = z.object({
  identifier: z.string().trim().min(1, "Nhập số điện thoại hoặc email"),
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
    defaultValues: { identifier: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.post<SessionUser>("/auth/login", values),
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

  return (
    <div>
      <h1 className="font-display text-d3 text-ink font-light">Đăng nhập</h1>
      <p className="text-ink-2 mt-3 text-sm">
        Dành cho học viên, huấn luyện viên và nhân viên studio. Tài khoản do studio cấp.
      </p>

      <form
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutateAsync(values).catch(() => {}))}
        className="mt-8 flex flex-col gap-5"
      >
        <Field label="Số điện thoại hoặc email" required error={errors.identifier?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              autoComplete="username"
              inputMode="email"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("identifier")}
            />
          )}
        </Field>

        <Field label="Mật khẩu" required error={errors.password?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("password")}
            />
          )}
        </Field>

        {failed ? (
          <p role="alert" className="text-danger text-sm">
            {isCredentialError
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
          className="decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
        >
          Quên mật khẩu?
        </Link>
      </p>
    </div>
  );
}
