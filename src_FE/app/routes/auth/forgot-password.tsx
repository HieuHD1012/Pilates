import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";

import { authApi } from "~/lib/api/endpoints";
import { Button } from "~/ui/button";
import { Field, Input } from "~/ui/field";
import { LiveRegion } from "~/ui/feedback";

import type { Route } from "./+types/forgot-password";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Quên mật khẩu — Soul Pilates Nha Trang" },
    { name: "robots", content: "noindex" },
  ];
}

const schema = z.object({
  email: z.email("Nhập đúng địa chỉ email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.forgotPassword(values),
  });

  /**
   * The same confirmation is shown whether or not the account exists. Telling a
   * visitor "this number is not registered" would leak the studio's member list.
   */
  const done = mutation.isSuccess;

  return (
    <div>
      <LiveRegion message={done ? "Đã gửi hướng dẫn đặt lại mật khẩu." : null} />
      <h1 className="font-display text-d3 text-ink font-light">Quên mật khẩu</h1>

      {done ? (
        <>
          <p className="text-ink-2 mt-4 text-sm">
            Nếu thông tin bạn nhập khớp với một tài khoản, hướng dẫn đặt lại mật khẩu đã
            được gửi đi. Liên kết chỉ dùng được một lần và sẽ hết hạn.
          </p>
          <div className="mt-8">
            <Button asChild variant="secondary" fullWidth>
              <Link to="/dang-nhap">Quay lại đăng nhập</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-ink-2 mt-3 text-sm">Nhập email bạn dùng để đăng nhập.</p>
          <form
            noValidate
            onSubmit={handleSubmit((values) =>
              mutation.mutateAsync(values).catch(() => {}),
            )}
            className="mt-8 flex flex-col gap-5"
          >
            <Field label="Email" required error={errors.email?.message}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="username"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("email")}
                />
              )}
            </Field>

            {mutation.isError ? (
              <p role="alert" className="text-danger text-sm">
                Chưa gửi được yêu cầu. Vui lòng thử lại sau ít phút.
              </p>
            ) : null}

            <Button type="submit" size="lg" fullWidth pending={mutation.isPending}>
              Gửi hướng dẫn đặt lại
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
