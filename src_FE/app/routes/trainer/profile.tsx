import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ChangePasswordForm, MyProfileForm } from "~/features/auth/profile-forms";
import { useSession } from "~/features/auth/use-session";
import { useTrainer, useTrainerPhoto, useUpdateTrainer } from "~/features/people/queries";
import { useTrainerSchedule } from "~/features/schedule/use-staff-calendar";
import type { TrainerResponse } from "~/lib/api/schema";
import { addDays, formatDate, formatNumber, formatPhone, telHref } from "~/lib/format";
import { Absent } from "~/ui/absent";
import { Button } from "~/ui/button";
import { DetailList, DetailRow } from "~/ui/detail-list";
import { Field, FormActions, Input, Textarea } from "~/ui/field";
import { LiveRegion, Skeleton } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { Metric, PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/profile";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Hồ sơ — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The trainer's own record.
 *
 * `PATCH /trainers/{id}` lets a trainer write their own introduction and
 * specialties. What it refuses, whatever this screen sends, is publishing
 * themselves to the public site (`is_public`) and moving the profile to another
 * login — so neither control exists here.
 *
 * Name and phone are account fields: `PATCH /auth/me` writes them and syncs the
 * trainer record in the same transaction, which is why they are edited once,
 * below, rather than twice in two forms that could disagree.
 */
export default function TrainerProfile() {
  const session = useSession();
  const trainerId = session.data?.trainer_id ?? null;
  const query = useTrainer(trainerId);

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <PageHeader
        title="Hồ sơ"
        description="Thông tin studio đang lưu cho bạn. Phần giới thiệu và chuyên môn do bạn tự viết."
      />

      <div className="mt-6">
        <QueryBoundary
          query={query}
          isEmpty={() => false}
          loading={<ProfileSkeleton />}
          errorDescription="Không tải được hồ sơ của bạn."
        >
          {(trainer) => (
            <>
              <Portrait trainer={trainer} />

              <DetailList>
                <DetailRow label="Họ và tên">{trainer.full_name}</DetailRow>
                <DetailRow label="Số điện thoại">
                  {trainer.phone ? (
                    <a
                      href={telHref(trainer.phone)}
                      className="figures text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[5px]"
                    >
                      {formatPhone(trainer.phone)}
                    </a>
                  ) : (
                    <Absent>Chưa ghi</Absent>
                  )}
                </DetailRow>
                <DetailRow label="Email đăng nhập">
                  {session.data?.email ?? <Absent>Chưa ghi</Absent>}
                </DetailRow>
                <DetailRow label="Hiện trên trang công khai">
                  {trainer.is_public ? "Có" : "Không"}
                </DetailRow>
                <DetailRow label="Bắt đầu làm việc">
                  <Figures>{formatDate(trainer.created_at)}</Figures>
                </DetailRow>
              </DetailList>

              <MonthlyClasses />

              <section className="mt-8">
                <h2 className="text-ink text-sm font-medium">Giới thiệu và chuyên môn</h2>
                <div className="mt-3">
                  <TrainerBioForm trainer={trainer} />
                </div>
              </section>
            </>
          )}
        </QueryBoundary>

        <section className="mt-8">
          <h2 className="text-ink text-sm font-medium">Tên và số điện thoại</h2>
          <div className="mt-3">
            {session.data ? (
              <MyProfileForm me={session.data} />
            ) : (
              <p className="text-ink-2 text-sm">Đang tải thông tin tài khoản.</p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-ink text-sm font-medium">Đổi mật khẩu</h2>
          <div className="mt-3">
            <ChangePasswordForm />
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * The portrait is fetched as bytes, not linked: `GET /trainers/{id}/photo` is
 * behind the token and re-authorised on every read, so there is no static URL.
 * No photo means no frame — an empty avatar ring reads as a broken profile
 * rather than a waiting one.
 */
function Portrait({ trainer }: { trainer: TrainerResponse }) {
  const photo = useTrainerPhoto(trainer.id, trainer.photo_key !== null);
  if (!photo.data) return null;

  return (
    <img
      src={photo.data}
      alt={trainer.full_name}
      decoding="async"
      className="border-rule mb-6 size-24 rounded-full border object-cover"
    />
  );
}

/**
 * How many classes this month.
 *
 * Counted from the trainer's own schedule, because `GET /classes/trainer-stats`
 * is an ADMIN/STAFF endpoint — the staff-side trainer screen uses it. There is
 * no endpoint that would tell a trainer how many distinct students they taught,
 * so that figure is absent rather than approximated.
 */
function MonthlyClasses() {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth =
    now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

  const query = useTrainerSchedule(monthStart, addDays(nextMonth, -1));
  const scheduled = (query.data ?? []).filter((item) => item.status === "SCHEDULED");

  return (
    <section className="mt-8">
      <h2 className="text-ink text-sm font-medium">Tháng này</h2>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5">
        <Metric
          label="Lớp được phân công"
          value={query.isSuccess ? formatNumber(scheduled.length) : "—"}
          unit="lớp"
        />
        <Metric
          label="Chỗ được mở"
          value={
            query.isSuccess
              ? formatNumber(scheduled.reduce((sum, item) => sum + item.capacity, 0))
              : "—"
          }
          unit="chỗ"
        />
      </div>
      <p className="text-ink-2 mt-4 text-xs">
        Đếm từ lịch dạy của bạn trong tháng, không tính lớp đã hủy.
      </p>
    </section>
  );
}

const bioSchema = z.object({
  bio: z.string().trim().max(4000, "Giới thiệu quá dài"),
  specialties: z.string().trim().max(1000, "Chuyên môn quá dài"),
});

type BioValues = z.infer<typeof bioSchema>;

function TrainerBioForm({ trainer }: { trainer: TrainerResponse }) {
  const update = useUpdateTrainer(trainer.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<BioValues>({
    resolver: zodResolver(bioSchema),
    defaultValues: {
      bio: trainer.bio ?? "",
      specialties: trainer.specialties ?? "",
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        update
          .mutateAsync({
            bio: values.bio === "" ? null : values.bio,
            specialties: values.specialties === "" ? null : values.specialties,
          })
          .then((saved) =>
            reset({ bio: saved.bio ?? "", specialties: saved.specialties ?? "" }),
          )
          .catch(() => {}),
      )}
      className="flex flex-col gap-4"
    >
      <LiveRegion message={update.isSuccess ? "Đã lưu hồ sơ." : null} />

      <Field
        label="Giới thiệu"
        hint="Đoạn này hiện trên trang công khai khi studio công bố hồ sơ của bạn."
        error={errors.bio?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={4}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("bio")}
          />
        )}
      </Field>

      <Field label="Chuyên môn" error={errors.specialties?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("specialties")}
          />
        )}
      </Field>

      {update.isError ? (
        <p role="alert" className="text-danger text-sm">
          Chưa lưu được hồ sơ. Vui lòng thử lại sau ít phút.
        </p>
      ) : null}

      <FormActions>
        <Button type="submit" size="sm" pending={update.isPending} disabled={!isDirty}>
          Lưu hồ sơ
        </Button>
      </FormActions>
    </form>
  );
}

function ProfileSkeleton() {
  return (
    <div>
      <div className="rule-t">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="rule-b flex items-baseline gap-4 py-3.5">
            <Skeleton className="h-3 w-28 shrink-0" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
      <span className="sr-only">Đang tải hồ sơ</span>
    </div>
  );
}
